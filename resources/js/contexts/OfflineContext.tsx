import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { setupNetworkListeners, isOnline, requestBackgroundSync } from '../utils/serviceWorker';
import { initOfflineDB, OfflineDB, deleteOfflineRecord, createLocalId } from '../utils/offlineDB';
import { processAttachmentQueue, reassignPendingAttachments } from '../utils/offlineAttachments';

interface OfflineContextValue {
    isOnline: boolean;
    isInitialized: boolean;
    isSyncing: boolean;
    pendingChanges: number;
    offlineDB: OfflineDB | null;
    syncNow: () => Promise<void>;
    clearOfflineData: () => Promise<void>;
    saveOffline: (type: string, data: any) => Promise<void>;
    getOfflineData: (type: string, id?: string) => Promise<any>;
}

const PRIME_WINDOW_DAYS = 30;
type SyncableEntity = 'timeEntry' | 'invoice' | 'expense';

const toApiDate = (date: Date) => date.toISOString().slice(0, 10);

interface QueueSyncConfig {
    endpoint: string;
    offlineType: string;
    responseKeys: string[];
}

const QUEUED_ENTITY_SYNC_MAP: Record<string, QueueSyncConfig> = {
    client: { endpoint: '/clients', offlineType: 'client', responseKeys: ['client', 'data'] },
    clients: { endpoint: '/clients', offlineType: 'client', responseKeys: ['client', 'data'] },
    project: { endpoint: '/projects', offlineType: 'project', responseKeys: ['project', 'data'] },
    projects: { endpoint: '/projects', offlineType: 'project', responseKeys: ['project', 'data'] },
    task: { endpoint: '/tasks', offlineType: 'task', responseKeys: ['task', 'data'] },
    tasks: { endpoint: '/tasks', offlineType: 'task', responseKeys: ['task', 'data'] },
    expense: { endpoint: '/expenses', offlineType: 'expense', responseKeys: ['expense', 'data'] },
    expenses: { endpoint: '/expenses', offlineType: 'expense', responseKeys: ['expense', 'data'] },
    expenseCategory: { endpoint: '/expense-categories', offlineType: 'expenseCategory', responseKeys: ['expense_category', 'data'] },
};

interface PrimeRequestConfig {
    url: string;
    params?: Record<string, any>;
    saveType: string;
    entityKey?: string;
    extractor?: (payload: any) => any[];
}

const pickSyncedEntity = (payload: any, type: SyncableEntity) => {
    if (!payload) return null;
    switch (type) {
        case 'timeEntry':
            return payload.time_entry || payload.timer || payload.data || payload;
        case 'invoice':
            return payload.invoice || payload.data || payload;
        case 'expense':
            return payload.expense || payload.data || payload;
        default:
            return payload;
    }
};

const OfflineContext = createContext<OfflineContextValue | undefined>(undefined);

