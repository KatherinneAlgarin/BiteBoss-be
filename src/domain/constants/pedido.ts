/**
 * Estados terminales del campo `pedido.estado_operativo`: el pedido ya cerró su ciclo de vida.
 * Cualquier otro valor del enum se considera "activo" — el pedido sigue vivo y bloquea
 * cambios de configuración (quitar tipo de orden o método de pago que está usando).
 *
 * Si en el futuro se agregan más estados terminales, basta con añadirlos aquí.
 */
export const ESTADOS_PEDIDO_TERMINALES = ['cerrado', 'cancelado'] as const;
