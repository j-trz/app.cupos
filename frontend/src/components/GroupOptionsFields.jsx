import { Plus, Trash2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Label } from './ui/Label';
import { Textarea } from './ui/Textarea';

// Bloque repetible de "opción de itinerario" — lo usa tanto el formulario de
// carga admin (GroupForm, cuando arma un grupo de cero y quiere ofrecer más
// de una opción) como el modal de solicitud de grupo en Requests.jsx. Cada
// opción se convierte en una fila propia de Group en el backend, todas
// compartiendo un mismo solicitud_id.
export default function GroupOptionsFields({ options, onChange }) {
  const updateOption = (index, key, value) => {
    onChange(options.map((opt, i) => (i === index ? { ...opt, [key]: value } : opt)));
  };

  const addOption = () => {
    onChange([...options, { itinerario: '', notas: '' }]);
  };

  const removeOption = (index) => {
    onChange(options.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {options.map((opt, index) => (
        <div key={index} className="rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Opción {index + 1}</span>
            {options.length > 1 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => removeOption(index)} title="Quitar esta opción">
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor={`itinerario-${index}`}>Itinerario *</Label>
            <Textarea
              id={`itinerario-${index}`}
              value={opt.itinerario}
              onChange={(e) => updateOption(index, 'itinerario', e.target.value)}
              placeholder="Pegá acá el itinerario de vuelo de esta opción..."
              rows={4}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`notas-${index}`}>Notas (opcional)</Label>
            <Textarea
              id={`notas-${index}`}
              value={opt.notas}
              onChange={(e) => updateOption(index, 'notas', e.target.value)}
              placeholder="Alguna aclaración sobre esta opción puntual..."
              rows={2}
            />
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addOption}>
        <Plus className="h-4 w-4 mr-1" />
        Agregar otra opción
      </Button>
    </div>
  );
}
