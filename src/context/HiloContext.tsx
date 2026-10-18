import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Customer, Order, Payment, ActivityEvent, BusinessSettings, OrderStatus } from '../types';
import {
  db,
  getSettings,
  saveSettings,
  generateId,
  getNextOrderNumber,
  logActivity,
  seedDemoData,
  exportDatabaseToJson,
  importDatabaseFromJson,
  wipeAllData,
  DEFAULT_SETTINGS,
} from '../db/db';
import { calculateOrderTotal, calculateTotalPaid, calculatePendingBalance, STATUS_CONFIG } from '../utils/orderCalculations';
import { useToast } from './ToastContext';

interface HiloContextValue {
  orders: Order[];
  customers: Customer[];
  activities: ActivityEvent[];
  settings: BusinessSettings;
  loading: boolean;
  refreshData: () => Promise<void>;
  createOrder: (orderData: Omit<Order, 'id' | 'orderNumber' | 'totalAmount' | 'paidAmount' | 'pendingBalance' | 'updatedAt'>, initialPayment?: Omit<Payment, 'id' | 'orderId' | 'createdAt'>) => Promise<Order>;
  updateOrder: (orderId: string, updates: Partial<Order>) => Promise<Order>;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus, notes?: string) => Promise<void>;
  addPayment: (orderId: string, paymentData: Omit<Payment, 'id' | 'orderId' | 'createdAt'>) => Promise<Payment>;
  rescheduleDelivery: (orderId: string, newDate: string, newTime?: string, reason?: string) => Promise<void>;
  cancelOrder: (orderId: string, reason?: string) => Promise<void>;
  createCustomer: (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Customer>;
  updateCustomer: (customerId: string, customerData: Partial<Customer>) => Promise<Customer>;
  deleteCustomer: (customerId: string) => Promise<{ success: boolean; message: string }>;
  updateSettings: (newSettings: Partial<BusinessSettings>) => Promise<void>;
  resetDemoData: () => Promise<void>;
  wipeData: () => Promise<void>;
  exportData: () => Promise<string>;
  importData: (jsonStr: string) => Promise<{ success: boolean; message: string }>;
}

const HiloContext = createContext<HiloContextValue | undefined>(undefined);

