import { useState } from 'react';
import { Download, FileText, Table, FileSpreadsheet } from 'lucide-react';
import ExportService from '../services/exportService';
import Swal from 'sweetalert2';

/**
 * Componente de botón de exportación con menú desplegable
 * Permite exportar datos en CSV, Excel y PDF
 * 
 * @param {Object} props - Propiedades del componente
 * @param {string} props.entityType - Tipo de entidad (reservations, products, users, agencies)
 * @param {string} props.entityLabel - Etiqueta de la entidad (ej: "Reservas")
 * @param {Object} props.filters - Filtros opcionales para la exportación
 * @param {string} props.size - Tamaño del botón (sm, md, lg)
 * @param {boolean} props.showLabel - Mostrar etiqueta junto al ícono
 */
export default function ExportButton({
    entityType,
    entityLabel = 'Datos',
    filters = {},
    size = 'md',
    showLabel = true
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async (format) => {
        setIsOpen(false);
        setIsExporting(true);

        try {
            switch (format) {
                case 'csv':
                    await ExportService.exportCSV(entityType, filters);
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: 'CSV exportado correctamente',
                        showConfirmButton: false,
                        timer: 3000
                    });
                    break;

                case 'excel':
                    await ExportService.exportExcel(entityType, filters);
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: 'Excel exportado correctamente',
                        showConfirmButton: false,
                        timer: 3000
                    });
                    break;

                case 'pdf':
                    await ExportService.exportPDF(entityType, filters);
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: 'PDF generado correctamente',
                        showConfirmButton: false,
                        timer: 3000
                    });
                    break;
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error al exportar',
                text: error.message || 'Ocurrió un error al exportar los datos'
            });
        } finally {
            setIsExporting(false);
        }
    };

    const sizeClasses = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-2 text-sm',
        lg: 'px-4 py-2 text-base'
    };

    return (
        <div className="relative inline-block">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={isExporting}
                className={`inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses[size]}`}
            >
                <Download className="w-4 h-4" />
                {showLabel && (
                    <span>{isExporting ? 'Exportando...' : 'Exportar'}</span>
                )}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden">
                        <div className="py-1">
                            <div className="px-3 py-2 text-xs text-gray-500 font-semibold border-b">
                                Exportar {entityLabel}
                            </div>

                            <button
                                onClick={() => handleExport('csv')}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                                <FileText className="w-4 h-4 text-green-600" />
                                <span>CSV</span>
                            </button>

                            <button
                                onClick={() => handleExport('excel')}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                <span>Excel</span>
                            </button>

                            <button
                                onClick={() => handleExport('pdf')}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                                <Table className="w-4 h-4 text-red-600" />
                                <span>PDF</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
