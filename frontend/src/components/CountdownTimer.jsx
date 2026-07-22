import { useEffect, useRef, useState } from 'react';
import { Clock3 } from 'lucide-react';

// Cronómetro en vivo (tick de 1s) para el hold temporal de stock — a
// diferencia de formatExpiry/useCountdownTick (lib/expiry.js, que solo
// recalculan una etiqueta minuto/hora en cada re-render), acá necesitamos
// mm:ss con precisión de segundo y un callback que dispare UNA sola vez
// al llegar a cero (para bloquear el formulario apenas vence el hold).
export default function CountdownTimer({ expiresAt, onExpire }) {
  const [remainingMs, setRemainingMs] = useState(() => new Date(expiresAt) - new Date());
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
    const tick = () => {
      const ms = new Date(expiresAt) - new Date();
      setRemainingMs(ms);
      if (ms <= 0 && !firedRef.current) {
        firedRef.current = true;
        onExpire?.();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpire]);

  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const ss = String(totalSeconds % 60).padStart(2, '0');

  const color = totalSeconds <= 0
    ? 'text-red-600'
    : totalSeconds <= 30
      ? 'text-red-500'
      : totalSeconds <= 120
        ? 'text-amber-500'
        : 'text-slate-600';

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-sm font-bold ${color}`}>
      <Clock3 className="h-4 w-4" />
      {totalSeconds > 0 ? `${mm}:${ss}` : 'Expirado'}
    </span>
  );
}
