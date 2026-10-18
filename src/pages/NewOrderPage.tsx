import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Calendar,
  Clock,
  User,
  CreditCard,
  FileText,
  AlertCircle,
  HelpCircle,
  Check,
} from 'lucide-react';
import { useHilo } from '../context/HiloContext';
import { OrderItem, OriginChannel, PaymentMethod, Customer } from '../types';
import {
  calculateItemTotal,
  calculateOrderTotal,
  calculatePendingBalance,
  formatCurrency,
  getTodayDateString,
  CHANNEL_CONFIG,
  PAYMENT_METHOD_CONFIG,
} from '../utils/orderCalculations';

export const NewOrderPage: React.FC = () => {
  const { customers, createOrder, createCustomer, settings } = useHilo();
  const navigate = useNavigate();

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isCreatingNewCustomer, setIsCreatingNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');

  const [channel, setChannel] = useState<OriginChannel>('whatsapp');
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [deliveryTime, setDeliveryTime] = useState<string>('17:00');

  // Items State
  const [items, setItems] = useState<OrderItem[]>([
    {
      id: 'item-1',
      name: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
    },
  ]);

  // Customization
  const [description, setDescription] = useState('');
  const [specifications, setSpecifications] = useState('');
  const [specialChanges, setSpecialChanges] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // Payment
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transferencia');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState<string>(getTodayDateString());

  // Errors & Submit State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Set default delivery date: 3 days from today
  useEffect(() => {
    const today = new Date();
    today.setDate(today.getDate() + 3);
    const yr = today.getFullYear();
    const mo = String(today.getMonth() + 1).padStart(2, '0');
    const da = String(today.getDate()).padStart(2, '0');
    setDeliveryDate(`${yr}-${mo}-${da}`);
  }, []);

  // Recalculate totals
  const orderTotal = calculateOrderTotal(items);
  const pendingBalance = calculatePendingBalance(orderTotal, advanceAmount);

  // Handle Item Changes
  const handleItemChange = (index: number, field: keyof OrderItem, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index], [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = field === 'quantity' ? Number(value) : item.quantity;
        const price = field === 'unitPrice' ? Number(value) : item.unitPrice;
        item.totalPrice = calculateItemTotal(qty, price);
      }
      copy[index] = item;
      return copy;
    });
  };

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        name: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Quick Customer Creation
  const handleCreateCustomerInline = async () => {
    if (!newCustName.trim()) {
      setErrors((prev) => ({ ...prev, newCustName: 'Ingresa el nombre del cliente' }));
      return;
    }
    try {
      const created = await createCustomer({
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        email: newCustEmail.trim() || undefined,
      });
      setSelectedCustomerId(created.id);
      setIsCreatingNewCustomer(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustEmail('');
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.customer;
        delete copy.newCustName;
        return copy;
      });
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, newCustName: err.message }));
    }
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedCustomerId && !isCreatingNewCustomer) {
      newErrors.customer = 'Selecciona un cliente o crea uno nuevo';
    }

    if (!deliveryDate) {
      newErrors.deliveryDate = 'La fecha de entrega es requerida';
    }

    if (items.length === 0) {
      newErrors.items = 'Debes agregar al menos un concepto';
    } else {
      items.forEach((item, idx) => {
        if (!item.name.trim()) {
          newErrors[`item_${idx}_name`] = 'El nombre del concepto es obligatorio';
        }
        if (item.quantity <= 0) {
          newErrors[`item_${idx}_qty`] = 'La cantidad debe ser mayor a 0';
        }
        if (item.unitPrice < 0) {
          newErrors[`item_${idx}_price`] = 'El precio no puede ser negativo';
        }
      });
    }

    if (advanceAmount < 0) {
      newErrors.advance = 'El anticipo no puede ser negativo';
    }

    if (advanceAmount > orderTotal && orderTotal > 0) {
      newErrors.advance = 'El anticipo supera el total del pedido. Ajusta el importe.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isCreatingNewCustomer) {
      await handleCreateCustomerInline();
      return;
    }

    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setSubmitting(true);
      const customer = customers.find((c) => c.id === selectedCustomerId);
      if (!customer) throw new Error('Cliente seleccionado no válido');

      const initialStatus = advanceAmount > 0 ? 'confirmado' : 'pendiente';

      const initialPaymentData =
        advanceAmount > 0
          ? {
              amount: advanceAmount,
              date: paymentDate || getTodayDateString(),
              method: paymentMethod,
              notes: paymentNotes || 'Anticipo inicial registrado al crear el pedido',
            }
          : undefined;

      const createdOrder = await createOrder(
        {
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          status: initialStatus,
          channel,
          createdAt: new Date().toISOString(),
          deliveryDate,
          deliveryTime: deliveryTime || undefined,
          items,
          customization: {
            description,
            specifications: specifications || undefined,
            specialChanges: specialChanges || undefined,
            internalNotes: internalNotes || undefined,
          },
          payments: [],
        },
        initialPaymentData
      );

      navigate(`/pedidos/${createdOrder.id}`);
    } catch (err: any) {
      console.error(err);
      setErrors((prev) => ({ ...prev, submit: err.message || 'Error al guardar el pedido' }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>
        <span className="text-xs text-slate-400">Paso 1 de 1 · Registro de nuevo encargo</span>
      </div>

      <div className="bg-white rounded-lg border border-[#E4E7EC] shadow-2xs overflow-hidden">
        <div className="p-6 border-b border-[#E4E7EC]">
          <h1 className="text-lg font-bold text-[#172033]">Registrar nuevo pedido</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Ingresa los datos del cliente, especificaciones del trabajo y anticipo inicial.
          </p>
        </div>

        {errors.submit && (
          <div className="m-6 p-4 rounded-md bg-rose-50 border border-rose-200 text-xs text-[#D92D20] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errors.submit}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Section 1: Cliente & Origen */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-[#3157D5]" />
              <span>1. Cliente y canal de origen</span>
            </h2>

            {!isCreatingNewCustomer ? (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-8">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Cliente <span className="text-[#D92D20]">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewCustomer(true)}
                      className="text-xs font-semibold text-[#3157D5] hover:underline"
                    >
                      + Nuevo cliente
                    </button>
                  </div>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => {
                      setSelectedCustomerId(e.target.value);
                      setErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.customer;
                        return copy;
                      });
                    }}
                    className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3157D5] ${
                      errors.customer ? 'border-[#D92D20]' : 'border-slate-200'
                    }`}
                  >
                    <option value="">-- Selecciona un cliente registrado --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))}
                  </select>
                  {errors.customer && (
                    <p className="text-[11px] text-[#D92D20] mt-1">{errors.customer}</p>
                  )}
                </div>

                <div className="sm:col-span-4">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Canal de origen
                  </label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as OriginChannel)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3157D5]"
                  >
                    {Object.entries(CHANNEL_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              /* Inline new customer box */
              <div className="p-4 bg-blue-50/50 border border-blue-200/80 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Crear cliente nuevo</span>
                  <button
                    type="button"
                    onClick={() => setIsCreatingNewCustomer(false)}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Cancelar y elegir existente
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Nombre completo *
                    </label>
                    <input
                      type="text"
                      value={newCustName}
                      onChange={(e) => setNewCustName(e.target.value)}
                      placeholder="Ej. Laura Gómez"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#3157D5]"
                    />
                    {errors.newCustName && (
                      <p className="text-[10px] text-[#D92D20] mt-1">{errors.newCustName}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Teléfono / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={newCustPhone}
                      onChange={(e) => setNewCustPhone(e.target.value)}
                      placeholder="Ej. 55 1234 5678"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#3157D5]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Correo electrónico (opcional)
                    </label>
                    <input
                      type="email"
                      value={newCustEmail}
                      onChange={(e) => setNewCustEmail(e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#3157D5]"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleCreateCustomerInline}
                    className="px-3 py-1.5 bg-[#3157D5] hover:bg-[#2646B0] text-white text-xs font-semibold rounded shadow-xs"
                  >
                    Guardar cliente y continuar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Fecha y Hora de Entrega */}
          <div className="pt-2 border-t border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#3157D5]" />
              <span>2. Programación de entrega</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Fecha de entrega <span className="text-[#D92D20]">*</span>
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3157D5] font-mono ${
                    errors.deliveryDate ? 'border-[#D92D20]' : 'border-slate-200'
                  }`}
                />
                {errors.deliveryDate && (
                  <p className="text-[11px] text-[#D92D20] mt-1">{errors.deliveryDate}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Hora acordada o estimada
                </label>
                <div className="relative">
                  <input
                    type="time"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3157D5] font-mono"
                  />
                  <Clock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Conceptos / Productos */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#3157D5]" />
                <span>3. Productos o conceptos a fabricar</span>
              </h2>

              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#3157D5] hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar concepto</span>
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-lg space-y-2 relative"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-6">
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Concepto / Producto #{index + 1} *
                      </label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                        placeholder="Ej. Pastel de chocolate artesanal, Playera serigrafiada..."
                        className={`w-full px-3 py-1.5 text-xs bg-white border rounded-md focus:outline-none focus:ring-1 focus:ring-[#3157D5] ${
                          errors[`item_${index}_name`] ? 'border-[#D92D20]' : 'border-slate-200'
                        }`}
                      />
                      {errors[`item_${index}_name`] && (
                        <p className="text-[10px] text-[#D92D20] mt-0.5">{errors[`item_${index}_name`]}</p>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Cantidad *
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#3157D5] font-mono tabular-nums"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Precio Unitario *
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
                          $
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                          className="w-full pl-6 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#3157D5] font-mono tabular-nums"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-4 sm:pt-0">
                      <div className="sm:text-right">
                        <span className="text-[10px] text-slate-400 block uppercase">Subtotal</span>
                        <span className="text-xs font-bold font-mono text-slate-800">
                          {formatCurrency(item.totalPrice, settings.currencySymbol)}
                        </span>
                      </div>

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(index)}
                          className="p-1.5 text-slate-400 hover:text-[#D92D20] hover:bg-rose-50 rounded transition-colors ml-2"
                          title="Eliminar concepto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={item.description || ''}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      placeholder="Detalles específicos de este ítem (sabor, talla, acabado opcional)..."
                      className="w-full px-3 py-1 text-[11px] bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#3157D5] text-slate-600"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Total Summary Row */}
            <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Total presupuestado del encargo:</span>
              <span className="text-base font-bold font-mono text-slate-900 tabular-nums">
                {formatCurrency(orderTotal, settings.currencySymbol)}
              </span>
            </div>
          </div>

          {/* Section 4: Personalización y Especificaciones */}
          <div className="pt-2 border-t border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#3157D5]" />
              <span>4. Especificaciones del encargo y personalización</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Descripción general del trabajo
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej. Pastel de bodas estilo vintage con flores naturales y cubierta lisa..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3157D5]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Características técnicas (colores, medidas, materiales)
                  </label>
                  <textarea
                    rows={2}
                    value={specifications}
                    onChange={(e) => setSpecifications(e.target.value)}
                    placeholder="Ej. Medidas 30x40cm, tela lino crudo, tonos tierra..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3157D5]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Notas internas del taller (privadas)
                  </label>
                  <textarea
                    rows={2}
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Ej. Apartar material el martes temprano; cliente recoge con vehículo grande..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3157D5]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Anticipo y Condiciones de Pago */}
          <div className="pt-2 border-t border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#3157D5]" />
              <span>5. Registro de anticipo inicial</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Anticipo recibido hoy
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3157D5] font-mono tabular-nums"
                  />
                </div>
                {errors.advance && (
                  <p className="text-[11px] text-[#D92D20] mt-1">{errors.advance}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Método de pago
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  disabled={advanceAmount <= 0}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3157D5] disabled:opacity-50"
                >
                  {Object.entries(PAYMENT_METHOD_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Referencia / Nota del anticipo
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  disabled={advanceAmount <= 0}
                  placeholder="Ej. Transferencia SPEI Banorte, Efectivo..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3157D5] disabled:opacity-50"
                />
              </div>
            </div>

            {/* Financial Ledger Balance Indicator */}
            <div className="mt-4 p-4 rounded-lg border border-blue-100 bg-blue-50/40 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center sm:text-left">
              <div>
                <span className="text-[11px] text-slate-500 block">Total del pedido:</span>
                <span className="text-sm font-bold font-mono text-slate-900">
                  {formatCurrency(orderTotal, settings.currencySymbol)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Anticipo registrado:</span>
                <span className="text-sm font-bold font-mono text-[#16845B]">
                  {formatCurrency(advanceAmount, settings.currencySymbol)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Saldo por liquidar a la entrega:</span>
                <span className="text-sm font-bold font-mono text-[#B7791F]">
                  {formatCurrency(pendingBalance, settings.currencySymbol)}
                </span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-md transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-[#3157D5] hover:bg-[#2646B0] text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{submitting ? 'Guardando...' : 'Crear pedido'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
