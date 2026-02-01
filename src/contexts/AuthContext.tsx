import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth';
// Keep db import if you need it for other things temporarily or remove if fully migrating auth
// import { db } from '../db/database'; 

interface AuthContextType {
    isAuthenticated: boolean;
    isFirstSetup: boolean;
    login: (password: string) => Promise<boolean>;
    logout: () => void;
    // remote setup might be different, but keeping signature for now or adapting
    completeFirstSetup: (email1: string, email2: string) => Promise<void>;
    resetPassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
        return !!localStorage.getItem('token');
    });
    const [isFirstSetup, setIsFirstSetup] = useState<boolean>(false);

    useEffect(() => {
        let inactivityTimer: ReturnType<typeof setTimeout>;

        const resetTimer = () => {
            if (isAuthenticated) {
                clearTimeout(inactivityTimer);
                inactivityTimer = setTimeout(() => {
                    logout();
                    alert("Su sesión ha expirado por inactividad.");
                }, 30 * 60 * 1000); // 30 minutes
            }
        };

        const events = ['mousemove', 'keydown', 'click', 'scroll'];

        if (isAuthenticated) {
            resetTimer(); // Start timer
            events.forEach(event => window.addEventListener(event, resetTimer));
        }

        return () => {
            clearTimeout(inactivityTimer);
            events.forEach(event => window.removeEventListener(event, resetTimer));
        };
    }, [isAuthenticated]);

    const login = async (password: string) => {
        try {
            const data = await authApi.login(password);
            if (data.token) {
                localStorage.setItem('token', data.token);
                setIsAuthenticated(true);
                return true;
            } else if (data.firstSetup) {
                setIsFirstSetup(true);
                return false;
            }
            return false;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    const logout = () => {
        setIsAuthenticated(false);
        localStorage.removeItem('token');
    };

    const completeFirstSetup = async (_email1: string, _email2: string) => {
        // This likely needs password passed in or handled differently in new flow.
        // The current frontend might call this after prompting user.
        // We might need to change the signature of this function or how it's called.
        // For now, simple console log or throw to indicate it needs refactor in UI
        console.warn('Frontend needs refactor to pass password for setup');
    };

    const resetPassword = async (_newPassword: string) => {
        // Implement API call change password if authenticated
    };

    return (
        <AuthContext.Provider value={{
            isAuthenticated,
            isFirstSetup,
            login,
            logout,
            completeFirstSetup,
            resetPassword
        }}>
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
