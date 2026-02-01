import { Home, FilePlus, FolderOpen, Files, BarChart3, Settings, Briefcase } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';

const NavItem = ({ to, icon: Icon, children }: { to: string, icon: any, children: React.ReactNode }) => (
    <NavLink
        to={to}
        className={({ isActive }) => clsx(
            "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium",
            isActive
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
        )}
    >
        <Icon size={20} />
        <span>{children}</span>
    </NavLink>
);

import { useConfig } from '../../contexts/ConfigContext';

export const Sidebar = () => {
    const { config, logoUrl } = useConfig();

    return (
        <aside className="w-64 bg-slate-900 border-r border-slate-800 min-h-screen flex flex-col">
            <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
                        {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                            <Files className="text-blue-500" />
                        )}
                    </div>
                    <div className="overflow-hidden">
                        <h1 className="text-sm font-bold text-white truncate">
                            {config?.entidad_nombre || 'Gestión PQR'}
                        </h1>
                        <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Uso Interno</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-4 py-2 space-y-1">
                <NavItem to="/" icon={Home}>Dashboard</NavItem>
                <NavItem to="/radicacion" icon={FilePlus}>Radicar PQR</NavItem>
                <NavItem to="/gestion" icon={FolderOpen}>Gestión PQRs</NavItem>
                <NavItem to="/expedientes" icon={Files}>Expedientes</NavItem>
                <NavItem to="/otras-gestiones" icon={Briefcase}>Otras Gestiones</NavItem>
                <NavItem to="/reportes" icon={BarChart3}>Reportes</NavItem>
            </nav>

            <div className="p-4 border-t border-slate-800">
                <NavItem to="/configuracion" icon={Settings}>Configuración</NavItem>
            </div>
        </aside>
    );
};
