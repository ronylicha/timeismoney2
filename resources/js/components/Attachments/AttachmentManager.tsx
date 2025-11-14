import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { PaperClipIcon, ArrowUpTrayIcon, TrashIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import {
    ATTACHMENT_QUEUE_EVENT,
    queueAttachmentUpload,
    listPendingAttachmentsByEntity,
    removePendingAttachment,
    processAttachmentQueue,
    PendingAttachmentRecord,
    AttachmentEntityType,
} from '@/utils/offlineAttachments';
import { useAuth } from '@/contexts/AuthContext';

interface Attachment {
    id: number;
    original_filename: string;
    mime_type: string;
    size: number;
    created_at: string;
    user?: {
        id: number;
        name: string;
        email?: string;
    };
    url?: string;
}

interface AttachmentManagerProps {
    entityType: AttachmentEntityType;
    entityId: number | string;
}

const AttachmentManager: React.FC<AttachmentManagerProps> = ({ entityType, entityId }) => {
    const { t } = useTranslation();
    const isOnline = useOnlineStatus();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [queuedAttachments, setQueuedAttachments] = useState<PendingAttachmentRecord[]>([]);
    const entityKey = entityId?.toString() ?? '';
    const isTemporaryEntity = entityKey.startsWith('local_');

    const endpointBase =
        entityType === 'projects'
            ? `/projects/${entityKey}/attachments`
            : `/expenses/${entityKey}/attachments`;

    const { data: attachments, isLoading } = useQuery<Attachment[]>({
        queryKey: ['attachments', entityType, entityKey],
        queryFn: async () => {
            const response = await axios.get(endpointBase);
            return response.data;
        },
        enabled: !!entityKey && !isTemporaryEntity,
    });

    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            await axios.post(endpointBase, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attachments', entityType, entityId] });
            toast.success(t('attachments.uploadSuccess') || 'Pièce jointe ajoutée');
        },
        onError: () => {
            toast.error(t('attachments.uploadError') || 'Impossible d’ajouter la pièce jointe');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (attachmentId: number) => {
            await axios.delete(`${endpointBase}/${attachmentId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attachments', entityType, entityId] });
            toast.success(t('attachments.deleteSuccess') || 'Pièce jointe supprimée');
        },
        onError: () => {
            toast.error(t('attachments.deleteError') || 'Impossible de supprimer la pièce jointe');
        },
    });

    const refreshQueued = useCallback(async () => {
        try {
            const queued = await listPendingAttachmentsByEntity(entityType, entityKey);
            setQueuedAttachments(queued);
        } catch (error) {
            if (import.meta.env.DEV) {
                console.warn('Failed to load queued attachments', error);
            }
        }
    }, [entityType, entityKey]);

    useEffect(() => {
        refreshQueued();
    }, [refreshQueued]);

    useEffect(() => {
        const handler = () => {
            refreshQueued();
            if (isOnline) {
                queryClient.invalidateQueries({ queryKey: ['attachments', entityType, entityKey] });
            }
        };
        if (typeof window !== 'undefined') {
            window.addEventListener(ATTACHMENT_QUEUE_EVENT, handler);
        }
        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener(ATTACHMENT_QUEUE_EVENT, handler);
            }
        };
    }, [entityType, entityId, isOnline, queryClient, refreshQueued]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!isOnline) {
            await queueAttachmentUpload({
                entityType,
                entityId: numericId,
                file,
            });
            toast.success(
                t('attachments.queueSuccess') ||
                    'Pièce jointe enregistrée hors ligne. Elle sera synchronisée automatiquement.'
            );
            event.target.value = '';
            return;
        }

        uploadMutation.mutate(file);
        event.target.value = '';
    };

    const handleDeleteAttachment = (attachmentId: number) => {
        deleteMutation.mutate(attachmentId);
    };

    const handleRemoveQueued = async (attachmentId: string) => {
        await removePendingAttachment(attachmentId);
        toast.info(t('attachments.queuedRemoved') || 'Pièce jointe retirée de la file d’attente.');
    };

    const handleRetryQueued = async () => {
        if (isTemporaryEntity) {
            toast.info(
                t('attachments.pendingEntityInfoShort') ||
                    'Synchronisez la ressource avant d’envoyer les pièces jointes.'
            );
            return;
        }
        if (!isOnline) {
            toast.info(
                t('attachments.retryOffline') ||
                    'Reconnectez-vous pour lancer la synchronisation des pièces jointes.'
            );
            return;
        }
        await processAttachmentQueue();
    };

    const attachmentList = isTemporaryEntity ? [] : attachments || [];

    const queuedDisplay = useMemo(
        () => queuedAttachments.sort((a, b) => b.createdAt - a.createdAt),
        [queuedAttachments]
    );

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                    <PaperClipIcon className="h-5 w-5 text-gray-500" />
                    <span>{t('attachments.title') || 'Pièces jointes'}</span>
                </h3>
                <label className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition">
                    <ArrowUpTrayIcon className="h-5 w-5" />
                    <span>{t('attachments.upload') || 'Ajouter un fichier'}</span>
                    <input
                        type="file"
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={uploadMutation.isPending && isOnline}
                    />
                </label>
            </div>

            {!isOnline && (
                <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 border border-amber-200">
                    {t('attachments.offlineInfo') ||
                        'Mode hors ligne : vos fichiers seront synchronisés automatiquement dès que la connexion revient.'}
                </div>
            )}

            {isTemporaryEntity && (
                <div className="mb-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800 border border-blue-200">
                    {t('attachments.pendingEntityInfo') ||
                        'Cette ressource n’est pas encore synchronisée. Les pièces jointes resteront en attente jusqu’à l’obtention d’un identifiant final.'}
                </div>
            )}

            {queuedDisplay.length > 0 && (
                <div className="mb-6 rounded-lg border border-dashed border-amber-300 bg-amber-50/60 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-amber-900">
                            {t('attachments.queued') ||
                                'Pièces jointes en attente de synchronisation'}
                        </p>
                        {isOnline && (
                            <button
                                onClick={handleRetryQueued}
                                className="text-sm text-amber-700 hover:text-amber-900 underline"
                            >
                                {t('attachments.retrySync') || 'Synchroniser maintenant'}
                            </button>
                        )}
                    </div>
                    <ul className="space-y-2">
                        {queuedDisplay.map((item) => (
                            <li
                                key={item.id}
                                className="flex items-center justify-between rounded bg-white px-3 py-2 text-sm shadow-sm"
                            >
                                <div>
                                    <p className="font-medium text-gray-900">{item.fileName}</p>
                                    <p className="text-xs text-gray-500">
                                        {(item.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleRemoveQueued(item.id)}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="space-y-3">
                {isLoading ? (
                    <div className="text-sm text-gray-500">{t('common.loading')}</div>
                ) : attachmentList.length === 0 ? (
                    <div className="text-sm text-gray-500">
                        {t('attachments.empty') || 'Aucune pièce jointe pour le moment.'}
                    </div>
                ) : (
                    attachmentList.map((attachment) => (
                        <div
                            key={attachment.id}
                            className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
                        >
                            <div>
                                <p className="font-medium text-gray-900">
                                    {attachment.original_filename}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {(attachment.size / 1024 / 1024).toFixed(2)} MB •{' '}
                                    {new Date(attachment.created_at).toLocaleString()}
                                </p>
                                {attachment.user && (
                                    <p className="text-xs text-gray-400">
                                        {attachment.user.name}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center space-x-3">
                                {attachment.url && (
                                    <a
                                        href={attachment.url}
                                        className="text-blue-600 hover:text-blue-800 text-sm"
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        {t('attachments.download') || 'Télécharger'}
                                    </a>
                                )}
                                {attachment.user?.id === user?.id && (
                                    <button
                                        onClick={() => handleDeleteAttachment(attachment.id)}
                                        className="text-red-500 hover:text-red-700"
                                        title={t('attachments.delete') || 'Supprimer'}
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AttachmentManager;
