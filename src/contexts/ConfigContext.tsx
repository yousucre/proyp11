import React, { createContext, useContext, useState, useEffect } from 'react';
import { configApi } from '../api/config';
import { bufferToBlob } from '../utils/fileUtils';
import { useAuth } from './AuthContext';

interface ConfigContextType {
    config: any;
    logoUrl: string | null;
    refreshConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<any>(null);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const { isAuthenticated } = useAuth();

    const loadConfig = async () => {
        if (!isAuthenticated) return;
        try {
            const data = await configApi.getSystemConfig();
            setConfig(data);
            if (data?.entidad_logo) {
                const blob = bufferToBlob(data.entidad_logo, 'image/png');
                if (blob) {
                    if (logoUrl) URL.revokeObjectURL(logoUrl);
                    setLogoUrl(URL.createObjectURL(blob));
                }
            } else {
                setLogoUrl(null);
            }
        } catch (error) {
            console.error('Error loading config in context:', error);
        }
    };

    useEffect(() => {
        loadConfig();
    }, [isAuthenticated]);

    return (
        <ConfigContext.Provider value={{ config, logoUrl, refreshConfig: loadConfig }}>
            {children}
        </ConfigContext.Provider>
    );
};

export const useConfig = () => {
    const context = useContext(ConfigContext);
    if (context === undefined) {
        throw new Error('useConfig must be used within a ConfigProvider');
    }
    return context;
};
