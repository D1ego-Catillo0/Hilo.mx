import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  Users,
  BarChart3,
  Settings,
  Plus,
  Menu,
  X,
  HardDrive,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { useHilo } from '../../context/HiloContext';

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { settings, orders } = useHilo();
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation items
  const navItems = [
    { to: '/', label: 'Inicio', icon: LayoutDashboard },
    {
      to: '/pedidos',
      label: 'Pedidos',
      icon: ClipboardList,
      count: orders.filter((o) => o.status !== 'entregado' && o.status !== 'cancelado').length,
    },
    { to: '/calendario', label: 'Calendario', icon: CalendarDays },
    { to: '/clientes', label: 'Clientes', icon: Users },
    { to: '/reportes', label: 'Reportes', icon: BarChart3 },
    { to: '/configuracion', label: 'Configuración', icon: Settings },
  ];

  const getBreadcrumbTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Tablero de Control';
    if (path.startsWith('/pedidos/nuevo')) return 'Nuevo Pedido';
    if (path.startsWith('/pedidos/')) return 'Detalle de Pedido';
    if (path === '/pedidos') return 'Listado de Pedidos';
    if (path === '/calendario') return 'Calendario de Entregas';
    if (path === '/clientes') return 'Directorio de Clientes';
    if (path === '/reportes') return 'Reportes Operativos y Financieros';
    if (path === '/configuracion') return 'Configuración del Negocio';
    return 'Hilo';
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col md:flex-row antialiased text-[#172033]">
      {/* Mobile Top Header */}
      <header className="md:hidden no-print sticky top-0 z-30 bg-white border-b border-[#E4E7EC] px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 -ml-1.5 text-slate-600 hover:text-slate-900 rounded-md focus-visible:outline-2 focus-visible:outline-[#3157D5]"
            aria-label="Abrir menú de navegación"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#3157D5] flex items-center justify-center text-white font-bold text-sm tracking-tight shadow-xs">
              H
            </div>
            <span className="font-bold text-base tracking-tight text-[#172033]">Hilo</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/pedidos/nuevo')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#3157D5] hover:bg-[#2646B0] rounded-md shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo</span>
          </button>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-[#E4E7EC] flex flex-col transform transition-transform duration-200 ease-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-[#E4E7EC] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#3157D5] flex items-center justify-center text-white font-bold text-sm tracking-tight shadow-xs">
              H
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-[#172033]">Hilo</span>
              <p className="text-[11px] text-slate-500 leading-none">Gestión por encargo</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/pedidos/nuevo');
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#3157D5] hover:bg-[#2646B0] rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Pedido</span>
          </button>
        </div>

        <nav className="flex-1 px-3 py-1 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50/80 text-[#3157D5] font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100/70 text-[#3157D5] font-mono tabular-nums">
                    {item.count}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#E4E7EC] bg-slate-50/60">
          <div className="flex items-center justify-between">
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-800 truncate">{settings.businessName}</p>
              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                <HardDrive className="w-3 h-3 text-emerald-600" />
                <span>Almacenamiento local</span>
              </p>
            </div>
            {settings.demoDataLoaded && (
              <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200/80 px-1.5 py-0.5 rounded font-medium">
                Demo
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* Desktop Persistent Sidebar (250px) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-[#E4E7EC] shrink-0 h-screen sticky top-0 no-print">
        {/* Brand Lockup */}
        <div className="p-5 border-b border-[#E4E7EC] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#3157D5] flex items-center justify-center text-white font-bold text-base tracking-tight shadow-xs">
              H
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg tracking-tight text-[#172033]">Hilo</span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-none mt-0.5">Pedidos por encargo</p>
            </div>
          </div>
        </div>

        {/* Primary CTA */}
        <div className="px-4 pt-4 pb-2">
          <button
            type="button"
            onClick={() => navigate('/pedidos/nuevo')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#3157D5] hover:bg-[#2646B0] rounded-lg shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3157D5]"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="tracking-wide">Nuevo pedido</span>
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors group ${
                    isActive
                      ? 'bg-blue-50/80 text-[#3157D5] font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100/70 text-[#3157D5] font-mono tabular-nums">
                    {item.count}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Business Context */}
        <div className="p-3.5 border-t border-[#E4E7EC] bg-[#F7F8FA]/60">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-800 truncate block max-w-[150px]">
              {settings.businessName}
            </span>
            {settings.demoDataLoaded && (
              <span className="text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200/80 px-1.5 py-0.2 rounded inline-flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                Demo
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
              IndexedDB local
            </span>
            <NavLink
              to="/configuracion"
              className="hover:text-slate-800 transition-colors underline-offset-2 hover:underline"
            >
              Ajustes
            </NavLink>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* Top Header Breadcrumb / Bar for desktop */}
        <header className="hidden md:flex items-center justify-between px-8 py-3.5 bg-white border-b border-[#E4E7EC] no-print">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Hilo</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-800">{getBreadcrumbTitle()}</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="font-medium text-slate-600">
              {new Date().toLocaleDateString('es-MX', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            <span className="text-slate-300">|</span>
            <span className="font-mono text-slate-600">Zona: {settings.timezone}</span>
          </div>
        </header>

        {/* Viewport page container */}
        <div className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
