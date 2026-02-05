import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ShieldCheck, Mail, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../db/database';
import { authApi } from '../api/auth';

export default function Login() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login, isAuthenticated, isFirstSetup, completeFirstSetup } = useAuth();
    const navigate = useNavigate();
    const [showForgot, setShowForgot] = useState(false);
    const [email, setEmail] = useState('');
    const [recoverySent, setRecoverySent] = useState(false);

    // Recovery emails state
    const [recoveryEmails, setRecoveryEmails] = useState<{ email1?: string, email2?: string } | null>(null);
    const [selectedRecoveryEmail, setSelectedRecoveryEmail] = useState('');

    // First time setup state
    const [setupEmails, setSetupEmails] = useState({ email1: '', email2: '' });
    const [setupSuccess, setSetupSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isAuthenticated && !isFirstSetup) {
            navigate('/');
        }
    }, [isAuthenticated, isFirstSetup, navigate]);

    useEffect(() => {
        const loadRecoveryInfo = async () => {
            const config = await db.getConfig();
            if (config) {
                setRecoveryEmails({
                    email1: config.recovery_email_1,
                    email2: config.recovery_email_2
                });
            }
        };
        loadRecoveryInfo();
    }, [showForgot]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (await login(email, password)) {
            // Success! The useEffect will handle navigation if not first setup
        } else {
            setError('Contraseña incorrecta. Por favor intente de nuevo.');
        }
    };

    const handleSetupSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (setupEmails.email1 && setupEmails.email2) {
            await completeFirstSetup(setupEmails.email1, setupEmails.email2);
            setSetupSuccess(true);
            setTimeout(() => {
                navigate('/');
            }, 2000);
        }
    };

    const handleRecovery = async (e: React.FormEvent) => {
        e.preventDefault();
        const targetEmail = selectedRecoveryEmail || email;
        if (!targetEmail) return;

        setLoading(true);
        try {
            await authApi.forgotPassword(targetEmail);
            setRecoverySent(true);
            setTimeout(() => {
                setRecoverySent(false);
                setShowForgot(false);
                setEmail('');
                setSelectedRecoveryEmail('');
            }, 5000);
        } catch (err: any) {
            console.error(err);
            alert('Error al enviar el correo: ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    if (isAuthenticated && isFirstSetup) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
                <div className="max-w-md w-full bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-2xl space-y-8">
                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-green-600 mb-4 shadow-lg shadow-green-500/50">
                            <CheckCircle2 size={48} className="text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Configuración Inicial</h2>
                        <p className="text-blue-200/60 font-medium">Por seguridad, registra dos correos electrónicos para recuperar tu contraseña.</p>
                    </div>

                    {setupSuccess ? (
                        <div className="bg-green-500/20 border border-green-500/30 p-6 rounded-2xl text-center">
                            <p className="text-green-400 font-bold">¡Configuración guardada!</p>
                            <p className="text-sm text-green-400/60 mt-2">Redirigiendo al panel principal...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSetupSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-blue-300/60 ml-1">CORREO ELECTRÓNICO 1 (Principal)</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-blue-300/40 group-focus-within:text-blue-400">
                                            <Mail size={20} />
                                        </div>
                                        <input
                                            type="email"
                                            required
                                            value={setupEmails.email1}
                                            onChange={(e) => setSetupEmails({ ...setupEmails, email1: e.target.value })}
                                            placeholder="ejemplo@correo.com"
                                            className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:bg-white/10"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-blue-300/60 ml-1">CORREO ELECTRÓNICO 2 (Alternativo)</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-blue-300/40 group-focus-within:text-blue-400">
                                            <Mail size={20} />
                                        </div>
                                        <input
                                            type="email"
                                            required
                                            value={setupEmails.email2}
                                            onChange={(e) => setSetupEmails({ ...setupEmails, email2: e.target.value })}
                                            placeholder="alternativo@correo.com"
                                            className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:bg-white/10"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-600/30"
                            >
                                Finalizar Configuración
                            </button>
                        </form>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
            <div className="max-w-md w-full">
                <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-2xl space-y-8">
                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-500/50">
                            <ShieldCheck size={48} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Gestión PQR</h1>
                        <p className="text-blue-200/60 font-medium">Panel de Control Administrativo</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-blue-300/40 group-focus-within:text-blue-400">
                                    <User size={20} />
                                </div>
                                <input
                                    type="text"
                                    required
                                    placeholder="Usuario o Correo"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:bg-white/10"
                                />
                            </div>

                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-blue-300/40 group-focus-within:text-blue-400">
                                    <Lock size={20} />
                                </div>
                                <input
                                    type="password"
                                    required
                                    autoFocus
                                    placeholder="Contraseña de acceso"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:bg-white/10"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                                <p className="text-sm text-red-400 text-center font-medium">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-600/30"
                        >
                            Ingresar al Sistema
                        </button>

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => setShowForgot(true)}
                                className="text-sm text-blue-300/60 hover:text-blue-300 transition-colors"
                            >
                                ¿Olvidaste tu contraseña?
                            </button>
                        </div>
                    </form>

                    <div className="pt-8 border-t border-white/10">
                        <p className="text-center text-xs text-blue-200/40">
                            Este programa fue creado por Jhon Jairo carrascal.<br />
                            contactanos email jairoj1984@yahoo.es teléfono 3007781551.
                        </p>
                    </div>
                </div>
            </div>

            {/* Modal de Recuperación */}
            {showForgot && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
                    <div className="bg-slate-800 border border-white/10 p-8 rounded-3xl max-w-sm w-full shadow-2xl space-y-6">
                        <button
                            onClick={() => setShowForgot(false)}
                            className="flex items-center gap-2 text-blue-300/60 hover:text-blue-300 transition-colors text-sm font-medium"
                        >
                            <ArrowLeft size={16} /> Volver al login
                        </button>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-white">Recuperar Acceso</h2>
                            <p className="text-blue-200/60 text-sm">Escoge a cuál de tus correos registrados enviar el enlace de recuperación.</p>
                        </div>

                        {recoverySent ? (
                            <div className="bg-green-500/10 border border-green-500/20 p-6 rounded-2xl text-center space-y-3">
                                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                                    <ShieldCheck size={24} className="text-white" />
                                </div>
                                <p className="text-green-400 font-medium">¡Enlace enviado!</p>
                                <p className="text-xs text-green-400/60">Revisa tu bandeja de entrada en unos minutos.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleRecovery} className="space-y-4">
                                {recoveryEmails?.email1 || recoveryEmails?.email2 ? (
                                    <div className="space-y-3">
                                        {recoveryEmails.email1 && (
                                            <label className={`block p-4 rounded-2xl border transition-all cursor-pointer ${selectedRecoveryEmail === recoveryEmails.email1 ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-blue-200/60'}`}>
                                                <input
                                                    type="radio"
                                                    className="hidden"
                                                    name="recoveryEmail"
                                                    value={recoveryEmails.email1}
                                                    onChange={(e) => setSelectedRecoveryEmail(e.target.value)}
                                                />
                                                <div className="flex items-center gap-3">
                                                    <Mail size={18} />
                                                    <span className="text-sm truncate">{recoveryEmails.email1}</span>
                                                </div>
                                            </label>
                                        )}
                                        {recoveryEmails.email2 && (
                                            <label className={`block p-4 rounded-2xl border transition-all cursor-pointer ${selectedRecoveryEmail === recoveryEmails.email2 ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-blue-200/60'}`}>
                                                <input
                                                    type="radio"
                                                    className="hidden"
                                                    name="recoveryEmail"
                                                    value={recoveryEmails.email2}
                                                    onChange={(e) => setSelectedRecoveryEmail(e.target.value)}
                                                />
                                                <div className="flex items-center gap-3">
                                                    <Mail size={18} />
                                                    <span className="text-sm truncate">{recoveryEmails.email2}</span>
                                                </div>
                                            </label>
                                        )}
                                    </div>
                                ) : (
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-blue-300/40 group-focus-within:text-blue-400">
                                            <Mail size={20} />
                                        </div>
                                        <input
                                            type="email"
                                            required
                                            placeholder="correo@ejemplo.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        />
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || (!selectedRecoveryEmail && !email)}
                                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                                >
                                    {loading ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                                    ) : (
                                        <Send size={18} />
                                    )}
                                    {loading ? 'Enviando...' : 'Enviar Enlace'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

