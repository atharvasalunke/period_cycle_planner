import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { BACKEND_BASE_URL } from '@/lib/backend';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, firstName: string, lastName: string, dateOfBirth: string) => Promise<void>;
    googleLogin: () => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('auth-token');
            const urlParams = new URLSearchParams(window.location.search);
            const tokenFromUrl = urlParams.get('token');

            const activeToken = tokenFromUrl || token;

            if (activeToken) {
                if (tokenFromUrl) {
                    localStorage.setItem('auth-token', tokenFromUrl);
                    // Clean up URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                }

                try {
                    const response = await fetch(`${BACKEND_BASE_URL}/auth/me`, {
                        headers: {
                            'Authorization': `Bearer ${activeToken}`
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        setUser(data.user);

                        // If we're on the login page and just got a token from URL (Google Login)
                        if (tokenFromUrl && window.location.pathname === '/login') {
                            navigate('/', { replace: true });
                        }
                    } else {
                        localStorage.removeItem('auth-token');
                    }
                } catch (error) {
                    console.error('Failed to verify session', error);
                }
            }
            setIsLoading(false);
        };

        initAuth();
    }, [navigate]);

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${BACKEND_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            setUser(data.user);
            localStorage.setItem('auth-token', data.token);
            navigate('/', { replace: true });
        } catch (error: any) {
            toast.error(error.message);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const signup = async (email: string, password: string, firstName: string, lastName: string, dateOfBirth: string) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${BACKEND_BASE_URL}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, firstName, lastName, dateOfBirth }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Signup failed');
            }

            setUser(data.user);
            localStorage.setItem('auth-token', data.token);
            navigate('/', { replace: true });
        } catch (error: any) {
            toast.error(error.message);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const googleLogin = () => {
        // Start Google OAuth flow via backend redirect
        window.location.href = `${BACKEND_BASE_URL}/auth/google/start`;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('auth-token');
        navigate('/login', { replace: true });
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
