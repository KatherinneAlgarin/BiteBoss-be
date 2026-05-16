import supabase from '../config/supabase';
import { AppError } from '../helpers/app-error';
import { ESTADOS_PEDIDO_TERMINALES } from '../domain/constants/pedido';
import type {
  TipoPagoItem,
  CrearTipoPagoDto,
  ActualizarTipoPagoDto,
  DependenciasDesactivacionTipoPago,
  SucursalImpactadaTipoPago,
  AuditoriaTipoPagoEvento,
} from '../domain/interfaces/tipo-pago.interface';

const ESTADOS_TERMINALES_PG = `(${ESTADOS_PEDIDO_TERMINALES.map(s => `"${s}"`).join(',')})`;
const AUDIT_TABLE = process.env.AUDIT_TABLE_TIPO_PAGO ?? 'auditoria_evento';

interface AuditActor {
  id_usuario?: number;
  email: string;
}

export class TipoPagoService {

  private mapTipoPago(item: any): TipoPagoItem {
    return {
      id_tipo_pago: item.id_tipo_pago,
      nombre: item.nombre,
      activo: item.activo ?? true,
    };
  }

  private async registrarAuditoria(evento: AuditoriaTipoPagoEvento): Promise<void> {
    const { error } = await supabase
      .from(AUDIT_TABLE)
      .insert({
        entidad: evento.entidad,
        entidad_id: evento.entidad_id,
        accion: evento.accion,
        actor_id_usuario: evento.actor_id_usuario,
        actor_email: evento.actor_email,
        cambios: evento.cambios,
        timestamp: evento.timestamp,
      });

    if (error) {
      // Fallback a logs para no interrumpir la operación principal.
      console.warn('[AUDIT_TIPO_PAGO_FALLBACK]', JSON.stringify(evento));
    }
  }

  private async auditarCambio(params: {
    accion: 'CREAR' | 'EDITAR' | 'ACTIVAR' | 'DESACTIVAR';
    actor: AuditActor;
    antes: TipoPagoItem | null;
    despues: TipoPagoItem;
  }): Promise<void> {
    const campos = ['nombre', 'activo'] as const;
    const cambios = campos
      .filter((campo) => (params.antes?.[campo] ?? null) !== (params.despues[campo] ?? null))
      .map((campo) => ({
        campo,
        anterior: params.antes?.[campo] ?? null,
        nuevo: params.despues[campo] ?? null,
      }));

    await this.registrarAuditoria({
      entidad: 'tipo_pago',
      entidad_id: params.despues.id_tipo_pago,
      accion: params.accion,
      actor_id_usuario: params.actor.id_usuario ?? null,
      actor_email: params.actor.email,
      cambios,
      timestamp: new Date().toISOString(),
    });
  }

  private async existeNombreCI(nombre: string, excluirId?: number): Promise<boolean> {
    let query = supabase
      .from('tipo_pago')
      .select('id_tipo_pago')
      .ilike('nombre', nombre);

    if (excluirId !== undefined) {
      query = query.neq('id_tipo_pago', excluirId);
    }

    const { data, error } = await query;
    if (error) {
      throw new AppError('Error al validar nombre del método de pago', 500);
    }
    return (data ?? []).length > 0;
  }

  async obtenerPorId(id_tipo_pago: number): Promise<TipoPagoItem | null> {
    const { data, error } = await supabase
      .from('tipo_pago')
      .select('id_tipo_pago, nombre, activo')
      .eq('id_tipo_pago', id_tipo_pago)
      .maybeSingle();

    if (error) {
      throw new AppError('Error al obtener método de pago', 500);
    }
    if (!data) return null;

    return this.mapTipoPago(data);
  }

  async listar(): Promise<TipoPagoItem[]> {
    const { data, error } = await supabase
      .from('tipo_pago')
      .select('id_tipo_pago, nombre, activo')
      .order('nombre', { ascending: true });

    if (error) {
      throw new AppError('Error al listar tipos de pago', 500);
    }

    return (data ?? []).map((t: any) => this.mapTipoPago(t));
  }

