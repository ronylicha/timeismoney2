import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { PlusIcon, UserGroupIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

interface TeamMember {
    id: number;
    name: string;
    email: string;
    role: string;
    avatar?: string;
}

const TeamManagement: React.FC = () => {
    const [showInviteModal, setShowInviteModal] = useState(false);

    const { data: team, isLoading } = useQuery({
        queryKey: ['team'],
        queryFn: async () => {
            const response = await axios.get('/team');
            return response.data.data;
        },
    });

    const getRoleBadge = (role: string) => {
        const colors = {
            admin: 'bg-purple-100 text-purple-800',
            manager: 'bg-blue-100 text-blue-800',
            member: 'bg-gray-100 text-gray-800',
        };

        const labels = {
            admin: 'Administrateur',
            manager: 'Manager',
            member: 'Membre',
        };

        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
                {labels[role as keyof typeof labels] || role}
            </span>
        );
    };

    return (
        <div className="p-6">
            <div className="mb-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Équipe</h1>
                        <p className="mt-2 text-gray-600">Gérez les membres de votre équipe</p>
                    </div>
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                        <PlusIcon className="h-5 w-5" />
                        <span>Inviter un membre</span>
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Chargement...</p>
                </div>
            ) : team?.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <UserGroupIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun membre</h3>
                    <p className="text-gray-600 mb-6">Invitez votre premier membre d'équipe</p>
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                        <PlusIcon className="h-5 w-5" />
                        <span>Inviter un membre</span>
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {team?.map((member: TeamMember) => (
                        <div
                            key={member.id}
                            className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center">
                                        <span className="text-lg font-semibold text-gray-600">
                                            {member.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{member.name}</h3>
                                        {getRoleBadge(member.role)}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                    <EnvelopeIcon className="h-4 w-4" />
                                    <span className="truncate">{member.email}</span>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end space-x-2">
                                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                                    Modifier
                                </button>
                                <button className="text-sm text-red-600 hover:text-red-700 font-medium">
                                    Retirer
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Inviter un membre</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="membre@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Rôle
                                </label>
                                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                    <option value="member">Membre</option>
                                    <option value="manager">Manager</option>
                                    <option value="admin">Administrateur</option>
                                </select>
                            </div>

                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    onClick={() => setShowInviteModal(false)}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                                >
                                    Annuler
                                </button>
                                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                                    Envoyer l'invitation
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamManagement;
