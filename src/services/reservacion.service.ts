import supabase from '../config/supabase';
import { AppError } from '../helpers/app-error';
import type { CrearReservacionDto, ActualizarReservacionDto, ReservacionItem } from '../domain/interfaces/reservacion.interface';

export class ReservacionService {

  async listar(id_sucursal: number, activo?: boolean): Promise<ReservacionItem[]> {
    let query = supabase
      .from('reservacion')
      .select(`
        id_reservacion,
        nombre_cliente,
        telefono,
        email,
        fecha_llegada,
        cantidad_personas,
        id_sucursal,
        id_usuario_sucursal,
        activo,
        creado_en,
        zona ( id_zona, nombre ),
        reservacion_mesa ( id_mesa, activo, mesa ( id_mesa, numero ) )
      `)
      .eq('id_sucursal', id_sucursal)
      .order('fecha_llegada', { ascending: false });

    if (activo !== undefined) {
      query = query.eq('activo', activo);
    }

    const { data, error } = await query;

    if (error) {
      throw new AppError('Error al listar reservaciones', 500);
    }

    return (data ?? []).map((r: any) => {
      const mesaActiva = (r.reservacion_mesa ?? []).find((rm: any) => rm.activo === true);
      return {
        id_reservacion: r.id_reservacion,
        nombre_cliente: r.nombre_cliente,
        telefono: r.telefono ?? null,
        email: r.email ?? null,
        fecha_llegada: r.fecha_llegada,
        cantidad_personas: r.cantidad_personas,
        id_zona: r.zona?.id_zona ?? 0,
        zona_nombre: r.zona?.nombre ?? '',
        id_mesa: mesaActiva?.mesa?.id_mesa ?? 0,
        mesa_numero: mesaActiva?.mesa?.numero ?? 0,
        id_sucursal: r.id_sucursal,
        id_usuario_sucursal: r.id_usuario_sucursal,
        activo: r.activo,
        creado_en: r.creado_en,
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

    const { data: reservacion, error: errorReservacion } = await supabase
      .from('reservacion')
      .insert({
        id_usuario_sucursal,
        id_sucursal,
        nombre_cliente: dto.nombre_cliente,
        telefono: dto.telefono ?? null,
        email: dto.email ?? null,
        id_zona: dto.id_zona,
        fecha_llegada: dto.fecha_llegada,
        cantidad_personas: dto.cantidad_personas,
        activo: true,
      })
      .select('id_reservacion, creado_en')
      .single();

    if (errorReservacion || !reservacion) {
      throw new AppError('Error al crear la reservación', 500);
    }

    const { error: errorMesa } = await supabase
      .from('reservacion_mesa')
      .insert({
        id_reservacion: reservacion.id_reservacion,
        id_mesa: dto.id_mesa,
        activo: true,
      });

    if (errorMesa) {
      await supabase
        .from('reservacion')
        .update({ activo: false })
        .eq('id_reservacion', reservacion.id_reservacion);
      throw new AppError('Error al asignar la mesa a la reservación', 500);
    }

    return {
      id_reservacion: reservacion.id_reservacion,
      nombre_cliente: dto.nombre_cliente,
      telefono: dto.telefono ?? null,
      email: dto.email ?? null,
      fecha_llegada: dto.fecha_llegada,
      cantidad_personas: dto.cantidad_personas,
      id_zona: dto.id_zona,
      zona_nombre: zona.nombre,
      id_mesa: dto.id_mesa,
      mesa_numero: mesa.numero,
      id_sucursal,
      id_usuario_sucursal,
      activo: true,
      creado_en: reservacion.creado_en,
    };
  }

  async actualizar(id_reservacion: number, dto: ActualizarReservacionDto, id_sucursal: number): Promise<ReservacionItem> {
    const actual = await this.obtenerYValidarPertenencia(id_reservacion, id_sucursal);

    if (!actual.activo) {
      throw new AppError('No se puede editar una reservación cancelada', 409);
    }

    const zonaFinal = dto.id_zona ?? actual.id_zona;
    const mesaFinal = dto.id_mesa ?? actual.id_mesa;
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
    if (dto.nombre_cliente !== undefined) updateReservacion.nombre_cliente = dto.nombre_cliente;
    if (dto.telefono !== undefined)       updateReservacion.telefono = dto.telefono;
    if (dto.email !== undefined)          updateReservacion.email = dto.email;
    if (dto.fecha_llegada !== undefined)  updateReservacion.fecha_llegada = dto.fecha_llegada;
    if (dto.cantidad_personas !== undefined) updateReservacion.cantidad_personas = dto.cantidad_personas;
    if (dto.id_zona !== undefined)        updateReservacion.id_zona = dto.id_zona;

    if (Object.keys(updateReservacion).length > 0) {
      const { error } = await supabase
        .from('reservacion')
        .update(updateReservacion)
        .eq('id_reservacion', id_reservacion);

      if (error) {
        throw new AppError('Error al actualizar la reservación', 500);
      }
    }

    if (dto.id_mesa !== undefined && dto.id_mesa !== actual.id_mesa) {
      await supabase
        .from('reservacion_mesa')
        .update({ activo: false })
        .eq('id_reservacion', id_reservacion);

      await supabase
        .from('reservacion_mesa')
        .insert({ id_reservacion, id_mesa: dto.id_mesa, activo: true });
    }

    const todas = await this.listar(id_sucursal, undefined);
    const actualizado = todas.find(r => r.id_reservacion === id_reservacion);
    if (!actualizado) {
      throw new AppError('Error al recuperar la reservación actualizada', 500);
    }
    return actualizado;
  }

  async cancelar(id_reservacion: number, id_sucursal: number): Promise<void> {
    const actual = await this.obtenerYValidarPertenencia(id_reservacion, id_sucursal);

    if (!actual.activo) {
      throw new AppError('La reservación ya está cancelada', 409);
    }

    const { error } = await supabase
      .from('reservacion')
      .update({ activo: false })
      .eq('id_reservacion', id_reservacion);

    if (error) {
      throw new AppError('Error al cancelar la reservación', 500);
    }

    await supabase
      .from('reservacion_mesa')
      .update({ activo: false })
      .eq('id_reservacion', id_reservacion);
  }

  async reactivar(id_reservacion: number, id_sucursal: number): Promise<void> {
    const actual = await this.obtenerYValidarPertenencia(id_reservacion, id_sucursal);

    if (actual.activo) {
      throw new AppError('La reservación ya está activa', 409);
    }

    const { error } = await supabase
      .from('reservacion')
      .update({ activo: true })
      .eq('id_reservacion', id_reservacion);

    if (error) {
      throw new AppError('Error al reactivar la reservación', 500);
    }

    await supabase
      .from('reservacion_mesa')
      .update({ activo: true })
      .eq('id_reservacion', id_reservacion);
  }

  private async obtenerYValidarPertenencia(
    id_reservacion: number,
    id_sucursal: number,
  ): Promise<{ id_reservacion: number; id_sucursal: number; id_zona: number; id_mesa: number; cantidad_personas: number; activo: boolean }> {
    const { data, error } = await supabase
      .from('reservacion')
      .select(`
        id_reservacion,
        id_sucursal,
        id_zona,
        cantidad_personas,
        activo,
        reservacion_mesa ( id_mesa, activo )
      `)
      .eq('id_reservacion', id_reservacion)
      .maybeSingle();

    if (error) {
      throw new AppError('Error al buscar la reservación', 500);
    }
    if (!data) {
      throw new AppError('Reservación no encontrada', 404);
    }
    if (data.id_sucursal !== id_sucursal) {
      throw new AppError('No tienes permisos para modificar esta reservación', 403);
    }

    const mesaActiva = (data.reservacion_mesa as any[])?.find((rm: any) => rm.activo === true);

    return {
      id_reservacion: data.id_reservacion,
      id_sucursal:    data.id_sucursal,
      id_zona:        data.id_zona,
      id_mesa:        mesaActiva?.id_mesa ?? 0,
      cantidad_personas: data.cantidad_personas,
      activo:         data.activo,
    };
  }

  private async validarZonaDeSucursal(id_zona: number, id_sucursal: number): Promise<{ id_zona: number; nombre: string }> {
    const { data, error } = await supabase
      .from('zona')
      .select('id_zona, nombre')
      .eq('id_zona', id_zona)
      .eq('id_sucursal', id_sucursal)
      .eq('activo', true)
      .maybeSingle();

    if (error) {
      throw new AppError('Error al validar la zona', 500);
    }
    if (!data) {
      throw new AppError('La zona no existe o no pertenece a tu sucursal', 400);
    }
    return data;
  }

  private async validarMesaDeZona(id_mesa: number, id_zona: number): Promise<{ id_mesa: number; numero: number; capacidad: number }> {
    const { data, error } = await supabase
      .from('mesa')
      .select('id_mesa, numero, capacidad')
      .eq('id_mesa', id_mesa)
      .eq('id_zona', id_zona)
      .eq('activo', true)
      .maybeSingle();

    if (error) {
      throw new AppError('Error al validar la mesa', 500);
    }
    if (!data) {
      throw new AppError('La mesa no existe o no pertenece a la zona seleccionada', 400);
    }
    return data;
  }
}
