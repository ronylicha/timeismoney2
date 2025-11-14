/**
 * Offline database using SQLite WASM for complete offline functionality
 * Enhanced with iOS storage quota management
 */

import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { checkStorageQuota, isIOSDevice } from './platform';

export const OFFLINE_ENTITY_EVENT = 'tim2-offline-entity-saved';

export interface OfflineDB {
    db: Database;
    save: (type: string, data: any) => Promise<void>;
    get: (type: string, id?: string) => Promise<any>;
    getPendingTimeEntries: () => Promise<any[]>;
    getPendingInvoices: () => Promise<any[]>;
    getPendingExpenses: () => Promise<any[]>;
    markAsSynced: (type: string, localId: string) => Promise<void>;
    countPendingChanges: () => Promise<number>;
    clearAll: () => Promise<void>;
    close: () => void;
    getQueuedEntities: (types?: string[]) => Promise<SyncQueueEntry[]>;
    deleteQueueEntry: (id: number) => Promise<void>;
    queueDelete: (type: string, entityId: string) => Promise<void>;
}

export interface SyncQueueEntry {
    id: number;
    entityType: string;
    entityId: string;
    action: string;
    payload: any;
}

let SQL: SqlJsStatic;
let dbInstance: OfflineDB | null = null;

// Storage quota warning state
let hasWarnedAboutQuota = false;
const OFFLINE_DB_STORAGE_KEY = 'offlineDb';
const OFFLINE_TENANT_KEY = 'offlineDbTenant';
const IDB_SNAPSHOT_DB = 'tim2-offline-cache';
const IDB_SNAPSHOT_STORE = 'snapshots';
const IDB_SNAPSHOT_KEY = 'offlineDb';
const OFFLINE_DB_DEBUG_FLAG = 'tim2_offline_db_debug';
let cachedWasmBinary: ArrayBuffer | null = null;

function isOfflineDbDebugEnabled(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }
    try {
        return localStorage.getItem(OFFLINE_DB_DEBUG_FLAG) === '1';
    } catch {
        return false;
    }
}

function offlineDbDebug(...args: any[]): void {
    if (!isOfflineDbDebugEnabled()) {
        return;
    }
    console.debug('[OfflineDB]', ...args);
}

function safeGetLocalStorage(key: string): string | null {
    if (typeof window === 'undefined') {
        return null;
    }
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.warn(`localStorage get failed for ${key}`, error);
        return null;
    }
}

function safeSetLocalStorage(key: string, value: string | null): void {
    if (typeof window === 'undefined') {
        return;
    }
    try {
        if (value === null) {
            localStorage.removeItem(key);
        } else {
            localStorage.setItem(key, value);
        }
    } catch (error) {
        console.warn(`localStorage set failed for ${key}`, error);
    }
}

function getActiveTenantId(): string | null {
    if (typeof window === 'undefined') {
        return null;
    }
    const direct = safeGetLocalStorage('tenant_id');
    if (direct) {
        return direct;
    }
    const storedUser = safeGetLocalStorage('user');
    if (!storedUser) {
        return null;
    }
    try {
        const parsed = JSON.parse(storedUser);
        return parsed?.tenant_id ?? null;
    } catch {
        return null;
    }
}

function uint8ArrayToBase64(buffer: Uint8Array): string {
    const globalBuffer = typeof globalThis !== 'undefined' ? (globalThis as any).Buffer : undefined;
    if (typeof window === 'undefined' && globalBuffer) {
        return globalBuffer.from(buffer).toString('base64');
    }

    let binary = '';
    const chunkSize = 0x8000;

    for (let i = 0; i < buffer.length; i += chunkSize) {
        const chunk = buffer.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, Array.from(chunk));
    }

    return btoa(binary);
}

/**
 * Initialize SQLite WASM database
 */
