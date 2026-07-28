package services

// ResolveAgencyCode normaliza un valor de agencia (que históricamente puede
// venir guardado como código o como nombre, según qué pantalla lo haya
// cargado en Profile.Agencia o en el JWT) al código canónico de Agency. Esto
// evita que comparaciones exactas como `restricted_agency = ?` fallen cuando
// un lado tiene el código y el otro el nombre (o difieren en mayúsculas) —
// caso real: una cesión a "TocToc" no era visible para el usuario cuyo
// perfil tenía agencia cargada de otra forma.
// Si no encuentra ninguna coincidencia, devuelve el valor tal cual vino (para
// no romper comparaciones con datos legacy que no tienen agencia registrada).
func ResolveAgencyCode(value string) string {
	if value == "" {
		return value
	}
	agency, err := FindAgencyByCodeOrName(value)
	if err != nil {
		return value
	}
	return agency.Code
}

// ResolveAgencyAIHabilitado indica si el asistente de IA está habilitado para
// la agencia dada (Profile.Agencia, código o nombre). Sin agencia cargada, o
// si la agencia no se encuentra, no se bloquea (comportamiento previo a que
// existiera este flag) — el apagado es un opt-out explícito por agencia, no
// un default restrictivo.
func ResolveAgencyAIHabilitado(agenciaRaw string) bool {
	if agenciaRaw == "" {
		return true
	}
	agency, err := FindAgencyByCodeOrName(agenciaRaw)
	if err != nil {
		return true
	}
	return agency.AIHabilitado
}
