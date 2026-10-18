import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Calendar,
  CreditCard,
  Printer,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Phone,
  Mail,
  User,
  FileText,
  AlertCircle,
  HelpCircle,
  Check,
  Edit2,
} from 'lucide-react';
import { useHilo } from '../context/HiloContext';
import { OrderStatus, PaymentMethod } from '../types';
import {
  formatCurrency,
  formatDateMX,
  formatDateTimeMX,
  formatRelativeDate,
  isOrderOverdue,
  STATUS_CONFIG,
  CHANNEL_CONFIG,
  PAYMENT_METHOD_CONFIG,
  getTodayDateString,
} from '../utils/orderCalculations';

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    orders,
    activities,
    settings,
    updateOrderStatus,
    addPayment,
    rescheduleDelivery,
    cancelOrder,
    loading,
  } = useHilo();

  // Modals state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transferencia');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(getTodayDateString());

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [newDeliveryDate, setNewDeliveryDate] = useState('');
  const [newDeliveryTime, setNewDeliveryTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<OrderStatus>('en_preparacion');
  const [statusNotes, setStatusNotes] = useState('');

  const order = orders.find((o) => o.id === id);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3157D5]" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-white p-12 text-center rounded-lg border border-[#E4E7EC] shadow-2xs max-w-xl mx-auto space-y-4">
        <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
        <h2 className="text-base font-bold text-slate-800">Pedido no encontrado</h2>
        <p className="text-xs text-slate-500">
          El pedido solicitado no existe o fue eliminado de la base de datos local.
        </p>
        <button
          type="button"
          onClick={() => navigate('/pedidos')}
          className="px-4 py-2 text-xs font-semibold bg-[#3157D5] text-white rounded-md hover:bg-[#2646B0]"
        >
          Volver a la lista de pedidos
        </button>
      </div>
    );
  }

  const statusInfo = STATUS_CONFIG[order.status];
  const isOverdue = isOrderOverdue(order.deliveryDate, order.status);

  // Filter activities related to this order
  const orderActivities = activities.filter(
    (a) => a.orderId === order.id || a.orderNumber === order.orderNumber
  );

  // Status handlers
  const handleOpenStatusModal = (status: OrderStatus) => {
    setTargetStatus(status);
    setStatusNotes('');
    setShowStatusModal(true);
  };

  const handleConfirmStatusChange = async () => {
    await updateOrderStatus(order.id, targetStatus, statusNotes);
    setShowStatusModal(false);
  };

  // Payment handler
  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount <= 0) return;

    await addPayment(order.id, {
      amount: paymentAmount,
      date: paymentDate || getTodayDateString(),
      method: paymentMethod,
      notes: paymentNotes.trim() || undefined,
    });

    setShowPaymentModal(false);
    setPaymentAmount(0);
    setPaymentNotes('');
  };

  // Reschedule handler
  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeliveryDate) return;

    await rescheduleDelivery(order.id, newDeliveryDate, newDeliveryTime || undefined, rescheduleReason);
    setShowRescheduleModal(false);
  };

  // Cancel handler
  const handleConfirmCancel = async () => {
    await cancelOrder(order.id, cancelReason);
    setShowCancelModal(false);
  };

  // Print function
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Bar Navigation & Print Action */}
      <div className="flex items-center justify-between no-print">
        <button
          type="button"
          onClick={() => navigate('/pedidos')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a pedidos</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-md shadow-2xs transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Imprimir comprobante</span>
          </button>
        </div>
      </div>

      {/* Main Order Header Card */}
      <div className="bg-white rounded-lg border border-[#E4E7EC] shadow-2xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E4E7EC]">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold font-mono tracking-tight text-[#172033]">
                {order.orderNumber}
              </span>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded border ${statusInfo.badgeColor}`}
              >
                {statusInfo.label}
              </span>
              {isOverdue && (
                <span className="text-xs font-bold text-[#D92D20] bg-rose-50 border border-rose-200 px-2 py-0.5 rounded flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Atrasado
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Registrado el {formatDateTimeMX(order.createdAt)} vía {CHANNEL_CONFIG[order.channel]?.label}
            </p>
          </div>

          {/* Quick Workflow Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 no-print">
            {order.status !== 'entregado' && order.status !== 'cancelado' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentAmount(order.pendingBalance > 0 ? order.pendingBalance : 100);
                    setShowPaymentModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#16845B] border border-emerald-200 text-xs font-semibold rounded-md transition-colors"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>+ Registrar pago</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewDeliveryDate(order.deliveryDate);
                    setNewDeliveryTime(order.deliveryTime || '');
                    setShowRescheduleModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-md transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Modificar entrega</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenStatusModal('entregado')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#3157D5] hover:bg-[#2646B0] text-white text-xs font-semibold rounded-md shadow-xs transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Marcar entregado</span>
                </button>
              </>
            )}

            {order.status !== 'cancelado' && order.status !== 'entregado' && (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-slate-400 hover:text-[#D92D20] hover:bg-rose-50 text-xs rounded-md transition-colors"
                title="Cancelar pedido"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancelar</span>
              </button>
            )}
          </div>
        </div>

        {/* Workflow State Step Progression */}
        <div className="pt-2 no-print">
          <span className="text-[11px] font-semibold text-slate-500 block mb-2">
            Flujo de producción:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {(['pendiente', 'confirmado', 'en_preparacion', 'listo', 'entregado'] as OrderStatus[]).map(
              (stepStatus) => {
                const stepConfig = STATUS_CONFIG[stepStatus];
                const isCurrent = order.status === stepStatus;
                return (
                  <button
                    key={stepStatus}
                    type="button"
                    disabled={order.status === 'cancelado'}
                    onClick={() => handleOpenStatusModal(stepStatus)}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-all flex items-center gap-1.5 ${
                      isCurrent
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {isCurrent && <Check className="w-3 h-3 text-white" />}
                    <span>{stepConfig.label}</span>
                  </button>
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* Grid: Details, Concepts, Payments, History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Items & Specifications */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items & Concepts Table */}
          <div className="bg-white rounded-lg border border-[#E4E7EC] shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E4E7EC] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#172033]">Conceptos presupuestados</h2>
                <p className="text-xs text-slate-500">Detalle de productos o servicios del encargo</p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-800">
                Total: {formatCurrency(order.totalAmount, settings.currencySymbol)}
              </span>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-[#E4E7EC] text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Concepto</th>
                  <th className="py-2.5 px-4 text-center">Cant.</th>
                  <th className="py-2.5 px-4 text-right">P. Unitario</th>
                  <th className="py-2.5 px-4 text-right">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E7EC]">
                {order.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{item.name}</div>
                      {item.description && (
                        <div className="text-[11px] text-slate-500 mt-0.5">{item.description}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono tabular-nums text-slate-700">
                      {item.quantity}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {formatCurrency(item.unitPrice, settings.currencySymbol)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-slate-900">
                      {formatCurrency(item.totalPrice, settings.currencySymbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50/70 border-t border-[#E4E7EC] font-semibold text-xs text-slate-800">
                <tr>
                  <td colSpan={3} className="py-3 px-4 text-right">
                    Total del encargo:
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-sm text-[#172033]">
                    {formatCurrency(order.totalAmount, settings.currencySymbol)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Customization Details */}
          <div className="bg-white rounded-lg border border-[#E4E7EC] shadow-2xs p-5 space-y-4">
            <h2 className="text-sm font-bold text-[#172033] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#3157D5]" />
              <span>Personalización y especificaciones de taller</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-slate-700 block mb-0.5">Descripción del encargo:</span>
                <p className="text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-200/80 leading-relaxed">
                  {order.customization.description || 'Sin descripción adicional especificada.'}
                </p>
              </div>

              {order.customization.specifications && (
                <div>
                  <span className="font-semibold text-slate-700 block mb-0.5">
                    Detalles técnicos (medidas, colores, materiales):
                  </span>
                  <p className="text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-200/80 leading-relaxed font-mono text-[11px]">
                    {order.customization.specifications}
                  </p>
                </div>
              )}

              {order.customization.internalNotes && (
                <div>
                  <span className="font-semibold text-slate-700 block mb-0.5">
                    Notas internas del taller:
                  </span>
                  <p className="text-slate-600 bg-amber-50/50 p-3 rounded-md border border-amber-200/80 leading-relaxed">
                    {order.customization.internalNotes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Ledger / Historial de Pagos */}
          <div className="bg-white rounded-lg border border-[#E4E7EC] shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E4E7EC] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#172033]">Registro de pagos y anticipos</h2>
                <p className="text-xs text-slate-500">Historial de abonos recibidos</p>
              </div>

              {order.pendingBalance > 0 && order.status !== 'cancelado' && (
                <button
                  type="button"
                  onClick={() => {
                    setPaymentAmount(order.pendingBalance);
                    setShowPaymentModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#3157D5] hover:bg-[#2646B0] text-white text-xs font-semibold rounded-md shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Abonar pago</span>
                </button>
              )}
            </div>

            {order.payments.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                <span>No se ha registrado ningún anticipo o pago para este pedido aún.</span>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-[#E4E7EC] text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Fecha</th>
                    <th className="py-2.5 px-4">Método</th>
                    <th className="py-2.5 px-4">Referencia / Nota</th>
                    <th className="py-2.5 px-4 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E7EC]">
                  {order.payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                        {formatDateMX(p.date)}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {PAYMENT_METHOD_CONFIG[p.method]?.label || p.method}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{p.notes || '—'}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-slate-900">
                        {formatCurrency(p.amount, settings.currencySymbol)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Reconciliation Disclaimer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                Hilo registra y concilia pagos en tu libreta digital. No procesa transferencias bancarias directas.
              </span>
            </div>
          </div>
        </div>

        {/* Right Column (1/3): Client, Financial Ledger Summary, Activity Feed */}
        <div className="space-y-6">
          {/* Financial Summary Card */}
          <div className="bg-white rounded-lg border border-[#E4E7EC] shadow-2xs p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Estado financiero del pedido
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Importe Total:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {formatCurrency(order.totalAmount, settings.currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Total Recibido:</span>
                <span className="font-mono font-semibold text-[#16845B]">
                  {formatCurrency(order.paidAmount, settings.currencySymbol)}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Saldo pendiente:</span>
                <span
                  className={`text-base font-bold font-mono tabular-nums ${
                    order.pendingBalance > 0 ? 'text-[#B7791F]' : 'text-[#16845B]'
                  }`}
                >
                  {formatCurrency(order.pendingBalance, settings.currencySymbol)}
                </span>
              </div>

              {order.pendingBalance === 0 ? (
                <div className="p-2.5 rounded bg-emerald-50 text-[#16845B] text-xs font-medium text-center border border-emerald-200 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Pedido completamente liquidado</span>
                </div>
              ) : (
                <div className="p-2.5 rounded bg-amber-50 text-[#B7791F] text-xs font-medium text-center border border-amber-200">
                  <span>Por cobrar contra entrega o despacho</span>
                </div>
              )}
            </div>
          </div>

          {/* Client Card */}
          <div className="bg-white rounded-lg border border-[#E4E7EC] shadow-2xs p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Cliente</span>
              <button
                type="button"
                onClick={() => navigate('/clientes')}
                className="text-[11px] font-semibold text-[#3157D5] hover:underline"
              >
                Ver directorio
              </button>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span className="font-bold text-slate-900">{order.customerName}</span>
              </div>

              {order.customerPhone ? (
                <div className="flex items-center gap-2 text-slate-600 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{order.customerPhone}</span>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400">Sin teléfono registrado</span>
              )}
            </div>
          </div>

          {/* Delivery Schedule Card */}
          <div className="bg-white rounded-lg border border-[#E4E7EC] shadow-2xs p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Compromiso de entrega
              </h3>
              {order.status !== 'entregado' && order.status !== 'cancelado' && (
                <button
                  type="button"
                  onClick={() => {
                    setNewDeliveryDate(order.deliveryDate);
                    setNewDeliveryTime(order.deliveryTime || '');
                    setShowRescheduleModal(true);
                  }}
                  className="text-[11px] font-semibold text-[#3157D5] hover:underline"
                >
                  Reprogramar
                </button>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span
                  className={`font-mono font-bold ${
                    isOverdue ? 'text-[#D92D20]' : 'text-slate-800'
                  }`}
                >
                  {formatDateMX(order.deliveryDate)}
                </span>
                <span className="text-slate-400">({formatRelativeDate(order.deliveryDate)})</span>
              </div>

              {order.deliveryTime && (
                <div className="flex items-center gap-2 text-slate-600 font-mono">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Hora: {order.deliveryTime} hrs</span>
                </div>
              )}
            </div>
          </div>

          {/* Order Activity Audit Log */}
          <div className="bg-white rounded-lg border border-[#E4E7EC] shadow-2xs p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Historial del pedido
            </h3>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {orderActivities.length === 0 ? (
                <p className="text-xs text-slate-400">Sin eventos específicos registrados.</p>
              ) : (
                orderActivities.map((act) => (
                  <div key={act.id} className="text-xs border-b border-slate-100 pb-2 last:border-0">
                    <p className="text-slate-800 font-medium leading-relaxed">{act.description}</p>
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                      {formatDateTimeMX(act.timestamp)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Printable Workshop Ticket / Comprobante de Taller (Hidden on screen, shown when printed) */}
      <div className="print-only hidden p-8 bg-white text-black font-sans max-w-2xl mx-auto">
        <div className="border-b-2 border-black pb-4 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">{settings.businessName}</h1>
              <p className="text-sm">{settings.tagline || 'Pedidos por Encargo'}</p>
            </div>
            <div className="text-right">
              <span className="text-xl font-mono font-bold">{order.orderNumber}</span>
              <p className="text-xs">Fecha: {formatDateMX(order.createdAt.substring(0, 10))}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs mb-6 pb-4 border-b border-gray-300">
          <div>
            <p className="font-bold">Cliente:</p>
            <p>{order.customerName}</p>
            <p>{order.customerPhone || 'Sin teléfono'}</p>
          </div>
          <div>
            <p className="font-bold">Fecha de Entrega Prometida:</p>
            <p className="font-bold text-sm">
              {formatDateMX(order.deliveryDate)} {order.deliveryTime ? `a las ${order.deliveryTime} hrs` : ''}
            </p>
            <p>Estado: {statusInfo.label}</p>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="font-bold text-xs uppercase mb-2">Detalle de Conceptos</h2>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-black">
                <th className="py-1">Cant.</th>
                <th className="py-1">Concepto</th>
                <th className="py-1 text-right">P. Unitario</th>
                <th className="py-1 text-right">Importe</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((i) => (
                <tr key={i.id} className="border-b border-gray-200">
                  <td className="py-1 font-mono">{i.quantity}</td>
                  <td className="py-1">
                    <p className="font-semibold">{i.name}</p>
                    {i.description && <p className="text-[11px] text-gray-600">{i.description}</p>}
                  </td>
                  <td className="py-1 text-right font-mono">{formatCurrency(i.unitPrice, settings.currencySymbol)}</td>
                  <td className="py-1 text-right font-mono font-semibold">{formatCurrency(i.totalPrice, settings.currencySymbol)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mb-6 text-xs bg-gray-50 p-3 border border-gray-200">
          <p className="font-bold mb-1">Especificaciones de Personalización:</p>
          <p>{order.customization.description || 'Sin notas adicionales.'}</p>
          {order.customization.specifications && (
            <p className="mt-1 font-mono">{order.customization.specifications}</p>
          )}
        </div>

        <div className="text-right text-xs space-y-1 mb-8">
          <p>Total del Pedido: <strong className="font-mono text-sm">{formatCurrency(order.totalAmount, settings.currencySymbol)}</strong></p>
          <p>Total Abonado / Anticipo: <strong className="font-mono text-sm">{formatCurrency(order.paidAmount, settings.currencySymbol)}</strong></p>
          <p className="text-sm font-bold pt-1 border-t border-black">
            Saldo por Liquidar a la Entrega: <span className="font-mono">{formatCurrency(order.pendingBalance, settings.currencySymbol)}</span>
          </p>
        </div>

        <div className="text-center text-[10px] text-gray-500 pt-4 border-t border-gray-300">
          Comprobante impreso desde Hilo · Software de gestión para pequeños talleres.
        </div>
      </div>

      {/* MODAL 1: Registrar Pago */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Registrar abono o liquidación</h3>
            <p className="text-xs text-slate-500">
              Registra un pago para el pedido <strong>{order.orderNumber}</strong> de {order.customerName}.
            </p>

            <form onSubmit={handleRegisterPayment} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Monto a pagar (Saldo pendiente: {formatCurrency(order.pendingBalance, settings.currencySymbol)})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
                    $
                  </span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3157D5] font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Método de pago
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3157D5]"
                  >
                    {Object.entries(PAYMENT_METHOD_CONFIG).map(([k, cfg]) => (
                      <option key={k} value={k}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Fecha del cobro
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3157D5] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nota / Folio de comprobante (opcional)
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Ej. Transferencia Banamex autorización #4892..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3157D5]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#3157D5] hover:bg-[#2646B0] text-white text-xs font-semibold rounded-md shadow-xs"
                >
                  Confirmar pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Modificar Entrega */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Modificar fecha de entrega</h3>
            <p className="text-xs text-slate-500">
              Actualiza la fecha prometida para el pedido <strong>{order.orderNumber}</strong>.
            </p>

            <form onSubmit={handleConfirmReschedule} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Nueva fecha *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDeliveryDate}
                    onChange={(e) => setNewDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3157D5] font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Hora (opcional)
                  </label>
                  <input
                    type="time"
                    value={newDeliveryTime}
                    onChange={(e) => setNewDeliveryTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3157D5] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Motivo del cambio
                </label>
                <input
                  type="text"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="Ej. Solicitud del cliente por viaje, demora en material..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3157D5]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#3157D5] hover:bg-[#2646B0] text-white text-xs font-semibold rounded-md shadow-xs"
                >
                  Guardar fecha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Cambiar Estado */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Cambiar estado a "{STATUS_CONFIG[targetStatus]?.label}"
            </h3>
            <p className="text-xs text-slate-500">
              {STATUS_CONFIG[targetStatus]?.description}
            </p>

            {targetStatus === 'entregado' && order.pendingBalance > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Atención:</strong> Este pedido tiene un saldo pendiente de{' '}
                  <strong>{formatCurrency(order.pendingBalance, settings.currencySymbol)}</strong>. Recuerda registrar el pago final si ya te liquidaron.
                </span>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Nota adicional para el historial (opcional)
              </label>
              <input
                type="text"
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="Ej. Revisión de calidad aprobada, empaque listo..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3157D5]"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmStatusChange}
                className="px-4 py-1.5 bg-[#3157D5] hover:bg-[#2646B0] text-white text-xs font-semibold rounded-md shadow-xs"
              >
                Confirmar cambio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Cancelar Pedido */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-[#D92D20] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>¿Cancelar este pedido?</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              El pedido {order.orderNumber} se marcará como <strong>Cancelado</strong>. No se borrará del sistema para conservar el historial y la trazabilidad contable.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Motivo de la cancelación
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ej. Cliente solicitó cancelación por cambio de fecha del evento..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3157D5]"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md"
              >
                Mantener pedido
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-4 py-1.5 bg-[#D92D20] hover:bg-rose-700 text-white text-xs font-semibold rounded-md shadow-xs"
              >
                Sí, cancelar pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
