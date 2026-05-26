import type { CrearPedidoProveedorDto, EditarPedidoProveedorDto, RecibirPedidoProveedorDto } from '../interfaces/pedido-proveedor.interface';

export function validateCrearPedidoProveedor(body: unknown): { data?: CrearPedidoProveedorDto; error?: string } {
  if (!body || typeof body !== 'object') return { error: 'Cuerpo de solicitud inválido' };

  const b = body as Record<string, unknown>;

  const id_proveedor = Number(b.id_proveedor);
  if (!b.id_proveedor || !Number.isInteger(id_proveedor) || id_proveedor <= 0)
    return { error: 'id_proveedor es requerido y debe ser un entero positivo' };

  const id_sucursal = Number(b.id_sucursal);
  if (!b.id_sucursal || !Number.isInteger(id_sucursal) || id_sucursal <= 0)
    return { error: 'id_sucursal es requerido y debe ser un entero positivo' };

  if (b.fecha_entrega !== undefined && b.fecha_entrega !== null) {
    const fecha = new Date(b.fecha_entrega as string);
    if (isNaN(fecha.getTime())) return { error: 'fecha_entrega debe ser una fecha válida' };
  }

  if (!Array.isArray(b.detalles) || b.detalles.length === 0)
    return { error: 'Debe incluir al menos un ingrediente en el detalle' };

  for (let i = 0; i < b.detalles.length; i++) {
    const d = b.detalles[i] as Record<string, unknown>;
    const id_ingrediente = Number(d.id_ingrediente);
    if (!d.id_ingrediente || !Number.isInteger(id_ingrediente) || id_ingrediente <= 0)
      return { error: `Detalle ${i + 1}: id_ingrediente es requerido y debe ser un entero positivo` };

    const cantidad = Number(d.cantidad);
    if (d.cantidad === undefined || isNaN(cantidad) || cantidad <= 0)
      return { error: `Detalle ${i + 1}: la cantidad debe ser mayor a 0` };

    if (d.precio_unitario === undefined || d.precio_unitario === null)
      return { error: `Detalle ${i + 1}: el precio unitario es requerido` };
    const precio = Number(d.precio_unitario);
    if (isNaN(precio) || precio < 0)
      return { error: `Detalle ${i + 1}: el precio unitario debe ser mayor o igual a 0` };
  }

  return {
    data: {
      id_proveedor,
      id_sucursal,
      fecha_entrega: b.fecha_entrega ? String(b.fecha_entrega) : undefined,
      detalles: b.detalles.map((d: any) => ({
        id_ingrediente: Number(d.id_ingrediente),
        cantidad: Number(d.cantidad),
        precio_unitario: Number(d.precio_unitario),
      })),
    },
  };
}

function validateDetalles(detalles: unknown[]): string | null {
  for (let i = 0; i < detalles.length; i++) {
    const d = detalles[i] as Record<string, unknown>;
    const id_ingrediente = Number(d.id_ingrediente);
    if (!d.id_ingrediente || !Number.isInteger(id_ingrediente) || id_ingrediente <= 0)
      return `Detalle ${i + 1}: id_ingrediente inválido`;
    const cantidad = Number(d.cantidad);
    if (d.cantidad === undefined || isNaN(cantidad) || cantidad <= 0)
      return `Detalle ${i + 1}: la cantidad debe ser mayor a 0`;
    if (d.precio_unitario === undefined || d.precio_unitario === null)
      return `Detalle ${i + 1}: el precio unitario es requerido`;
    const precio = Number(d.precio_unitario);
    if (isNaN(precio) || precio < 0)
      return `Detalle ${i + 1}: el precio unitario debe ser ≥ 0`;
  }
  return null;
}

export function validateRecibirPedido(body: unknown): { data?: RecibirPedidoProveedorDto; error?: string } {
  if (!body || typeof body !== 'object') return { error: 'Cuerpo de solicitud inválido' };
  const b = body as Record<string, unknown>;

  const id_bodega = Number(b.id_bodega);
  if (!b.id_bodega || !Number.isInteger(id_bodega) || id_bodega <= 0)
    return { error: 'id_bodega es requerido y debe ser un entero positivo' };

  if (!Array.isArray(b.detalles) || b.detalles.length === 0)
    return { error: 'Debe incluir al menos un ingrediente en detalles' };

  for (let i = 0; i < b.detalles.length; i++) {
    const d = b.detalles[i] as Record<string, unknown>;
    const id_det = Number(d.id_pedido_proveedor_detalle);
    if (!d.id_pedido_proveedor_detalle || !Number.isInteger(id_det) || id_det <= 0)
      return { error: `Detalle ${i + 1}: id_pedido_proveedor_detalle inválido` };
    const id_ing = Number(d.id_ingrediente);
    if (!d.id_ingrediente || !Number.isInteger(id_ing) || id_ing <= 0)
      return { error: `Detalle ${i + 1}: id_ingrediente inválido` };
    const cantidad = Number(d.cantidad);
    if (d.cantidad === undefined || isNaN(cantidad) || cantidad <= 0)
      return { error: `Detalle ${i + 1}: la cantidad debe ser mayor a 0` };
    if (d.fecha_vencimiento !== undefined && d.fecha_vencimiento !== null && d.fecha_vencimiento !== '') {
      const fv = new Date(d.fecha_vencimiento as string);
      if (isNaN(fv.getTime())) return { error: `Detalle ${i + 1}: fecha_vencimiento debe ser una fecha válida` };
    }
  }

  return {
    data: {
      id_bodega,
      detalles: b.detalles.map((d: any) => ({
        id_pedido_proveedor_detalle: Number(d.id_pedido_proveedor_detalle),
        id_ingrediente: Number(d.id_ingrediente),
        cantidad: Number(d.cantidad),
        lote: d.lote ? String(d.lote).trim() : undefined,
        fecha_vencimiento: d.fecha_vencimiento ? String(d.fecha_vencimiento) : undefined,
      })),
    },
  };
}

export function validateEditarPedidoProveedor(body: unknown): { data?: EditarPedidoProveedorDto; error?: string } {
  if (!body || typeof body !== 'object') return { error: 'Cuerpo de solicitud inválido' };

  const b = body as Record<string, unknown>;
  const ESTADOS_VALIDOS = ['PENDIENTE', 'RECIBIDO', 'CANCELADO'];

  if (b.estado !== undefined && !ESTADOS_VALIDOS.includes(b.estado as string))
    return { error: `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(', ')}` };

  if (b.fecha_entrega !== undefined && b.fecha_entrega !== null) {
    const fecha = new Date(b.fecha_entrega as string);
    if (isNaN(fecha.getTime())) return { error: 'fecha_entrega debe ser una fecha válida' };
  }

  if (b.detalles !== undefined) {
    if (!Array.isArray(b.detalles) || b.detalles.length === 0)
      return { error: 'Debe incluir al menos un ingrediente en el detalle' };
    const err = validateDetalles(b.detalles);
    if (err) return { error: err };
  }

  return {
    data: {
      estado: b.estado as EditarPedidoProveedorDto['estado'],
      fecha_entrega: b.fecha_entrega === null ? null : (b.fecha_entrega ? String(b.fecha_entrega) : undefined),
      detalles: b.detalles
        ? (b.detalles as any[]).map(d => ({
            id_ingrediente: Number(d.id_ingrediente),
            cantidad: Number(d.cantidad),
            precio_unitario: Number(d.precio_unitario),
          }))
        : undefined,
    },
  };
}
