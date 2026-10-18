import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  Package,
  Edit2,
  Trash2,
  ExternalLink,
  DollarSign,
  AlertCircle,
  X,
  Check,
} from 'lucide-react';
import { useHilo } from '../context/HiloContext';
import { Customer } from '../types';
import { formatCurrency, formatDateMX, STATUS_CONFIG } from '../utils/orderCalculations';

export const CustomersPage: React.FC = () => {
  const { customers, orders, settings, createCustomer, updateCustomer, deleteCustomer, loading } =
    useHilo();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Modal State for New/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Delete Confirmation Modal
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q))
    );
  }, [customers, searchQuery]);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setEmail('');
    setNotes('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone || '');
    setEmail(c.email || '');
    setNotes(c.notes || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('El nombre del cliente es obligatorio');
      return;
    }

    try {
      if (editingCustomer) {
        const updated = await updateCustomer(editingCustomer.id, {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        if (selectedCustomer?.id === updated.id) {
          setSelectedCustomer(updated);
        }
      } else {
        const created = await createCustomer({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        setSelectedCustomer(created);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar cliente');
    }
  };

  const handleDelete = async (id: string) => {
    const res = await deleteCustomer(id);
    if (res.success) {
      if (selectedCustomer?.id === id) {
        setSelectedCustomer(null);
      }
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3157D5]" />
      </div>
    );
  }

  // Selected customer orders & metrics
  const customerOrders = selectedCustomer
    ? orders.filter((o) => o.customerId === selectedCustomer.id)
    : [];
  const activeOrders = customerOrders.filter(
    (o) => o.status !== 'entregado' && o.status !== 'cancelado'
  );
  const lifetimeSpend = customerOrders
    .filter((o) => o.status !== 'cancelado')
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const customerPendingBalance = customerOrders
    .filter((o) => o.status !== 'cancelado')
    .reduce((sum, o) => sum + o.pendingBalance, 0);

  return (
    <div className="space-y-6">
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#172033]">Clientes</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Directorio, información de contacto e historial de encargos.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#3157D5] hover:bg-[#2646B0] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo cliente</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por nombre, teléfono, correo o notas..."
          className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#E4E7EC] rounded-md focus:outline-none focus:ring-1 focus:ring-[#3157D5] shadow-2xs"
        />
      </div>

      {/* Main Grid: Directory List + Customer Profile Sheet */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Customer Directory Table/List (7 cols on desktop) */}
        <div className="lg:col-span-7 bg-white rounded-lg border border-[#E4E7EC] shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-[#E4E7EC] flex items-center justify-between text-xs text-slate-500">
            <span>
              <strong>{filteredCustomers.length}</strong> clientes registrados
            </span>
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <span>No se encontraron clientes que coincidan con la búsqueda.</span>
            </div>
          ) : (
            <div className="divide-y divide-[#E4E7EC]">
              {filteredCustomers.map((cust) => {
                const totalCustOrders = orders.filter((o) => o.customerId === cust.id).length;
                const isSelected = selectedCustomer?.id === cust.id;

                return (
                  <div
                    key={cust.id}
                    onClick={() => setSelectedCustomer(cust)}
                    className={`p-4 transition-colors cursor-pointer flex items-center justify-between gap-4 ${
                      isSelected ? 'bg-blue-50/60 border-l-2 border-l-[#3157D5]' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">{cust.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {totalCustOrders} pedido(s)
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-1">
                        {cust.phone && (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-2.5 h-2.5 text-slate-400" />
                            {cust.phone}
                          </span>
                        )}
                        {cust.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-2.5 h-2.5 text-slate-400" />
                            <span className="truncate max-w-[150px]">{cust.email}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => openEditModal(cust)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                        title="Editar datos"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(cust.id)}
                        className="p-1 text-slate-400 hover:text-[#D92D20] rounded hover:bg-rose-50"
                        title="Eliminar cliente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Customer Profile Sheet (5 cols on desktop) */}
        <div className="lg:col-span-5">
          {selectedCustomer ? (
            <div className="bg-white rounded-lg border border-[#E4E7EC] shadow-2xs p-5 space-y-5 sticky top-20">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{selectedCustomer.name}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Cliente desde {formatDateMX(selectedCustomer.createdAt.substring(0, 10))}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openEditModal(selectedCustomer)}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                >
                  Editar
                </button>
              </div>

              {/* Contact Info */}
              <div className="p-3 bg-slate-50 rounded-lg space-y-2 text-xs border border-slate-200/80">
                <div className="flex items-center gap-2 text-slate-700">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{selectedCustomer.phone || 'Sin teléfono registrado'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedCustomer.email || 'Sin correo registrado'}</span>
                </div>
                {selectedCustomer.notes && (
                  <div className="pt-2 border-t border-slate-200/60 text-slate-600 italic">
                    "{selectedCustomer.notes}"
                  </div>
                )}
              </div>

              {/* Customer Financial Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
                  <span className="text-[10px] text-slate-500 uppercase block">Total histórico</span>
                  <span className="text-sm font-bold font-mono text-slate-900 tabular-nums">
                    {formatCurrency(lifetimeSpend, settings.currencySymbol)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
                  <span className="text-[10px] text-slate-500 uppercase block">Saldo pendiente</span>
                  <span
                    className={`text-sm font-bold font-mono tabular-nums ${
                      customerPendingBalance > 0 ? 'text-[#B7791F]' : 'text-[#16845B]'
                    }`}
                  >
                    {formatCurrency(customerPendingBalance, settings.currencySymbol)}
                  </span>
                </div>
              </div>

              {/* Action: Create order for this customer */}
              <button
                type="button"
                onClick={() => navigate('/pedidos/nuevo')}
                className="w-full py-2 px-3 bg-[#3157D5] hover:bg-[#2646B0] text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Crear pedido para {selectedCustomer.name.split(' ')[0]}</span>
              </button>

              {/* Customer Orders History */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Historial de pedidos ({customerOrders.length})
                </h3>

                {customerOrders.length === 0 ? (
                  <p className="text-xs text-slate-400">Sin pedidos registrados para este cliente.</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {customerOrders.map((ord) => {
                      const cfg = STATUS_CONFIG[ord.status];
                      return (
                        <div
                          key={ord.id}
                          onClick={() => navigate(`/pedidos/${ord.id}`)}
                          className="p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded border border-slate-200/80 transition-colors cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-900">{ord.orderNumber}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded border ${cfg.badgeColor}`}>
                                {cfg.label}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 block mt-0.5">
                              Entrega: {formatDateMX(ord.deliveryDate)}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="font-mono font-bold text-slate-800 block">
                              {formatCurrency(ord.totalAmount, settings.currencySymbol)}
                            </span>
                            {ord.pendingBalance > 0 && (
                              <span className="text-[10px] font-mono text-[#B7791F]">
                                Saldo: {formatCurrency(ord.pendingBalance, settings.currencySymbol)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-[#E4E7EC] p-8 text-center text-xs text-slate-400 shadow-2xs">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>Selecciona un cliente de la lista para consultar su ficha, saldo e historial de pedidos.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: New / Edit Customer */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {editingCustomer ? 'Editar cliente' : 'Nuevo cliente'}
            </h3>

            {formError && (
              <div className="p-3 rounded bg-rose-50 border border-rose-200 text-xs text-[#D92D20] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCustomer} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Carmen Ortiz"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3157D5]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej. 55 9876 5432"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3157D5]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Correo electrónico (opcional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@ejemplo.com"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3157D5]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Notas internas sobre el cliente
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Preferencias particulares, horarios de entrega o detalles de trato..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3157D5]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#3157D5] hover:bg-[#2646B0] text-white text-xs font-semibold rounded-md shadow-xs"
                >
                  Guardar cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs">
          <div className="bg-white rounded-lg max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-[#D92D20] flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>¿Eliminar este cliente?</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Esta acción no se puede deshacer. Solo es posible eliminar clientes que no cuenten con pedidos activos en producción.
            </p>
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deletingId)}
                className="px-4 py-1.5 bg-[#D92D20] hover:bg-rose-700 text-white text-xs font-semibold rounded-md shadow-xs"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
