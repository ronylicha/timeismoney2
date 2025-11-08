/**
 * Offline database using SQLite WASM for complete offline functionality
 */

import initSqlJs, { Database, SqlJsStatic } from 'sql.js';

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
}

let SQL: SqlJsStatic;
let dbInstance: OfflineDB | null = null;

/**
 * Initialize SQLite WASM database
 */
export async function initOfflineDB(): Promise<OfflineDB> {
    if (dbInstance) {
        return dbInstance;
    }

    try {
        // Load SQLite WASM
        SQL = await initSqlJs({
            locateFile: file => `/wasm/${file}`
        });

        // Create or load database
        let db: Database;
        const savedDb = localStorage.getItem('offlineDb');

        if (savedDb) {
            const buff = Uint8Array.from(atob(savedDb), c => c.charCodeAt(0));
            db = new SQL.Database(buff);
        } else {
            db = new SQL.Database();

            // Create tables
            createTables(db);
        }

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
async function saveData(db: Database, type: string, data: any): Promise<void> {
    const localId = data.localId || generateLocalId();
    const jsonData = JSON.stringify(data);

    switch (type) {
        case 'timeEntry':
            db.run(`
                INSERT OR REPLACE INTO time_entries
                (local_id, id, user_id, project_id, task_id, started_at, ended_at,
                 duration_seconds, description, is_billable, hourly_rate, data, synced)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
            `, [
                localId,
                data.id || null,
                data.user_id,
                data.project_id,
                data.task_id || null,
                data.started_at,
                data.ended_at || null,
                data.duration_seconds || 0,
                data.description || '',
                data.is_billable ? 1 : 0,
                data.hourly_rate || 0,
                jsonData
            ]);
            break;

        case 'invoice':
            db.run(`
                INSERT OR REPLACE INTO invoices
                (local_id, id, client_id, project_id, invoice_number, invoice_date,
                 due_date, status, total, data, synced)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
            `, [
                localId,
                data.id || null,
                data.client_id,
                data.project_id || null,
                data.invoice_number || generateInvoiceNumber(),
                data.invoice_date,
                data.due_date,
                data.status || 'draft',
                data.total || 0,
                jsonData
            ]);
            break;

        case 'expense':
            db.run(`
                INSERT OR REPLACE INTO expenses
                (local_id, id, user_id, project_id, category_id, description,
                 amount, expense_date, is_billable, is_reimbursable, data, synced)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
            `, [
                localId,
                data.id || null,
                data.user_id,
                data.project_id || null,
                data.category_id || null,
                data.description,
                data.amount,
                data.expense_date,
                data.is_billable ? 1 : 0,
                data.is_reimbursable ? 1 : 0,
                jsonData
            ]);
            break;

        case 'project':
            db.run(`
                INSERT OR REPLACE INTO projects
                (id, client_id, name, code, status, billable_type, hourly_rate, data)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                data.id,
                data.client_id,
                data.name,
                data.code || null,
                data.status,
                data.billable_type,
                data.hourly_rate || null,
                jsonData
            ]);
            break;

        case 'client':
            db.run(`
                INSERT OR REPLACE INTO clients
                (id, name, email, phone, client_type, data)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                data.id,
                data.name,
                data.email || null,
                data.phone || null,
                data.client_type,
                jsonData
            ]);
            break;

        case 'task':
            db.run(`
                INSERT OR REPLACE INTO tasks
                (id, project_id, title, status, priority, assignee_id, data)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                data.id,
                data.project_id,
                data.title,
                data.status,
                data.priority,
                data.assignee_id || null,
                jsonData
            ]);
            break;
    }

    // Add to sync queue if it's a change that needs syncing
    if (['timeEntry', 'invoice', 'expense'].includes(type) && !data.id) {
        db.run(`
            INSERT INTO sync_queue (entity_type, entity_id, action, data)
            VALUES (?, ?, 'create', ?)
        `, [type, localId, jsonData]);
    }

    saveToLocalStorage(db);
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
    const table = type === 'timeEntries' ? 'time_entries' :
                  type === 'invoices' ? 'invoices' :
                  type === 'expenses' ? 'expenses' : null;

    if (table) {
        db.run(`UPDATE ${table} SET synced = 1 WHERE local_id = ?`, [localId]);

        // Remove from sync queue
        db.run('DELETE FROM sync_queue WHERE entity_type = ? AND entity_id = ?', [type, localId]);

        saveToLocalStorage(db);
    }
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

    return count;
}

/**
 * Clear all data
 */
async function clearAllData(db: Database): Promise<void> {
    const tables = [
        'time_entries', 'invoices', 'expenses',
        'projects', 'clients', 'tasks', 'sync_queue'
    ];

    for (const table of tables) {
        db.run(`DELETE FROM ${table}`);
    }

    saveToLocalStorage(db);
}

/**
 * Save database to localStorage
 */
function saveToLocalStorage(db: Database): void {
    try {
        const data = db.export();
        // Convert Uint8Array to base64 string for storage in browser
        const base64String = btoa(
            String.fromCharCode.apply(null, Array.from(data))
        );
        localStorage.setItem('offlineDb', base64String);
    } catch (error) {
        console.error('Failed to save database to localStorage:', error);
    }
}

/**
 * Generate a local ID
 */
function generateLocalId(): string {
    return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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