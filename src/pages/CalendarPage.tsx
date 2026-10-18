import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  List,
  AlertTriangle,
  Clock,
  Package,
  CheckCircle2,
} from 'lucide-react';
import { useHilo } from '../context/HiloContext';
import { Order } from '../types';
import {
  formatDateMX,
  formatRelativeDate,
  isOrderOverdue,
  STATUS_CONFIG,
  formatCurrency,
} from '../utils/orderCalculations';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';

export const CalendarPage: React.FC = () => {
  const { orders, settings, loading } = useHilo();
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');

  // Month navigation
  const prevMonth = () => setCurrentDate((d) => subMonths(d, 1));
  const nextMonth = () => setCurrentDate((d) => addMonths(d, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Calendar days grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [calendarStart, calendarEnd]);

  // Map orders by deliveryDate YYYY-MM-DD
  const ordersByDate = useMemo(() => {
    const map = new Map<string, Order[]>();
    orders.forEach((order) => {
      const dateKey = order.deliveryDate;
      const current = map.get(dateKey) || [];
      map.set(dateKey, [...current, order]);
    });
    return map;
  }, [orders]);

  // Selected date orders
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const selectedDateOrders = ordersByDate.get(selectedDateStr) || [];

  // All upcoming active orders for Agenda view
  const agendaOrders = useMemo(() => {
    return [...orders]
      .filter((o) => o.status !== 'cancelado')
      .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));
  }, [orders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3157D5]" />
      </div>
    );
  }

  const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#172033]">Calendario de Entregas</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Organiza tus fechas de entrega pactadas con los clientes.
          </p>
        </div>

        {/* View mode toggle (Month vs Agenda) */}
        <div className="flex items-center gap-2">
          <div className="bg-white p-1 rounded-lg border border-[#E4E7EC] flex items-center shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                viewMode === 'month'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Mes</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                viewMode === 'agenda'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Agenda</span>
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'month' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Month Grid (8 cols on desktop) */}
          <div className="lg:col-span-8 bg-white rounded-lg border border-[#E4E7EC] shadow-2xs overflow-hidden">
            {/* Month Header Navigation */}
            <div className="p-4 border-b border-[#E4E7EC] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold text-slate-900 capitalize">
                  {format(currentDate, 'MMMM yyyy', { locale: es })}
                </h2>
                <button
                  type="button"
                  onClick={goToToday}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                >
                  Hoy
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                  aria-label="Mes anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                  aria-label="Mes siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 border-b border-[#E4E7EC] bg-slate-50 text-center text-[11px] font-semibold text-slate-500 py-2">
              {daysOfWeek.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-[#E4E7EC]">
              {calendarDays.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());
                const isSelected = isSameDay(day, selectedDate);
                const dayOrders = ordersByDate.get(dayStr) || [];
                const hasOverdue = dayOrders.some((o) => isOrderOverdue(o.deliveryDate, o.status));

                return (
                  <div
                    key={dayStr}
                    onClick={() => setSelectedDate(day)}
                    className={`min-h-[90px] p-1.5 transition-colors cursor-pointer flex flex-col justify-between ${
                      !isCurrentMonth ? 'bg-slate-50/50 text-slate-400' : 'bg-white'
                    } ${isSelected ? 'ring-2 ring-inset ring-[#3157D5]' : 'hover:bg-slate-50/60'}`}
                  >
                    {/* Date Number Badge */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-mono font-semibold px-1.5 py-0.5 rounded ${
                          isToday
                            ? 'bg-[#3157D5] text-white'
                            : isCurrentMonth
                            ? 'text-slate-800'
                            : 'text-slate-400'
                        }`}
                      >
                        {format(day, 'd')}
                      </span>

                      {hasOverdue && (
                        <span className="w-2 h-2 rounded-full bg-[#D92D20]" title="Contiene pedido atrasado" />
                      )}
                    </div>

                    {/* Orders Pill Stack */}
                    <div className="space-y-1 mt-1 overflow-hidden">
                      {dayOrders.slice(0, 2).map((ord) => {
                        const isOver = isOrderOverdue(ord.deliveryDate, ord.status);
                        const isDone = ord.status === 'entregado';
                        return (
                          <div
                            key={ord.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/pedidos/${ord.id}`);
                            }}
                            className={`px-1.5 py-0.5 text-[10px] rounded font-medium truncate transition-colors ${
                              isDone
                                ? 'bg-slate-100 text-slate-500 line-through'
                                : isOver
                                ? 'bg-rose-100 text-[#D92D20] font-bold'
                                : 'bg-blue-50 text-[#3157D5] hover:bg-blue-100'
                            }`}
                            title={`${ord.orderNumber} - ${ord.customerName}`}
                          >
                            {ord.orderNumber} · {ord.customerName.split(' ')[0]}
                          </div>
                        );
                      })}
                      {dayOrders.length > 2 && (
                        <span className="text-[9px] text-slate-400 font-medium block pl-1">
                          +{dayOrders.length - 2} más
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day Detail Sidebar (4 cols on desktop) */}
          <div className="lg:col-span-4 bg-white rounded-lg border border-[#E4E7EC] shadow-2xs p-5 space-y-4">
            <div className="border-b border-[#E4E7EC] pb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Entregas del día
              </span>
              <h3 className="text-base font-bold text-slate-900 capitalize mt-0.5">
                {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
              </h3>
            </div>

            {selectedDateOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p>No hay entregas programadas para esta fecha.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {selectedDateOrders.map((ord) => {
                  const cfg = STATUS_CONFIG[ord.status];
                  const isOver = isOrderOverdue(ord.deliveryDate, ord.status);

                  return (
                    <div
                      key={ord.id}
                      onClick={() => navigate(`/pedidos/${ord.id}`)}
                      className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-lg border border-slate-200 transition-colors cursor-pointer space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-slate-900">{ord.orderNumber}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${cfg.badgeColor}`}>
                          {cfg.label}
                        </span>
                      </div>

                      <div className="text-xs">
                        <span className="font-semibold text-slate-800">{ord.customerName}</span>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {ord.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60 font-mono">
                        <span className="text-slate-600">
                          {ord.deliveryTime ? `Hora: ${ord.deliveryTime} hrs` : 'Horario flexible'}
                        </span>
                        <span className="font-bold text-slate-800">
                          {formatCurrency(ord.totalAmount, settings.currencySymbol)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Agenda View */
        <div className="bg-white rounded-lg border border-[#E4E7EC] shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-[#E4E7EC] flex items-center justify-between text-xs text-slate-500">
            <span>
              Agenda cronológica de entregas ({agendaOrders.length} pedidos registrados)
            </span>
          </div>

          <div className="divide-y divide-[#E4E7EC]">
            {agendaOrders.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <span>No hay pedidos programados en la agenda.</span>
              </div>
            ) : (
              agendaOrders.map((ord) => {
                const cfg = STATUS_CONFIG[ord.status];
                const isOver = isOrderOverdue(ord.deliveryDate, ord.status);

                return (
                  <div
                    key={ord.id}
                    onClick={() => navigate(`/pedidos/${ord.id}`)}
                    className="p-4 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-4">
                      {/* Date Badge */}
                      <div className="text-center w-16 p-2 bg-slate-50 rounded border border-slate-200 shrink-0 font-mono">
                        <span
                          className={`text-xs font-bold block ${
                            isOver ? 'text-[#D92D20]' : 'text-slate-800'
                          }`}
                        >
                          {formatDateMX(ord.deliveryDate)}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {formatRelativeDate(ord.deliveryDate)}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{ord.orderNumber}</span>
                          <span className="text-slate-300">·</span>
                          <span className="font-semibold text-slate-800">{ord.customerName}</span>
                          {isOver && (
                            <span className="text-[10px] font-bold text-[#D92D20] bg-rose-50 border border-rose-200 px-1 rounded">
                              Atrasado
                            </span>
                          )}
                        </div>
                        <p className="text-slate-600 truncate mt-0.5">
                          {ord.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-center">
                      <div className="text-right font-mono">
                        <span className="font-bold text-slate-800 block">
                          {formatCurrency(ord.totalAmount, settings.currencySymbol)}
                        </span>
                        {ord.pendingBalance > 0 && (
                          <span className="text-[10px] text-[#B7791F]">
                            Saldo: {formatCurrency(ord.pendingBalance, settings.currencySymbol)}
                          </span>
                        )}
                      </div>

                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${cfg.badgeColor}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
