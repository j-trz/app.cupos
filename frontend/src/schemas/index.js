import { z } from 'zod';

// Esquema para validación de usuarios
export const userSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  nombre: z.string().min(1, 'El nombre es requerido'),
  apellido: z.string().min(1, 'El apellido es requerido'),
  rol: z.string().min(1, 'El rol es requerido'),
  agencia: z.string().optional(),
  activo: z.boolean().optional(),
});

// Esquema para actualización de usuario (password opcional)
export const updateUserSchema = z.object({
  email: z.string().email('Email inválido'),
  nombre: z.string().min(1, 'El nombre es requerido'),
  apellido: z.string().min(1, 'El apellido es requerido'),
  rol: z.string().min(1, 'El rol es requerido'),
  agencia: z.string().optional(),
  activo: z.boolean().optional(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional(),
});

// Esquema para validación de productos
export const productSchema = z.object({
  nombre_producto: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
  categoria: z.string().min(1, 'La categoría es requerida'),
  precio_venta: z.number().positive('El precio debe ser positivo'),
  stock_disponible: z.number().nonnegative('El stock debe ser no negativo'),
  fecha_inicio: z.string().min(1, 'La fecha de inicio es requerida'),
  fecha_fin: z.string().min(1, 'La fecha de fin es requerida'),
  activo: z.boolean().optional(),
});

// Esquema para validación de agencias
export const agencySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  email: z.string().email('Email inválido').optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  active: z.boolean().optional(),
});