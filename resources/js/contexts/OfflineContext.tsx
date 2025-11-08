import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { setupNetworkListeners, isOnline, requestBackgroundSync } from '../utils/serviceWorker';
import { initOfflineDB, OfflineDB } from '../utils/offlineDB';

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
    const syncTimeoutRef = useRef<NodeJS.Timeout>();

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
                    const response = await fetch('/api/time-entries', {
                        method: entry.id ? 'PUT' : 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                        },
                        body: JSON.stringify(entry.data)
                    });

                    if (response.ok) {
                        await offlineDB.markAsSynced('timeEntries', entry.localId);
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
                    const response = await fetch('/api/invoices', {
                        method: invoice.id ? 'PUT' : 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                        },
                        body: JSON.stringify(invoice.data)
                    });

                    if (response.ok) {
                        await offlineDB.markAsSynced('invoices', invoice.localId);
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
                    const response = await fetch('/api/expenses', {
                        method: expense.id ? 'PUT' : 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                        },
                        body: JSON.stringify(expense.data)
                    });

                    if (response.ok) {
                        await offlineDB.markAsSynced('expenses', expense.localId);
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