export const useOffline = () => {
    const context = useContext(OfflineContext);
    if (!context) {
        throw new Error('useOffline must be used within an OfflineProvider');
    }
    return context;
};

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOnlineState, setIsOnlineState] = useState(isOnline());
    const [isInitialized, setIsInitialized] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingChanges, setPendingChanges] = useState(0);
    const [offlineDB, setOfflineDB] = useState<OfflineDB | null>(null);
    const [authToken, setAuthToken] = useState<string | null>(() => {
        if (typeof window === 'undefined') {
            return null;
        }
        try {
            return localStorage.getItem('auth_token');
        } catch {
            return null;
        }
    });
    const syncTimeoutRef = useRef<NodeJS.Timeout>();
    const primeStateRef = useRef<{ token: string | null; primed: boolean }>({ token: null, primed: false });

    // Initialize offline database
    useEffect(() => {
        const initDB = async () => {
            try {
                if (import.meta.env.DEV) {
                    console.log('Initializing offline database...');
                }
                const db = await initOfflineDB();
                setOfflineDB(db);
                setIsInitialized(true);

                // Count pending changes
                const pending = await db.countPendingChanges();
                setPendingChanges(pending);

                if (import.meta.env.DEV) {
                    console.log('Offline database initialized with', pending, 'pending changes');
                }
            } catch (error) {
                console.error('Failed to initialize offline database:', error);
                toast.error('Offline mode initialization failed');
            }
        };

        initDB();
    }, []);

    // Sync data with server
    const syncNow = useCallback(async () => {
        if (!isOnlineState || !offlineDB || isSyncing) {
            return;
        }

        setIsSyncing(true);

        try {
            if (import.meta.env.DEV) {
                console.log('Starting sync...');
            }

            // Get all pending changes
            const pendingTimeEntries = await offlineDB.getPendingTimeEntries();
            const pendingInvoices = await offlineDB.getPendingInvoices();
            const pendingExpenses = await offlineDB.getPendingExpenses();

            let syncedCount = 0;
            let errorCount = 0;

            // Sync time entries
            for (const entry of pendingTimeEntries) {
                try {
                    const response = await fetch('/time-entries', {
                        method: entry.id ? 'PUT' : 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                        },
                        body: JSON.stringify(entry.data)
                    });

                    if (response.ok) {
                        let payload: any = null;
                        try {
                            payload = await response.json();
                        } catch {
                            // ignore
                        }
                        const serverRecord = pickSyncedEntity(payload, 'timeEntry');
                        if (serverRecord) {
                            await offlineDB.save('timeEntry', serverRecord);
                        }
                        await offlineDB.markAsSynced('timeEntries', entry.localId);
                        await deleteOfflineRecord('time-entries', entry.localId);
                        syncedCount++;
                    } else {
                        errorCount++;
                    }
                } catch (error) {
                    if (import.meta.env.DEV) {
                        console.error('Failed to sync time entry:', error);
                    }
                    errorCount++;
                }
            }

            // Sync invoices
            for (const invoice of pendingInvoices) {
                try {
                    const response = await fetch('/invoices', {
                        method: invoice.id ? 'PUT' : 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                        },
                        body: JSON.stringify(invoice.data)
                    });

                    if (response.ok) {
                        let payload: any = null;
                        try {
                            payload = await response.json();
                        } catch {
                            // ignore
                        }
                        const serverInvoice = pickSyncedEntity(payload, 'invoice');
                        if (serverInvoice) {
                            await offlineDB.save('invoice', serverInvoice);
                        }
                        await offlineDB.markAsSynced('invoices', invoice.localId);
                        await deleteOfflineRecord('invoice', invoice.localId);
                        syncedCount++;
                    } else {
                        errorCount++;
                    }
                } catch (error) {
                    if (import.meta.env.DEV) {
                        console.error('Failed to sync invoice:', error);
                    }
                    errorCount++;
                }
            }

            // Sync expenses
            for (const expense of pendingExpenses) {
                try {
                    const response = await fetch('/expenses', {
                        method: expense.id ? 'PUT' : 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                        },
                        body: JSON.stringify(expense.data)
                    });

                    if (response.ok) {
                        let payload: any = null;
                        try {
                            payload = await response.json();
                        } catch {
                            // ignore
                        }
                        const serverExpense = pickSyncedEntity(payload, 'expense');
                        if (serverExpense) {
                            await offlineDB.save('expense', serverExpense);
                        }
                        await offlineDB.markAsSynced('expenses', expense.localId);
                        await deleteOfflineRecord('expense', expense.localId);
                        syncedCount++;
                    } else {
                        errorCount++;
                    }
                } catch (error) {
                    if (import.meta.env.DEV) {
                        console.error('Failed to sync expense:', error);
                    }
                    errorCount++;
                }
            }

            // Sync queued entities (clients, projects, tasks, expenses, expense categories)
            const queuedEntities = await offlineDB.getQueuedEntities(['client', 'project', 'task', 'expense', 'expenseCategory']);

            if (import.meta.env.DEV && queuedEntities.length > 0) {
                console.log(`[Sync] Found ${queuedEntities.length} queued entities:`, queuedEntities.map(e => ({
                    type: e.entityType,
                    action: e.action,
                    id: e.entityId
                })));
            }

            for (const entry of queuedEntities) {
                const config = QUEUED_ENTITY_SYNC_MAP[entry.entityType];
                if (!config || !entry.payload) {
                    if (import.meta.env.DEV) {
                        console.warn(`[Sync] Skipping entry - no config or payload:`, entry);
                    }
                    continue;
                }

                try {
                    const payload = sanitizeQueuedPayload(entry.payload);
                    let response;
                    let entity;

                    // Handle different actions
                    switch (entry.action) {
                        case 'create': {
                            response = await axios.post(config.endpoint, payload);
                            entity = extractEntityFromResponse(response.data, config.responseKeys);
                            if (entity) {
                                await deleteOfflineRecord(config.offlineType, entry.entityId);
                                await offlineDB.save(config.offlineType, entity);

                                // Reassign pending attachments from local ID to server ID
                                if (entity.id && entry.entityId !== entity.id) {
                                    const attachmentEntityType = config.offlineType === 'project' ? 'projects' :
                                        config.offlineType === 'expense' ? 'expenses' :
                                        config.offlineType === 'task' ? 'tasks' : null;

                                    if (attachmentEntityType) {
                                        try {
                                            await reassignPendingAttachments(
                                                attachmentEntityType as any,
                                                entry.entityId,
                                                entity.id
                                            );
                                        } catch (error) {
                                            if (import.meta.env.DEV) {
                                                console.warn('Failed to reassign attachments:', error);
                                            }
                                        }
                                    }
                                }
                            }
                            break;
                        }

                        case 'update': {
                            // Extract server ID from entityId (could be local_xxx or server ID)
                            const serverId = payload.id || entry.entityId;
                            if (serverId && !serverId.toString().startsWith('local_')) {
                                response = await axios.put(`${config.endpoint}/${serverId}`, payload);
                                entity = extractEntityFromResponse(response.data, config.responseKeys);
                                if (entity) {
                                    await offlineDB.save(config.offlineType, entity);
                                }
                            } else {
                                // If still has local ID, treat as create
                                response = await axios.post(config.endpoint, payload);
                                entity = extractEntityFromResponse(response.data, config.responseKeys);
                                if (entity) {
                                    await deleteOfflineRecord(config.offlineType, entry.entityId);
                                    await offlineDB.save(config.offlineType, entity);
                                }
                            }
                            break;
                        }

                        case 'delete': {
                            const serverId = entry.entityId;
                            if (serverId && !serverId.toString().startsWith('local_')) {
                                await axios.delete(`${config.endpoint}/${serverId}`);
                                await deleteOfflineRecord(config.offlineType, entry.entityId);
                            } else {
                                // If local ID, just remove from local DB
                                await deleteOfflineRecord(config.offlineType, entry.entityId);
                            }
                            break;
                        }

                        default:
                            if (import.meta.env.DEV) {
                                console.warn(`[Sync] Unknown action: ${entry.action}`);
                            }
                            continue;
                    }

                    await offlineDB.deleteQueueEntry(entry.id);
                    syncedCount++;

                    if (import.meta.env.DEV) {
                        console.log(`[Sync] Successfully synced ${entry.action} ${entry.entityType} ${entry.entityId}`);
                    }
                } catch (error) {
                    if (import.meta.env.DEV) {
                        console.error(`Failed to sync ${entry.action} ${entry.entityType}:`, error);
                    }
                    errorCount++;
                }
            }

            // Update pending count
            const remaining = await offlineDB.countPendingChanges();
            setPendingChanges(remaining);

            if (syncedCount > 0) {
                toast.success(`Synced ${syncedCount} items successfully`);
            }
            if (errorCount > 0) {
                toast.warning(`Failed to sync ${errorCount} items`);
            }

            if (import.meta.env.DEV) {
                console.log('Sync completed:', { syncedCount, errorCount, remaining });
            }

            // Request background sync if there are still pending items
            if (remaining > 0) {
                await requestBackgroundSync();
            }

        } catch (error) {
            if (import.meta.env.DEV) {
                console.error('Sync failed:', error);
            }
            toast.error('Failed to sync data');
        } finally {
            setIsSyncing(false);
        }
    }, [isOnlineState, offlineDB, isSyncing]);

    // Setup network listeners
    useEffect(() => {
        const cleanup = setupNetworkListeners(
            () => {
                setIsOnlineState(true);
                toast.success('Back online! Syncing data...');

                // Trigger sync after coming online
                if (syncTimeoutRef.current) {
                    clearTimeout(syncTimeoutRef.current);
                }
                syncTimeoutRef.current = setTimeout(() => {
                    syncNow();
                    processAttachmentQueue().catch(error => {
                        if (import.meta.env.DEV) {
                            console.warn('Attachment queue sync failed', error);
                        }
                    });
                }, 2000); // Wait 2 seconds before syncing
            },
            () => {
                setIsOnlineState(false);
                toast.info('You are offline. Changes will be saved locally.');
            }
        );

        return () => {
            cleanup();
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }
        };
    }, [syncNow]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }
        const handleTokenEvent = (event: Event) => {
            const detail = (event as CustomEvent<string | null>).detail ?? null;
            setAuthToken(detail);
        };
        const handleStorage = (event: StorageEvent) => {
            if (event.key === 'auth_token') {
                setAuthToken(event.newValue);
            }
        };
        window.addEventListener('tim2-auth-token-changed', handleTokenEvent as EventListener);
        window.addEventListener('storage', handleStorage);
        return () => {
            window.removeEventListener('tim2-auth-token-changed', handleTokenEvent as EventListener);
            window.removeEventListener('storage', handleStorage);
        };
    }, []);

    useEffect(() => {
        if (!isOnlineState || !offlineDB) {
            return;
        }
        const token = authToken;
        if (!token) {
            primeStateRef.current = { token: null, primed: false };
            return;
        }
        if (primeStateRef.current.primed && primeStateRef.current.token === token) {
            return;
        }

        const prime = async () => {
            try {
                primeStateRef.current = { token, primed: true };
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(endDate.getDate() - PRIME_WINDOW_DAYS);

                const baseListParams = { per_page: 250 };
                const rangeParams = {
                    start_date: toApiDate(startDate),
                    end_date: toApiDate(endDate),
                    per_page: 500,
                };

                const primeConfigs: PrimeRequestConfig[] = [
                    { url: '/projects', params: baseListParams, saveType: 'project', entityKey: 'project' },
                    { url: '/clients', params: baseListParams, saveType: 'client', entityKey: 'client' },
                    { url: '/expenses', params: baseListParams, saveType: 'expense', entityKey: 'expense' },
                    { url: '/expense-categories', params: { per_page: 250 }, saveType: 'expenseCategory', entityKey: 'expense_category' },
                    { url: '/users', params: baseListParams, saveType: 'user', entityKey: 'user' },
                    { url: '/tasks', params: { ...baseListParams, include_full: true }, saveType: 'task', entityKey: 'task' }, // Include all relations for offline
                    { url: '/time-entries', params: rangeParams, saveType: 'timeEntry', extractor: extractTimeEntries },
                    { url: '/time-entries/timesheet', params: { start_date: rangeParams.start_date, end_date: rangeParams.end_date }, saveType: 'timeEntry', extractor: extractTimeEntries },
                ];

                // Execute requests sequentially with delay to avoid rate limiting
                const results: PromiseSettledResult<any>[] = [];
                for (let i = 0; i < primeConfigs.length; i++) {
                    const cfg = primeConfigs[i];
                    try {
                        const result = await axios.get(cfg.url, { params: cfg.params });
                        results.push({ status: 'fulfilled', value: result });
                    } catch (error) {
                        results.push({ status: 'rejected', reason: error });
                    }

                    // Wait 200ms between requests to avoid rate limiting
                    if (i < primeConfigs.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                }

                let hasFailure = false;
                await Promise.all(
                    results.map(async (result, index) => {
                        const cfg = primeConfigs[index];
                        if (result.status !== 'fulfilled') {
                            hasFailure = true;
                            return;
                        }

                        const payload = result.value.data;
                        const items = cfg.extractor
                            ? cfg.extractor(payload)
                            : extractItems(payload, cfg.entityKey || cfg.saveType);

                        if (!items.length) {
                            return;
                        }

                        await Promise.all(
                            items.map(item =>
                                offlineDB.save(cfg.saveType, item).catch(() => undefined)
                            )
                        );
                    })
                );

                if (hasFailure) {
                    primeStateRef.current = { token: null, primed: false };
                }
            } catch (error) {
                primeStateRef.current = { token: null, primed: false };
                if (import.meta.env.DEV) {
                    console.warn('Offline cache prime failed', error);
                }
            }
        };

        prime();
    }, [isOnlineState, offlineDB, authToken]);

    // Clear all offline data
    const clearOfflineData = useCallback(async () => {
        if (!offlineDB) return;

        try {
            await offlineDB.clearAll();
            setPendingChanges(0);
            toast.success('Offline data cleared');
        } catch (error) {
            if (import.meta.env.DEV) {
                console.error('Failed to clear offline data:', error);
            }
            toast.error('Failed to clear offline data');
        }
    }, [offlineDB]);

    // Save data offline
    const saveOffline = useCallback(async (type: string, data: any) => {
        if (!offlineDB) {
            throw new Error('Offline database not initialized');
        }

        try {
            await offlineDB.save(type, data);

            // Update pending count
            const pending = await offlineDB.countPendingChanges();
            setPendingChanges(pending);

            // If online, trigger sync after a delay
            if (isOnlineState) {
                if (syncTimeoutRef.current) {
                    clearTimeout(syncTimeoutRef.current);
                }
                syncTimeoutRef.current = setTimeout(() => {
                    syncNow();
                }, 5000); // Wait 5 seconds before syncing
            }
        } catch (error) {
            if (import.meta.env.DEV) {
                console.error('Failed to save offline:', error);
            }
            throw error;
        }
    }, [offlineDB, isOnlineState, syncNow]);

    // Get offline data
    const getOfflineData = useCallback(async (type: string, id?: string) => {
        if (!offlineDB) {
            throw new Error('Offline database not initialized');
        }

        return await offlineDB.get(type, id);
    }, [offlineDB]);

    const value: OfflineContextValue = {
        isOnline: isOnlineState,
        isInitialized,
        isSyncing,
        pendingChanges,
        offlineDB,
        syncNow,
        clearOfflineData,
        saveOffline,
        getOfflineData
    };

    return (
        <OfflineContext.Provider value={value}>
            {children}

            {/* Offline indicator */}
            {!isOnlineState && (
                <div className="fixed bottom-4 left-4 z-50 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
                    </svg>
                    <div>
                        <div className="font-semibold">Offline Mode</div>
                        {pendingChanges > 0 && (
                            <div className="text-xs">{pendingChanges} pending changes</div>
                        )}
                    </div>
                </div>
            )}

            {/* Sync indicator */}
            {isSyncing && (
                <div className="fixed bottom-4 right-4 z-50 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center">
                    <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Syncing...
                </div>
            )}
        </OfflineContext.Provider>
    );
};


