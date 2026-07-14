// formatGroupItinerary normaliza un itinerario de grupo pegado como un bloque
// de texto continuo (formato GDS: "2 AF5527 R 09OCT 5 MVDPTY HK1 ... OPERATED
// BY COPA AIRLINES 3 AF 491 R 09OCT ...") en líneas legibles: un salto antes
// de cada tramo nuevo y otro antes de "OPERATED BY". No usa <br> — inserta
// "\n" real para que el contenedor (con whitespace-pre-wrap) lo renderice,
// evitando dangerouslySetInnerHTML.
//
// El marcador de tramo nuevo es "<1-2 dígitos> <2 letras><espacio opcional><2-5
// dígitos>" (ej. "3 AF 491", "7 AF5526") — se distingue del token de
// día-de-semana + par de aeropuertos que aparece DENTRO de un mismo tramo
// (ej. "5 MVDPTY", "6*CDGCAI") porque ese nunca tiene un dígito inmediatamente
// después de las primeras 2 letras.
export function formatGroupItinerary(text) {
  if (!text) return '';
  let normalized = text.replace(/\s+/g, ' ').trim();
  normalized = normalized.replace(/\s*OPERATED BY/gi, '\nOPERATED BY');
  normalized = normalized.replace(/\s+(?=\d{1,2}\s+[A-Z]{2}\s?\d{2,5}\b)/g, '\n');
  return normalized;
}
