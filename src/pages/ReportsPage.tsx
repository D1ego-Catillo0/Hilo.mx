import React, { useState, useMemo } from 'react';
import {
  Download,
  Calendar,
  TrendingUp,
  CreditCard,
  AlertCircle,
  PackageCheck,
  PackageX,
  FileSpreadsheet,
} from 'lucide-react';
import { useHilo } from '../context/HiloContext';
import { formatCurrency, STATUS_CONFIG } from '../utils/orderCalculations';
import { OrderStatus } from '../types';
import { subDays, startOfMonth, endOfMonth, subMonths, isAfter, isBefore, parseISO } from 'date-fns';

export const ReportsPage: React.FC = () => {
  const { orders, settings, loading } = useHilo();
  const [period, setPeriod] = useState<'this_month' | 'last_month' | 'last_30' | 'all'>('this_month');

  // Filter orders according to period
  const filteredOrders = useMemo(() => {
    const today = new Date();
    if (period === 'all') return orders;

    if (period === 'this_month') {
      const start = startOfMonth(today);
      const end = endOfMonth(today);
      return orders.filter((o) => {
        const d = parseISO(o.createdAt);
        return isAfter(d, start) && isBefore(d, end);
      });
    }

    if (period === 'last_month') {
      const prev = subMonths(today, 1);
      const start = startOfMonth(prev);
      const end = endOfMonth(prev);
      return orders.filter((o) => {
        const d = parseISO(o.createdAt);
        return isAfter(d, start) && isBefore(d, end);
      });
    }

    if (period === 'last_30') {
      const past30 = subDays(today, 30);
      return orders.filter((o) => {
        const d = parseISO(o.createdAt);
        return isAfter(d, past30);
      });
    }

    return orders;
  }, [orders, period]);

  // Operational metrics
  const totalCreated = filteredOrders.length;
  const deliveredOrders = filteredOrders.filter((o) => o.status === 'entregado');
  const cancelledOrders = filteredOrders.filter((o) => o.status === 'cancelado');
  const activeOrders = filteredOrders.filter((o) => o.status !== 'entregado' && o.status !== 'cancelado');

  // Financial calculations
  // Non-cancelled orders order volume
  const validOrders = filteredOrders.filter((o) => o.status !== 'cancelado');
  const totalVolume = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalCollected = validOrders.reduce((sum, o) => sum + o.paidAmount, 0);
  const totalPending = validOrders.reduce((sum, o) => sum + o.pendingBalance, 0);

  // Status breakdown
  const statusCounts: Record<string, number> = {
    pendiente: 0,
    confirmado: 0,
    en_preparacion: 0,
    listo: 0,
    entregado: 0,
    cancelado: 0,
  };
  filteredOrders.forEach((o) => {
    if (statusCounts[o.status] !== undefined) {
      statusCounts[o.status]++;
    }
  });

  // CSV Export for Orders
  const exportOrdersCSV = () => {
    const headers = [
      'Número de Pedido',
      'Cliente',
      'Teléfono',
      'Fecha Creación',
      'Fecha Entrega',
      'Estado',
      'Canal Origen',
      'Total (MXN)',
      'Pagado (MXN)',
      'Saldo Pendiente (MXN)',
    ];

    const rows = filteredOrders.map((o) => [
      `"${o.orderNumber}"`,
      `"${o.customerName.replace(/"/g, '""')}"`,
      `"${o.customerPhone || ''}"`,
      `"${o.createdAt.substring(0, 10)}"`,
      `"${o.deliveryDate}"`,
      `"${STATUS_CONFIG[o.status]?.label || o.status}"`,
      `"${o.channel}"`,
      o.totalAmount.toFixed(2),
      o.paidAmount.toFixed(2),
      o.pendingBalance.toFixed(2),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hilo_pedidos_${period}_${new Date().toISOString().substring(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // CSV Export for Payments
  const exportPaymentsCSV = () => {
    const headers = [
      'ID Pago',
      'Número de Pedido',
      'Cliente',
      'Fecha de Pago',
      'Método de Pago',
      'Importe (MXN)',
      'Notas / Referencia',
    ];

    const rows: string[][] = [];
    filteredOrders.forEach((order) => {
      order.payments.forEach((payment) => {
        rows.push([
          `"${payment.id}"`,
          `"${order.orderNumber}"`,
          `"${order.customerName.replace(/"/g, '""')}"`,
          `"${payment.date}"`,
          `"${payment.method}"`,
          payment.amount.toFixed(2),
          `"${(payment.notes || '').replace(/"/g, '""')}"`,
        ]);
      });
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hilo_pagos_${period}_${new Date().toISOString().substring(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3157D5]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#172033]">Reportes de Producción</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Métricas de volumen, cobranza y entregas calculadas sobre tus datos reales.
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-white p-1 rounded-lg border border-[#E4E7EC] flex items-center shadow-2xs">
            <button
              type="button"
              onClick={() => setPeriod('this_month')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                period === 'this_month' ? 'bg-[#3157D5] text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Este mes
            </button>
            <button
              type="button"
              onClick={() => setPeriod('last_30')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                period === 'last_30' ? 'bg-[#3157D5] text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Últimos 30 días
            </button>
            <button
              type="button"
              onClick={() => setPeriod('last_month')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                period === 'last_month' ? 'bg-[#3157D5] text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mes anterior
            </button>
            <button
              type="button"
              onClick={() => setPeriod('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                period === 'all' ? 'bg-[#3157D5] text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Histórico
            </button>
          </div>
        </div>
      </div>

      {/* Distinction Advisory Callout */}
      <div className="p-4 bg-blue-50/50 border border-blue-200/80 rounded-lg text-xs text-slate-700 flex items-start gap-3">
        <CreditCard className="w-4 h-4 text-[#3157D5] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-slate-900 block">Claridad de cobranza:</span>
          <p className="leading-relaxed">
            Distinguimos entre <strong>Volumen presupuestado</strong> (valor total de los pedidos contratados) y el{' '}
            <strong>Dinero efectivamente recibido</strong> (anticipos y finiquitos que ya ingresaron a tu cuenta o caja). Los saldos pendientes no se contabilizan como ganancia hasta ser liquidados.
          </p>
        </div>
      </div>

      {/* 3 Main Financial Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Order Volume */}
        <div className="bg-white p-5 rounded-lg border border-[#E4E7EC] shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Volumen presupuestado</span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2 tabular-nums">
            {formatCurrency(totalVolume, settings.currencySymbol)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Valor de {validOrders.length} pedido(s) contratados en el periodo
          </p>
        </div>

        {/* Real Cash Collected */}
        <div className="bg-white p-5 rounded-lg border border-emerald-200/80 bg-emerald-50/15 shadow-2xs">
          <span className="text-xs font-medium text-emerald-800">Dinero cobrado en caja / banco</span>
          <div className="text-2xl font-bold font-mono text-[#16845B] mt-2 tabular-nums">
            {formatCurrency(totalCollected, settings.currencySymbol)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Total acumulado de anticipos y liquidaciones recibidas
          </p>
        </div>

        {/* Pending Balance */}
        <div className="bg-white p-5 rounded-lg border border-amber-200/80 bg-amber-50/15 shadow-2xs">
          <span className="text-xs font-medium text-amber-800">Saldo pendiente por cobrar</span>
          <div className="text-2xl font-bold font-mono text-[#B7791F] mt-2 tabular-nums">
            {formatCurrency(totalPending, settings.currencySymbol)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Cuentas por cobrar a liquidarse contra entrega
          </p>
        </div>
      </div>

      {/* Operational Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-[#E4E7EC] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">Pedidos creados</span>
            <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
              {totalCreated}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-50 text-[#3157D5]">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E4E7EC] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">Entregados satisfactoriamente</span>
            <span className="text-xl font-bold font-mono text-[#16845B] tabular-nums">
              {deliveredOrders.length}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-50 text-[#16845B]">
            <PackageCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E4E7EC] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">Cancelados</span>
            <span className="text-xl font-bold font-mono text-[#D92D20] tabular-nums">
              {cancelledOrders.length}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-rose-50 text-[#D92D20]">
            <PackageX className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Production Status Distribution & CSV Exports */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Status Breakdown (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-lg border border-[#E4E7EC] shadow-2xs p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900">
            Distribución por estado de producción
          </h2>

          <div className="space-y-3">
            {Object.entries(statusCounts).map(([statusKey, count]) => {
              const cfg = STATUS_CONFIG[statusKey as OrderStatus];
              const pct = totalCreated > 0 ? Math.round((count / totalCreated) * 100) : 0;

              return (
                <div key={statusKey} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{cfg.label}</span>
                    <span className="font-mono text-slate-500 tabular-nums">
                      {count} pedidos ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        statusKey === 'entregado'
                          ? 'bg-[#16845B]'
                          : statusKey === 'cancelado'
                          ? 'bg-[#D92D20]'
                          : statusKey === 'en_preparacion'
                          ? 'bg-[#B7791F]'
                          : 'bg-[#3157D5]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Data Exports (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-lg border border-[#E4E7EC] shadow-2xs p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Exportar reportes a CSV</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Descarga hojas de cálculo compatibles con Excel y Google Sheets.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={exportOrdersCSV}
              className="w-full p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-[#3157D5] shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Exportar listado de pedidos
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Incluye clientes, totales, saldos y fechas
                  </span>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
            </button>

            <button
              type="button"
              onClick={exportPaymentsCSV}
              className="w-full p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Exportar libro de pagos y anticipos
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Detalle de fecha, método, monto y referencia
                  </span>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
