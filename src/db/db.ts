import Dexie, { Table } from 'dexie';
import { Customer, Order, Payment, ActivityEvent, BusinessSettings } from '../types';
import { calculateOrderTotal, calculateTotalPaid, calculatePendingBalance } from '../utils/orderCalculations';
import { format, subDays, addDays } from 'date-fns';

export class HiloDatabase extends Dexie {
  customers!: Table<Customer, string>;
  orders!: Table<Order, string>;
  payments!: Table<Payment, string>;
  activities!: Table<ActivityEvent, string>;
  settings!: Table<BusinessSettings, string>;

  constructor() {
    super('HiloDatabase');
    this.version(1).stores({
      customers: 'id, name, phone, email, createdAt',
      orders: 'id, orderNumber, customerId, status, deliveryDate, createdAt, totalAmount, pendingBalance',
      payments: 'id, orderId, date, method, createdAt',
      activities: 'id, orderId, timestamp, type',
      settings: 'id',
    });
  }
}

export const db = new HiloDatabase();

export const DEFAULT_SETTINGS: BusinessSettings = {
  id: 'current_settings',
  businessName: 'Taller de Ejemplo',
  tagline: 'Diseño, Confección y Repostería Creativa',
  currency: 'MXN',
  currencySymbol: '$',
  timezone: 'America/Mexico_City',
  dateFormat: 'DD/MM/AAAA',
  orderPrefix: 'PED-',
  nextOrderNumber: 108,
  demoDataLoaded: true,
};

