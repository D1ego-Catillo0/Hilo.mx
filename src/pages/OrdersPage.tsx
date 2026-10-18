import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  RotateCcw,
  CheckCircle,
  Eye,
  AlertCircle,
  Clock,
  Phone,
  DollarSign,
} from 'lucide-react';
import { useHilo } from '../context/HiloContext';
import { OrderStatus, OrderFilters } from '../types';
import {
  formatCurrency,
  formatDateMX,
  formatRelativeDate,
  filterAndSortOrders,
  isOrderOverdue,
  STATUS_CONFIG,
} from '../utils/orderCalculations';

export const OrdersPage: React.FC = () => {
  const { orders, settings, updateOrderStatus, loading } = useHilo();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize filters from URL search params if present
  const initialFiltro = searchParams.get('filtro');
  const [filters, setFilters] = useState<OrderFilters>({
    searchQuery: '',
    status: 'all',
    pendingBalanceOnly: initialFiltro === 'con_saldo',
    overdueOnly: initialFiltro === 'atrasados',
    period: 'all',
    sortBy: 'delivery_asc',
  });

  const filteredOrders = useMemo(() => {
    return filterAndSortOrders(orders, filters);
  }, [orders, filters]);

  const resetFilters = () => {
    setFilters({
      searchQuery: '',
      status: 'all',
      pendingBalanceOnly: false,
      overdueOnly: false,
      period: 'all',
      sortBy: 'delivery_asc',
    });
    setSearchParams({});
  };

  const hasActiveFilters =
    filters.searchQuery !== '' ||
    filters.status !== 'all' ||
    filters.pendingBalanceOnly ||
    filters.overdueOnly ||
    filters.period !== 'all';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3157D5]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Page Title & Top CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#172033]">Gestión de Pedidos</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Consulta, filtra y da seguimiento a los encargos en producción.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/pedidos/nuevo')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#3157D5] hover:bg-[#2646B0] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo pedido</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-[#E4E7EC] shadow-2xs space-y-3">
        {/* Row 1: Search input + Status Select + Sort Select */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
              placeholder="Buscar por # pedido, cliente, teléfono, producto o notas..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3157D5] focus:border-[#3157D5] transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <select
              value={filters.status || 'all'}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  status: e.target.value as OrderStatus | 'all',
                }))
              }
              aria-label="Filtrar por estado"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3157D5] text-slate-700 font-medium"
            >
              <option value="all">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="confirmado">Confirmado</option>
              <option value="en_preparacion">En preparación</option>
              <option value="listo">Listo para entregar</option>
              <option value="entregado">Entregado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="sm:col-span-3">
            <div className="relative">
              <select
                value={filters.sortBy}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    sortBy: e.target.value as any,
                  }))
                }
                aria-label="Ordenar pedidos"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3157D5] text-slate-700 font-medium"
              >
                <option value="delivery_asc">Fecha de entrega (Próximas primero)</option>
                <option value="delivery_desc">Fecha de entrega (Lejanas primero)</option>
                <option value="created_desc">Fecha de creación (Más recientes)</option>
                <option value="total_desc">Importe total (Mayor a menor)</option>
                <option value="status">Por estado de flujo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Row 2: Segmented quick filters */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filtros:
            </span>

            {/* Overdue */}
            <button
              type="button"
              onClick={() => setFilters((p) => ({ ...p, overdueOnly: !p.overdueOnly }))}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filters.overdueOnly
                  ? 'bg-rose-100 text-[#D92D20] border border-rose-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              Solo atrasados
            </button>

            {/* Pending Balance */}
            <button
              type="button"
              onClick={() => setFilters((p) => ({ ...p, pendingBalanceOnly: !p.pendingBalanceOnly }))}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filters.pendingBalanceOnly
                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              Con saldo pendiente
            </button>

            {/* Deliveries Today */}
            <button
              type="button"
              onClick={() =>
                setFilters((p) => ({
                  ...p,
                  period: p.period === 'today' ? 'all' : 'today',
                }))
              }
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filters.period === 'today'
                  ? 'bg-blue-100 text-[#3157D5] border border-blue-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              Entrega hoy
            </button>

            {/* This week */}
            <button
              type="button"
              onClick={() =>
                setFilters((p) => ({
                  ...p,
                  period: p.period === 'this_week' ? 'all' : 'this_week',
                }))
              }
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filters.period === 'this_week'
                  ? 'bg-blue-100 text-[#3157D5] border border-blue-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              Esta semana
            </button>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition-colors ml-auto"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Mostrando <strong className="text-slate-800 font-mono">{filteredOrders.length}</strong> de{' '}
          <strong className="text-slate-800 font-mono">{orders.length}</strong> pedidos registrados
        </span>
      </div>

      {/* Orders View: Desktop Table + Mobile Cards */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E4E7EC] p-12 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Search className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No se encontraron pedidos</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {hasActiveFilters
              ? 'Prueba a cambiar o limpiar los filtros seleccionados para ver más resultados.'
              : 'Aún no tienes pedidos registrados en tu taller. Comienza creando el primero.'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
              >
                Limpiar filtros
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/pedidos/nuevo')}
                className="px-4 py-2 text-xs font-semibold bg-[#3157D5] hover:bg-[#2646B0] text-white rounded-md shadow-xs transition-colors"
              >
                + Crear primer pedido
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white rounded-lg border border-[#E4E7EC] shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-[#E4E7EC] text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Pedido</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Conceptos</th>
                  <th className="py-3 px-4">Fecha Entrega</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Saldo Pend.</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E7EC]">
                {filteredOrders.map((order) => {
                  const statusInfo = STATUS_CONFIG[order.status];
                  const isOverdue = isOrderOverdue(order.deliveryDate, order.status);

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/pedidos/${order.id}`)}
                    >
                      {/* Order Number */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {order.orderNumber}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{order.customerName}</div>
                        {order.customerPhone && (
                          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="w-2.5 h-2.5" />
                            {order.customerPhone}
                          </div>
                        )}
                      </td>

                      {/* Items */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="truncate font-medium text-slate-700">
                          {order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                        </div>
                        {order.customization.description && (
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {order.customization.description}
                          </div>
                        )}
                      </td>

                      {/* Delivery Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div
                          className={`font-mono font-medium ${
                            isOverdue ? 'text-[#D92D20] font-bold' : 'text-slate-800'
                          }`}
                        >
                          {formatDateMX(order.deliveryDate)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {formatRelativeDate(order.deliveryDate)}
                        </div>
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold tabular-nums text-slate-800">
                        {formatCurrency(order.totalAmount, settings.currencySymbol)}
                      </td>

                      {/* Pending Balance */}
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        {order.pendingBalance > 0 ? (
                          <span className="text-[#B7791F] font-bold">
                            {formatCurrency(order.pendingBalance, settings.currencySymbol)}
                          </span>
                        ) : (
                          <span className="text-[#16845B] font-medium">Pagado</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded border ${statusInfo.badgeColor}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => navigate(`/pedidos/${order.id}`)}
                            className="p-1 text-slate-500 hover:text-[#3157D5] hover:bg-slate-100 rounded transition-colors"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {order.status !== 'entregado' && order.status !== 'cancelado' && (
                            <button
                              type="button"
                              onClick={() => updateOrderStatus(order.id, 'entregado')}
                              className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                              title="Marcar como entregado"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="lg:hidden space-y-3">
            {filteredOrders.map((order) => {
              const statusInfo = STATUS_CONFIG[order.status];
              const isOverdue = isOrderOverdue(order.deliveryDate, order.status);

              return (
                <div
                  key={order.id}
                  onClick={() => navigate(`/pedidos/${order.id}`)}
                  className="bg-white p-4 rounded-lg border border-[#E4E7EC] shadow-2xs space-y-3 cursor-pointer hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-900">{order.orderNumber}</span>
                        {isOverdue && (
                          <span className="text-[10px] font-bold text-[#D92D20] bg-rose-50 border border-rose-200 px-1 rounded">
                            Atrasado
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 mt-0.5">{order.customerName}</h3>
                    </div>

                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded border shrink-0 ${statusInfo.badgeColor}`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2">
                    {order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Entrega</span>
                      <span
                        className={`font-mono font-medium ${
                          isOverdue ? 'text-[#D92D20] font-bold' : 'text-slate-800'
                        }`}
                      >
                        {formatDateMX(order.deliveryDate)}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {formatRelativeDate(order.deliveryDate)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase">Saldo pendiente</span>
                      {order.pendingBalance > 0 ? (
                        <span className="font-mono font-bold text-[#B7791F]">
                          {formatCurrency(order.pendingBalance, settings.currencySymbol)}
                        </span>
                      ) : (
                        <span className="font-mono font-medium text-[#16845B]">Liquidado</span>
                      )}
                      <span className="text-[10px] text-slate-400 block">
                        Total: {formatCurrency(order.totalAmount, settings.currencySymbol)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
