import { Order, OrderItem, Payment, OrderStatus, OriginChannel, PaymentMethod, OrderFilters } from '../types';
import { format, parseISO, isBefore, isAfter, startOfDay, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

export function calculateItemTotal(quantity: number, unitPrice: number): number {
  if (isNaN(quantity) || isNaN(unitPrice)) return 0;
  return Math.round(quantity * unitPrice * 100) / 100;
}

export function calculateOrderTotal(items: OrderItem[]): number {
  if (!items || !items.length) return 0;
  const total = items.reduce((sum, item) => sum + (item.totalPrice || calculateItemTotal(item.quantity, item.unitPrice)), 0);
  return Math.round(total * 100) / 100;
}

export function calculateTotalPaid(payments: Payment[]): number {
  if (!payments || !payments.length) return 0;
  const total = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  return Math.round(total * 100) / 100;
}

export function calculatePendingBalance(totalAmount: number, paidAmount: number): number {
  const pending = totalAmount - paidAmount;
  return Math.round(Math.max(0, pending) * 100) / 100;
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isOrderOverdue(deliveryDateStr: string, status: OrderStatus, referenceDateStr?: string): boolean {
  if (status === 'entregado' || status === 'cancelado') return false;
  const ref = referenceDateStr || getTodayDateString();
  return deliveryDateStr < ref;
}

export function isDeliveryDueSoon(deliveryDateStr: string, status: OrderStatus, daysAhead: number = 3): boolean {
  if (status === 'entregado' || status === 'cancelado') return false;
  const today = startOfDay(new Date());
  try {
    const deliveryDate = startOfDay(parseISO(deliveryDateStr));
    const targetLimit = addDays(today, daysAhead);
    return (
      (isAfter(deliveryDate, today) || isSameDay(deliveryDate, today)) &&
      (isBefore(deliveryDate, targetLimit) || isSameDay(deliveryDate, targetLimit))
    );
  } catch {
    return false;
  }
}

export function formatCurrency(amount: number, symbol: string = '$', currencyCode: string = 'MXN'): string {
  const safeAmount = isNaN(amount) ? 0 : amount;
  const formatted = new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount);
  return `${symbol}${formatted} ${currencyCode}`;
}

export function formatDateMX(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    // If it's YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    }
    const d = parseISO(dateStr);
    return format(d, 'dd/MM/yyyy', { locale: es });
  } catch {
    return dateStr;
  }
}

export function formatDateTimeMX(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = parseISO(dateStr);
    return format(d, 'dd/MM/yyyy HH:mm', { locale: es });
  } catch {
    return dateStr;
  }
}

export function formatRelativeDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const today = startOfDay(new Date());
    const delivery = startOfDay(d);
    
    const diffTime = delivery.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Mañana';
    if (diffDays === -1) return 'Ayer';
    if (diffDays < -1) return `Atrasado por ${Math.abs(diffDays)} días`;
    if (diffDays <= 7) return `En ${diffDays} días`;
    return formatDateMX(dateStr);
  } catch {
    return formatDateMX(dateStr);
  }
}

export const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; badgeColor: string; description: string; rank: number }
> = {
  pendiente: {
    label: 'Pendiente',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    description: 'Recién registrado, a la espera de confirmación o anticipo',
    rank: 1,
  },
  confirmado: {
    label: 'Confirmado',
    badgeColor: 'bg-blue-50 text-[#3157D5] border-blue-200',
    description: 'Anticipo recibido o especificaciones aceptadas',
    rank: 2,
  },
  en_preparacion: {
    label: 'En preparación',
    badgeColor: 'bg-amber-50 text-[#B7791F] border-amber-200',
    description: 'En proceso de confección, horneado o producción',
    rank: 3,
  },
  listo: {
    label: 'Listo para entregar',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Terminado, listo para retiro o despacho',
    rank: 4,
  },
  entregado: {
    label: 'Entregado',
    badgeColor: 'bg-emerald-50 text-[#16845B] border-emerald-200',
    description: 'Entregado al cliente satisfactoriamente',
    rank: 5,
  },
  cancelado: {
    label: 'Cancelado',
    badgeColor: 'bg-rose-50 text-[#D92D20] border-rose-200',
    description: 'Cancelado; conservado para trazabilidad',
    rank: 6,
  },
};

export const CHANNEL_CONFIG: Record<OriginChannel, { label: string }> = {
  whatsapp: { label: 'WhatsApp' },
  instagram: { label: 'Instagram' },
  presencial: { label: 'Presencial / Mostrador' },
  telefono: { label: 'Llamada telefónica' },
  otro: { label: 'Otro canal' },
};

export const PAYMENT_METHOD_CONFIG: Record<PaymentMethod, { label: string }> = {
  efectivo: { label: 'Efectivo' },
  transferencia: { label: 'Transferencia bancaria / SPEI' },
  tarjeta: { label: 'Tarjeta' },
  otro: { label: 'Otro método' },
};

export function filterAndSortOrders(orders: Order[], filters: OrderFilters): Order[] {
  const query = filters.searchQuery.trim().toLowerCase();
  const todayStr = getTodayDateString();

  return orders
    .filter((order) => {
      // Search text
      if (query) {
        const matchNumber = order.orderNumber.toLowerCase().includes(query);
        const matchCustomer = order.customerName.toLowerCase().includes(query);
        const matchPhone = order.customerPhone ? order.customerPhone.toLowerCase().includes(query) : false;
        const matchCustomDesc = order.customization.description.toLowerCase().includes(query);
        const matchNotes = order.customization.internalNotes ? order.customization.internalNotes.toLowerCase().includes(query) : false;
        const matchItem = order.items.some(
          (item) => item.name.toLowerCase().includes(query) || (item.description && item.description.toLowerCase().includes(query))
        );

        if (!matchNumber && !matchCustomer && !matchPhone && !matchCustomDesc && !matchNotes && !matchItem) {
          return false;
        }
      }

      // Status
      if (filters.status && filters.status !== 'all' && order.status !== filters.status) {
        return false;
      }

      // Customer
      if (filters.customerId && order.customerId !== filters.customerId) {
        return false;
      }

      // Overdue
      const isOverdue = isOrderOverdue(order.deliveryDate, order.status, todayStr);
      if (filters.overdueOnly && !isOverdue) {
        return false;
      }

      // Pending balance
      if (filters.pendingBalanceOnly && order.pendingBalance <= 0) {
        return false;
      }

      // Period filter
      if (filters.period && filters.period !== 'all') {
        if (filters.period === 'overdue') {
          if (!isOverdue) return false;
        } else if (filters.period === 'today') {
          if (order.deliveryDate !== todayStr) return false;
        } else if (filters.period === 'this_week') {
          const orderDate = parseISO(order.deliveryDate);
          const today = startOfDay(new Date());
          const nextWeek = addDays(today, 7);
          if (isBefore(orderDate, today) || isAfter(orderDate, nextWeek)) return false;
        } else if (filters.period === 'this_month') {
          const currentMonth = todayStr.substring(0, 7);
          if (!order.deliveryDate.startsWith(currentMonth)) return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case 'delivery_asc':
          return a.deliveryDate.localeCompare(b.deliveryDate);
        case 'delivery_desc':
          return b.deliveryDate.localeCompare(a.deliveryDate);
        case 'created_desc':
          return b.createdAt.localeCompare(a.createdAt);
        case 'total_desc':
          return b.totalAmount - a.totalAmount;
        case 'status':
          return STATUS_CONFIG[a.status].rank - STATUS_CONFIG[b.status].rank;
        default:
          return a.deliveryDate.localeCompare(b.deliveryDate);
      }
    });
}
