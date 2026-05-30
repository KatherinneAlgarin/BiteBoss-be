import supabase from '../config/supabase';
import { AppError } from '../helpers/app-error';
import type {
  CajaCierreListadoItem,
  CajaMetodoResumen,
  CajaProductoResumen,
  CajaResumen,
  CajaTransaccionResumen,
  EstadoCajaSesion,
  SolicitarCierreCajaDto,
} from '../domain/interfaces/caja-cierre.interface';

type CajaSesionRow = {
  id_caja_sesion: number;
  id_sucursal: number;
  id_usuario_cajero: number;
  fecha_apertura: string;
  fecha_solicitud_cierre?: string | null;
  fecha_resolucion?: string | null;
  estado: EstadoCajaSesion;
  monto_declarado?: number | null;
  observacion_solicitud?: string | null;
  motivo_rechazo?: string | null;
  resumen?: any;
};

export class CajaCierreService {
  private async validarNoHayCuentasAbiertasSinPagar(id_sucursal: number, id_usuario: number): Promise<void> {
    const { data, error } = await supabase
      .from('pedido')
      .select('id_pedido')
      .eq('id_sucursal', id_sucursal)
      .eq('id_usuario', id_usuario)
      .eq('estado_financiero', 'SIN_PAGAR')
      .neq('estado_operativo', 'CANCELADO')
      .neq('estado_operativo', 'OCULTO')
      .limit(1);

    if (error) {
      throw new AppError('No se pudo validar cuentas pendientes antes del cierre de caja', 500);
    }

    if ((data ?? []).length > 0) {
      throw new AppError('No se puede cerrar caja: hay cuentas abiertas sin pagar.', 409);
    }
  }

  async obtenerSesionActiva(id_usuario: number, id_sucursal: number): Promise<CajaSesionRow | null> {
    const { data: existente, error: existenteError } = await supabase
      .from('caja_sesion')
      .select('*')
      .eq('id_usuario_cajero', id_usuario)
      .eq('id_sucursal', id_sucursal)
      .in('estado', ['ABIERTA', 'PENDIENTE'])
      .order('fecha_apertura', { ascending: false })
      .limit(1);

    if (existenteError) {
      throw new AppError('Error al validar sesión de caja', 500);
    }

    if ((existente ?? []).length > 0) {
      return existente![0] as CajaSesionRow;
    }

    return null;
  }

  private async validarCodigoEmpleado(id_usuario: number, codigo_empleado: string): Promise<void> {
    const { data, error } = await supabase
      .from('usuario')
      .select('codigo_empleado')
      .eq('id_usuario', id_usuario)
      .single();

    if (error || !data) {
      throw new AppError('No se pudo validar el código de empleado', 500);
    }

    const codigoConfigurado = String((data as any).codigo_empleado ?? '').trim();
    if (!codigoConfigurado) {
      throw new AppError('Tu usuario no tiene código de empleado configurado. Contacta al administrador.', 409);
    }

    if (codigoConfigurado !== codigo_empleado) {
      throw new AppError('Código de empleado inválido', 403);
    }
  }

  async iniciarSesion(id_usuario: number, id_sucursal: number, codigo_empleado: string): Promise<CajaResumen> {
    await this.validarCodigoEmpleado(id_usuario, codigo_empleado);

    const existente = await this.obtenerSesionActiva(id_usuario, id_sucursal);
    if (existente) {
      if (existente.estado === 'PENDIENTE') {
        throw new AppError('Hay una revisión pendiente de tu cierre de caja. No puedes abrir la caja hasta que sea autorizada o denegada.', 409);
      }

      return this.calcularResumenSesion(existente);
    }

    const { data: creada, error: crearError } = await supabase
      .from('caja_sesion')
      .insert({
        id_usuario_cajero: id_usuario,
        id_sucursal,
        estado: 'ABIERTA',
      })
      .select('*')
      .single();

    if (crearError || !creada) {
      throw new AppError('No se pudo iniciar la sesión de caja', 500);
    }

    return this.calcularResumenSesion(creada as CajaSesionRow);
  }