function extractItems(payload: any, singularKey: string): any[] {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload.filter(Boolean);
    if (Array.isArray(payload.data)) return payload.data.filter(Boolean);
    if (payload.data && Array.isArray(payload.data.data)) return payload.data.data.filter(Boolean);
    if (payload[singularKey]) {
        return Array.isArray(payload[singularKey]) ? payload[singularKey] : [payload[singularKey]];
    }
    if (payload.data && payload.data[singularKey]) {
        const value = payload.data[singularKey];
        return Array.isArray(value) ? value : [value];
    }
    if (payload.data && typeof payload.data === 'object') {
        return [payload.data];
    }
    return [payload].filter(Boolean);
}

function extractTimeEntries(payload: any): any[] {
    if (!payload) return [];
    const entriesMap = new Map<string, any>();

    const pushEntry = (entry: any) => {
        if (!entry || typeof entry !== 'object') {
            return;
        }
        const key = entry.id || entry.local_id || entry.localId || createLocalId();
        if (!entriesMap.has(key)) {
            entriesMap.set(key, entry);
        }
    };

    const pushArray = (value: any) => {
        if (!value) return;
        if (Array.isArray(value)) {
            value.forEach(pushEntry);
        }
    };

    if (Array.isArray(payload)) {
        pushArray(payload);
    } else {
        pushArray(payload.data);
        pushArray(payload.data?.data);
        pushArray(payload.entries);
        if (payload.by_date) {
            Object.values(payload.by_date).forEach((list) => pushArray(list));
        }
        if (payload.by_project) {
            Object.values(payload.by_project).forEach((bucket: any) => {
                pushArray(bucket?.entries);
            });
        }
        if (payload.time_entry) {
            pushEntry(payload.time_entry);
        }
        if (payload.timer) {
            pushEntry(payload.timer);
        }
        if (payload.data && !Array.isArray(payload.data) && payload.data.id) {
            pushEntry(payload.data);
        }
    }

    if (!entriesMap.size && payload.id) {
        pushEntry(payload);
    }

    return Array.from(entriesMap.values());
}

function sanitizeQueuedPayload(payload: any) {
    if (!payload || typeof payload !== 'object') {
        return payload;
    }
    const cloned = { ...payload };
    if (typeof cloned.id === 'string' && cloned.id.startsWith('local_')) {
        delete cloned.id;
    }
    if ('__offline' in cloned) {
        delete cloned.__offline;
    }
    return cloned;
}

function extractEntityFromResponse(data: any, keys: string[]) {
    if (!data) {
        return null;
    }
    for (const key of keys) {
        if (data[key]) {
            return data[key];
        }
    }
    return data;
}
