import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export const MainLayout = () => {
    return (
        <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-auto bg-gray-50 p-8">
                    <div className="max-w-7xl mx-auto min-h-[calc(100vh-160px)]">
                        <Outlet />
                    </div>
                </main>
                <footer className="bg-white border-t border-slate-200 py-6 px-8 text-center text-slate-500 text-sm">
                    <p className="font-medium">
                        Este programa fue creado por Jhon Jairo carrascal.
                        <span className="mx-2 text-slate-300">|</span>
                        contacto: <a href="mailto:jairoj1984@yahoo.es" className="text-blue-600 hover:underline">jairoj1984@yahoo.es</a>
                        <span className="mx-2 text-slate-300">|</span>
                        teléfono: <span className="text-slate-700 font-semibold">3007781551</span>
                    </p>
                </footer>
            </div>
        </div>
    );
};
