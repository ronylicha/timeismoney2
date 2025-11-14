import axios from 'axios';

export type AttachmentEntityType = 'projects' | 'expenses' | 'tasks';

export interface PendingAttachmentRecord {
    id: string;
    entityType: AttachmentEntityType;
    entityId: string;
    fileName: string;
    mimeType: string;
    size: number;
    data: ArrayBuffer;
    createdAt: number;
}

const DB_NAME = 'Tim2AttachmentQueue';
const STORE_NAME = 'pendingAttachments';
const DB_VERSION = 1;

export const ATTACHMENT_QUEUE_EVENT = 'tim2-attachment-queue-changed';

function dispatchQueueEvent() {
    if (typeof window === 'undefined') {
        return;
    }
    window.dispatchEvent(new Event(ATTACHMENT_QUEUE_EVENT));
}

function openDB(): Promise<IDBDatabase> {
    if (typeof indexedDB === 'undefined') {
        return Promise.reject(new Error('IndexedDB unavailable'));
    }

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

export async function queueAttachmentUpload(params: {
    entityType: AttachmentEntityType;
    entityId: number | string;
    file: File;
}): Promise<PendingAttachmentRecord> {
    const buffer = await params.file.arrayBuffer();
    const db = await openDB();

    const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    const record: PendingAttachmentRecord = {
        id,
        entityType: params.entityType,
        entityId: String(params.entityId),
        fileName: params.file.name,
        mimeType: params.file.type || 'application/octet-stream',
        size: params.file.size,
        data: buffer,
        createdAt: Date.now(),
    };

    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.onerror = () => reject(tx.error);
        tx.oncomplete = () => resolve();
        tx.objectStore(STORE_NAME).put(record);
    });

    dispatchQueueEvent();
    return record;
}

export async function listPendingAttachmentsByEntity(
    entityType: AttachmentEntityType,
    entityId: number | string
): Promise<PendingAttachmentRecord[]> {
    const db = await openDB();
    const items = await new Promise<PendingAttachmentRecord[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        tx.onerror = () => reject(tx.error);
        const request = tx.objectStore(STORE_NAME).getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result as PendingAttachmentRecord[]);
    });

    const targetId = String(entityId);
    return items.filter(
        (item) => item.entityType === entityType && item.entityId === targetId
    );
}

export async function removePendingAttachment(id: string): Promise<void> {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.onerror = () => reject(tx.error);
        tx.oncomplete = () => resolve();
        tx.objectStore(STORE_NAME).delete(id);
    });
    dispatchQueueEvent();
}

export async function processAttachmentQueue(): Promise<void> {
    const db = await openDB();
    const items = await new Promise<PendingAttachmentRecord[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        tx.onerror = () => reject(tx.error);
        const request = tx.objectStore(STORE_NAME).getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result as PendingAttachmentRecord[]);
    });

    for (const item of items) {
        const formData = new FormData();
        formData.append(
            'file',
            new Blob([item.data], { type: item.mimeType }),
            item.fileName
        );

        const targetId = String(item.entityId);
        if (!targetId || targetId.startsWith('local_')) {
            continue;
        }

        let endpoint: string;
        if (item.entityType === 'projects') {
            endpoint = `/projects/${targetId}/attachments`;
        } else if (item.entityType === 'tasks') {
            endpoint = `/tasks/${targetId}/attachments`;
        } else {
            endpoint = `/expenses/${targetId}/attachments`;
        }

        try {
            await axios.post(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            await removePendingAttachment(item.id);
        } catch (error) {
            // Stop processing on first failure to avoid infinite loop
            break;
        }
    }
}

export async function reassignPendingAttachments(
    entityType: AttachmentEntityType,
    fromId: string | number,
    toId: string | number
): Promise<void> {
    const db = await openDB();
    const items = await new Promise<PendingAttachmentRecord[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        tx.onerror = () => reject(tx.error);
        const request = tx.objectStore(STORE_NAME).getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result as PendingAttachmentRecord[]);
    });

    const sourceId = String(fromId);
    const targetId = String(toId);
    const matches = items.filter(
        (item) => item.entityType === entityType && item.entityId === sourceId
    );

    if (!matches.length) {
        return;
    }

    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.onerror = () => reject(tx.error);
        tx.oncomplete = () => resolve();
        const store = tx.objectStore(STORE_NAME);
        matches.forEach((item) => {
            store.put({ ...item, entityId: targetId });
        });
    });

    dispatchQueueEvent();
}