  async obtenerResumenActual(id_usuario: number, id_sucursal: number): Promise<CajaResumen> {
    const sesion = await this.obtenerSesionActiva(id_usuario, id_sucursal);
    if (!sesion) {
      throw new AppError('No hay una sesión de caja activa para este usuario.', 404);
    }

    return this.calcularResumenSesion(sesion);
  }

  async solicitarCierre(id_usuario: number, id_sucursal: number, dto: SolicitarCierreCajaDto): Promise<CajaResumen> {
    await this.validarCodigoEmpleado(id_usuario, dto.codigo_empleado);
    await this.validarNoHayCuentasAbiertasSinPagar(id_sucursal, id_usuario);

    const sesion = await this.obtenerSesionActiva(id_usuario, id_sucursal);
    if (!sesion) {
      throw new AppError('No hay una sesión de caja activa para este usuario.', 404);
    }

    if (sesion.estado === 'PENDIENTE') {
      throw new AppError('Ya existe un cierre de caja pendiente de autorización', 409);
    }

    const resumen = await this.calcularResumenSesion(sesion);

    const { error } = await supabase
      .from('caja_sesion')
      .update({
        estado: 'PENDIENTE',
        fecha_solicitud_cierre: new Date(),
        observacion_solicitud: dto.observacion ?? null,
        monto_declarado: dto.monto_declarado,
        resumen,
      })
      .eq('id_caja_sesion', sesion.id_caja_sesion);

    if (error) {
      throw new AppError('No se pudo solicitar el cierre de caja', 500);
    }

    return {
      ...resumen,
      estado: 'PENDIENTE',
      fecha_solicitud_cierre: new Date().toISOString(),
    };
  }

  async listarCierres(params: {
    estado?: string;
    rol_usuario?: string;
    id_sucursal_usuario?: number;
  }): Promise<CajaCierreListadoItem[]> {
    const rol = String(params.rol_usuario ?? '').toUpperCase();

    let query = supabase
      .from('caja_sesion')
      .select(`
        id_caja_sesion,
        estado,
        fecha_apertura,
        fecha_solicitud_cierre,
        fecha_resolucion,
        id_sucursal,
        id_usuario_cajero,
        id_usuario_revisor,
        monto_declarado,
        observacion_solicitud,
        motivo_rechazo,
        resumen,
        sucursal:sucursal!id_sucursal(nombre),
        cajero:usuario!id_usuario_cajero(nombre),
        revisor:usuario!id_usuario_revisor(nombre)
      `)
      .order('fecha_apertura', { ascending: false });

    if (params.estado) {
      query = query.eq('estado', params.estado);
    }

    if (rol === 'GERENTE' && params.id_sucursal_usuario) {
      query = query.eq('id_sucursal', params.id_sucursal_usuario);
    }

    const { data, error } = await query;
    if (error) {
      throw new AppError('No se pudo listar cortes de caja', 500);
    }

    return (data ?? []).map((item: any) => {
      const resumen = item.resumen ?? {};
      return {
        id_caja_sesion: item.id_caja_sesion,
        estado: item.estado,
        fecha_apertura: item.fecha_apertura,
        fecha_solicitud_cierre: item.fecha_solicitud_cierre,
        fecha_resolucion: item.fecha_resolucion,
        id_sucursal: item.id_sucursal,
        sucursal_nombre: item.sucursal?.nombre,
        id_usuario_cajero: item.id_usuario_cajero,
        cajero_nombre: item.cajero?.nombre,
        id_usuario_revisor: item.id_usuario_revisor,
        revisor_nombre: item.revisor?.nombre ?? null,
        total_transacciones: Number(resumen.total_transacciones ?? 0),
        total_monto: Number(resumen.total_monto ?? 0),
        total_propina: Number(resumen.total_propina ?? 0),
        monto_declarado: item.monto_declarado,
        observacion_solicitud: item.observacion_solicitud,
        motivo_rechazo: item.motivo_rechazo,
        resumen: item.resumen ?? null,
      } as CajaCierreListadoItem;
    });
  }

