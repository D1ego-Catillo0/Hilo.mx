import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Calendar,
  AlertTriangle,
  BadgeDollarSign,
  ArrowRight,
  Clock,
  CheckCircle2,
  Phone,
  Plus,
  Sparkles,
} from 'lucide-react';
import { useHilo } from '../context/HiloContext';
import {
  formatCurrency,
  formatDateMX,
  formatRelativeDate,
  isOrderOverdue,
  isDeliveryDueSoon,
  STATUS_CONFIG,
} from '../utils/orderCalculations';

export const DashboardPage: React.FC = () => {
  const { orders, activities, settings, resetDemoData, loading } = useHilo();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3157D5]" />
      </div>
    );
  }

  // Domain Calculations
  const activeOrders = orders.filter((o) => o.status !== 'entregado' && o.status !== 'cancelado');
  const overdueOrders = orders.filter((o) => isOrderOverdue(o.deliveryDate, o.status));
  const upcomingOrders = orders.filter((o) => isDeliveryDueSoon(o.deliveryDate, o.status, 4));

  const totalPendingBalance = activeOrders.reduce((sum, o) => sum + (o.pendingBalance || 0), 0);
  const totalCollectedActive = activeOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);

  // Attention required: overdue first, then ready to deliver with pending balance, then pending confirmation
  const attentionOrders = activeOrders
    .filter((o) => isOrderOverdue(o.deliveryDate, o.status) || o.status === 'listo' || o.status === 'pendiente')
    .sort((a, b) => {
      const aOverdue = isOrderOverdue(a.deliveryDate, a.status);
      const bOverdue = isOrderOverdue(b.deliveryDate, b.status);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      return a.deliveryDate.localeCompare(b.deliveryDate);
    })
    .slice(0, 5);

  // Chronological upcoming deliveries
  const chronologicalDeliveries = [...activeOrders]
    .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))
    .slice(0, 6);

  return (
    <div className="space-y-7">
      {/* Welcome & Quick Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#172033]">
            {settings.businessName}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Todos tus pedidos por encargo, organizados y al día.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/pedidos/nuevo')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#3157D5] hover:bg-[#2646B0] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo pedido</span>
          </button>
        </div>
      </div>

      {/* Demo Notice Banner if present */}
      {settings.demoDataLoaded && (
        <div className="p-3.5 bg-amber-50/70 border border-amber-200/90 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Modo de demostración:</strong> Estás explorando datos de prueba del "Taller de Ejemplo" con fechas relativas al día de hoy.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => resetDemoData()}
              className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-amber-100 text-amber-800 border border-amber-200 rounded transition-colors"
            >
              Restablecer ejemplos
            </button>
            <button
              type="button"
              onClick={() => navigate('/configuracion')}
              className="px-2.5 py-1 text-[11px] font-medium bg-amber-800 text-white hover:bg-amber-900 rounded transition-colors"
            >
              Limpiar y usar mis datos
            </button>
          </div>
        </div>
      )}

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Orders */}
        <div
          onClick={() => navigate('/pedidos')}
          className="bg-white p-5 rounded-lg border border-[#E4E7EC] hover:border-slate-300 transition-all cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pedidos activos</span>
            <div className="p-2 rounded-md bg-blue-50 text-[#3157D5]">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-[#172033] font-mono tabular-nums">
              {activeOrders.length}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>En taller o proceso</span>
              <span className="text-[#3157D5] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                Ver todos <ArrowRight className="w-3 h-3" />
              </span>
            </p>
          </div>
        </div>

        {/* Upcoming Deliveries */}
        <div
          onClick={() => navigate('/calendario')}
          className="bg-white p-5 rounded-lg border border-[#E4E7EC] hover:border-slate-300 transition-all cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Entregas próximas</span>
            <div className="p-2 rounded-md bg-amber-50 text-[#B7791F]">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-[#172033] font-mono tabular-nums">
              {upcomingOrders.length}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>Siguientes 4 días</span>
              <span className="text-[#3157D5] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                Calendario <ArrowRight className="w-3 h-3" />
              </span>
            </p>
          </div>
        </div>

        {/* Overdue Orders */}
        <div
          onClick={() => navigate('/pedidos?filtro=atrasados')}
          className={`bg-white p-5 rounded-lg border transition-all cursor-pointer group shadow-2xs ${
            overdueOrders.length > 0 ? 'border-rose-200 bg-rose-50/15' : 'border-[#E4E7EC]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pedidos atrasados</span>
            <div
              className={`p-2 rounded-md ${
                overdueOrders.length > 0 ? 'bg-rose-100 text-[#D92D20]' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl font-bold tracking-tight font-mono tabular-nums ${
                overdueOrders.length > 0 ? 'text-[#D92D20]' : 'text-slate-800'
              }`}
            >
              {overdueOrders.length}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>{overdueOrders.length > 0 ? 'Requieren entrega urgente' : 'Al día sin atrasos'}</span>
              <span className="text-[#3157D5] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                Revisar <ArrowRight className="w-3 h-3" />
              </span>
            </p>
          </div>
        </div>

        {/* Pending Balance */}
        <div
          onClick={() => navigate('/pedidos?filtro=con_saldo')}
          className="bg-white p-5 rounded-lg border border-[#E4E7EC] hover:border-slate-300 transition-all cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Saldo por cobrar</span>
            <div className="p-2 rounded-md bg-emerald-50 text-[#16845B]">
              <BadgeDollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-[#172033] font-mono tabular-nums">
              {formatCurrency(totalPendingBalance, settings.currencySymbol)}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>Cobrado: {formatCurrency(totalCollectedActive, settings.currencySymbol)}</span>
              <span className="text-[#3157D5] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                Cobros <ArrowRight className="w-3 h-3" />
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Orders Requiring Attention + Upcoming Deliveries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Attention & Upcoming */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section: Requieren Atención */}
          <div className="bg-white rounded-lg border border-[#E4E7EC] shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E4E7EC] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#172033]">Pedidos que requieren atención</h2>
                <p className="text-xs text-slate-500">Atrasos, pedidos listos o pendientes de anticipo</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/pedidos')}
                className="text-xs font-semibold text-[#3157D5] hover:underline"
              >
                Ver todos
              </button>
            </div>

            <div className="divide-y divide-[#E4E7EC]">
              {attentionOrders.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                  <span>No hay pedidos que requieran atención inmediata. ¡Todo el taller está al día!</span>
                </div>
              ) : (
                attentionOrders.map((order) => {
                  const isOverdue = isOrderOverdue(order.deliveryDate, order.status);
                  const statusInfo = STATUS_CONFIG[order.status];

                  return (
                    <div
                      key={order.id}
                      onClick={() => navigate(`/pedidos/${order.id}`)}
                      className="p-4 hover:bg-slate-50/70 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono font-bold text-slate-900">{order.orderNumber}</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs font-semibold text-[#172033] truncate">{order.customerName}</span>
                          {isOverdue && (
                            <span className="text-[10px] font-semibold text-[#D92D20] bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                              Atrasado
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 truncate">
                          {order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Entrega: {formatDateMX(order.deliveryDate)} ({formatRelativeDate(order.deliveryDate)})
                          </span>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0">
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded border ${statusInfo.badgeColor}`}
                        >
                          {statusInfo.label}
                        </span>
                        <span className="text-xs font-mono tabular-nums text-slate-700">
                          {order.pendingBalance > 0 ? (
                            <span className="text-amber-800 font-medium">
                              Resta: {formatCurrency(order.pendingBalance, settings.currencySymbol)}
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-medium">Liquidado</span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Section: Próximas Entregas (Cronológicas) */}
          <div className="bg-white rounded-lg border border-[#E4E7EC] shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E4E7EC] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#172033]">Próximas entregas</h2>
                <p className="text-xs text-slate-500">Orden cronológico para planificar tu producción</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/calendario')}
                className="text-xs font-semibold text-[#3157D5] hover:underline"
              >
                Ver calendario
              </button>
            </div>

            <div className="divide-y divide-[#E4E7EC]">
              {chronologicalDeliveries.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  <span>No hay pedidos activos programados para entrega.</span>
                </div>
              ) : (
                chronologicalDeliveries.map((order) => {
                  const statusInfo = STATUS_CONFIG[order.status];
                  const isOverdue = isOrderOverdue(order.deliveryDate, order.status);

                  return (
                    <div
                      key={order.id}
                      onClick={() => navigate(`/pedidos/${order.id}`)}
                      className="p-4 hover:bg-slate-50/70 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono font-bold text-slate-900">{order.orderNumber}</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs font-semibold text-slate-800 truncate">{order.customerName}</span>
                          {order.customerPhone && (
                            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline-flex items-center gap-0.5">
                              <Phone className="w-2.5 h-2.5" />
                              {order.customerPhone}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 truncate">
                          {order.customization.description || order.items[0]?.name}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <span
                            className={`text-xs font-mono font-medium block ${
                              isOverdue ? 'text-[#D92D20] font-bold' : 'text-slate-800'
                            }`}
                          >
                            {formatDateMX(order.deliveryDate)}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            {formatRelativeDate(order.deliveryDate)}
                          </span>
                        </div>

                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded border ${statusInfo.badgeColor}`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1/3): Actividad Reciente & Resumen Operativo */}
        <div className="space-y-6">
          {/* Recent Activity Card */}
          <div className="bg-white rounded-lg border border-[#E4E7EC] shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E4E7EC]">
              <h2 className="text-sm font-bold text-[#172033]">Actividad reciente</h2>
              <p className="text-xs text-slate-500">Historial de acciones registradas</p>
            </div>

            <div className="p-4 space-y-4 max-h-[460px] overflow-y-auto">
              {activities.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No hay actividad registrada aún.</p>
              ) : (
                activities.slice(0, 10).map((act) => (
                  <div key={act.id} className="text-xs border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                    <p className="text-slate-800 font-medium leading-relaxed">{act.description}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                      {formatDateMX(act.timestamp.substring(0, 10))} · {act.timestamp.substring(11, 16)} hrs
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Practical Workshop Advice Card */}
          <div className="bg-white p-5 rounded-lg border border-[#E4E7EC] shadow-2xs text-xs space-y-2">
            <h3 className="font-bold text-slate-800">Consejo de flujo de trabajo</h3>
            <p className="text-slate-600 leading-relaxed">
              Registra siempre un anticipo mínimo al confirmar un pedido para apartar materiales y asegurar la fecha de entrega con tu cliente.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate('/pedidos/nuevo')}
                className="w-full text-center py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded text-xs transition-colors"
              >
                + Crear encargo ahora
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
