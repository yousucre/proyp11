import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth';

interface AuthContextType {
    isAuthenticated: boolean;
    isFirstSetup: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    completeFirstSetup: (email1: string, email2: string) => Promise<void>;
    resetPassword: (token: string, newPassword: string) => Promise<void>;
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
                    alert('Su sesión ha expirado por inactividad.');
                }, 30 * 60 * 1000);
            }
        };

        const events = ['mousemove', 'keydown', 'click', 'scroll'];

        if (isAuthenticated) {
            resetTimer();
            events.forEach(event => window.addEventListener(event, resetTimer));
        }

        return () => {
            clearTimeout(inactivityTimer);
            events.forEach(event => window.removeEventListener(event, resetTimer));
        };
    }, [isAuthenticated]);

    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            const data = await authApi.login(email, password);

            if (data.token) {
                localStorage.setItem('token', data.token);
                setIsAuthenticated(true);
                setIsFirstSetup(false);
                return true;
            }

            if (data.firstSetup) {
                setIsAuthenticated(true);
                setIsFirstSetup(true);
                return true;
            }

            return false;
        } catch (error) {
            console.error(error);
            return false;
        }
    };

    const logout = () => {
        setIsAuthenticated(false);
        setIsFirstSetup(false);
        localStorage.removeItem('token');
    };

    const completeFirstSetup = async (email1: string, email2: string): Promise<void> => {
        await authApi.setup({ email1, email2 });
        setIsFirstSetup(false);
    };

    const resetPassword = async (
        token: string,
        newPassword: string
    ): Promise<void> => {
        await authApi.resetPassword(token, newPassword);
    };

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                isFirstSetup,
                login,
                logout,
                completeFirstSetup,
                resetPassword
            }}
        >
            {children}
        </AuthContext.Provider>
    );

};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe usarse dentro de AuthProvider');
    }
    return context;
};