  async resolverCierre(
    id_caja_sesion: number,
    estado: 'AUTORIZADA' | 'RECHAZADA',
    id_usuario_revisor: number,
    motivo_rechazo?: string,
  ): Promise<CajaCierreListadoItem> {
    const { data: actual, error: actualError } = await supabase
      .from('caja_sesion')
      .select('*')
      .eq('id_caja_sesion', id_caja_sesion)
      .single();

    if (actualError || !actual) {
      throw new AppError('Corte de caja no encontrado', 404);
    }

    if (actual.estado !== 'PENDIENTE') {
      throw new AppError('Solo se pueden resolver cortes en estado pendiente', 409);
    }

    const patch: any = {
      estado,
      id_usuario_revisor,
      fecha_resolucion: new Date(),
      motivo_rechazo: estado === 'RECHAZADA' ? (motivo_rechazo ?? '') : null,
    };

    const { data, error } = await supabase
      .from('caja_sesion')
      .update(patch)
      .eq('id_caja_sesion', id_caja_sesion)
      .select(`
        id_caja_sesion,
        estado,
        fecha_apertura,
        fecha_solicitud_cierre,
        fecha_resolucion,
        id_sucursal,
        id_usuario_cajero,
        id_usuario_revisor,
        monto_declarado,
        observacion_solicitud,
        motivo_rechazo,
        resumen,
        sucursal:sucursal!id_sucursal(nombre),
        cajero:usuario!id_usuario_cajero(nombre),
        revisor:usuario!id_usuario_revisor(nombre)
      `)
      .single();

    if (error || !data) {
      throw new AppError('No se pudo resolver el cierre de caja', 500);
    }

    const resumen = (data as any).resumen ?? {};
    return {
      id_caja_sesion: (data as any).id_caja_sesion,
      estado: (data as any).estado,
      fecha_apertura: (data as any).fecha_apertura,
      fecha_solicitud_cierre: (data as any).fecha_solicitud_cierre,
      fecha_resolucion: (data as any).fecha_resolucion,
      id_sucursal: (data as any).id_sucursal,
      sucursal_nombre: (data as any).sucursal?.nombre,
      id_usuario_cajero: (data as any).id_usuario_cajero,
      cajero_nombre: (data as any).cajero?.nombre,
      id_usuario_revisor: (data as any).id_usuario_revisor,
      revisor_nombre: (data as any).revisor?.nombre ?? null,
      total_transacciones: Number(resumen.total_transacciones ?? 0),
      total_monto: Number(resumen.total_monto ?? 0),
      total_propina: Number(resumen.total_propina ?? 0),
      monto_declarado: (data as any).monto_declarado,
      observacion_solicitud: (data as any).observacion_solicitud,
      motivo_rechazo: (data as any).motivo_rechazo,
      resumen: (data as any).resumen ?? null,
    };
  }

  async reautorizarCierre(
    id_caja_sesion: number,
    id_usuario_revisor: number,
  ): Promise<CajaCierreListadoItem> {
    const { data: actual, error: actualError } = await supabase
      .from('caja_sesion')
      .select('*')
      .eq('id_caja_sesion', id_caja_sesion)
      .single();

    if (actualError || !actual) {
      throw new AppError('Corte de caja no encontrado', 404);
    }

    if (actual.estado !== 'RECHAZADA') {
      throw new AppError('Solo se pueden reautorizar cortes rechazados', 409);
    }

    const { data, error } = await supabase
      .from('caja_sesion')
      .update({
        estado: 'AUTORIZADA',
        id_usuario_revisor,
        fecha_resolucion: new Date(),
      })
      .eq('id_caja_sesion', id_caja_sesion)
      .select(`
        id_caja_sesion,
        estado,
        fecha_apertura,
        fecha_solicitud_cierre,
        fecha_resolucion,
        id_sucursal,
        id_usuario_cajero,
        id_usuario_revisor,
        monto_declarado,
        observacion_solicitud,
        motivo_rechazo,
        resumen,
        sucursal:sucursal!id_sucursal(nombre),
        cajero:usuario!id_usuario_cajero(nombre),
        revisor:usuario!id_usuario_revisor(nombre)
      `)
      .single();

    if (error || !data) {
      throw new AppError('No se pudo reautorizar el cierre de caja', 500);
    }

    const resumen = (data as any).resumen ?? {};
    return {
      id_caja_sesion: (data as any).id_caja_sesion,
      estado: (data as any).estado,
      fecha_apertura: (data as any).fecha_apertura,
      fecha_solicitud_cierre: (data as any).fecha_solicitud_cierre,
      fecha_resolucion: (data as any).fecha_resolucion,
      id_sucursal: (data as any).id_sucursal,
      sucursal_nombre: (data as any).sucursal?.nombre,
      id_usuario_cajero: (data as any).id_usuario_cajero,
      cajero_nombre: (data as any).cajero?.nombre,
      id_usuario_revisor: (data as any).id_usuario_revisor,
      revisor_nombre: (data as any).revisor?.nombre ?? null,
      total_transacciones: Number(resumen.total_transacciones ?? 0),
      total_monto: Number(resumen.total_monto ?? 0),
      total_propina: Number(resumen.total_propina ?? 0),
      monto_declarado: (data as any).monto_declarado,
      observacion_solicitud: (data as any).observacion_solicitud,
      motivo_rechazo: (data as any).motivo_rechazo,
      resumen: (data as any).resumen ?? null,
    };
  }

