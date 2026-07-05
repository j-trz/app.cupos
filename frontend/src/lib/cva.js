import { cx } from "class-variance-authority";

export { cx, cva } from "class-variance-authority";

/**
 * Clase utilitaria para combinar nombres de clase con soporte para condiciones
 */
export function cn(...inputs) {
  return cx(inputs);
}