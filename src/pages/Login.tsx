import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/auth';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showForgot, setShowForgot] = useState(false);
    const [recoverySent, setRecoverySent] = useState(false);
    const [loading, setLoading] = useState(false);

    const { login, isAuthenticated, isFirstSetup, completeFirstSetup } = useAuth();
    const navigate = useNavigate();

    const [setupEmails, setSetupEmails] = useState({ email1: '', email2: '' });
    const [setupSuccess, setSetupSuccess] = useState(false);

    useEffect(() => {
        if (isAuthenticated && !isFirstSetup) {
            navigate('/');
        }
    }, [isAuthenticated, isFirstSetup, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const ok = await login(email, password);
        if (!ok) {
            setError('Credenciales incorrectas');
        }
    };

    const handleSetupSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await completeFirstSetup(setupEmails.email1, setupEmails.email2);
        setSetupSuccess(true);
        setTimeout(() => navigate('/'), 1500);
    };

    const handleRecovery = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await authApi.forgotPassword(email);
            setRecoverySent(true);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Error al enviar correo');
        } finally {
            setLoading(false);
        }
    };

    if (isAuthenticated && isFirstSetup) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <form onSubmit={handleSetupSubmit} className="bg-white/10 p-8 rounded-3xl space-y-4 w-full max-w-md">
                    <h2 className="text-white text-xl font-bold text-center">Configuración Inicial</h2>

                    <input
                        type="email"
                        required
                        placeholder="Correo principal"
                        value={setupEmails.email1}
                        onChange={e => setSetupEmails({ ...setupEmails, email1: e.target.value })}
                        className="w-full p-3 rounded bg-white/10 text-white"
                    />

                    <input
                        type="email"
                        required
                        placeholder="Correo alternativo"
                        value={setupEmails.email2}
                        onChange={e => setSetupEmails({ ...setupEmails, email2: e.target.value })}
                        className="w-full p-3 rounded bg-white/10 text-white"
                    />

                    <button className="w-full bg-blue-600 py-3 rounded text-white font-bold">
                        Guardar
                    </button>

                    {setupSuccess && (
                        <p className="text-green-400 text-center">Configuración guardada</p>
                    )}
                </form>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
            <div className="bg-white/10 p-8 rounded-3xl w-full max-w-md space-y-6">
                <h1 className="text-white text-2xl font-bold text-center">Gestión PQR</h1>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="email"
                        required
                        placeholder="Correo"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full p-3 rounded bg-white/10 text-white"
                    />

                    <input
                        type="password"
                        required
                        placeholder="Contraseña"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full p-3 rounded bg-white/10 text-white"
                    />

                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                    <button className="w-full bg-blue-600 py-3 rounded text-white font-bold">
                        Ingresar
                    </button>
                </form>

                <button
                    onClick={() => setShowForgot(!showForgot)}
                    className="text-sm text-blue-300 block mx-auto"
                >
                    ¿Olvidaste tu contraseña?
                </button>

                {showForgot && (
                    <form onSubmit={handleRecovery} className="space-y-3">
                        <input
                            type="email"
                            required
                            placeholder="Correo de recuperación"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full p-3 rounded bg-white/10 text-white"
                        />

                        <button className="w-full bg-blue-600 py-2 rounded text-white">
                            {loading ? 'Enviando...' : 'Enviar enlace'}
                        </button>

                        {recoverySent && (
                            <p className="text-green-400 text-center">Correo enviado</p>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
}