export async function getSettings(): Promise<BusinessSettings> {
  const existing = await db.settings.get('current_settings');
  if (existing) return existing;
  await db.settings.put(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Partial<BusinessSettings>): Promise<BusinessSettings> {
  const current = await getSettings();
  const updated: BusinessSettings = { ...current, ...settings, id: 'current_settings' };
  await db.settings.put(updated);
  return updated;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export async function getNextOrderNumber(): Promise<string> {
  const settings = await getSettings();
  const nextNum = settings.nextOrderNumber || 101;
  const prefix = settings.orderPrefix || 'PED-';
  const orderNumber = `${prefix}${String(nextNum).padStart(3, '0')}`;
  await saveSettings({ nextOrderNumber: nextNum + 1 });
  return orderNumber;
}

export async function logActivity(
  type: ActivityEvent['type'],
  description: string,
  orderId?: string,
  orderNumber?: string
): Promise<ActivityEvent> {
  const event: ActivityEvent = {
    id: generateId(),
    orderId,
    orderNumber,
    type,
    description,
    timestamp: new Date().toISOString(),
  };
  await db.activities.add(event);
  return event;
}

export async function seedDemoData(force = false): Promise<void> {
  const count = await db.orders.count();
  if (count > 0 && !force) {
    return;
  }

  // Clear existing
  await db.transaction('rw', [db.customers, db.orders, db.payments, db.activities, db.settings], async () => {
    await db.customers.clear();
    await db.orders.clear();
    await db.payments.clear();
    await db.activities.clear();

    const today = new Date();
    const dateFmt = (d: Date) => format(d, 'yyyy-MM-dd');
    const isoFmt = (d: Date) => d.toISOString();

    // 1. Clientes
    const cust1: Customer = {
      id: 'cust-1',
      name: 'Sofía Morales',
      phone: '55 4192 8831',
      email: 'sofia.morales@ejemplo.mx',
      notes: 'Cliente frecuente. Prefiere comunicarse por WhatsApp. Puntual en recojo.',
      createdAt: isoFmt(subDays(today, 25)),
      updatedAt: isoFmt(subDays(today, 2)),
    };
    const cust2: Customer = {
      id: 'cust-2',
      name: 'Rodrigo Mendoza',
      phone: '81 1234 5678',
      email: 'rodrigo.mendoza@empresa.mx',
      notes: 'Encargos corporativos y souvenirs impresos para eventos.',
      createdAt: isoFmt(subDays(today, 18)),
      updatedAt: isoFmt(subDays(today, 5)),
    };
    const cust3: Customer = {
      id: 'cust-3',
      name: 'Camila Villalobos',
      phone: '33 9876 5432',
      email: 'camila.v@correo.mx',
      notes: 'Le gustan los tonos pastel y empaques de regalo especiales.',
      createdAt: isoFmt(subDays(today, 12)),
      updatedAt: isoFmt(subDays(today, 1)),
    };
    const cust4: Customer = {
      id: 'cust-4',
      name: 'Mariana Garza',
      phone: '55 8765 4321',
      notes: 'Pide arreglos florales y cajas sorpresa.',
      createdAt: isoFmt(subDays(today, 8)),
      updatedAt: isoFmt(subDays(today, 3)),
    };

    await db.customers.bulkAdd([cust1, cust2, cust3, cust4]);

    // Demo Orders
    // Order 1: Atrasado (Overdue) - 2 days ago, partially paid
    const p1Amount = 450;
    const o1Total = 1200;
    const order1: Order = {
      id: 'ord-101',
      orderNumber: 'PED-101',
      customerId: cust1.id,
      customerName: cust1.name,
      customerPhone: cust1.phone,
      status: 'en_preparacion',
      channel: 'whatsapp',
      createdAt: isoFmt(subDays(today, 7)),
      deliveryDate: dateFmt(subDays(today, 2)),
      deliveryTime: '16:00',
      items: [
        {
          id: 'item-101-1',
          name: 'Pastel de Red Velvet 3 Pisos',
          description: 'Decoración con betún de queso crema y rosas comestibles',
          quantity: 1,
          unitPrice: 1200,
          totalPrice: 1200,
        },
      ],
      customization: {
        description: 'Pastel temático para 30 personas. Letrero en acrílico dorado "Felices 30".',
        specifications: 'Colores: Borgoña y blanco. Sin frutos secos por alergia familiar.',
        internalNotes: 'Cliente llamó avisando que vendrá con flete propio. Falta aplicar la cubierta final.',
      },
      totalAmount: o1Total,
      paidAmount: p1Amount,
      pendingBalance: o1Total - p1Amount,
      payments: [
        {
          id: 'pay-101',
          orderId: 'ord-101',
          amount: p1Amount,
          date: dateFmt(subDays(today, 7)),
          method: 'transferencia',
          notes: 'Anticipo del 35% vía SPEI BBVA',
          createdAt: isoFmt(subDays(today, 7)),
        },
      ],
      updatedAt: isoFmt(subDays(today, 2)),
    };

    // Order 2: Entrega Hoy - Listo para entregar, saldo pendiente
    const o2Total = 850;
    const p2Amount = 400;
    const order2: Order = {
      id: 'ord-102',
      orderNumber: 'PED-102',
      customerId: cust2.id,
      customerName: cust2.name,
      customerPhone: cust2.phone,
      status: 'listo',
      channel: 'presencial',
      createdAt: isoFmt(subDays(today, 4)),
      deliveryDate: dateFmt(today),
      deliveryTime: '18:30',
      items: [
        {
          id: 'item-102-1',
          name: 'Playeras Personalizadas en Serigrafía',
          description: 'Algodón peinado negro con logo frontal en vinil plateado',
          quantity: 5,
          unitPrice: 170,
          totalPrice: 850,
        },
      ],
      customization: {
        description: '5 playeras tallas: 2 M, 2 L, 1 XL con isotipo del equipo de diseño.',
        specifications: 'Tinta vinil termotransferible mate. Planchado a doble pasada.',
        internalNotes: 'Empacado en bolsa kraft con etiqueta de Hilo Taller.',
      },
      totalAmount: o2Total,
      paidAmount: p2Amount,
      pendingBalance: o2Total - p2Amount,
      payments: [
        {
          id: 'pay-102',
          orderId: 'ord-102',
          amount: p2Amount,
          date: dateFmt(subDays(today, 4)),
          method: 'efectivo',
          notes: 'Anticipo recibido en mostrador',
          createdAt: isoFmt(subDays(today, 4)),
        },
      ],
      updatedAt: isoFmt(today),
    };

    // Order 3: Próxima entrega en 2 días - Confirmado con 50% anticipo
    const o3Total = 1500;
    const p3Amount = 750;
    const order3: Order = {
      id: 'ord-103',
      orderNumber: 'PED-103',
      customerId: cust3.id,
      customerName: cust3.name,
      customerPhone: cust3.phone,
      status: 'confirmado',
      channel: 'instagram',
      createdAt: isoFmt(subDays(today, 3)),
      deliveryDate: dateFmt(addDays(today, 2)),
      deliveryTime: '12:00',
      items: [
        {
          id: 'item-103-1',
          name: 'Caja Regalo Sorpresa Madera y Resina',
          description: 'Caja grabada a láser con taza cerámica y selección gourmet',
          quantity: 1,
          unitPrice: 1100,
          totalPrice: 1100,
        },
        {
          id: 'item-103-2',
          name: 'Tarjeta Caligráfica Personalizada',
          description: 'Papel de algodón con tinta dorada a mano',
          quantity: 1,
          unitPrice: 400,
          totalPrice: 400,
        },
      ],
      customization: {
        description: 'Texto grabado en la tapa: "Gracias por tu amistad infinita - Mariana".',
        specifications: 'Madera de pino barniz nogal claro, cinta de yute con lavanda seca.',
        internalNotes: 'Ya se tiene el grabado láser. Falta montar la selección de chocolates.',
      },
      totalAmount: o3Total,
      paidAmount: p3Amount,
      pendingBalance: o3Total - p3Amount,
      payments: [
        {
          id: 'pay-103',
          orderId: 'ord-103',
          amount: p3Amount,
          date: dateFmt(subDays(today, 3)),
          method: 'transferencia',
          notes: 'Anticipo 50% vía SPEI',
          createdAt: isoFmt(subDays(today, 3)),
        },
      ],
      updatedAt: isoFmt(subDays(today, 1)),
    };

    // Order 4: Pendiente - Recién recibido sin anticipo
    const o4Total = 620;
    const order4: Order = {
      id: 'ord-104',
      orderNumber: 'PED-104',
      customerId: cust4.id,
      customerName: cust4.name,
      customerPhone: cust4.phone,
      status: 'pendiente',
      channel: 'whatsapp',
      createdAt: isoFmt(today),
      deliveryDate: dateFmt(addDays(today, 5)),
      items: [
        {
          id: 'item-104-1',
          name: 'Arreglo Floral en Cilindro de Cerámica',
          description: 'Girasoles, mini rosas y eucalipto fresco',
          quantity: 1,
          unitPrice: 620,
          totalPrice: 620,
        },
      ],
      customization: {
        description: 'Desea enviar a domicilio a su mamá. Pendiente confirmar dirección exacta.',
        specifications: 'Colores cálidos amarillos y durazno.',
        internalNotes: 'Se envió cotización por WhatsApp, en espera de comprobante de anticipo.',
      },
      totalAmount: o4Total,
      paidAmount: 0,
      pendingBalance: o4Total,
      payments: [],
      updatedAt: isoFmt(today),
    };

    // Order 5: Completamente pagado y Entregado (Historial)
    const o5Total = 2100;
    const order5: Order = {
      id: 'ord-105',
      orderNumber: 'PED-105',
      customerId: cust1.id,
      customerName: cust1.name,
      customerPhone: cust1.phone,
      status: 'entregado',
      channel: 'whatsapp',
      createdAt: isoFmt(subDays(today, 15)),
      deliveryDate: dateFmt(subDays(today, 5)),
      deliveryTime: '15:00',
      items: [
        {
          id: 'item-105-1',
          name: 'Mantelería y Servilletas Bordadas (Juego 12)',
          description: 'Lino rústico con monograma familiar bordado a máquina',
          quantity: 1,
          unitPrice: 2100,
          totalPrice: 2100,
        },
      ],
      customization: {
        description: 'Bordado de iniciales "M & G" en hilo plateado.',
        specifications: 'Tela lino color marfil.',
        internalNotes: 'Cliente muy satisfecha, recomendó el taller a sus amigas.',
      },
      totalAmount: o5Total,
      paidAmount: o5Total,
      pendingBalance: 0,
      payments: [
        {
          id: 'pay-105-1',
          orderId: 'ord-105',
          amount: 1000,
          date: dateFmt(subDays(today, 15)),
          method: 'transferencia',
          notes: 'Anticipo al encargar',
          createdAt: isoFmt(subDays(today, 15)),
        },
        {
          id: 'pay-105-2',
          orderId: 'ord-105',
          amount: 1100,
          date: dateFmt(subDays(today, 5)),
          method: 'efectivo',
          notes: 'Finiquito al recoger pedido en taller',
          createdAt: isoFmt(subDays(today, 5)),
        },
      ],
      updatedAt: isoFmt(subDays(today, 5)),
    };

    // Order 6: Cancelado
    const order6: Order = {
      id: 'ord-106',
      orderNumber: 'PED-106',
      customerId: cust2.id,
      customerName: cust2.name,
      customerPhone: cust2.phone,
      status: 'cancelado',
      channel: 'telefono',
      createdAt: isoFmt(subDays(today, 10)),
      deliveryDate: dateFmt(subDays(today, 4)),
      items: [
        {
          id: 'item-106-1',
          name: 'Llaveros Acrílicos Grabados (Lote 50)',
          description: 'Corte láser acrílico 3mm con argolla niquelada',
          quantity: 50,
          unitPrice: 25,
          totalPrice: 1250,
        },
      ],
      customization: {
        description: 'Evento corporativo que se canceló por motivos internos de la empresa.',
        internalNotes: 'No se habían adquirido materiales especiales aún. No hubo anticipo.',
      },
      totalAmount: 1250,
      paidAmount: 0,
      pendingBalance: 1250,
      payments: [],
      updatedAt: isoFmt(subDays(today, 8)),
    };

    // Order 7: En preparación para próxima semana
    const o7Total = 980;
    const p7Amount = 500;
    const order7: Order = {
      id: 'ord-107',
      orderNumber: 'PED-107',
      customerId: cust3.id,
      customerName: cust3.name,
      customerPhone: cust3.phone,
      status: 'en_preparacion',
      channel: 'presencial',
      createdAt: isoFmt(subDays(today, 2)),
      deliveryDate: dateFmt(addDays(today, 6)),
      deliveryTime: '17:00',
      items: [
        {
          id: 'item-107-1',
          name: 'Vestido Infantil Ceremonia a Medida',
          description: 'Ajuste de talle y forro de satén suave',
          quantity: 1,
          unitPrice: 980,
          totalPrice: 980,
        },
      ],
      customization: {
        description: 'Vestido para primera comunión. Medidas: Pecho 62cm, Largo falda 75cm.',
        specifications: 'Tela organdí y encaje de algodón.',
        internalNotes: 'Primera prueba de ajuste programada 2 días antes de la entrega.',
      },
      totalAmount: o7Total,
      paidAmount: p7Amount,
      pendingBalance: o7Total - p7Amount,
      payments: [
        {
          id: 'pay-107',
          orderId: 'ord-107',
          amount: p7Amount,
          date: dateFmt(subDays(today, 2)),
          method: 'tarjeta',
          notes: 'Cobro con terminal física en taller',
          createdAt: isoFmt(subDays(today, 2)),
        },
      ],
      updatedAt: isoFmt(subDays(today, 1)),
    };

    await db.orders.bulkAdd([order1, order2, order3, order4, order5, order6, order7]);

    // Add all payments to the payments table
    const allPayments: Payment[] = [
      ...order1.payments,
      ...order2.payments,
      ...order3.payments,
      ...order5.payments,
      ...order7.payments,
    ];
    await db.payments.bulkAdd(allPayments);

    // Initial Activities
    const sampleActivities: ActivityEvent[] = [
      {
        id: 'act-1',
        orderId: order4.id,
        orderNumber: order4.orderNumber,
        type: 'order_created',
        description: `Nuevo encargo ${order4.orderNumber} registrado para ${order4.customerName}`,
        timestamp: isoFmt(today),
      },
      {
        id: 'act-2',
        orderId: order2.id,
        orderNumber: order2.orderNumber,
        type: 'status_changed',
        description: `Pedido ${order2.orderNumber} cambió de estado a "Listo para entregar"`,
        timestamp: isoFmt(today),
      },
      {
        id: 'act-3',
        orderId: order7.id,
        orderNumber: order7.orderNumber,
        type: 'payment_added',
        description: `Anticipo de $500.00 MXN registrado para el pedido ${order7.orderNumber}`,
        timestamp: isoFmt(subDays(today, 2)),
      },
      {
        id: 'act-4',
        orderId: order3.id,
        orderNumber: order3.orderNumber,
        type: 'status_changed',
        description: `Pedido ${order3.orderNumber} confirmado tras recibir anticipo del 50%`,
        timestamp: isoFmt(subDays(today, 3)),
      },
      {
        id: 'act-5',
        orderId: order5.id,
        orderNumber: order5.orderNumber,
        type: 'order_delivered',
        description: `Pedido ${order5.orderNumber} entregado y liquidado en su totalidad`,
        timestamp: isoFmt(subDays(today, 5)),
      },
    ];

    await db.activities.bulkAdd(sampleActivities);
    await db.settings.put(DEFAULT_SETTINGS);
  });
}

export async function exportDatabaseToJson(): Promise<string> {
  const [customers, orders, payments, activities, settings] = await Promise.all([
    db.customers.toArray(),
    db.orders.toArray(),
    db.payments.toArray(),
    db.activities.toArray(),
    getSettings(),
  ]);

  const backupData = {
    app: 'Hilo',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    data: {
      settings,
      customers,
      orders,
      payments,
      activities,
    },
  };

  return JSON.stringify(backupData, null, 2);
}

export async function importDatabaseFromJson(jsonContent: string): Promise<{ success: boolean; message: string }> {
  try {
    const parsed = JSON.parse(jsonContent);
    if (!parsed || !parsed.data) {
      return { success: false, message: 'El archivo JSON no tiene un formato de respaldo válido de Hilo.' };
    }

    const { settings, customers, orders, payments, activities } = parsed.data;

    if (!Array.isArray(customers) || !Array.isArray(orders)) {
      return { success: false, message: 'El archivo carece de colecciones obligatorias (clientes o pedidos).' };
    }

    await db.transaction('rw', [db.customers, db.orders, db.payments, db.activities, db.settings], async () => {
      await db.customers.clear();
      await db.orders.clear();
      await db.payments.clear();
      await db.activities.clear();

      if (customers.length) await db.customers.bulkAdd(customers);
      if (orders.length) await db.orders.bulkAdd(orders);
      if (Array.isArray(payments) && payments.length) await db.payments.bulkAdd(payments);
      if (Array.isArray(activities) && activities.length) await db.activities.bulkAdd(activities);
      if (settings) await db.settings.put({ ...settings, id: 'current_settings' });
    });

    return {
      success: true,
      message: `Restauración exitosa: ${orders.length} pedidos y ${customers.length} clientes importados.`,
    };
  } catch (err: any) {
    return { success: false, message: `Error al procesar el archivo: ${err.message || 'JSON no válido'}` };
  }
}

export async function wipeAllData(): Promise<void> {
  await db.transaction('rw', [db.customers, db.orders, db.payments, db.activities, db.settings], async () => {
    await db.customers.clear();
    await db.orders.clear();
    await db.payments.clear();
    await db.activities.clear();
    const cleanSettings: BusinessSettings = {
      ...DEFAULT_SETTINGS,
      businessName: 'Mi Negocio',
      tagline: 'Pedidos Personalizados',
      nextOrderNumber: 1,
      demoDataLoaded: false,
    };
    await db.settings.put(cleanSettings);
  });
}
