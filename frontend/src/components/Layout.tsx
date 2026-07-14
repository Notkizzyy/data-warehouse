import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../store';
import { LayoutDashboard, TrendingUp, Lightbulb, Box, Search, Bell, Menu } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const Sidebar = () => {
  const location = useLocation();
  const isSidebarOpen = useAppStore(state => state.isSidebarOpen);

  const menu = [
    { name: 'Dashboard Deskriptif', path: '/', icon: LayoutDashboard },
    { name: 'Prediktif & Preskriptif', path: '/predictive', icon: TrendingUp },
    { name: 'Analisis Multidimensi', path: '/olap', icon: Box },
    { name: 'Cube 3D', path: '/cube', icon: Box },
  ];

  return (
    <div className={cn(
      "glass border-r border-white/10 h-screen transition-all duration-300 flex flex-col z-20",
      isSidebarOpen ? "w-64" : "w-20"
    )}>
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center font-bold text-primary shadow-[0_0_15px_rgba(0,212,255,0.6)]">
          AS
        </div>
        {isSidebarOpen && <span className="font-bold text-lg neon-text tracking-wide whitespace-nowrap">Ayam Serayu BI</span>}
      </div>
      
      <nav className="flex-1 mt-6">
        <ul className="space-y-2 px-3">
          {menu.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link to={item.path} className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg transition-all",
                  isActive ? "bg-white/10 border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)] text-secondary" : "hover:bg-white/5 text-gray-300 hover:text-white"
                )}>
                  <item.icon size={20} className={isActive ? "text-secondary" : ""} />
                  {isSidebarOpen && <span className="whitespace-nowrap">{item.name}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  );
};

const Header = () => {
  const toggleSidebar = useAppStore(state => state.toggleSidebar);
  const location = useLocation();
  
  const pathNameMap: Record<string, string> = {
    '/': 'Dashboard Deskriptif',
    '/predictive': 'Dashboard Prediktif & Preskriptif',
    '/olap': 'Analisis Multidimensi',
    '/cube': 'Cube 3D',
  };

  return (
    <header className="glass border-b border-white/10 h-16 flex items-center justify-between px-6 z-10 sticky top-0">
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar} className="p-2 hover:bg-white/10 rounded-lg transition">
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>Home</span>
          <span>/</span>
          <span className="text-secondary">{pathNameMap[location.pathname] || 'Dashboard'}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="pl-9 pr-4 py-1.5 bg-white/5 border border-white/10 rounded-full focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/50 transition-all text-sm w-48 focus:w-64"
          />
        </div>
        <button className="p-2 hover:bg-white/10 rounded-full relative">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-secondary rounded-full shadow-[0_0_8px_rgba(0,212,255,1)]"></span>
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-secondary to-blue-500 border border-white/20"></div>
      </div>
    </header>
  );
};

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-screen overflow-hidden bg-primary text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Background Decorative Effects */}
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
        
        <Header />
        <main className="flex-1 overflow-auto p-6 z-10 relative">
          {children}
        </main>
      </div>
    </div>
  );
};
