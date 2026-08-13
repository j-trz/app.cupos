import { z } from 'zod';

export const opportunitySchema = z.object({
  destino: z.string().min(1, 'Destino es requerido'),
  compania: z.string().min(1, 'Compañía es requerida'),
  fecha_salida: z.string().min(1, 'Fecha de salida es requerida'),
  temporada: z.string().optional(),
  validez: z.string().optional(),
  fecha_llegada: z.string().optional(),
  total_lugares: z.coerce.number().int().min(0, 'Total de lugares debe ser >= 0'),
  total_liberados: z.coerce.number().int().min(0, 'Total liberados debe ser >= 0'),
  neto_1: z.coerce.number().optional(),
  neto_2: z.coerce.number().optional(),
  estado_interno: z.string().optional(),
  estado: z.enum(['pendiente', 'aprobada', 'rechazada']).optional(),
  usuario_autorizador: z.string().uuid().optional().nullable(),
});

export type OpportunityFormData = z.infer<typeof opportunitySchema>;