export async function initOfflineDB(): Promise<OfflineDB> {
    if (dbInstance) {
        return dbInstance;
    }

    try {
        // Load SQLite WASM
        const wasmBinary = await loadSqlWasmBinary();
        SQL = await initSqlJs({
            wasmBinary,
        });

        // Create or load database
        let db: Database;
        const currentTenantId = getActiveTenantId();
        const storedTenantId = safeGetLocalStorage(OFFLINE_TENANT_KEY);
        const shouldResetTenant = Boolean(currentTenantId && storedTenantId && currentTenantId !== storedTenantId);

        if (shouldResetTenant) {
            safeSetLocalStorage(OFFLINE_DB_STORAGE_KEY, null);
            await deleteSnapshotFromIndexedDB();
        }

        let savedDb: string | null = null;
        if (!shouldResetTenant) {
            savedDb = await loadSnapshotFromIndexedDB();
            if (!savedDb) {
                savedDb = safeGetLocalStorage(OFFLINE_DB_STORAGE_KEY);
            }
        }

        if (savedDb) {
            try {
                const buff = Uint8Array.from(atob(savedDb), c => c.charCodeAt(0));
                db = new SQL.Database(buff);
            } catch (error) {
                console.warn('Failed to restore offline database snapshot. Resetting...', error);
                safeSetLocalStorage(OFFLINE_DB_STORAGE_KEY, null);
                await deleteSnapshotFromIndexedDB();
                db = new SQL.Database();
            }
        } else {
            db = new SQL.Database();
        }

        if (currentTenantId) {
            safeSetLocalStorage(OFFLINE_TENANT_KEY, currentTenantId);
        } else if (!currentTenantId && storedTenantId) {
            safeSetLocalStorage(OFFLINE_TENANT_KEY, null);
        }

        // Ensure tables exist even on older snapshots
        createTables(db);

        // Create the OfflineDB instance
        dbInstance = {
            db,
            save: (type: string, data: any) => saveData(db, type, data),
            get: (type: string, id?: string) => getData(db, type, id),
            getPendingTimeEntries: () => getPendingTimeEntries(db),
            getPendingInvoices: () => getPendingInvoices(db),
            getPendingExpenses: () => getPendingExpenses(db),
            markAsSynced: (type: string, localId: string) => markAsSynced(db, type, localId),
            countPendingChanges: () => countPendingChanges(db),
            clearAll: () => clearAllData(db),
            getQueuedEntities: (types?: string[]) => getQueuedEntities(db, types),
            deleteQueueEntry: (id: number) => deleteQueueEntry(db, id),
            queueDelete: (type: string, entityId: string) => queueDelete(db, type, entityId),
            close: () => {
                saveToLocalStorage(db);
                db.close();
            }
        };

        // Auto-save periodically
        setInterval(() => {
            saveToLocalStorage(db);
        }, 30000); // Every 30 seconds

        // Save on page unload
        window.addEventListener('beforeunload', () => {
            saveToLocalStorage(db);
        });

        return dbInstance;

    } catch (error) {
        console.error('Failed to initialize SQLite WASM:', error);
        throw error;
    }
}

/**
 * Create database tables
 */
