import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import axios from 'axios';
import {
    PaperClipIcon,
    CloudArrowUpIcon,
    EyeIcon,
    ArrowDownTrayIcon,
    TrashIcon,
    DocumentIcon,
    PhotoIcon,
    VideoCameraIcon,
    MusicalNoteIcon,
    ArchiveBoxIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';

interface Attachment {
    id: number;
    filename: string;
    original_name: string;
    mime_type: string;
    size: number;
    url: string;
    created_at: string;
    user: {
        id: number;
        name: string;
    };
}

interface TaskAttachmentsProps {
    taskId: number;
}

const TaskAttachments: React.FC<TaskAttachmentsProps> = ({ taskId }) => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Fetch attachments
    const { data: attachments, isLoading } = useQuery({
        queryKey: ['task-attachments', taskId],
        queryFn: async () => {
            const response = await axios.get(`/tasks/${taskId}/attachments`);
            return response.data as Attachment[];
        },
        enabled: !!taskId,
    });

    // Upload attachment mutation
    const uploadAttachmentMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('task_id', taskId.toString());

            const response = await axios.post(`/tasks/${taskId}/attachments`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task-attachments', taskId] });
            toast.success('Fichier ajouté avec succès');
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Erreur lors de l\'upload du fichier';
            toast.error(message);
        },
    });

    // Delete attachment mutation
    const deleteAttachmentMutation = useMutation({
        mutationFn: async (attachmentId: number) => {
            await axios.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task-attachments', taskId] });
            toast.success('Fichier supprimé avec succès');
        },
        onError: () => {
            toast.error('Erreur lors de la suppression du fichier');
        },
    });

    const handleFileSelect = (files: FileList | null) => {
        if (!files || files.length === 0) return;

        Array.from(files).forEach((file) => {
            // Check file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                toast.error(`Le fichier ${file.name} est trop volumineux (max 10MB)`);
                return;
            }

            uploadAttachmentMutation.mutate(file);
        });
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileSelect(e.dataTransfer.files);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFileSelect(e.target.files);
    };

    const handleDelete = (attachmentId: number) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer ce fichier ?')) {
            deleteAttachmentMutation.mutate(attachmentId);
        }
    };

    const getFileIcon = (mimeType: string) => {
        if (mimeType.startsWith('image/')) {
            return PhotoIcon;
        } else if (mimeType.startsWith('video/')) {
            return VideoCameraIcon;
        } else if (mimeType.startsWith('audio/')) {
            return MusicalNoteIcon;
        } else if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) {
            return DocumentIcon;
        } else {
            return ArchiveBoxIcon;
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const isImage = (mimeType: string) => mimeType.startsWith('image/');

    const currentUserId = user?.id ?? null;

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Upload Area */}
            <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDragging
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                    <label htmlFor="file-upload" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-gray-900">
                            Glissez-déposez des fichiers ici, ou
                        </span>
                        <span className="mt-1 block text-sm text-blue-600 hover:text-blue-500">
                            cliquez pour parcourir
                        </span>
                        <input
                            id="file-upload"
                            ref={fileInputRef}
                            type="file"
                            className="sr-only"
                            multiple
                            onChange={handleFileInput}
                            disabled={uploadAttachmentMutation.isPending}
                        />
                    </label>
                    <p className="mt-1 text-xs text-gray-500">
                        PNG, JPG, PDF, DOC jusqu'à 10MB
                    </p>
                </div>
            </div>

            {/* Attachments List */}
            <div className="space-y-4">
                {attachments && attachments.length > 0 ? (
                    attachments.map((attachment) => {
                        const Icon = getFileIcon(attachment.mime_type);
                        return (
                            <div
                                key={attachment.id}
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                            >
                                <div className="flex items-center space-x-3 flex-1">
                                    <Icon className="h-8 w-8 text-gray-400 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {attachment.original_name}
                                        </p>
                                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                                            <span>{formatFileSize(attachment.size)}</span>
                                            <span>•</span>
                                            <span>
                                                {format(new Date(attachment.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                                            </span>
                                            <span>•</span>
                                            <span>{attachment.user.name}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    {/* Preview button for images */}
                                    {isImage(attachment.mime_type) && (
                                        <button
                                            onClick={() => window.open(attachment.url, '_blank')}
                                            className="p-2 text-gray-400 hover:text-gray-600 transition"
                                            title="Aperçu"
                                        >
                                            <EyeIcon className="h-4 w-4" />
                                        </button>
                                    )}

                                    {/* Download button */}
                                    <a
                                        href={attachment.url}
                                        download={attachment.original_name}
                                        className="p-2 text-gray-400 hover:text-gray-600 transition"
                                        title="Télécharger"
                                    >
                                        <ArrowDownTrayIcon className="h-4 w-4" />
                                    </a>

                                    {/* Delete button */}
                                    {attachment.user.id === currentUserId && (
                                        <button
                                            onClick={() => handleDelete(attachment.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 transition"
                                            title="Supprimer"
                                            disabled={deleteAttachmentMutation.isPending}
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-8">
                        <PaperClipIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune pièce jointe</h3>
                        <p className="text-gray-500">
                            Ajoutez des fichiers pour les associer à cette tâche.
                        </p>
                    </div>
                )}
            </div>

            {/* Upload Progress */}
            {uploadAttachmentMutation.isPending && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <span className="text-sm text-blue-700">Upload en cours...</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskAttachments;
