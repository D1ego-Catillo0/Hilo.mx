import {
  calculateItemTotal,
  calculateOrderTotal,
  calculateTotalPaid,
  calculatePendingBalance,
  isOrderOverdue,
  formatCurrency,
  filterAndSortOrders,
} from './orderCalculations';
import { Order, OrderItem, Payment } from '../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`TEST FAILED: ${message}`);
  }
}

function runTests() {
  console.log('🧪 Iniciando pruebas automatizadas de funciones financieras y de dominio...');

  // 1. calculateItemTotal
  assert(calculateItemTotal(3, 150) === 450, '3 * 150 debe ser 450');
  assert(calculateItemTotal(2.5, 10.33) === 25.83, '2.5 * 10.33 redondeado debe ser 25.83');
  assert(calculateItemTotal(0, 500) === 0, '0 cantidad debe ser 0');
  console.log('  ✓ calculateItemTotal passed');

  // 2. calculateOrderTotal
  const items: OrderItem[] = [
    { id: '1', name: 'Pastel', quantity: 1, unitPrice: 650, totalPrice: 650 },
    { id: '2', name: 'Vela mágica', quantity: 3, unitPrice: 25, totalPrice: 75 },
    { id: '3', name: 'Entrega a domicilio', quantity: 1, unitPrice: 80, totalPrice: 80 },
  ];
  assert(calculateOrderTotal(items) === 805, 'Suma de conceptos debe ser 805');
  assert(calculateOrderTotal([]) === 0, 'Lista vacía debe ser 0');
  console.log('  ✓ calculateOrderTotal passed');

  // 3. calculateTotalPaid
  const payments: Payment[] = [
    { id: 'p1', orderId: 'ord-1', amount: 300, date: '2026-10-10', method: 'transferencia', createdAt: '' },
    { id: 'p2', orderId: 'ord-1', amount: 200, date: '2026-10-12', method: 'efectivo', createdAt: '' },
  ];
  assert(calculateTotalPaid(payments) === 500, 'Suma de pagos debe ser 500');
  assert(calculateTotalPaid([]) === 0, 'Sin pagos debe ser 0');
  console.log('  ✓ calculateTotalPaid passed');

  // 4. calculatePendingBalance
  assert(calculatePendingBalance(805, 500) === 305, '805 - 500 debe dar 305');
  assert(calculatePendingBalance(805, 805) === 0, 'Liquidado debe dar 0');
  assert(calculatePendingBalance(805, 1000) === 0, 'Pagos mayores no deben generar saldo negativo sin reembolso');
  console.log('  ✓ calculatePendingBalance passed');

  // 5. isOrderOverdue
  assert(isOrderOverdue('2026-10-10', 'en_preparacion', '2026-10-17') === true, 'Fecha anterior y no entregado debe ser atrasado');
  assert(isOrderOverdue('2026-10-10', 'entregado', '2026-10-17') === false, 'Entregado nunca está atrasado');
  assert(isOrderOverdue('2026-10-10', 'cancelado', '2026-10-17') === false, 'Cancelado nunca está atrasado');
  assert(isOrderOverdue('2026-10-20', 'en_preparacion', '2026-10-17') === false, 'Fecha futura no está atrasada');
  console.log('  ✓ isOrderOverdue passed');

  // 6. formatCurrency
  const formatted = formatCurrency(1250.5);
  assert(formatted.includes('1,250.50'), 'Debe formatear con comas y 2 decimales');
  console.log('  ✓ formatCurrency passed');

  // 7. filterAndSortOrders
  const sampleOrders: Order[] = [
    {
      id: 'o1',
      orderNumber: 'PED-101',
      customerId: 'c1',
      customerName: 'Ana Ruiz',
      customerPhone: '55 1111 2222',
      status: 'pendiente',
      channel: 'whatsapp',
      createdAt: '2026-10-10T10:00:00Z',
      deliveryDate: '2026-10-25',
      items: [{ id: 'i1', name: 'Pastel Fresa', quantity: 1, unitPrice: 500, totalPrice: 500 }],
      customization: { description: 'Pastel sin azúcar' },
      totalAmount: 500,
      payments: [],
      paidAmount: 0,
      pendingBalance: 500,
      updatedAt: '',
    },
    {
      id: 'o2',
      orderNumber: 'PED-102',
      customerId: 'c2',
      customerName: 'Carlos Slim',
      customerPhone: '55 9999 8888',
      status: 'listo',
      channel: 'presencial',
      createdAt: '2026-10-12T10:00:00Z',
      deliveryDate: '2026-10-15',
      items: [{ id: 'i2', name: 'Playera bordada', quantity: 2, unitPrice: 200, totalPrice: 400 }],
      customization: { description: 'Talla M' },
      totalAmount: 400,
      payments: [{ id: 'p1', orderId: 'o2', amount: 400, date: '2026-10-12', method: 'efectivo', createdAt: '' }],
      paidAmount: 400,
      pendingBalance: 0,
      updatedAt: '',
    },
  ];

  const searchRes = filterAndSortOrders(sampleOrders, {
    searchQuery: 'ruiz',
    pendingBalanceOnly: false,
    overdueOnly: false,
    sortBy: 'delivery_asc',
  });
  assert(searchRes.length === 1 && searchRes[0].orderNumber === 'PED-101', 'Búsqueda por cliente Ruiz debe encontrar PED-101');

  const pendingRes = filterAndSortOrders(sampleOrders, {
    searchQuery: '',
    pendingBalanceOnly: true,
    overdueOnly: false,
    sortBy: 'delivery_asc',
  });
  assert(pendingRes.length === 1 && pendingRes[0].orderNumber === 'PED-101', 'Filtro con saldo pendiente debe excluir pedidos liquidados');

  console.log('  ✓ filterAndSortOrders passed');
  console.log('🎉 ¡Todas las pruebas unitarias pasaron con éxito!');
}

runTests();