  private async calcularResumenSesion(sesion: CajaSesionRow): Promise<CajaResumen> {
    const { data: pagosRaw, error: pagosError } = await supabase
      .from('pago_pedido')
      .select('id_pago_pedido, id_pedido, monto, propina, nota, id_metodo_pago, tipo_pago:tipo_pago!id_metodo_pago(nombre)')
      .eq('id_caja_sesion', sesion.id_caja_sesion)
      .order('id_pago_pedido', { ascending: false });

    if (pagosError) {
      throw new AppError('No se pudo obtener transacciones de caja', 500);
    }

    const transacciones: CajaTransaccionResumen[] = (pagosRaw ?? []).map((item: any) => ({
      id_pago_pedido: item.id_pago_pedido,
      id_pedido: item.id_pedido,
      metodo: item.tipo_pago?.nombre ?? 'Desconocido',
      monto: Number(item.monto ?? 0),
      propina: Number(item.propina ?? 0),
      referencia: item.nota ?? undefined,
    }));

    const porMetodoMap = new Map<string, CajaMetodoResumen>();
    for (const tx of transacciones) {
      const actual = porMetodoMap.get(tx.metodo) ?? { metodo: tx.metodo, total: 0, cantidad: 0 };
      actual.total += tx.monto;
      actual.cantidad += 1;
      porMetodoMap.set(tx.metodo, actual);
    }

    const pedidoIds = [...new Set(transacciones.map(tx => tx.id_pedido))];

    let productos: CajaProductoResumen[] = [];
    if (pedidoIds.length > 0) {
      const { data: detallesRaw, error: detallesError } = await supabase
        .from('pedido_producto')
        .select('id_pedido, id_producto, cantidad, subtotal, estado_linea, producto:producto!id_producto(nombre)')
        .in('id_pedido', pedidoIds)
        .neq('estado_linea', 'CANCELADO');

      if (detallesError) {
        throw new AppError('No se pudo obtener detalle de productos para el cierre', 500);
      }

      const productosMap = new Map<number, CajaProductoResumen>();
      for (const d of (detallesRaw ?? []) as any[]) {
        const idProducto = Number(d.id_producto);
        const actual = productosMap.get(idProducto) ?? {
          id_producto: idProducto,
          nombre_producto: d.producto?.nombre ?? `Producto ${idProducto}`,
          cantidad_total: 0,
          total_vendido: 0,
        };

        actual.cantidad_total += Number(d.cantidad ?? 0);
        actual.total_vendido += Number(d.subtotal ?? 0);
        productosMap.set(idProducto, actual);
      }

      productos = [...productosMap.values()]
        .sort((a, b) => b.total_vendido - a.total_vendido);
    }

    const total_monto = transacciones.reduce((sum, tx) => sum + tx.monto, 0);
    const total_propina = transacciones.reduce((sum, tx) => sum + tx.propina, 0);

    return {
      id_caja_sesion: sesion.id_caja_sesion,
      estado: sesion.estado,
      fecha_apertura: sesion.fecha_apertura,
      fecha_solicitud_cierre: sesion.fecha_solicitud_cierre ?? null,
      total_transacciones: transacciones.length,
      total_monto,
      total_propina,
      por_metodo: [...porMetodoMap.values()].sort((a, b) => b.total - a.total),
      productos,
      transacciones,
    };
  }
}
