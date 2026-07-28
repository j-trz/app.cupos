import { useState, useEffect, useCallback } from 'react';
import {
  Database, Download, RefreshCw, Trash2, Upload, HardDrive,
  CheckCircle2, AlertTriangle, Clock, Terminal, Copy, Check, ShieldAlert,
} from 'lucide-react';
import BackupService from '../../services/backupService';
import Button from '../ui/Button';

export default function BackupPanel() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [deletingFile, setDeletingFile] = useState(null);
  const [message, setMessage] = useState(null);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const fetchBackups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await BackupService.listBackups();
      setBackups(res.data || []);
    } catch (e) {
      console.error('Error al listar backups:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const handleGenerateBackup = async () => {
    setGenerating(true);
    setMessage(null);
    try {
      const res = await BackupService.generateBackup();
      setMessage({ type: 'success', text: `✅ Backup generado correctamente: ${res.filename || 'backup.json'}` });
      fetchBackups();
    } catch (e) {
      setMessage({ type: 'error', text: 'Error al generar backup: ' + (e.message || 'Error desconocido') });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (filename) => {
    try {
      await BackupService.downloadBackup(filename);
    } catch (e) {
      alert('Error al descargar backup: ' + e.message);
    }
  };

  const handleDelete = async (filename) => {
    if (!window.confirm(`¿Seguro que querés eliminar el archivo ${filename}?`)) return;
    setDeletingFile(filename);
    try {
      await BackupService.deleteBackup(filename);
      fetchBackups();
    } catch (e) {
      alert('Error al eliminar backup: ' + e.message);
    } finally {
      setDeletingFile(null);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleRestore = async (fileToRestore) => {
    const target = fileToRestore || selectedFile;
    if (!target) return;
    if (!window.confirm('⚠️ ATENCIÓN: Restaurar un backup actualizará los registros de la base de datos con los datos del archivo. ¿Deseás continuar?')) return;

    setRestoring(true);
    setMessage(null);
    try {
      const res = await BackupService.restoreBackup(target);
      setMessage({
        type: 'success',
        text: `✅ Restauración completada: ${res.tables_restored || 0} tablas y ${res.records_restored || 0} registros restaurados.`,
      });
      setSelectedFile(null);
    } catch (e) {
      setMessage({ type: 'error', text: 'Error al restaurar: ' + (e.message || 'Error desconocido') });
    } finally {
      setRestoring(false);
    }
  };

  const curlCommand = `curl -X GET "https://<tu-dominio>/api/cron/backup" \\
  -H "X-Cron-Secret: TU_CRON_SECRET"`;

  const handleCopyCurl = async () => {
    try {
      await navigator.clipboard.writeText(curlCommand);
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    } catch (_) {}
  };

  return (
    <div className="space-y-6">
      {/* Banner de mensajes */}
      {message && (
        <div className={`p-4 rounded-2xl border text-sm flex items-center justify-between ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs font-semibold hover:underline">Cerrar</button>
        </div>
      )}

      {/* Hero accionador */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700">
            <Database className="h-3.5 w-3.5 text-emerald-400" />
            <span>Base de Datos Respaldo JSON</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold">Generación y Restauración de Backup</h2>
          <p className="text-sm text-slate-400 max-w-xl">
            Creá una copia de seguridad completa con todos los productos, reservas, usuarios, configuraciones SMTP, IA y logs en un paquete agnóstico JSON.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Button
            size="lg"
            onClick={handleGenerateBackup}
            disabled={generating}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md transition-all"
          >
            {generating ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
            {generating ? 'Generando dump…' : 'Crear Backup Instantáneo'}
          </Button>
        </div>
      </div>

      {/* Dos Columnas: Restauración manual + Automatización por Cron */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Col 1: Restaurar backup desde archivo local */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Upload className="h-4 w-4 text-slate-600" /> Restaurar Backup desde Archivo JSON
          </h3>
          <p className="text-xs text-slate-500">
            Podés subir un archivo <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">.json</code> generado previamente para restaurar las tablas de la base de datos.
          </p>
          <div className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl p-4 text-center transition-colors">
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              id="backup-file-input"
              className="hidden"
            />
            <label htmlFor="backup-file-input" className="cursor-pointer flex flex-col items-center gap-1.5">
              <HardDrive className="h-8 w-8 text-slate-400" />
              <span className="text-xs font-medium text-slate-700">
                {selectedFile ? selectedFile.name : 'Hacé clic para seleccionar archivo .json'}
              </span>
              {selectedFile && (
                <span className="text-[11px] text-slate-400">
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              )}
            </label>
          </div>
          {selectedFile && (
            <Button
              size="sm"
              onClick={() => handleRestore(selectedFile)}
              disabled={restoring}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white"
            >
              {restoring ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
              {restoring ? 'Restaurando datos…' : 'Restaurar Datos desde este Archivo'}
            </Button>
          )}
        </div>

        {/* Col 2: Backup automatizado por Cron */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" /> Automatización Programada (Cron)
          </h3>
          <p className="text-xs text-slate-500">
            Podés automatizar los respaldos mediante un programador de tareas externo (ej. <span className="font-semibold">cron-job.org</span> o GitHub Actions) llamando a nuestro endpoint seguro:
          </p>
          <div className="relative bg-slate-900 rounded-xl p-3 text-xs font-mono text-slate-200 overflow-x-auto">
            <button
              onClick={handleCopyCurl}
              className="absolute right-2 top-2 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Copiar comando cURL"
            >
              {copiedCurl ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <pre className="pr-8">{curlCommand}</pre>
          </div>
          <p className="text-[11px] text-slate-400">
            💡 El sistema conserva automáticamente la rotación de los últimos 30 respaldos para optimizar el almacenamiento.
          </p>
        </div>
      </div>

      {/* Tabla de Backups en Servidor */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-slate-500" /> Archivos de Backup en Servidor ({backups.length})
          </h3>
          <Button size="sm" variant="secondary" onClick={fetchBackups} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refrescar
          </Button>
        </div>

        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400" />
          </div>
        ) : backups.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            📭 No hay archivos de backup guardados en el servidor. Hacé clic en <span className="font-semibold text-slate-600">"Crear Backup Instantáneo"</span> arriba para generar uno.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-semibold">
                <tr>
                  <th className="text-left px-4 py-3">Nombre del Archivo</th>
                  <th className="text-left px-4 py-3">Fecha de Creación</th>
                  <th className="text-left px-4 py-3">Tamaño</th>
                  <th className="text-right px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backups.map((b) => (
                  <tr key={b.filename} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-slate-800 flex items-center gap-2">
                      <Database className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      {b.filename}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                      {new Date(b.created_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 font-mono whitespace-nowrap">
                      {b.size_formatted}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDownload(b.filename)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                          title="Descargar este JSON"
                        >
                          <Download className="h-3 w-3" /> Descargar
                        </button>
                        <button
                          onClick={() => handleDelete(b.filename)}
                          disabled={deletingFile === b.filename}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50"
                          title="Eliminar este archivo"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
