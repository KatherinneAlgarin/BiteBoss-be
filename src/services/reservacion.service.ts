import supabase from '../config/supabase';
import { AppError } from '../helpers/app-error';
import type { CrearReservacionDto, ActualizarReservacionDto, ReservacionItem, EstadoReservacion } from '../domain/interfaces/reservacion.interface';

export class ReservacionService {

  private calcularDuracion(cantidad_personas: number): number {
    if (cantidad_personas <= 2) return 60;
    if (cantidad_personas <= 4) return 90;
    if (cantidad_personas <= 7) return 120;
    return 150;
  }

  private async validarSinTraslape(
    id_mesa: number,
    fecha_llegada: string,
    duracion_minutos: number,
    excluir_id?: number,
  ): Promise<void> {
    const { data, error } = await supabase
      .from('reservacion')
      .select(`
        id_reservacion,
        fecha_llegada,
        duracion_minutos,
        reservacion_mesa!inner ( id_mesa )
      `)
      .eq('reservacion_mesa.id_mesa', id_mesa)
      .eq('reservacion_mesa.activo', true)
      .eq('estado', 'pendiente')
      .eq('activo', true);

    if (error) throw new AppError('Error al verificar disponibilidad de la mesa', 500);

    const nuevaInicio = new Date(fecha_llegada).getTime();
    const nuevaFin    = nuevaInicio + duracion_minutos * 60_000;

    const conflicto = (data ?? []).find((r: any) => {
      if (excluir_id && r.id_reservacion === excluir_id) return false;
      const existInicio = new Date(r.fecha_llegada).getTime();
      const existFin    = existInicio + r.duracion_minutos * 60_000;
      return nuevaInicio < existFin && existInicio < nuevaFin;
    });

    if (conflicto) {
      throw new AppError('La mesa ya tiene una reservación activa en ese horario.', 409);
    }
  }

  async listar(id_sucursal: number, estado?: EstadoReservacion): Promise<ReservacionItem[]> {
    let query = supabase
      .from('reservacion')
      .select(`
        id_reservacion,
        nombre_cliente,
        telefono,
        email,
        fecha_llegada,
        cantidad_personas,
        duracion_minutos,
        id_sucursal,
        id_usuario_sucursal,
        estado,
        activo,
        creado_en,
        zona ( id_zona, nombre ),
        reservacion_mesa ( id_mesa, activo, mesa ( id_mesa, numero ) )
      `)
      .eq('id_sucursal', id_sucursal)
      .eq('activo', true)
      .order('fecha_llegada', { ascending: false });

    if (estado !== undefined) {
      query = query.eq('estado', estado);
    }

    const { data, error } = await query;

    if (error) throw new AppError('Error al listar reservaciones', 500);

    return (data ?? []).map((r: any) => {
      const mesaActiva = (r.reservacion_mesa ?? []).find((rm: any) => rm.activo === true);
      return {
        id_reservacion:      r.id_reservacion,
        nombre_cliente:      r.nombre_cliente,
        telefono:            r.telefono ?? null,
        email:               r.email ?? null,
        fecha_llegada:       r.fecha_llegada,
        cantidad_personas:   r.cantidad_personas,
        duracion_minutos:    r.duracion_minutos,
        id_zona:             r.zona?.id_zona ?? 0,
        zona_nombre:         r.zona?.nombre ?? '',
        id_mesa:             mesaActiva?.mesa?.id_mesa ?? 0,
        mesa_numero:         mesaActiva?.mesa?.numero ?? 0,
        id_sucursal:         r.id_sucursal,
        id_usuario_sucursal: r.id_usuario_sucursal,
        estado:              r.estado as EstadoReservacion,
        activo:              r.activo,
        creado_en:           r.creado_en,
      };
    });
  }

