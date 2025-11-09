import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { MagnifyingGlassIcon, ChevronUpDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Project, PaginatedResponse } from '../types';

interface ProjectSearchSelectProps {
    value: string;
    onChange: (projectId: string) => void;
    clientId?: string;
    label?: string;
    placeholder?: string;
    required?: boolean;
    error?: string;
}

const ProjectSearchSelect: React.FC<ProjectSearchSelectProps> = ({
    value,
    onChange,
    clientId,
    label,
    placeholder = 'Rechercher un projet...',
    required = false,
    error
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch projects with search
    const { data: projectsData, isLoading } = useQuery<PaginatedResponse<Project>>({
        queryKey: ['projects', clientId, searchQuery],
        queryFn: async () => {
            const params: any = { search: searchQuery };
            if (clientId) {
                params.client_id = clientId;
            }
            const response = await axios.get('/projects', { params });
            return response.data;
        },
        enabled: !!clientId
    });

    // Fetch selected project details
    const { data: selectedProject } = useQuery<Project>({
        queryKey: ['project', value],
        queryFn: async () => {
            const response = await axios.get(`/projects/${value}`);
            return response.data;
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

    const projects = projectsData?.data || [];

    const handleSelect = (projectId: string) => {
        onChange(projectId);
        setIsOpen(false);
        setSearchQuery('');
    };

    const formatBudget = (budget?: number) => {
        if (!budget) return null;
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR'
        }).format(budget);
    };

    const displayValue = selectedProject ? selectedProject.name : '';

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
                disabled={!clientId}
                className={`w-full px-3 py-2 text-left border rounded-lg focus:ring-2 focus:outline-none transition flex items-center justify-between ${
                    !clientId
                        ? 'bg-gray-100 cursor-not-allowed'
                        : error
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
                }`}
            >
                <div className="flex-1">
                    <span className={displayValue ? 'text-gray-900' : 'text-gray-400'}>
                        {displayValue || placeholder}
                    </span>
                    {selectedProject?.budget && (
                        <div className="text-xs text-gray-500 mt-1">
                            Budget: {formatBudget(selectedProject.budget)}
                        </div>
                    )}
                </div>
                <ChevronUpDownIcon className="h-5 w-5 text-gray-400 flex-shrink-0 ml-2" />
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
                        ) : projects.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                                Aucun projet trouvé
                            </div>
                        ) : (
                            projects.map((project) => (
                                <button
                                    key={project.id}
                                    type="button"
                                    onClick={() => handleSelect(project.id.toString())}
                                    className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition flex items-center justify-between ${
                                        value === project.id.toString() ? 'bg-blue-50' : ''
                                    }`}
                                >
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900">{project.name}</div>
                                        {project.code && (
                                            <div className="text-sm text-gray-500">Code: {project.code}</div>
                                        )}
                                        <div className="flex items-center gap-2 mt-1">
                                            {project.budget && (
                                                <span className="text-xs text-blue-600 font-medium">
                                                    Budget: {formatBudget(project.budget)}
                                                </span>
                                            )}
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                project.status === 'active'
                                                    ? 'bg-green-100 text-green-700'
                                                    : project.status === 'completed'
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-gray-100 text-gray-700'
                                            }`}>
                                                {project.status}
                                            </span>
                                        </div>
                                    </div>
                                    {value === project.id.toString() && (
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

export default ProjectSearchSelect;
