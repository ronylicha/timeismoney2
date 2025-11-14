import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User, LoginCredentials, RegisterData } from '../types';
import { toast } from 'react-toastify';
import { syncServiceWorkerAuthToken } from '../utils/serviceWorker';

interface AuthContextValue {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => Promise<void>;
    updateUser: (user: User) => void;
    checkAuth: () => Promise<void>;
    verify2FA: (code: string) => Promise<void>;
    setup2FA: () => Promise<{ qrCode: string; secret: string }>;
    disable2FA: (password: string) => Promise<void>;
    getRecoveryCodes: () => Promise<string[]>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    const checkAuth = useCallback(async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('auth_token');

            if (!token) {
                setUser(null);
                setIsLoading(false);
                return;
            }

            const response = await axios.get('/user');
            setUser(response.data);
        } catch (error: any) {
            localStorage.removeItem('auth_token');
            syncServiceWorkerAuthToken(null);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Check if user is authenticated on mount
    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const login = useCallback(async (credentials: LoginCredentials) => {
        try {
            setIsLoading(true);

            // No need for CSRF token since we're using Bearer tokens
            const response = await axios.post('/login', credentials);
            const { user, token, requires_2fa } = response.data;

            if (requires_2fa) {
                // Store temp token and redirect to 2FA
                localStorage.setItem('2fa_token', token);
                navigate('/2fa');
                return;
            }

            localStorage.setItem('auth_token', token);
            syncServiceWorkerAuthToken(token);
            setUser(user);

            toast.success('Successfully logged in!');
            navigate('/dashboard');
        } catch (error: any) {
            console.error('Login error:', error);
            const message = error.response?.data?.message || 'Login failed';
            toast.error(message);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [navigate]);

    const verify2FA = useCallback(async (code: string) => {
        try {
            setIsLoading(true);
            const tempToken = localStorage.getItem('2fa_token');

            if (!tempToken) {
                throw new Error('No 2FA session found');
            }

            const response = await axios.post('/2fa/verify', {
                code,
                token: tempToken,
            });

            const { user, token } = response.data;

            localStorage.removeItem('2fa_token');
            localStorage.setItem('auth_token', token);
            syncServiceWorkerAuthToken(token);
            setUser(user);

            toast.success('2FA verification successful!');
            navigate('/dashboard');
        } catch (error: any) {
            const message = error.response?.data?.message || '2FA verification failed';
            toast.error(message);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [navigate]);

    const register = useCallback(async (data: RegisterData) => {
        try {
            setIsLoading(true);

            // No need for CSRF token since we're using Bearer tokens
            const response = await axios.post('/register', data);
            const { user, token } = response.data;

            localStorage.setItem('auth_token', token);
            syncServiceWorkerAuthToken(token);
            setUser(user);

            toast.success('Registration successful! Welcome to TimeIsMoney!');
            navigate('/dashboard');
        } catch (error: any) {
            const message = error.response?.data?.message || 'Registration failed';
            const errors = error.response?.data?.errors;

            if (errors) {
                // Show validation errors
                Object.values(errors).flat().forEach((err: any) => {
                    toast.error(err);
                });
            } else {
                toast.error(message);
            }
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [navigate]);

    const logout = useCallback(async () => {
        try {
            setIsLoading(true);
            await axios.post('/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('auth_token');
            syncServiceWorkerAuthToken(null);
            localStorage.removeItem('user');
            setUser(null);
            setIsLoading(false);
            navigate('/login');
            toast.success('Successfully logged out');
        }
    }, [navigate]);

    const updateUser = useCallback((updatedUser: User) => {
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
    }, []);

    const setup2FA = useCallback(async () => {
        try {
            const response = await axios.post('/2fa/setup');
            return response.data;
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to setup 2FA';
            toast.error(message);
            throw error;
        }
    }, []);

    const disable2FA = useCallback(async (password: string) => {
        try {
            await axios.post('/2fa/disable', { password });

            // Refresh user data
            const response = await axios.get('/user');
            setUser(response.data);

            toast.success('2FA has been disabled');
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to disable 2FA';
            toast.error(message);
            throw error;
        }
    }, []);

    const getRecoveryCodes = useCallback(async () => {
        try {
            const response = await axios.get('/2fa/recovery-codes');
            return response.data.codes;
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to get recovery codes';
            toast.error(message);
            throw error;
        }
    }, []);

    const value: AuthContextValue = {
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateUser,
        checkAuth,
        verify2FA,
        setup2FA,
        disable2FA,
        getRecoveryCodes,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
