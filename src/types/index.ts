export type OrderStatus =
  | 'pendiente'
  | 'confirmado'
  | 'en_preparacion'
  | 'listo'
  | 'entregado'
  | 'cancelado';

export type OriginChannel =
  | 'whatsapp'
  | 'instagram'
  | 'presencial'
  | 'telefono'
  | 'otro';

export type PaymentMethod =
  | 'efectivo'
  | 'transferencia'
  | 'tarjeta'
  | 'otro';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  method: PaymentMethod;
  notes?: string;
  createdAt: string;
}

export interface ActivityEvent {
  id: string;
  orderId?: string;
  orderNumber?: string;
  type:
    | 'order_created'
    | 'status_changed'
    | 'payment_added'
    | 'delivery_rescheduled'
    | 'order_delivered'
    | 'order_cancelled'
    | 'order_edited';
  description: string;
  timestamp: string; // ISO
}

export interface OrderCustomization {
  description: string;
  specifications?: string; // colors, measurements, materials
  specialChanges?: string;
  internalNotes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  status: OrderStatus;
  channel: OriginChannel;
  createdAt: string; // ISO string
  deliveryDate: string; // YYYY-MM-DD
  deliveryTime?: string; // HH:mm
  items: OrderItem[];
  customization: OrderCustomization;
  totalAmount: number;
  payments: Payment[];
  paidAmount: number;
  pendingBalance: number;
  updatedAt: string;
}

export interface BusinessSettings {
  id?: string;
  businessName: string;
  tagline?: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  dateFormat: string;
  orderPrefix: string;
  nextOrderNumber: number;
  demoDataLoaded: boolean;
}

export interface OrderFilters {
  searchQuery: string;
  status?: OrderStatus | 'all';
  pendingBalanceOnly: boolean;
  overdueOnly: boolean;
  period?: 'all' | 'today' | 'this_week' | 'this_month' | 'overdue';
  customerId?: string;
  sortBy: 'delivery_asc' | 'delivery_desc' | 'created_desc' | 'total_desc' | 'status';
}
