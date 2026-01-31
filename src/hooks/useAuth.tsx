import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, name: string) => Promise<void>;
    googleLogin: () => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for stored session
        const storedUser = localStorage.getItem('auth-user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error('Failed to parse stored user', e);
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        // Mock API call delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const mockUser: User = {
            id: '1',
            email,
            name: email.split('@')[0],
        };

        setUser(mockUser);
        localStorage.setItem('auth-user', JSON.stringify(mockUser));
        setIsLoading(false);
    };

    const signup = async (email: string, password: string, name: string) => {
        setIsLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const mockUser: User = {
            id: Math.random().toString(36).substr(2, 9),
            email,
            name,
        };

        setUser(mockUser);
        localStorage.setItem('auth-user', JSON.stringify(mockUser));
        setIsLoading(false);
    };

    const googleLogin = async () => {
        setIsLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 1200));

        const mockUser: User = {
            id: 'google-123',
            email: 'google.user@gmail.com',
            name: 'Google User',
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
        };

        setUser(mockUser);
        localStorage.setItem('auth-user', JSON.stringify(mockUser));
        setIsLoading(false);
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('auth-user');
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, signup, googleLogin, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
