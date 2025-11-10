import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import axios from 'axios';
import {
    ChatBubbleLeftRightIcon,
    UserIcon,
    ClockIcon,
    TrashIcon,
    PencilIcon,
    PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Comment {
    id: number;
    content: string;
    created_at: string;
    updated_at?: string;
    user: {
        id: number;
        name: string;
        email: string;
    };
    task_id: number;
}

interface TaskCommentsProps {
    taskId: number;
}

const TaskComments: React.FC<TaskCommentsProps> = ({ taskId }) => {
    const queryClient = useQueryClient();
    const [newComment, setNewComment] = useState('');
    const [editingComment, setEditingComment] = useState<number | null>(null);
    const [editContent, setEditContent] = useState('');

    // Fetch comments
    const { data: comments, isLoading } = useQuery({
        queryKey: ['task-comments', taskId],
        queryFn: async () => {
            const response = await axios.get(`/tasks/${taskId}/comments`);
            return response.data as Comment[];
        },
        enabled: !!taskId,
    });

    // Create comment mutation
    const createCommentMutation = useMutation({
        mutationFn: async (content: string) => {
            const response = await axios.post(`/tasks/${taskId}/comments`, { content });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
            setNewComment('');
            toast.success('Commentaire ajouté');
        },
        onError: () => {
            toast.error('Erreur lors de l\'ajout du commentaire');
        },
    });

    // Update comment mutation
    const updateCommentMutation = useMutation({
        mutationFn: async ({ commentId, content }: { commentId: number; content: string }) => {
            const response = await axios.put(`/tasks/${taskId}/comments/${commentId}`, { content });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
            setEditingComment(null);
            setEditContent('');
            toast.success('Commentaire mis à jour');
        },
        onError: () => {
            toast.error('Erreur lors de la mise à jour du commentaire');
        },
    });

    // Delete comment mutation
    const deleteCommentMutation = useMutation({
        mutationFn: async (commentId: number) => {
            await axios.delete(`/tasks/${taskId}/comments/${commentId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
            toast.success('Commentaire supprimé');
        },
        onError: () => {
            toast.error('Erreur lors de la suppression du commentaire');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        createCommentMutation.mutate(newComment.trim());
    };

    const handleEdit = (comment: Comment) => {
        setEditingComment(comment.id);
        setEditContent(comment.content);
    };

    const handleUpdate = (commentId: number) => {
        if (!editContent.trim()) return;

        updateCommentMutation.mutate({
            commentId,
            content: editContent.trim(),
        });
    };

    const handleDelete = (commentId: number) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer ce commentaire ?')) {
            deleteCommentMutation.mutate(commentId);
        }
    };

    const cancelEdit = () => {
        setEditingComment(null);
        setEditContent('');
    };

    const currentUserId = 1; // TODO: Get from auth context

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Add Comment Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ajouter un commentaire
                    </label>
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        placeholder="Écrivez votre commentaire ici..."
                    />
                </div>
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={!newComment.trim() || createCommentMutation.isPending}
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        <PaperAirplaneIcon className="h-4 w-4" />
                        <span>
                            {createCommentMutation.isPending ? 'Envoi...' : 'Envoyer'}
                        </span>
                    </button>
                </div>
            </form>

            {/* Comments List */}
            <div className="space-y-4">
                {comments && comments.length > 0 ? (
                    comments.map((comment) => (
                        <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-3 flex-1">
                                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                                        {comment.user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <span className="font-medium text-gray-900">
                                                {comment.user.name}
                                            </span>
                                            <span className="text-sm text-gray-500">
                                                {format(new Date(comment.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                                            </span>
                                            {comment.updated_at && comment.updated_at !== comment.created_at && (
                                                <span className="text-xs text-gray-400">(modifié)</span>
                                            )}
                                        </div>
                                        
                                        {editingComment === comment.id ? (
                                            <div className="space-y-2">
                                                <textarea
                                                    value={editContent}
                                                    onChange={(e) => setEditContent(e.target.value)}
                                                    rows={3}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                                />
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleUpdate(comment.id)}
                                                        disabled={!editContent.trim() || updateCommentMutation.isPending}
                                                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition disabled:opacity-50"
                                                    >
                                                        {updateCommentMutation.isPending ? 'Mise à jour...' : 'Mettre à jour'}
                                                    </button>
                                                    <button
                                                        onClick={cancelEdit}
                                                        className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition"
                                                    >
                                                        Annuler
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-gray-700 whitespace-pre-wrap">
                                                {comment.content}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Actions */}
                                {comment.user.id === currentUserId && editingComment !== comment.id && (
                                    <div className="flex items-center space-x-1 ml-4">
                                        <button
                                            onClick={() => handleEdit(comment)}
                                            className="p-1 text-gray-400 hover:text-gray-600 transition"
                                            title="Modifier"
                                        >
                                            <PencilIcon className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(comment.id)}
                                            className="p-1 text-gray-400 hover:text-red-600 transition"
                                            title="Supprimer"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8">
                        <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun commentaire</h3>
                        <p className="text-gray-500">
                            Soyez le premier à commenter cette tâche.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaskComments;