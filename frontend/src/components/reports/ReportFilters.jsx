import { Calendar, Filter, Download, X } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/Select';
import { ShadcnButton as Button } from '../ui/shadcn-button';

export default function ReportFilters({ filters, onFiltersChange, onExport }) {
    const hasActiveFilters = filters.destino !== 'all' || filters.dateRange !== '6m';

    const handleReset = () => {
        onFiltersChange({ dateRange: '6m', destino: 'all', temporada: '' });
    };

    return (
        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            {/* Rango de fechas */}
            <Select value={filters.dateRange} onValueChange={(v) => onFiltersChange({ ...filters, dateRange: v })}>
                <SelectTrigger className="w-[160px] bg-white">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Rango" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="3m">Últimos 3 meses</SelectItem>
                    <SelectItem value="6m">Últimos 6 meses</SelectItem>
                    <SelectItem value="12m">Último año</SelectItem>
                </SelectContent>
            </Select>

            {/* Filtro de destino */}
            <Select value={filters.destino} onValueChange={(v) => onFiltersChange({ ...filters, destino: v })}>
                <SelectTrigger className="w-[160px] bg-white">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Destino" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos los destinos</SelectItem>
                    <SelectItem value="Cancún">Cancún</SelectItem>
                    <SelectItem value="Miami">Miami</SelectItem>
                    <SelectItem value="Punta Cana">Punta Cana</SelectItem>
                    <SelectItem value="Cartagena">Cartagena</SelectItem>
                    <SelectItem value="Bariloche">Bariloche</SelectItem>
                </SelectContent>
            </Select>

            {/* Reset filtros */}
            {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1 text-xs">
                    <X className="h-3 w-3" /> Limpiar
                </Button>
            )}

            {/* Botón de exportar */}
            <Button variant="outline" className="ml-auto gap-2" onClick={onExport}>
                <Download className="h-4 w-4" /> Exportar
            </Button>
        </div>
    );
}
