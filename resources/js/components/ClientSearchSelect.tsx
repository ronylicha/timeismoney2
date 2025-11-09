import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { MagnifyingGlassIcon, ChevronUpDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Client, PaginatedResponse } from '../types';

interface ClientSearchSelectProps {
    value: string;
    onChange: (clientId: string) => void;
    label?: string;
    placeholder?: string;
    required?: boolean;
    error?: string;
}

const ClientSearchSelect: React.FC<ClientSearchSelectProps> = ({
    value,
    onChange,
    label,
    placeholder = 'Rechercher un client...',
    required = false,
    error
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch clients with search
    const { data: clientsData, isLoading } = useQuery<PaginatedResponse<Client>>({
        queryKey: ['clients', searchQuery],
        queryFn: async () => {
            const response = await axios.get('/clients', {
                params: { search: searchQuery }
            });
            return response.data;
        }
    });

    // Fetch selected client details
    const { data: selectedClient } = useQuery<Client>({
        queryKey: ['client', value],
        queryFn: async () => {
            const response = await axios.get(`/clients/${value}`);
            return response.data.data;
        },
        enabled: !!value && value !== ''
    });

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const clients = clientsData?.data || [];

    const handleSelect = (clientId: string) => {
        onChange(clientId);
        setIsOpen(false);
        setSearchQuery('');
    };

    const displayValue = selectedClient
        ? `${selectedClient.name}${selectedClient.company_name ? ` (${selectedClient.company_name})` : ''}`
        : '';

    return (
        <div className="relative" ref={dropdownRef}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}

            {/* Selected value display / trigger */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-3 py-2 text-left border rounded-lg focus:ring-2 focus:outline-none transition flex items-center justify-between ${
                    error
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
                }`}
            >
                <span className={displayValue ? 'text-gray-900' : 'text-gray-400'}>
                    {displayValue || placeholder}
                </span>
                <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
            </button>

            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-hidden">
                    {/* Search input */}
                    <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Rechercher..."
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Options list */}
                    <div className="max-h-80 overflow-y-auto">
                        {isLoading ? (
                            <div className="p-4 text-center text-gray-500">
                                Chargement...
                            </div>
                        ) : clients.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                                Aucun client trouvé
                            </div>
                        ) : (
                            clients.map((client) => (
                                <button
                                    key={client.id}
                                    type="button"
                                    onClick={() => handleSelect(client.id.toString())}
                                    className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition flex items-center justify-between ${
                                        value === client.id.toString() ? 'bg-blue-50' : ''
                                    }`}
                                >
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900">{client.name}</div>
                                        {client.company_name && (
                                            <div className="text-sm text-gray-500">{client.company_name}</div>
                                        )}
                                        {client.email && (
                                            <div className="text-xs text-gray-400">{client.email}</div>
                                        )}
                                    </div>
                                    {value === client.id.toString() && (
                                        <CheckIcon className="h-5 w-5 text-blue-600 flex-shrink-0 ml-2" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientSearchSelect;