function createTables(db: Database): void {
    // Time entries table
    db.run(`
        CREATE TABLE IF NOT EXISTS time_entries (
            local_id TEXT PRIMARY KEY,
            id TEXT,
            user_id TEXT,
            project_id TEXT,
            task_id TEXT,
            started_at TEXT,
            ended_at TEXT,
            duration_seconds INTEGER,
            description TEXT,
            is_billable INTEGER,
            hourly_rate REAL,
            data TEXT,
            synced INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Invoices table
    db.run(`
        CREATE TABLE IF NOT EXISTS invoices (
            local_id TEXT PRIMARY KEY,
            id TEXT,
            client_id TEXT,
            project_id TEXT,
            invoice_number TEXT,
            invoice_date TEXT,
            due_date TEXT,
            status TEXT,
            total REAL,
            data TEXT,
            synced INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Expenses table
    db.run(`
        CREATE TABLE IF NOT EXISTS expenses (
            local_id TEXT PRIMARY KEY,
            id TEXT,
            user_id TEXT,
            project_id TEXT,
            category_id TEXT,
            description TEXT,
            amount REAL,
            expense_date TEXT,
            is_billable INTEGER,
            is_reimbursable INTEGER,
            data TEXT,
            synced INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Projects table (for offline access)
    db.run(`
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            client_id TEXT,
            name TEXT,
            code TEXT,
            status TEXT,
            billable_type TEXT,
            hourly_rate REAL,
            data TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Clients table (for offline access)
    db.run(`
        CREATE TABLE IF NOT EXISTS clients (
            id TEXT PRIMARY KEY,
            name TEXT,
            email TEXT,
            phone TEXT,
            client_type TEXT,
            data TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Tasks table (for offline access)
    db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            project_id TEXT,
            title TEXT,
            status TEXT,
            priority TEXT,
            assignee_id TEXT,
            data TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Expense categories table
    db.run(`
        CREATE TABLE IF NOT EXISTS expense_categories (
            id TEXT PRIMARY KEY,
            name TEXT,
            description TEXT,
            color TEXT,
            data TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Users table (for offline access)
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT,
            email TEXT,
            data TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Sync queue table
    db.run(`
        CREATE TABLE IF NOT EXISTS sync_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_type TEXT,
            entity_id TEXT,
            action TEXT,
            data TEXT,
            attempts INTEGER DEFAULT 0,
            error TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create indexes
    db.run('CREATE INDEX IF NOT EXISTS idx_time_entries_synced ON time_entries(synced)');
    db.run('CREATE INDEX IF NOT EXISTS idx_invoices_synced ON invoices(synced)');
    db.run('CREATE INDEX IF NOT EXISTS idx_expenses_synced ON expenses(synced)');
    db.run('CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity_type, entity_id)');
}

/**
 * Save data to the database
 */
function sanitizeDbParams(values: any[]): any[] {
    return values.map(value => (value === undefined ? null : value));
}

async function saveData(db: Database, type: string, data: any): Promise<void> {
    const timestamp = new Date().toISOString();
    if (!data.created_at) {
        data.created_at = timestamp;
    }
    if (!data.updated_at) {
        data.updated_at = timestamp;
    }

    const ensureId = () => data.id || data.localId || data.local_id || generateLocalId();

    switch (type) {
        case 'timeEntry': {
            const localId = data.localId || data.local_id || data.id || generateLocalId();
            const recordId = data.id || localId;
            data.local_id = localId;
            data.id = recordId;
            const isServerOwned = recordId && !recordId.toString().startsWith('local_');
            const jsonData = JSON.stringify(data);

            db.run(`
                INSERT OR REPLACE INTO time_entries
                (local_id, id, user_id, project_id, task_id, started_at, ended_at,
                 duration_seconds, description, is_billable, hourly_rate, data, synced)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, sanitizeDbParams([
                localId,
                recordId,
                data.user_id,
                data.project_id,
                data.task_id || null,
                data.started_at,
                data.ended_at || null,
                data.duration_seconds || 0,
                data.description || '',
                data.is_billable ? 1 : 0,
                data.hourly_rate || 0,
                jsonData,
                isServerOwned ? 1 : 0,
            ]));

            maybeQueueSync(db, type, localId, jsonData, recordId);
            break;
        }

        case 'invoice': {
            const localId = data.localId || data.local_id || data.id || generateLocalId();
            const recordId = data.id || localId;
            data.id = recordId;
            const isServerOwned = recordId && !recordId.toString().startsWith('local_');
            const jsonData = JSON.stringify(data);
            db.run(`
                INSERT OR REPLACE INTO invoices
                (local_id, id, client_id, project_id, invoice_number, invoice_date,
                 due_date, status, total, data, synced)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, sanitizeDbParams([
                localId,
                recordId,
                data.client_id,
                data.project_id || null,
                data.invoice_number || generateInvoiceNumber(),
                data.invoice_date,
                data.due_date,
                data.status || 'draft',
                data.total || 0,
                jsonData,
                isServerOwned ? 1 : 0,
            ]));

            maybeQueueSync(db, type, localId, jsonData, recordId);
            break;
        }

        case 'expense': {
            const recordId = ensureId();
            data.id = recordId;
            const localId = data.localId || data.local_id || recordId;
            const isServerOwned = recordId && !recordId.toString().startsWith('local_');
            const jsonData = JSON.stringify(data);
            db.run(`
                INSERT OR REPLACE INTO expenses
                (local_id, id, user_id, project_id, category_id, description,
                 amount, expense_date, is_billable, is_reimbursable, data, synced)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, sanitizeDbParams([
                localId,
                recordId,
                data.user_id,
                data.project_id || null,
                data.category_id || null,
                data.description,
                data.amount,
                data.expense_date,
                data.is_billable ? 1 : 0,
                data.is_reimbursable ? 1 : 0,
                jsonData,
                isServerOwned ? 1 : 0,
            ]));

            maybeQueueSync(db, type, recordId, jsonData, recordId);
            break;
        }

        case 'project': {
            const recordId = ensureId();
            data.id = recordId;
            const jsonData = JSON.stringify(data);
            db.run(`
                INSERT OR REPLACE INTO projects
                (id, client_id, name, code, status, billable_type, hourly_rate, data)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, sanitizeDbParams([
                recordId,
                data.client_id,
                data.name,
                data.code || null,
                data.status,
                data.billable_type,
                data.hourly_rate || null,
                jsonData
            ]));

            maybeQueueSync(db, type, recordId, jsonData, data.id);
            break;
        }

        case 'client': {
            const recordId = ensureId();
            data.id = recordId;
            const jsonData = JSON.stringify(data);
            db.run(`
                INSERT OR REPLACE INTO clients
                (id, name, email, phone, client_type, data)
                VALUES (?, ?, ?, ?, ?, ?)
            `, sanitizeDbParams([
                recordId,
                data.name,
                data.email || null,
                data.phone || null,
                data.client_type || 'standard',
                jsonData
            ]));

            maybeQueueSync(db, type, recordId, jsonData, data.id);
            break;
        }

        case 'task': {
            const recordId = ensureId();
            data.id = recordId;
            const jsonData = JSON.stringify(data);
            db.run(`
                INSERT OR REPLACE INTO tasks
                (id, project_id, title, status, priority, assignee_id, data)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, sanitizeDbParams([
                recordId,
                data.project_id,
                data.title,
                data.status,
                data.priority,
                data.assignee_id || null,
                jsonData
            ]));
            break;
        }

        case 'expenseCategory': {
            const recordId = ensureId();
            data.id = recordId;
            const jsonData = JSON.stringify(data);
            db.run(`
                INSERT OR REPLACE INTO expense_categories
                (id, name, description, color, data)
                VALUES (?, ?, ?, ?, ?)
            `, sanitizeDbParams([
                recordId,
                data.name,
                data.description || null,
                data.color || null,
                jsonData,
            ]));
            break;
        }

        case 'user': {
            const recordId = ensureId();
            data.id = recordId;
            const jsonData = JSON.stringify(data);
            db.run(`
                INSERT OR REPLACE INTO users
                (id, name, email, data)
                VALUES (?, ?, ?, ?)
            `, sanitizeDbParams([
                recordId,
                data.name,
                data.email || null,
                jsonData,
            ]));
            break;
        }

        default:
            break;
    }

    saveToLocalStorage(db);
    emitOfflineEntityEvent(type, data);
}

function shouldQueueSync(type: string): boolean {
    return ['timeEntry', 'invoice', 'expense', 'client', 'project', 'task', 'expenseCategory'].includes(type);
}

function maybeQueueSync(db: Database, type: string, entityId: string, payload: string, serverId: string | null | undefined): void {
    if (!shouldQueueSync(type)) {
        return;
    }

    const isTemporaryId = !serverId || serverId.toString().startsWith('local_');
    const action = isTemporaryId ? 'create' : 'update';

    // Check if already in queue for this entity
    const stmt = db.prepare('SELECT id FROM sync_queue WHERE entity_type = ? AND entity_id = ? LIMIT 1');
    stmt.bind([type, entityId]);
    const hasExisting = stmt.step();
    stmt.free();

    if (hasExisting) {
        // Update existing queue entry
        db.run(`
            UPDATE sync_queue
            SET action = ?, data = ?, created_at = CURRENT_TIMESTAMP
            WHERE entity_type = ? AND entity_id = ?
        `, sanitizeDbParams([action, payload, type, entityId]));
    } else {
        // Insert new queue entry
        db.run(`
            INSERT INTO sync_queue (entity_type, entity_id, action, data)
            VALUES (?, ?, ?, ?)
        `, sanitizeDbParams([type, entityId, action, payload]));
    }
}

/**
 * Get data from the database
 */
async function getData(db: Database, type: string, id?: string): Promise<any> {
    let stmt;
    let results = [];

    switch (type) {
        case 'timeEntries':
            if (id) {
                stmt = db.prepare('SELECT data FROM time_entries WHERE local_id = ? OR id = ?');
                stmt.bind([id, id]);
            } else {
                stmt = db.prepare('SELECT data FROM time_entries ORDER BY created_at DESC');
            }
            break;

        case 'invoices':
            if (id) {
                stmt = db.prepare('SELECT data FROM invoices WHERE local_id = ? OR id = ?');
                stmt.bind([id, id]);
            } else {
                stmt = db.prepare('SELECT data FROM invoices ORDER BY created_at DESC');
            }
            break;

        case 'expenses':
            if (id) {
                stmt = db.prepare('SELECT data FROM expenses WHERE local_id = ? OR id = ?');
                stmt.bind([id, id]);
            } else {
                stmt = db.prepare('SELECT data FROM expenses ORDER BY created_at DESC');
            }
            break;

        case 'projects':
            if (id) {
                stmt = db.prepare('SELECT data FROM projects WHERE id = ?');
                stmt.bind([id]);
            } else {
                stmt = db.prepare('SELECT data FROM projects ORDER BY name');
            }
            break;

        case 'clients':
            if (id) {
                stmt = db.prepare('SELECT data FROM clients WHERE id = ?');
                stmt.bind([id]);
            } else {
                stmt = db.prepare('SELECT data FROM clients ORDER BY name');
            }
            break;

        case 'tasks':
            if (id) {
                stmt = db.prepare('SELECT data FROM tasks WHERE id = ?');
                stmt.bind([id]);
            } else {
                stmt = db.prepare('SELECT data FROM tasks ORDER BY created_at DESC');
            }
            break;

        case 'expenseCategories':
            if (id) {
                stmt = db.prepare('SELECT data FROM expense_categories WHERE id = ?');
                stmt.bind([id]);
            } else {
                stmt = db.prepare('SELECT data FROM expense_categories ORDER BY name');
            }
            break;

        default:
            return id ? null : [];
    }

    while (stmt.step()) {
        const row = stmt.getAsObject();
        if (row.data) {
            results.push(JSON.parse(row.data as string));
        }
    }
    stmt.free();

    return id ? results[0] : results;
}

/**
 * Get pending time entries
 */
async function getPendingTimeEntries(db: Database): Promise<any[]> {
    const stmt = db.prepare('SELECT local_id, data FROM time_entries WHERE synced = 0');
    const results = [];

    while (stmt.step()) {
        const row = stmt.getAsObject();
        results.push({
            localId: row.local_id,
            data: JSON.parse(row.data as string)
        });
    }
    stmt.free();

    return results;
}

/**
 * Get pending invoices
 */
async function getPendingInvoices(db: Database): Promise<any[]> {
    const stmt = db.prepare('SELECT local_id, data FROM invoices WHERE synced = 0');
    const results = [];

    while (stmt.step()) {
        const row = stmt.getAsObject();
        results.push({
            localId: row.local_id,
            data: JSON.parse(row.data as string)
        });
    }
    stmt.free();

    return results;
}

/**
 * Get pending expenses
 */
async function getPendingExpenses(db: Database): Promise<any[]> {
    const stmt = db.prepare('SELECT local_id, data FROM expenses WHERE synced = 0');
    const results = [];

    while (stmt.step()) {
        const row = stmt.getAsObject();
        results.push({
            localId: row.local_id,
            data: JSON.parse(row.data as string)
        });
    }
    stmt.free();

    return results;
}

/**
 * Mark an item as synced
 */
async function markAsSynced(db: Database, type: string, localId: string): Promise<void> {
    const config: Record<string, { table: string; queueType: string }> = {
        timeEntries: { table: 'time_entries', queueType: 'timeEntry' },
        invoices: { table: 'invoices', queueType: 'invoice' },
        expenses: { table: 'expenses', queueType: 'expense' },
    };

    const map = config[type];
    if (!map) {
        return;
    }

    db.run(`UPDATE ${map.table} SET synced = 1 WHERE local_id = ?`, sanitizeDbParams([localId]));
    db.run('DELETE FROM sync_queue WHERE entity_type = ? AND entity_id = ?', sanitizeDbParams([map.queueType, localId]));

    saveToLocalStorage(db);
}

async function getQueuedEntities(db: Database, types?: string[]): Promise<SyncQueueEntry[]> {
    let stmt;
    if (types?.length) {
        const placeholders = types.map(() => '?').join(',');
        stmt = db.prepare(`SELECT id, entity_type, entity_id, action, data FROM sync_queue WHERE entity_type IN (${placeholders}) ORDER BY id`);
        stmt.bind(types);
    } else {
        stmt = db.prepare('SELECT id, entity_type, entity_id, action, data FROM sync_queue ORDER BY id');
    }

    const entries: SyncQueueEntry[] = [];
    while (stmt.step()) {
        const row = stmt.getAsObject();
        entries.push({
            id: row.id as number,
            entityType: row.entity_type as string,
            entityId: row.entity_id as string,
            action: row.action as string,
            payload: parseJSON(row.data as string),
        });
    }
    stmt.free();
    return entries;
}

function parseJSON(value: string | null): any {
    if (!value) return null;
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

async function deleteQueueEntry(db: Database, id: number): Promise<void> {
    db.run('DELETE FROM sync_queue WHERE id = ?', sanitizeDbParams([id]));
    saveToLocalStorage(db);
}

async function queueDelete(db: Database, type: string, entityId: string): Promise<void> {
    if (!shouldQueueSync(type)) {
        return;
    }

    // Check if already in queue for this entity
    const stmt = db.prepare('SELECT id FROM sync_queue WHERE entity_type = ? AND entity_id = ? LIMIT 1');
    stmt.bind([type, entityId]);
    const hasExisting = stmt.step();
    stmt.free();

    if (hasExisting) {
        // Update existing queue entry to delete action
        db.run(`
            UPDATE sync_queue
            SET action = 'delete', data = NULL, created_at = CURRENT_TIMESTAMP
            WHERE entity_type = ? AND entity_id = ?
        `, sanitizeDbParams([type, entityId]));
    } else {
        // Insert new delete queue entry
        db.run(`
            INSERT INTO sync_queue (entity_type, entity_id, action, data)
            VALUES (?, ?, 'delete', NULL)
        `, sanitizeDbParams([type, entityId]));
    }

    saveToLocalStorage(db);
}

/**
 * Count pending changes
 */
async function countPendingChanges(db: Database): Promise<number> {
    let count = 0;

    const tables = ['time_entries', 'invoices', 'expenses'];
    for (const table of tables) {
        const stmt = db.prepare(`SELECT COUNT(*) as count FROM ${table} WHERE synced = 0`);
        if (stmt.step()) {
            const row = stmt.getAsObject();
            count += row.count as number;
        }
        stmt.free();
    }

    const queueStmt = db.prepare('SELECT COUNT(*) as count FROM sync_queue');
    if (queueStmt.step()) {
        const row = queueStmt.getAsObject();
        count += row.count as number;
    }
    queueStmt.free();

    return count;
}

/**
 * Clear all data
 */
async function clearAllData(db: Database): Promise<void> {
    const tables = [
        'time_entries', 'invoices', 'expenses',
        'projects', 'clients', 'tasks', 'expense_categories', 'sync_queue'
    ];

    for (const table of tables) {
        db.run(`DELETE FROM ${table}`);
    }

    saveToLocalStorage(db);
}

/**
 * Save database to localStorage with quota management
 */
async function saveToLocalStorage(db: Database): Promise<void> {
    try {
        const data = db.export();
        // Convert Uint8Array to base64 string for storage in browser
        const base64String = uint8ArrayToBase64(data);

        const dataSize = base64String.length * 2; // UTF-16 encoding
        const dataSizeMB = (dataSize / 1024 / 1024).toFixed(2);

        // Check storage quota before saving (especially important on iOS)
        if (isIOSDevice()) {
            const quota = await checkStorageQuota();

            // Warn if approaching limit (70%)
            if (quota.isNearLimit && !hasWarnedAboutQuota) {
                console.warn(
                    `Storage quota warning: ${quota.percentUsed.toFixed(1)}% used ` +
                    `(${(quota.used / 1024 / 1024).toFixed(2)} MB / ${(quota.total / 1024 / 1024).toFixed(2)} MB)`
                );
                hasWarnedAboutQuota = true;

                // Notify user if in critical zone
                if (quota.isCritical) {
                    alert(
                        'Attention: L\'espace de stockage est presque plein.\n' +
                        'Veuillez synchroniser vos données et supprimer les anciennes entrées.'
                    );
                }
            }

            // Prevent saving if it would exceed quota
            if (dataSize > quota.available) {
                throw new Error(
                    `Storage quota exceeded. ` +
                    `Database size (${dataSizeMB} MB) exceeds available space ` +
                    `(${(quota.available / 1024 / 1024).toFixed(2)} MB). ` +
                    `Please sync your data and clear old entries.`
                );
            }
        }

        safeSetLocalStorage(OFFLINE_DB_STORAGE_KEY, base64String);
        await saveSnapshotToIndexedDB(base64String);
        offlineDbDebug(`Database saved: ${dataSizeMB} MB`);

    } catch (error) {
        console.error('Failed to save database to localStorage:', error);

        // Handle QuotaExceededError specifically
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
            alert(
                'Espace de stockage insuffisant!\n\n' +
                'L\'application a besoin de plus d\'espace.\n' +
                'Sur iOS:\n' +
                '1. Synchronisez vos données\n' +
                '2. Supprimez les anciennes entrées\n' +
                '3. Effacez le cache Safari si nécessaire'
            );
            throw error;
        }

        throw error;
    }
}

/**
 * Generate a local ID
 */
function generateLocalId(): string {
    return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function createLocalId(): string {
    return generateLocalId();
}

/**
 * Generate a temporary invoice number
 */
function generateInvoiceNumber(): string {
    return `TEMP-${Date.now()}`;
}

/**
 * Export the database instance
 */
export function getOfflineDB(): OfflineDB | null {
    return dbInstance;
}

const TABLE_MAP: Record<string, string> = {
    timeEntry: 'time_entries',
    timeEntries: 'time_entries',
    'time-entries': 'time_entries',
    invoice: 'invoices',
    invoices: 'invoices',
    expense: 'expenses',
    expenses: 'expenses',
    project: 'projects',
    projects: 'projects',
    client: 'clients',
    clients: 'clients',
    task: 'tasks',
    tasks: 'tasks',
    expenseCategory: 'expense_categories',
    expenseCategories: 'expense_categories',
    user: 'users',
    users: 'users',
};

export async function deleteOfflineRecord(type: string, id: string): Promise<void> {
    const table = TABLE_MAP[type];
    if (!table) return;

    const db = dbInstance?.db || (await initOfflineDB()).db;
    const hasLocalColumn = ['time_entries', 'invoices', 'expenses'].includes(table);
    if (hasLocalColumn) {
        db.run(`DELETE FROM ${table} WHERE id = ? OR local_id = ?`, sanitizeDbParams([id, id]));
    } else {
        db.run(`DELETE FROM ${table} WHERE id = ?`, sanitizeDbParams([id]));
    }
    await saveToLocalStorage(db);
}

function emitOfflineEntityEvent(type: string, payload: any) {
    if (typeof window === 'undefined') {
        return;
    }
    try {
        window.dispatchEvent(new CustomEvent(OFFLINE_ENTITY_EVENT, { detail: { type, payload } }));
    } catch {
        // ignore
    }
}

async function loadSnapshotFromIndexedDB(): Promise<string | null> {
    if (!('indexedDB' in globalThis)) {
        return null;
    }
    try {
        const db = await openSnapshotDB();
        if (!db) {
            return null;
        }
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_SNAPSHOT_STORE, 'readonly');
            const store = tx.objectStore(IDB_SNAPSHOT_STORE);
            const request = store.get(IDB_SNAPSHOT_KEY);
            request.onsuccess = () => resolve((request.result as string) || null);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.warn('Failed to load offline snapshot from IndexedDB', error);
        return null;
    }
}

async function saveSnapshotToIndexedDB(value: string): Promise<void> {
    if (!('indexedDB' in globalThis)) {
        return;
    }
    try {
        const db = await openSnapshotDB();
        if (!db) {
            return;
        }
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(IDB_SNAPSHOT_STORE, 'readwrite');
            const store = tx.objectStore(IDB_SNAPSHOT_STORE);
            const request = store.put(value, IDB_SNAPSHOT_KEY);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.warn('Failed to save offline snapshot to IndexedDB', error);
    }
}

async function deleteSnapshotFromIndexedDB(): Promise<void> {
    if (!('indexedDB' in globalThis)) {
        return;
    }
    try {
        const db = await openSnapshotDB();
        if (!db) {
            return;
        }
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(IDB_SNAPSHOT_STORE, 'readwrite');
            const store = tx.objectStore(IDB_SNAPSHOT_STORE);
            const request = store.delete(IDB_SNAPSHOT_KEY);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.warn('Failed to delete offline snapshot from IndexedDB', error);
    }
}

function openSnapshotDB(): Promise<IDBDatabase | null> {
    return new Promise((resolve, reject) => {
        if (!('indexedDB' in globalThis)) {
            resolve(null);
            return;
        }
        const request = indexedDB.open(IDB_SNAPSHOT_DB, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(IDB_SNAPSHOT_STORE)) {
                db.createObjectStore(IDB_SNAPSHOT_STORE);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function loadSqlWasmBinary(): Promise<ArrayBuffer> {
    if (cachedWasmBinary) {
        return cachedWasmBinary;
    }

    if (typeof fetch === 'undefined') {
        throw new Error('Fetch is not available to load sql-wasm.wasm');
    }

    const response = await fetch('/wasm/sql-wasm.wasm', {
        credentials: 'same-origin',
    });

    if (!response.ok) {
        throw new Error(`Unable to load sql-wasm.wasm (status ${response.status})`);
    }

    const buffer = await response.arrayBuffer();

    if (!buffer || buffer.byteLength === 0) {
        throw new Error('sql-wasm.wasm is empty');
    }

    cachedWasmBinary = buffer;
    return buffer;
}