export const HiloProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const { success, error, info } = useToast();

  const refreshData = useCallback(async () => {
    try {
      // First ensure database has either data or demo data
      const orderCount = await db.orders.count();
      if (orderCount === 0) {
        await seedDemoData(false);
      }

      const [loadedOrders, loadedCustomers, loadedActivities, loadedSettings] = await Promise.all([
        db.orders.toArray(),
        db.customers.toArray(),
        db.activities.orderBy('timestamp').reverse().limit(40).toArray(),
        getSettings(),
      ]);

      setOrders(loadedOrders);
      setCustomers(loadedCustomers);
      setActivities(loadedActivities);
      setSettings(loadedSettings);
    } catch (err: any) {
      console.error('Error refreshing Hilo data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const createOrder = async (
    orderData: Omit<Order, 'id' | 'orderNumber' | 'totalAmount' | 'paidAmount' | 'pendingBalance' | 'updatedAt'>,
    initialPayment?: Omit<Payment, 'id' | 'orderId' | 'createdAt'>
  ): Promise<Order> => {
    try {
      const orderId = generateId();
      const orderNumber = await getNextOrderNumber();
      const totalAmount = calculateOrderTotal(orderData.items);

      const payments: Payment[] = [];
      let paidAmount = 0;

      if (initialPayment && initialPayment.amount > 0) {
        const paymentId = generateId();
        const paymentRecord: Payment = {
          ...initialPayment,
          id: paymentId,
          orderId,
          createdAt: new Date().toISOString(),
        };
        payments.push(paymentRecord);
        paidAmount = initialPayment.amount;
        await db.payments.add(paymentRecord);
      }

      const pendingBalance = calculatePendingBalance(totalAmount, paidAmount);
      const nowIso = new Date().toISOString();

      const newOrder: Order = {
        ...orderData,
        id: orderId,
        orderNumber,
        totalAmount,
        payments,
        paidAmount,
        pendingBalance,
        updatedAt: nowIso,
      };

      await db.orders.add(newOrder);

      // Audit Activity
      await logActivity(
        'order_created',
        `Pedido ${orderNumber} creado para el cliente ${newOrder.customerName} por $${totalAmount.toFixed(2)} MXN`,
        orderId,
        orderNumber
      );

      if (initialPayment && initialPayment.amount > 0) {
        await logActivity(
          'payment_added',
          `Anticipo inicial de $${initialPayment.amount.toFixed(2)} MXN registrado para el pedido ${orderNumber}`,
          orderId,
          orderNumber
        );
      }

      await refreshData();
      success(`Pedido ${orderNumber} creado con éxito.`);
      return newOrder;
    } catch (err: any) {
      error(`Error al crear el pedido: ${err.message || 'Error de persistencia'}`);
      throw err;
    }
  };

  const updateOrder = async (orderId: string, updates: Partial<Order>): Promise<Order> => {
    try {
      const existing = await db.orders.get(orderId);
      if (!existing) throw new Error('Pedido no encontrado');

      const items = updates.items || existing.items;
      const totalAmount = calculateOrderTotal(items);
      const paidAmount = calculateTotalPaid(existing.payments);
      const pendingBalance = calculatePendingBalance(totalAmount, paidAmount);

      const updatedOrder: Order = {
        ...existing,
        ...updates,
        items,
        totalAmount,
        paidAmount,
        pendingBalance,
        updatedAt: new Date().toISOString(),
      };

      await db.orders.put(updatedOrder);

      await logActivity(
        'order_edited',
        `Detalles del pedido ${updatedOrder.orderNumber} actualizados`,
        orderId,
        updatedOrder.orderNumber
      );

      await refreshData();
      success(`Pedido ${updatedOrder.orderNumber} actualizado correctamente.`);
      return updatedOrder;
    } catch (err: any) {
      error(`Error al actualizar el pedido: ${err.message}`);
      throw err;
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus, notes?: string): Promise<void> => {
    try {
      const existing = await db.orders.get(orderId);
      if (!existing) throw new Error('Pedido no encontrado');

      if (existing.status === newStatus) return;

      const previousStatusLabel = STATUS_CONFIG[existing.status]?.label || existing.status;
      const newStatusLabel = STATUS_CONFIG[newStatus]?.label || newStatus;

      const updated: Order = {
        ...existing,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };

      await db.orders.put(updated);

      let activityType: ActivityEvent['type'] = 'status_changed';
      if (newStatus === 'entregado') activityType = 'order_delivered';
      if (newStatus === 'cancelado') activityType = 'order_cancelled';

      const desc = notes
        ? `Estado del pedido ${existing.orderNumber} cambió de "${previousStatusLabel}" a "${newStatusLabel}". Nota: ${notes}`
        : `Estado del pedido ${existing.orderNumber} cambió de "${previousStatusLabel}" a "${newStatusLabel}"`;

      await logActivity(activityType, desc, orderId, existing.orderNumber);

      await refreshData();
      success(`Pedido ${existing.orderNumber} marcado como "${newStatusLabel}".`);
    } catch (err: any) {
      error(`Error al actualizar estado: ${err.message}`);
      throw err;
    }
  };

  const addPayment = async (
    orderId: string,
    paymentData: Omit<Payment, 'id' | 'orderId' | 'createdAt'>
  ): Promise<Payment> => {
    try {
      const order = await db.orders.get(orderId);
      if (!order) throw new Error('Pedido no encontrado');

      if (paymentData.amount <= 0) {
        throw new Error('El importe del pago debe ser mayor a 0');
      }

      const paymentRecord: Payment = {
        ...paymentData,
        id: generateId(),
        orderId,
        createdAt: new Date().toISOString(),
      };

      await db.payments.add(paymentRecord);

      const allPayments = [...order.payments, paymentRecord];
      const paidAmount = calculateTotalPaid(allPayments);
      const pendingBalance = calculatePendingBalance(order.totalAmount, paidAmount);

      const updatedOrder: Order = {
        ...order,
        payments: allPayments,
        paidAmount,
        pendingBalance,
        updatedAt: new Date().toISOString(),
      };

      await db.orders.put(updatedOrder);

      await logActivity(
        'payment_added',
        `Pago de $${paymentData.amount.toFixed(2)} MXN registrado para el pedido ${order.orderNumber} (${paymentData.method})`,
        orderId,
        order.orderNumber
      );

      await refreshData();
      success(`Pago de $${paymentData.amount.toFixed(2)} MXN registrado con éxito.`);
      return paymentRecord;
    } catch (err: any) {
      error(`Error al registrar pago: ${err.message}`);
      throw err;
    }
  };

  const rescheduleDelivery = async (
    orderId: string,
    newDate: string,
    newTime?: string,
    reason?: string
  ): Promise<void> => {
    try {
      const order = await db.orders.get(orderId);
      if (!order) throw new Error('Pedido no encontrado');

      const oldDate = order.deliveryDate;
      const updated: Order = {
        ...order,
        deliveryDate: newDate,
        deliveryTime: newTime || order.deliveryTime,
        updatedAt: new Date().toISOString(),
      };

      await db.orders.put(updated);

      const noteText = reason ? `. Motivo: ${reason}` : '';
      await logActivity(
        'delivery_rescheduled',
        `Fecha de entrega del pedido ${order.orderNumber} reprogramada de ${oldDate} a ${newDate}${noteText}`,
        orderId,
        order.orderNumber
      );

      await refreshData();
      info(`Fecha de entrega actualizada para ${order.orderNumber}.`);
    } catch (err: any) {
      error(`Error al reprogramar entrega: ${err.message}`);
      throw err;
    }
  };

  const cancelOrder = async (orderId: string, reason?: string): Promise<void> => {
    try {
      await updateOrderStatus(orderId, 'cancelado', reason);
    } catch (err: any) {
      error(`Error al cancelar pedido: ${err.message}`);
      throw err;
    }
  };

  const createCustomer = async (
    customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Customer> => {
    try {
      const newCustomer: Customer = {
        ...customerData,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.customers.add(newCustomer);
      await refreshData();
      success(`Cliente ${newCustomer.name} agregado.`);
      return newCustomer;
    } catch (err: any) {
      error(`Error al crear cliente: ${err.message}`);
      throw err;
    }
  };

  const updateCustomer = async (
    customerId: string,
    customerData: Partial<Customer>
  ): Promise<Customer> => {
    try {
      const existing = await db.customers.get(customerId);
      if (!existing) throw new Error('Cliente no encontrado');

      const updatedCustomer: Customer = {
        ...existing,
        ...customerData,
        updatedAt: new Date().toISOString(),
      };

      await db.customers.put(updatedCustomer);

      // If customer name or phone changed, also sync customerName and customerPhone in related orders
      if (customerData.name || customerData.phone) {
        const relatedOrders = await db.orders.where('customerId').equals(customerId).toArray();
        if (relatedOrders.length > 0) {
          for (const order of relatedOrders) {
            order.customerName = customerData.name || order.customerName;
            if (customerData.phone !== undefined) {
              order.customerPhone = customerData.phone;
            }
            await db.orders.put(order);
          }
        }
      }

      await refreshData();
      success(`Información de ${updatedCustomer.name} actualizada.`);
      return updatedCustomer;
    } catch (err: any) {
      error(`Error al actualizar cliente: ${err.message}`);
      throw err;
    }
  };

  const deleteCustomer = async (customerId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const relatedOrders = await db.orders.where('customerId').equals(customerId).toArray();
      const activeOrders = relatedOrders.filter((o) => o.status !== 'entregado' && o.status !== 'cancelado');

      if (activeOrders.length > 0) {
        const msg = `No se puede eliminar al cliente porque tiene ${activeOrders.length} pedido(s) activo(s).`;
        error(msg);
        return { success: false, message: msg };
      }

      await db.customers.delete(customerId);
      await refreshData();
      success('Cliente eliminado del directorio.');
      return { success: true, message: 'Cliente eliminado.' };
    } catch (err: any) {
      error(`Error al eliminar cliente: ${err.message}`);
      return { success: false, message: err.message };
    }
  };

  const updateSettingsHandler = async (newSettings: Partial<BusinessSettings>): Promise<void> => {
    try {
      const updated = await saveSettings(newSettings);
      setSettings(updated);
      success('Configuración del negocio guardada.');
    } catch (err: any) {
      error(`Error al guardar configuración: ${err.message}`);
    }
  };

  const resetDemoDataHandler = async (): Promise<void> => {
    try {
      await seedDemoData(true);
      await refreshData();
      success('Datos de demostración del Taller de Ejemplo restaurados.');
    } catch (err: any) {
      error(`Error al restaurar ejemplos: ${err.message}`);
    }
  };

  const wipeDataHandler = async (): Promise<void> => {
    try {
      await wipeAllData();
      await refreshData();
      info('Todos los datos locales han sido borrados. Taller reiniciado.');
    } catch (err: any) {
      error(`Error al limpiar datos: ${err.message}`);
    }
  };

  const exportDataHandler = async (): Promise<string> => {
    return await exportDatabaseToJson();
  };

  const importDataHandler = async (jsonStr: string): Promise<{ success: boolean; message: string }> => {
    const result = await importDatabaseFromJson(jsonStr);
    if (result.success) {
      await refreshData();
      success(result.message);
    } else {
      error(result.message);
    }
    return result;
  };

  return (
    <HiloContext.Provider
      value={{
        orders,
        customers,
        activities,
        settings,
        loading,
        refreshData,
        createOrder,
        updateOrder,
        updateOrderStatus,
        addPayment,
        rescheduleDelivery,
        cancelOrder,
        createCustomer,
        updateCustomer,
        deleteCustomer,
        updateSettings: updateSettingsHandler,
        resetDemoData: resetDemoDataHandler,
        wipeData: wipeDataHandler,
        exportData: exportDataHandler,
        importData: importDataHandler,
      }}
    >
      {children}
    </HiloContext.Provider>
  );
};

export function useHilo() {
  const context = useContext(HiloContext);
  if (!context) {
    throw new Error('useHilo must be used within a HiloProvider');
  }
  return context;
}
