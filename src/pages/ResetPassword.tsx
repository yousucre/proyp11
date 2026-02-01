import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ShieldCheck, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { authApi } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { logout } = useAuth();

    const [token, setToken] = useState<string | null>(null);
    const [email, setEmail] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const t = searchParams.get('token');
        if (!t) {
            setError('Token de recuperación no encontrado.');
            setVerifying(false);
            return;
        }
        setToken(t);
        verifyToken(t);
    }, [searchParams]);

    const verifyToken = async (t: string) => {
        try {
            const response = await authApi.verifyToken(t);
            if (response.valid) {
                setEmail(response.email);
            } else {
                setError(response.error || 'El token ha expirado o no es válido.');
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al verificar el token.');
        } finally {
            setVerifying(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            alert('Las contraseñas no coinciden.');
            return;
        }

        setLoading(true);
        setLoading(true);
        try {
            if (token) {
                await authApi.resetPassword(token, password);
                setSuccess(true);
                // Clear any existing session
                logout();
                // Faster redirect
                setTimeout(() => {
                    navigate('/login');
                }, 1500);
            }
        } catch (err) {
            alert('Error al restablecer la contraseña.');
        } finally {
            setLoading(false);
        }
    };

    if (verifying) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
            <div className="max-w-md w-full bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-2xl space-y-8">
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-500/50">
                        <ShieldCheck size={48} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Nueva Contraseña</h2>
                    <p className="text-blue-200/60 font-medium">
                        {email
                            ? `Establezca su nueva contraseña para ${email}`
                            : 'Establezca su nueva contraseña de acceso.'}
                    </p>
                </div>

                {error ? (
                    <div className="space-y-6">
                        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-center space-y-3">
                            <AlertCircle size={40} className="text-red-500 mx-auto" />
                            <p className="text-red-400 font-bold">{error}</p>
                        </div>
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full py-4 bg-white/5 text-white rounded-2xl font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2 border border-white/10"
                        >
                            <ArrowLeft size={18} /> Volver al Login
                        </button>
                    </div>
                ) : success ? (
                    <div className="bg-green-500/10 border border-green-500/20 p-6 rounded-2xl text-center space-y-3 animate-in fade-in zoom-in duration-300">
                        <CheckCircle2 size={40} className="text-green-500 mx-auto" />
                        <p className="text-green-400 font-bold">¡Contraseña restablecida!</p>
                        <p className="text-xs text-green-400/60">Redirigiendo al inicio de sesión...</p>
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full mt-4 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
                        >
                            Ir al Login ahora
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-blue-300/40 group-focus-within:text-blue-400">
                                    <Lock size={20} />
                                </div>
                                <input
                                    type="password"
                                    required
                                    autoFocus
                                    placeholder="Nueva contraseña"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
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
                                    placeholder="Confirmar nueva contraseña"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:bg-white/10"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50"
                        >
                            {loading ? 'Procesando...' : 'Cambiar Contraseña'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
