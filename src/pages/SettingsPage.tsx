import React, { useState, useRef } from 'react';
import {
  Settings,
  Building2,
  HardDrive,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Check,
  AlertCircle,
  HelpCircle,
  FileCheck,
} from 'lucide-react';
import { useHilo } from '../context/HiloContext';
import { BusinessSettings } from '../types';

export const SettingsPage: React.FC = () => {
  const {
    settings,
    updateSettings,
    resetDemoData,
    wipeData,
    exportData,
    importData,
    loading,
  } = useHilo();

  const [formSettings, setFormSettings] = useState<BusinessSettings>(settings);
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [importStatus, setImportStatus] = useState<{ message: string; isError?: boolean } | null>(
    null
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(formSettings);
  };

  const handleExportBackup = async () => {
    const jsonStr = await exportData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hilo_respaldo_${new Date().toISOString().substring(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const res = await importData(content);
        if (res.success) {
          setImportStatus({ message: res.message, isError: false });
        } else {
          setImportStatus({ message: res.message, isError: true });
        }
      } catch (err: any) {
        setImportStatus({ message: `Error al leer el archivo: ${err.message}`, isError: true });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleWipeConfirm = async () => {
    if (wipeConfirmText !== 'BORRAR') return;
    await wipeData();
    setShowWipeModal(false);
    setWipeConfirmText('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3157D5]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#172033]">Configuración del Negocio</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Personaliza los datos de tu taller, formato monetario y opciones de respaldo.
        </p>
      </div>

      {/* Card 1: Perfil del Negocio & Ajustes Regionales */}
      <div className="bg-white rounded-lg border border-[#E4E7EC] shadow-2xs p-6">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4 pb-3 border-b border-[#E4E7EC]">
          <Building2 className="w-4 h-4 text-[#3157D5]" />
          <span>Datos de tu taller o negocio</span>
        </h2>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Nombre comercial del negocio *
              </label>
              <input
                type="text"
                required
                value={formSettings.businessName}
                onChange={(e) =>
                  setFormSettings((prev) => ({ ...prev, businessName: e.target.value }))
                }
                placeholder="Ej. Taller Dulce Encanto, Imprenta Creativa"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3157D5]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Subtítulo o especialidad
              </label>
              <input
                type="text"
                value={formSettings.tagline || ''}
                onChange={(e) =>
                  setFormSettings((prev) => ({ ...prev, tagline: e.target.value }))
                }
                placeholder="Ej. Repostería y Diseños Personalizados"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3157D5]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Moneda
              </label>
              <select
                value={formSettings.currency}
                onChange={(e) =>
                  setFormSettings((prev) => ({ ...prev, currency: e.target.value }))
                }
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3157D5]"
              >
                <option value="MXN">Peso Mexicano (MXN)</option>
                <option value="USD">Dólar Estadounidense (USD)</option>
                <option value="COP">Peso Colombiano (COP)</option>
                <option value="EUR">Euro (EUR)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Zona horaria
              </label>
              <select
                value={formSettings.timezone}
                onChange={(e) =>
                  setFormSettings((prev) => ({ ...prev, timezone: e.target.value }))
                }
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3157D5]"
              >
                <option value="America/Mexico_City">America/Mexico_City (Centro)</option>
                <option value="America/Monterrey">America/Monterrey</option>
                <option value="America/Cancun">America/Cancun (Quintana Roo)</option>
                <option value="America/Tijuana">America/Tijuana (Noroeste)</option>
                <option value="America/Bogota">America/Bogota</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Prefijo para números de pedido
              </label>
              <input
                type="text"
                value={formSettings.orderPrefix}
                onChange={(e) =>
                  setFormSettings((prev) => ({ ...prev, orderPrefix: e.target.value }))
                }
                placeholder="Ej. PED-"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3157D5] font-mono"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-[#3157D5] hover:bg-[#2646B0] text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Guardar configuración</span>
            </button>
          </div>
        </form>
      </div>

      {/* Card 2: Respaldo y Migración de Datos (Export / Import) */}
      <div className="bg-white rounded-lg border border-[#E4E7EC] shadow-2xs p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-[#E4E7EC]">
          <HardDrive className="w-4 h-4 text-[#3157D5]" />
          <span>Respaldo y seguridad de tus datos</span>
        </h2>

        <p className="text-xs text-slate-600 leading-relaxed">
          Toda la información de pedidos, clientes y pagos se guarda directamente en el almacenamiento seguro de tu navegador (IndexedDB). No se envía a ningún servidor de terceros sin tu consentimiento. Puedes exportar copias de respaldo en archivo JSON cuando lo desees.
        </p>

        {importStatus && (
          <div
            className={`p-3.5 rounded-lg border text-xs flex items-center gap-2.5 ${
              importStatus.isError
                ? 'bg-rose-50 border-rose-200 text-[#D92D20]'
                : 'bg-emerald-50 border-emerald-200 text-[#16845B]'
            }`}
          >
            {importStatus.isError ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <FileCheck className="w-4 h-4 shrink-0" />
            )}
            <span>{importStatus.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Export JSON */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between space-y-3">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Descargar respaldo completo</span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Copia en formato JSON con clientes, pedidos, conceptos y pagos.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportBackup}
              className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded text-xs font-semibold shadow-2xs transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-[#3157D5]" />
              <span>Exportar JSON de respaldo</span>
            </button>
          </div>

          {/* Import JSON */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between space-y-3">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Restaurar desde archivo</span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Importa un archivo JSON previamente generado por Hilo.
              </p>
            </div>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".json,application/json"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded text-xs font-semibold shadow-2xs transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>Seleccionar archivo JSON</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: Datos de Prueba y Limpieza */}
      <div className="bg-white rounded-lg border border-[#E4E7EC] shadow-2xs p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-[#E4E7EC]">
          <RotateCcw className="w-4 h-4 text-slate-500" />
          <span>Gestión de datos de prueba y reinicio</span>
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <div>
            <span className="text-xs font-bold text-slate-800 block">
              Restablecer datos del Taller de Ejemplo
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Restaura los pedidos ficticios de muestra con fechas dinámicas relativas a hoy.
            </p>
          </div>
          <button
            type="button"
            onClick={() => resetDemoData()}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-semibold rounded shadow-2xs transition-colors shrink-0"
          >
            Cargar ejemplos
          </button>
        </div>

        {/* Destructive Wipe Option */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-rose-50/40 border border-rose-200 rounded-lg">
          <div>
            <span className="text-xs font-bold text-[#D92D20] block">
              Borrar todos los datos locales
            </span>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Elimina todos los clientes, pedidos y pagos de tu navegador para empezar en blanco.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowWipeModal(true)}
            className="px-3.5 py-1.5 bg-[#D92D20] hover:bg-rose-700 text-white text-xs font-semibold rounded shadow-2xs transition-colors shrink-0"
          >
            Borrar todo
          </button>
        </div>
      </div>

      {/* Modal: Wipe Confirmation */}
      {showWipeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-[#D92D20] flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>Confirmación de borrado total</span>
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              Esta acción eliminará de forma irreversible todos los pedidos, clientes, conceptos, pagos e historial almacenados en este dispositivo.
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-2">
              <label className="text-[11px] font-semibold text-slate-700 block">
                Para confirmar, escribe la palabra <strong className="text-[#D92D20]">BORRAR</strong> a continuación:
              </label>
              <input
                type="text"
                value={wipeConfirmText}
                onChange={(e) => setWipeConfirmText(e.target.value)}
                placeholder="Escribe BORRAR"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#D92D20] font-mono"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowWipeModal(false);
                  setWipeConfirmText('');
                }}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={wipeConfirmText !== 'BORRAR'}
                onClick={handleWipeConfirm}
                className="px-4 py-1.5 bg-[#D92D20] hover:bg-rose-700 text-white text-xs font-semibold rounded-md shadow-xs disabled:opacity-50"
              >
                Confirmar y eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
