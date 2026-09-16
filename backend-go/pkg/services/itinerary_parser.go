package services

import (
	"regexp"
	"strconv"
	"strings"
)

// ItinerarySegment es un tramo de vuelo normalizado — mismo shape que
// parseRuta() en frontend/src/components/ItineraryTable.jsx (puerto 1:1 de
// esa lógica a Go, no una reimplementación distinta), para que el backoffice
// reciba nro. de vuelo/fecha/origen/destino/salida/llegada como campos
// propios en vez de tener que re-parsear el texto libre de `Ticket.Ruta`.
type ItinerarySegment struct {
	Segmento     string `json:"segmento"`
	Compania     string `json:"compania"`
	Vuelo        string `json:"vuelo"`
	Origen       string `json:"origen"`
	Destino      string `json:"destino"`
	FechaSalida  string `json:"fecha_salida"`
	Salida       string `json:"salida"`
	Llegada      string `json:"llegada"`
	FechaLlegada string `json:"fecha_llegada"`
	NextDay      bool   `json:"next_day"`
}

var (
	reSegLineTest = regexp.MustCompile(`^\s*(\d+\s+)?[A-Z]{2}[\d\s]`)
	reSegNoSplit  = regexp.MustCompile(`\s+\d+\s+[A-Z]{2}`)
	reFlightSplit = regexp.MustCompile(`[A-Z]{2}\d{3,4}\b`)
	reFlightStart = regexp.MustCompile(`^[A-Z]{2}\d{3,4}`)

	reIsTime4    = regexp.MustCompile(`^\d{4}$`)
	reIsTimeHM   = regexp.MustCompile(`^\d{2}:\d{2}$`)
	reIsDate     = regexp.MustCompile(`^\d{1,2}[A-Z]{3}(\d{2,4})?$`)
	reIsAirport  = regexp.MustCompile(`^[A-Z]{3}$`)
	reIsOD       = regexp.MustCompile(`[A-Z]{6}`)
	reIsFlight   = regexp.MustCompile(`^([A-Z]{2})(\d{3,4})$`)
	reIsAirline  = regexp.MustCompile(`^[A-Z]{2}$`)
	reIsFlightNo = regexp.MustCompile(`^\d{3,4}$`)
	reIsSegNo    = regexp.MustCompile(`^\d{1,2}$`)
	reSingleCaps = regexp.MustCompile(`^[A-Z]$`)
)

func normalizeItineraryText(text string) string {
	r := strings.NewReplacer(`\n`, "\n", "\r\n", "\n", "\r", "\n")
	return r.Replace(text)
}

// splitBeforeMatches emula el split(/(?=PATRON)/) de JS: Go (motor RE2) no
// soporta lookahead, así que partimos manualmente justo antes de cada
// posición donde el patrón matchea.
func splitBeforeMatches(re *regexp.Regexp, text string) []string {
	locs := re.FindAllStringIndex(text, -1)
	if len(locs) == 0 {
		return []string{text}
	}
	var parts []string
	prev := 0
	for i, loc := range locs {
		start := loc[0]
		if i == 0 {
			if start > 0 {
				parts = append(parts, text[:start])
			}
		} else {
			parts = append(parts, text[prev:start])
		}
		prev = start
	}
	parts = append(parts, text[prev:])
	return parts
}

func trimAll(parts []string) []string {
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		out = append(out, strings.TrimSpace(p))
	}
	return out
}

func filterSegLines(parts []string) []string {
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if reSegLineTest.MatchString(p) {
			out = append(out, p)
		}
	}
	return out
}

