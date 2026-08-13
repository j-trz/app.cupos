Registro cronológico append-only de altas, consultas y lints sobre este vault. Formato: `YYYY-MM-DD [PREFIJO] descripción corta — nota(s) tocada(s)`. Prefijos: `INGEST` (fuente nueva absorbida → resumen/páginas de entidad actualizadas), `QUERY` (pregunta respondida y el resultado quedó archivado en el vault), `LINT` (health-check: contradicciones, notas huérfanas, referencias cruzadas faltantes, sellos de frescura vencidos).

No se reconstruyen entradas retroactivas para altas anteriores a este archivo — esa historia vive en los sellos de frescura de cada nota y en `git log`. Este log arranca desde la primera entrada real de abajo.

---

- 2026-08-12 `LINT` — Reorganización del vault siguiendo el patrón "LLM Wiki" (Karpathy): se creó este `log.md` y `index.md` (antes el catálogo vivía embebido en `000 - README`), se renombró `Feedback UTG` → `008 - Backlog y Feedback` para alinear con la numeración del resto de carpetas, y se extendió el protocolo de actualización en [[Gotchas y Reglas de Oro]] con las obligaciones de mantener `index.md`/`log.md` al día.
