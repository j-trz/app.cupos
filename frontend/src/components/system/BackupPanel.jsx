import { useState, useEffect, useCallback } from 'react';
import {
  Database, Download, RefreshCw, Trash2, Upload, HardDrive,
  CheckCircle2, Clock, Copy, Check, ShieldAlert, FileText, ArrowDownToLine,
} from 'lucide-react';
import BackupService from '../../services/backupService';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

export default function BackupPanel() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [deletingFile, setDeletingFile] = useState(null);
  const [message, setMessage] = useState(null);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const fetchBackups = useCallback(async (keepLocalEntries = []) => {
    setLoading(true);
    try {
      const res = await BackupService.listBackups();
      const serverList = res.data || [];
      if (serverList.length > 0) {
        setBackups(serverList);
      } else if (keepLocalEntries.length > 0) {
        // En entornos serverless el disco no persiste → conservar las entradas locales
        setBackups(keepLocalEntries);
      } else {
        setBackups([]);
      }
    } catch (e) {
      console.error('Error al listar backups:', e);
      if (keepLocalEntries.length > 0) setBackups(keepLocalEntries);
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
      const filename = res.filename || `backup_${new Date().toISOString().slice(0, 10)}.json`;

      // 1. Disparar descarga automática en el navegador
      try {
        await BackupService.downloadBackup(filename);
      } catch (_) {}

      // 2. Insertar inmediatamente en la tabla para que el usuario lo vea
      const newBackup = {
        filename,
        size_bytes: res.size_bytes || 0,
        size_formatted: res.size_formatted || `${((res.size_bytes || 0) / 1024).toFixed(1)} KB`,
        created_at: res.created_at || new Date().toISOString(),
      };

      const optimisticList = [newBackup, ...backups.filter(b => b.filename !== filename)];
      setBackups(optimisticList);
      setMessage({
        type: 'success',
        text: `✅ Backup generado e iniciado su descarga: ${filename} (${res.total_records || 0} registros)`,
        filename,
      });

      // Re-fetch: si el servidor no tiene disco persistente (Vercel), conserva la lista optimista
      fetchBackups(optimisticList);
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
      setBackups(prev => prev.filter(b => b.filename !== filename));
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
        text: `✅ Restauración completada: ${res.tables_restored || 0} tablas y ${res.records_restored || 0} registros procesados.`,
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
      {/* Banner de aviso/notificación */}
      {message && (
        <div className={`p-4 rounded-2xl border text-sm flex items-center justify-between shadow-sm transition-all ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-3">
            {message.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" /> : <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0" />}
            <span className="font-medium">{message.text}</span>
          </div>
          {message.filename && (
            <button
              onClick={() => handleDownload(message.filename)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors ml-3 shrink-0"
            >
              <Download className="h-3.5 w-3.5" /> Descargar de nuevo
            </button>
          )}
        </div>
      )}

      {/* Hero accionador con diseño idéntico al tema del sitio */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-8 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-8 right-24 h-32 w-32 rounded-full bg-white/5" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-slate-200 text-xs font-medium border border-white/10 backdrop-blur-sm">
              <Database className="h-3.5 w-3.5 text-emerald-400" />
              <span>Respaldo Integral de Datos</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Copia de Seguridad y Restauración
            </h2>
            <p className="text-sm text-slate-350 max-w-xl leading-relaxed">
              Generá un dump completo en formato JSON de todas las tablas principales (productos, reservas, pasajeros, usuarios, configuraciones SMTP, IA y auditoría).
            </p>
          </div>

          <div className="shrink-0 w-full sm:w-auto">
            <button
              onClick={handleGenerateBackup}
              disabled={generating}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3.5 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50"
            >
              {generating ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <ArrowDownToLine className="h-5 w-5 shrink-0" />
              )}
              <span>{generating ? 'Generando dump…' : 'Crear Backup Instantáneo'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Secciones de Restauración y Automatización */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Restauración manual */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 border border-amber-200/60 rounded-xl text-amber-600">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Restaurar desde Archivo JSON</h3>
              <p className="text-xs text-slate-500">Cargá una copia de seguridad para actualizar la base de datos</p>
            </div>
          </div>

          <div className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-2xl p-5 text-center transition-colors bg-slate-50/50">
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              id="backup-file-input"
              className="hidden"
            />
            <label htmlFor="backup-file-input" className="cursor-pointer flex flex-col items-center gap-2">
              <HardDrive className="h-8 w-8 text-slate-400" />
              <span className="text-xs font-medium text-slate-700">
                {selectedFile ? selectedFile.name : 'Hacé clic para seleccionar archivo .json'}
              </span>
              {selectedFile && (
                <Badge variant="info">{(selectedFile.size / 1024).toFixed(1)} KB</Badge>
              )}
            </label>
          </div>

          {selectedFile && (
            <Button
              size="sm"
              onClick={() => handleRestore(selectedFile)}
              disabled={restoring}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-medium"
            >
              {restoring ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
              {restoring ? 'Restaurando datos…' : 'Restaurar Datos desde este Archivo'}
            </Button>
          )}
        </div>

        {/* Automatización Cron */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 border border-blue-200/60 rounded-xl text-blue-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Automatización Programada (Cron)</h3>
              <p className="text-xs text-slate-500">Programá ejecuciones automáticas sin intervención manual</p>
            </div>
          </div>

          <div className="relative bg-slate-900 rounded-2xl p-4 text-xs font-mono text-slate-200 overflow-x-auto shadow-inner border border-slate-800">
            <button
              onClick={handleCopyCurl}
              className="absolute right-3 top-3 p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Copiar comando cURL"
            >
              {copiedCurl ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </button>
            <pre className="pr-10 leading-relaxed">{curlCommand}</pre>
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <span>💡</span> El servidor mantendrá automáticamente los últimos 30 backups en rotación.
          </p>
        </div>
      </div>

      {/* Tabla de Backups Disponibles */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-900">
              Archivos de Backup Disponibles
            </h3>
            <Badge variant="default">{backups.length}</Badge>
          </div>
          <Button size="sm" variant="secondary" onClick={fetchBackups} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refrescar Lista
          </Button>
        </div>

        {loading && backups.length === 0 ? (
          <div className="py-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400" />
          </div>
        ) : backups.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            📭 No hay archivos de backup guardados. Hacé clic en <span className="font-semibold text-slate-700">"Crear Backup Instantáneo"</span> para generar uno.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3">Nombre del Archivo</th>
                  <th className="text-left px-4 py-3">Fecha de Creación</th>
                  <th className="text-left px-4 py-3">Tamaño</th>
                  <th className="text-right px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backups.map((b) => (
                  <tr key={b.filename} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-slate-800 whitespace-nowrap">
                      <span className="inline-flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                        {b.filename}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                      {new Date(b.created_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 font-mono whitespace-nowrap">
                      {b.size_formatted}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDownload(b.filename)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/80 transition-colors"
                          title="Descargar este JSON"
                        >
                          <Download className="h-3.5 w-3.5" /> Descargar
                        </button>
                        <button
                          onClick={() => handleDelete(b.filename)}
                          disabled={deletingFile === b.filename}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/80 transition-colors disabled:opacity-50"
                          title="Eliminar este archivo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