func extractSegmentLines(text string) []string {
	norm := normalizeItineraryText(text)

	byLine := filterSegLines(strings.Split(norm, "\n"))
	bySegNo := filterSegLines(trimAll(splitBeforeMatches(reSegNoSplit, norm)))
	byFlightRaw := trimAll(splitBeforeMatches(reFlightSplit, norm))
	byFlight := make([]string, 0, len(byFlightRaw))
	for _, p := range byFlightRaw {
		if reFlightStart.MatchString(p) {
			byFlight = append(byFlight, p)
		}
	}

	// Igual que el frontend: de las 3 estrategias, usar la que realmente
	// logró partir en más de 1 segmento, y entre esas la que dio más piezas —
	// una ruta de una sola línea con varios vuelos concatenados hace que
	// byLine "vea" un solo renglón si no se elige así.
	type candidate struct {
		parts []string
	}
	var candidates []candidate
	if len(byLine) > 1 {
		candidates = append(candidates, candidate{byLine})
	}
	if len(bySegNo) > 1 {
		candidates = append(candidates, candidate{bySegNo})
	}
	if len(byFlight) > 1 {
		candidates = append(candidates, candidate{byFlight})
	}
	if len(candidates) > 0 {
		best := candidates[0]
		for _, c := range candidates[1:] {
			if len(c.parts) > len(best.parts) {
				best = c
			}
		}
		return best.parts
	}

	if len(byLine) > 0 {
		return byLine
	}
	if len(bySegNo) > 0 {
		return bySegNo
	}
	if len(byFlight) > 0 {
		return byFlight
	}

	trimmed := strings.TrimSpace(norm)
	if reSegLineTest.MatchString(trimmed) {
		return []string{trimmed}
	}
	return nil
}

func normTime(t string) string {
	return strings.ReplaceAll(t, ":", "")
}

func parseSegmentLine(line string) ItinerarySegment {
	tokens := strings.Fields(strings.TrimSpace(line))
	var result ItinerarySegment

	for i := 0; i < len(tokens); i++ {
		t := tokens[i]

		if result.Compania == "" && reIsSegNo.MatchString(t) {
			result.Segmento = t
			continue
		}

		if result.Compania == "" && reIsFlight.MatchString(t) {
			m := reIsFlight.FindStringSubmatch(t)
			result.Compania = m[1]
			result.Vuelo = m[2]
			continue
		}

		if result.Compania == "" && reIsAirline.MatchString(t) && i+1 < len(tokens) && reIsFlightNo.MatchString(tokens[i+1]) {
			result.Compania = t
			i++
			result.Vuelo = tokens[i]
			continue
		}

		if reSingleCaps.MatchString(t) {
			continue
		}

		if reIsDate.MatchString(t) {
			if result.FechaSalida == "" {
				result.FechaSalida = t
			} else if result.FechaLlegada == "" {
				result.FechaLlegada = t
			}
			continue
		}

		if reIsOD.MatchString(t) {
			m := reIsOD.FindString(t)
			result.Origen = m[0:3]
			result.Destino = m[3:6]
			continue
		}

		if result.Compania != "" && reIsAirport.MatchString(t) {
			if result.Origen == "" {
				result.Origen = t
			} else if result.Destino == "" {
				result.Destino = t
			}
			continue
		}

		if reIsTime4.MatchString(t) || reIsTimeHM.MatchString(t) {
			if result.Salida == "" {
				result.Salida = normTime(t)
			} else if result.Llegada == "" {
				result.Llegada = normTime(t)
			}
			continue
		}
	}

	if result.FechaSalida != "" && result.FechaLlegada != "" {
		result.NextDay = result.FechaSalida != result.FechaLlegada
	} else if result.Salida != "" && result.Llegada != "" {
		salida, errS := strconv.Atoi(result.Salida)
		llegada, errL := strconv.Atoi(result.Llegada)
		if errS == nil && errL == nil {
			result.NextDay = llegada < salida
		}
	}

	return result
}

// ParseRuta parsea el texto libre de itinerario (campo Ruta de Product /
// Reservation.VueloRuta) en tramos normalizados. Puerto directo de
// parseRuta() en ItineraryTable.jsx — mismo comportamiento, misma prioridad
// de estrategias de split, para que backend y frontend nunca diverjan en
// cómo leen el mismo texto.
func ParseRuta(ruta string) []ItinerarySegment {
	if strings.TrimSpace(ruta) == "" {
		return nil
	}

	lines := extractSegmentLines(ruta)
	segments := make([]ItinerarySegment, 0, len(lines))
	for _, line := range lines {
		seg := parseSegmentLine(line)
		if seg.Compania != "" && seg.Vuelo != "" {
			segments = append(segments, seg)
		}
	}
	return segments
}