  async crear(dto: CrearReservacionDto, id_usuario_sucursal: number, id_sucursal: number): Promise<ReservacionItem> {
    const zona = await this.validarZonaDeSucursal(dto.id_zona, id_sucursal);
    const mesa = await this.validarMesaDeZona(dto.id_mesa, dto.id_zona);

    if (mesa.capacidad < dto.cantidad_personas) {
      throw new AppError(
        `La mesa tiene capacidad para ${mesa.capacidad} persona(s), pero se requieren ${dto.cantidad_personas}.`,
        400,
      );
    }

    const duracion_minutos = this.calcularDuracion(dto.cantidad_personas) + (dto.tiempo_extra_minutos ?? 0);

    await this.validarSinTraslape(dto.id_mesa, dto.fecha_llegada, duracion_minutos);

    const { data: reservacion, error: errorReservacion } = await supabase
      .from('reservacion')
      .insert({
        id_usuario_sucursal,
        id_sucursal,
        nombre_cliente:    dto.nombre_cliente,
        telefono:          dto.telefono ?? null,
        email:             dto.email ?? null,
        id_zona:           dto.id_zona,
        fecha_llegada:     dto.fecha_llegada,
        cantidad_personas: dto.cantidad_personas,
        duracion_minutos,
        estado:            'pendiente',
        activo:            true,
      })
      .select('id_reservacion, creado_en')
      .single();

    if (errorReservacion || !reservacion) {
      throw new AppError('Error al crear la reservación', 500);
    }

    const { error: errorMesa } = await supabase
      .from('reservacion_mesa')
      .insert({ id_reservacion: reservacion.id_reservacion, id_mesa: dto.id_mesa, activo: true });

    if (errorMesa) {
      await supabase.from('reservacion').update({ activo: false }).eq('id_reservacion', reservacion.id_reservacion);
      throw new AppError('Error al asignar la mesa a la reservación', 500);
    }

    return {
      id_reservacion:      reservacion.id_reservacion,
      nombre_cliente:      dto.nombre_cliente,
      telefono:            dto.telefono ?? null,
      email:               dto.email ?? null,
      fecha_llegada:       dto.fecha_llegada,
      cantidad_personas:   dto.cantidad_personas,
      duracion_minutos,
      id_zona:             dto.id_zona,
      zona_nombre:         zona.nombre,
      id_mesa:             dto.id_mesa,
      mesa_numero:         mesa.numero,
      id_sucursal,
      id_usuario_sucursal,
      estado:              'pendiente',
      activo:              true,
      creado_en:           reservacion.creado_en,
    };
  }

  async actualizar(id_reservacion: number, dto: ActualizarReservacionDto, id_sucursal: number): Promise<ReservacionItem> {
    const actual = await this.obtenerYValidarPertenencia(id_reservacion, id_sucursal);

    if (actual.estado !== 'pendiente') {
      throw new AppError('Solo se pueden editar reservaciones en estado pendiente', 409);
    }

    if (new Date(actual.fecha_llegada) < new Date()) {
      throw new AppError('No se puede editar una reservación cuya fecha de llegada ya pasó', 409);
    }

    const zonaFinal     = dto.id_zona          ?? actual.id_zona;
    const mesaFinal     = dto.id_mesa           ?? actual.id_mesa;
    const personasFinal = dto.cantidad_personas ?? actual.cantidad_personas;

    if (dto.id_zona !== undefined) {
      await this.validarZonaDeSucursal(dto.id_zona, id_sucursal);
    }

    if (dto.id_mesa !== undefined || dto.id_zona !== undefined || dto.cantidad_personas !== undefined) {
      const mesa = await this.validarMesaDeZona(mesaFinal, zonaFinal);
      if (mesa.capacidad < personasFinal) {
        throw new AppError(
          `La mesa tiene capacidad para ${mesa.capacidad} persona(s), pero se requieren ${personasFinal}.`,
          400,
        );
      }
    }

    const updateReservacion: Record<string, any> = {};
    if (dto.nombre_cliente !== undefined)    updateReservacion.nombre_cliente    = dto.nombre_cliente;
    if (dto.telefono !== undefined)          updateReservacion.telefono          = dto.telefono;
    if (dto.email !== undefined)             updateReservacion.email             = dto.email;
    if (dto.fecha_llegada !== undefined)     updateReservacion.fecha_llegada     = dto.fecha_llegada;
    if (dto.cantidad_personas !== undefined) updateReservacion.cantidad_personas = dto.cantidad_personas;
    if (dto.id_zona !== undefined)           updateReservacion.id_zona           = dto.id_zona;

    // Recalcular duración si cambia cantidad de personas o tiempo extra
    if (dto.cantidad_personas !== undefined || dto.tiempo_extra_minutos !== undefined) {
      const extraFinal = dto.tiempo_extra_minutos ?? actual.tiempo_extra_minutos;
      updateReservacion.duracion_minutos = this.calcularDuracion(personasFinal) + extraFinal;
    }

    const fechaFinal    = dto.fecha_llegada ?? actual.fecha_llegada;
    const duracionFinal = updateReservacion.duracion_minutos ?? actual.duracion_minutos;

    if (dto.id_mesa !== undefined || dto.fecha_llegada !== undefined || dto.cantidad_personas !== undefined || dto.tiempo_extra_minutos !== undefined) {
      await this.validarSinTraslape(mesaFinal, fechaFinal, duracionFinal, id_reservacion);
    }

    if (Object.keys(updateReservacion).length > 0) {
      const { error } = await supabase
        .from('reservacion')
        .update(updateReservacion)
        .eq('id_reservacion', id_reservacion);

      if (error) throw new AppError('Error al actualizar la reservación', 500);
    }

    if (dto.id_mesa !== undefined && dto.id_mesa !== actual.id_mesa) {
      await supabase.from('reservacion_mesa').update({ activo: false }).eq('id_reservacion', id_reservacion);
      await supabase.from('reservacion_mesa').insert({ id_reservacion, id_mesa: dto.id_mesa, activo: true });
    }

    const todas = await this.listar(id_sucursal, undefined);
    const actualizado = todas.find(r => r.id_reservacion === id_reservacion);
    if (!actualizado) throw new AppError('Error al recuperar la reservación actualizada', 500);
    return actualizado;
  }

