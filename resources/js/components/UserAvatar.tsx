import React from 'react';
import { UserCircleIcon } from '@heroicons/react/24/outline';

interface UserAvatarProps {
    avatar?: string | null;
    name?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

const sizeClasses = {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-24 w-24'
};

const iconSizeClasses = {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-20 w-20'
};

const UserAvatar: React.FC<UserAvatarProps> = ({
    avatar,
    name,
    size = 'md',
    className = ''
}) => {
    const avatarUrl = avatar ? `/storage/${avatar}` : null;

    if (avatarUrl) {
        return (
            <img
                src={avatarUrl}
                alt={name || 'User avatar'}
                className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
            />
        );
    }

    return (
        <UserCircleIcon className={`${iconSizeClasses[size]} text-gray-400 ${className}`} />
    );
};

export default UserAvatar;