  async crear(dto: CrearTipoPagoDto, actor: AuditActor): Promise<TipoPagoItem> {
    if (await this.existeNombreCI(dto.nombre)) {
      throw new AppError('Ya existe un método de pago con ese nombre', 409);
    }

    const { data, error } = await supabase
      .from('tipo_pago')
      .insert({
        nombre: dto.nombre,
        activo: true,
      })
      .select('id_tipo_pago')
      .single();

    if (error || !data) {
      throw new AppError('Error al crear método de pago', 500);
    }

    const creado = await this.obtenerPorId(data.id_tipo_pago);
    if (!creado) {
      throw new AppError('Error al recuperar método de pago creado', 500);
    }

    await this.auditarCambio({ accion: 'CREAR', actor, antes: null, despues: creado });
    return creado;
  }

  async actualizar(id_tipo_pago: number, dto: ActualizarTipoPagoDto, actor: AuditActor): Promise<TipoPagoItem> {
    const actual = await this.obtenerPorId(id_tipo_pago);
    if (!actual) {
      throw new AppError('Método de pago no encontrado', 404);
    }

    if (dto.nombre !== undefined && await this.existeNombreCI(dto.nombre, id_tipo_pago)) {
      throw new AppError('Ya existe un método de pago con ese nombre', 409);
    }

    const updateData: Record<string, any> = {};
    if (dto.nombre !== undefined) updateData.nombre = dto.nombre;

    if (Object.keys(updateData).length === 0) {
      return actual;
    }

    const { error } = await supabase
      .from('tipo_pago')
      .update(updateData)
      .eq('id_tipo_pago', id_tipo_pago);

    if (error) {
      throw new AppError('Error al actualizar método de pago', 500);
    }

    const actualizado = await this.obtenerPorId(id_tipo_pago);
    if (!actualizado) {
      throw new AppError('Error al recuperar método de pago actualizado', 500);
    }

    await this.auditarCambio({ accion: 'EDITAR', actor, antes: actual, despues: actualizado });
    return actualizado;
  }

  private async tipoPagoTienePedidosActivos(id_tipo_pago: number): Promise<boolean> {
    const { data, error } = await supabase
      .from('pago_pedido')
      .select('id_pago_pedido, pedido:pedido!id_pedido!inner(id_pedido, estado_operativo)')
      .eq('id_metodo_pago', id_tipo_pago)
      .not('pedido.estado_operativo', 'in', ESTADOS_TERMINALES_PG)
      .limit(1);

    if (error) {
      return false;
    }
    return (data ?? []).length > 0;
  }

  private async listarSucursalesConMetodoActivo(id_tipo_pago: number): Promise<Array<{ id_sucursal: number; nombre: string }>> {
    const { data, error } = await supabase
      .from('sucursal_metodo_pago')
      .select('id_sucursal, sucursal:sucursal!id_sucursal(id_sucursal, nombre, activo)')
      .eq('id_tipo_pago', id_tipo_pago)
      .eq('activo', true);

    if (error) {
      throw new AppError('Error al validar asignaciones del método de pago', 500);
    }

    const map = new Map<number, { id_sucursal: number; nombre: string }>();
    for (const row of (data ?? []) as any[]) {
      if (!row.sucursal || row.sucursal.activo === false) continue;
      map.set(row.id_sucursal, {
        id_sucursal: row.id_sucursal,
        nombre: row.sucursal.nombre,
      });
    }

    return Array.from(map.values());
  }

  private async contarMetodosActivosRestantes(id_sucursal: number, id_tipo_pago_desactivar: number): Promise<number> {
    const { data, error } = await supabase
      .from('sucursal_metodo_pago')
      .select('id_sucursal_pago, tipo_pago:tipo_pago!id_tipo_pago(id_tipo_pago, activo)')
      .eq('id_sucursal', id_sucursal)
      .eq('activo', true)
      .neq('id_tipo_pago', id_tipo_pago_desactivar);

    if (error) {
      throw new AppError('Error al validar métodos de pago restantes por sucursal', 500);
    }

    return (data ?? []).filter((row: any) => row.tipo_pago?.activo !== false).length;
  }