  async cancelar(id_reservacion: number, id_sucursal: number): Promise<void> {
    const actual = await this.obtenerYValidarPertenencia(id_reservacion, id_sucursal);

    if (actual.estado === 'cancelada') throw new AppError('La reservación ya está cancelada', 409);
    if (actual.estado === 'completada') throw new AppError('No se puede cancelar una reservación completada', 409);

    const { error } = await supabase.from('reservacion').update({ estado: 'cancelada' }).eq('id_reservacion', id_reservacion);
    if (error) throw new AppError('Error al cancelar la reservación', 500);
  }

  async reactivar(id_reservacion: number, id_sucursal: number): Promise<void> {
    const actual = await this.obtenerYValidarPertenencia(id_reservacion, id_sucursal);

    if (actual.estado !== 'cancelada') throw new AppError('Solo se pueden reactivar reservaciones canceladas', 409);

    const { error } = await supabase.from('reservacion').update({ estado: 'pendiente' }).eq('id_reservacion', id_reservacion);
    if (error) throw new AppError('Error al reactivar la reservación', 500);
  }

  async completar(id_reservacion: number, id_sucursal: number): Promise<void> {
    const actual = await this.obtenerYValidarPertenencia(id_reservacion, id_sucursal);

    if (actual.estado !== 'pendiente') throw new AppError('Solo se pueden completar reservaciones pendientes', 409);

    const { error } = await supabase.from('reservacion').update({ estado: 'completada' }).eq('id_reservacion', id_reservacion);
    if (error) throw new AppError('Error al completar la reservación', 500);
  }

  private async obtenerYValidarPertenencia(id_reservacion: number, id_sucursal: number): Promise<{
    id_reservacion: number; id_sucursal: number; id_zona: number; id_mesa: number;
    cantidad_personas: number; duracion_minutos: number; tiempo_extra_minutos: number;
    estado: EstadoReservacion; fecha_llegada: string;
  }> {
    const { data, error } = await supabase
      .from('reservacion')
      .select(`
        id_reservacion,
        id_sucursal,
        id_zona,
        cantidad_personas,
        duracion_minutos,
        estado,
        fecha_llegada,
        reservacion_mesa ( id_mesa, activo )
      `)
      .eq('id_reservacion', id_reservacion)
      .eq('activo', true)
      .maybeSingle();

    if (error) throw new AppError('Error al buscar la reservación', 500);
    if (!data)  throw new AppError('Reservación no encontrada', 404);
    if (data.id_sucursal !== id_sucursal) throw new AppError('No tienes permisos para modificar esta reservación', 403);

    const mesaActiva = (data.reservacion_mesa as any[])?.find((rm: any) => rm.activo === true);
    const base = this.calcularDuracion(data.cantidad_personas);
    const tiempo_extra_minutos = Math.max(0, data.duracion_minutos - base);

    return {
      id_reservacion:      data.id_reservacion,
      id_sucursal:         data.id_sucursal,
      id_zona:             data.id_zona,
      id_mesa:             mesaActiva?.id_mesa ?? 0,
      cantidad_personas:   data.cantidad_personas,
      duracion_minutos:    data.duracion_minutos,
      tiempo_extra_minutos,
      estado:              data.estado as EstadoReservacion,
      fecha_llegada:       data.fecha_llegada,
    };
  }

  private async validarZonaDeSucursal(id_zona: number, id_sucursal: number): Promise<{ id_zona: number; nombre: string }> {
    const { data, error } = await supabase
      .from('zona').select('id_zona, nombre')
      .eq('id_zona', id_zona).eq('id_sucursal', id_sucursal).eq('activo', true)
      .maybeSingle();

    if (error) throw new AppError('Error al validar la zona', 500);
    if (!data)  throw new AppError('La zona no existe o no pertenece a tu sucursal', 400);
    return data;
  }

  private async validarMesaDeZona(id_mesa: number, id_zona: number): Promise<{ id_mesa: number; numero: number; capacidad: number }> {
    const { data, error } = await supabase
      .from('mesa').select('id_mesa, numero, capacidad')
      .eq('id_mesa', id_mesa).eq('id_zona', id_zona).eq('activo', true)
      .maybeSingle();

    if (error) throw new AppError('Error al validar la mesa', 500);
    if (!data)  throw new AppError('La mesa no existe o no pertenece a la zona seleccionada', 400);
    return data;
  }
}
