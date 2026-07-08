import { Calendar, Plane, MapPin, Sun, Download, X, Filter } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/Select';
import { ShadcnButton as Button } from '../ui/shadcn-button';

const AIRLINES = ['Aerolíneas Argentinas', 'LATAM', 'Copa Airlines', 'Avianca', 'GOL'];
const SEASONS = ['Verano 2025', 'Invierno 2025', 'Semana Santa 2025', 'Temporada Alta 2025'];

export default function ReportFilters({ filters, onFiltersChange, onExport, destinations = [] }) {
    const hasActiveFilters = filters.destino !== 'all' || filters.dateRange !== '6m' || filters.aerolinea !== 'all' || filters.temporada !== 'all';

    const handleReset = () => {
        onFiltersChange({ dateRange: '6m', destino: 'all', aerolinea: 'all', temporada: 'all' });
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-500" />
                    <h3 className="text-sm font-semibold text-slate-700">Filtros</h3>
                </div>
                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1 text-xs text-slate-500 hover:text-slate-700">
                        <X className="h-3 w-3" /> Limpiar filtros
                    </Button>
                )}
            </div>

            {/* Filtros Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Rango de fechas */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Período
                    </label>
                    <Select value={filters.dateRange} onValueChange={(v) => onFiltersChange({ ...filters, dateRange: v })}>
                        <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="3m">Últimos 3 meses</SelectItem>
                            <SelectItem value="6m">Últimos 6 meses</SelectItem>
                            <SelectItem value="12m">Último año</SelectItem>
                            <SelectItem value="ytd">Año actual</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Destino */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Destino
                    </label>
                    <Select value={filters.destino} onValueChange={(v) => onFiltersChange({ ...filters, destino: v })}>
                        <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los destinos</SelectItem>
                            {destinations.length > 0 ? (
                                destinations.map((d) => (
                                    <SelectItem key={d} value={d}>{d}</SelectItem>
                                ))
                            ) : (
                                <>
                                    <SelectItem value="Cancún">Cancún</SelectItem>
                                    <SelectItem value="Miami">Miami</SelectItem>
                                    <SelectItem value="Punta Cana">Punta Cana</SelectItem>
                                    <SelectItem value="Cartagena">Cartagena</SelectItem>
                                    <SelectItem value="Bariloche">Bariloche</SelectItem>
                                </>
                            )}
                        </SelectContent>
                    </Select>
                </div>

                {/* Aerolínea */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                        <Plane className="h-3 w-3" /> Aerolínea
                    </label>
                    <Select value={filters.aerolinea} onValueChange={(v) => onFiltersChange({ ...filters, aerolinea: v })}>
                        <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las aerolíneas</SelectItem>
                            {AIRLINES.map((a) => (
                                <SelectItem key={a} value={a}>{a}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Temporada */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                        <Sun className="h-3 w-3" /> Temporada
                    </label>
                    <Select value={filters.temporada} onValueChange={(v) => onFiltersChange({ ...filters, temporada: v })}>
                        <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las temporadas</SelectItem>
                            {SEASONS.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Botón Exportar */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-transparent">Acción</label>
                    <Button variant="outline" className="w-full h-9 gap-2 text-sm" onClick={onExport}>
                        <Download className="h-4 w-4" /> Exportar CSV
                    </Button>
                </div>
            </div>
        </div>
    );
}