  async obtenerDependenciasDesactivacion(id_tipo_pago: number): Promise<DependenciasDesactivacionTipoPago> {
    const actual = await this.obtenerPorId(id_tipo_pago);
    if (!actual) {
      throw new AppError('Método de pago no encontrado', 404);
    }

    const sucursales = await this.listarSucursalesConMetodoActivo(id_tipo_pago);
    const impacto: SucursalImpactadaTipoPago[] = [];

    for (const suc of sucursales) {
      const restantes = await this.contarMetodosActivosRestantes(suc.id_sucursal, id_tipo_pago);
      impacto.push({
        id_sucursal: suc.id_sucursal,
        nombre: suc.nombre,
        metodos_activos_restantes: restantes,
      });
    }

    const sinMetodos = impacto.filter(s => s.metodos_activos_restantes === 0);

    return {
      id_tipo_pago: actual.id_tipo_pago,
      nombre: actual.nombre,
      sucursales_activas_count: impacto.length,
      sucursales_activas: impacto,
      puede_desactivar: sinMetodos.length === 0,
      sucursales_sin_metodos: sinMetodos,
    };
  }

  async desactivar(id_tipo_pago: number, actor: AuditActor): Promise<TipoPagoItem> {
    const actual = await this.obtenerPorId(id_tipo_pago);
    if (!actual) {
      throw new AppError('Método de pago no encontrado', 404);
    }

    if (!actual.activo) {
      return actual;
    }

    if (await this.tipoPagoTienePedidosActivos(id_tipo_pago)) {
      throw new AppError('No se puede desactivar: tiene pedidos activos asociados.', 409);
    }

    const dependencias = await this.obtenerDependenciasDesactivacion(id_tipo_pago);
    if (!dependencias.puede_desactivar) {
      const nombres = dependencias.sucursales_sin_metodos.map(s => s.nombre).join(', ');
      throw new AppError(
        `No se puede desactivar el método de pago porque dejaría sin métodos activos a: ${nombres}.`,
        409,
      );
    }

    const { error: errorVinculos } = await supabase
      .from('sucursal_metodo_pago')
      .update({ activo: false })
      .eq('id_tipo_pago', id_tipo_pago)
      .eq('activo', true);

    if (errorVinculos) {
      throw new AppError('Error al desactivar asignaciones del método de pago en sucursales', 500);
    }

    const { error: errorTipoPago } = await supabase
      .from('tipo_pago')
      .update({ activo: false })
      .eq('id_tipo_pago', id_tipo_pago);

    if (errorTipoPago) {
      throw new AppError('Error al desactivar método de pago', 500);
    }

    const actualizado = await this.obtenerPorId(id_tipo_pago);
    if (!actualizado) {
      throw new AppError('Error al recuperar método de pago desactivado', 500);
    }

    await this.auditarCambio({ accion: 'DESACTIVAR', actor, antes: actual, despues: actualizado });
    return actualizado;
  }

  async activar(id_tipo_pago: number, actor: AuditActor): Promise<TipoPagoItem> {
    const actual = await this.obtenerPorId(id_tipo_pago);
    if (!actual) {
      throw new AppError('Método de pago no encontrado', 404);
    }

    if (actual.activo) {
      return actual;
    }

    const { error } = await supabase
      .from('tipo_pago')
      .update({ activo: true })
      .eq('id_tipo_pago', id_tipo_pago);

    if (error) {
      throw new AppError('Error al activar método de pago', 500);
    }

    const actualizado = await this.obtenerPorId(id_tipo_pago);
    if (!actualizado) {
      throw new AppError('Error al recuperar método de pago activado', 500);
    }

    await this.auditarCambio({ accion: 'ACTIVAR', actor, antes: actual, despues: actualizado });
    return actualizado;
  }
}
