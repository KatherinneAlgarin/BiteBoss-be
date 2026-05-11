import supabase from '../config/supabase';
import { AppError } from '../helpers/app-error';
import type { PagoDto, MetodoPagoSucursalDto, CrearPagoDto } from '../domain/interfaces/pago.interface';

export class PagoService {

  async listarMetodosPago(id_sucursal: number): Promise<MetodoPagoSucursalDto[]> {
    const { data, error } = await supabase
      .from('sucursal_metodo_pago')
      .select(`
        id_sucursal_pago,
        id_sucursal,
        activo,
        tipo_pago!inner (nombre)
      `)
      .eq('id_sucursal', id_sucursal)
      .eq('activo', true);

    if (error) {
      throw new AppError('Error al listar métodos de pago', 500);
    }

    return (data ?? []).map(item => ({
      id_metodo_pago_sucursal: item.id_sucursal_pago,
      id_sucursal: item.id_sucursal,
      metodo: (item.tipo_pago as any)?.nombre || '',
      activo: item.activo,
    }));
  }

  async crearPago(dto: CrearPagoDto): Promise<PagoDto> {

    const { data: tipoPagoData, error: tipoError } = await supabase
      .from('tipo_pago')
      .select('id_tipo_pago')
      .eq('nombre', dto.metodo)
      .single();

    if (tipoError || !tipoPagoData) {
      throw new AppError('Método de pago no encontrado', 400);
    }

    const pagoData: PagoDto = {
      id_orden: dto.id_orden,
      monto: dto.monto,
      metodo: dto.metodo,
      referencia: dto.referencia,
      propina: dto.propina,
      estado: 'pendiente',
      fecha_pago: new Date(),
    };

    const pagoPedidoData = {
      id_usuario: 1, 
      id_pedido: dto.id_orden,
      id_metodo_pago: tipoPagoData.id_tipo_pago,
      propina: dto.propina || 0,
      monto: dto.monto,
      nota: dto.referencia,
      tipo_pago: 'VENTA',
    };

    const { data, error } = await supabase
      .from('pago_pedido')
      .insert(pagoPedidoData)
      .select()
      .single();

    if (error) {
      throw new AppError('Error al crear pago', 500);
    }

    return {
      id_pago: data.id_pago_pedido,
      ...pagoData,
    };
  }

  async listarPagosOrden(id_orden: number): Promise<PagoDto[]> {
    const { data, error } = await supabase
      .from('pago')
      .select('*')
      .eq('id_orden', id_orden)
      .order('fecha_pago', { ascending: false });

    if (error) {
      throw new AppError('Error al listar pagos de orden', 500);
    }

    return data ?? [];
  }

  async actualizarEstadoPago(id_pago: number, estado: string): Promise<PagoDto> {
    const { data, error } = await supabase
      .from('pago')
      .update({ estado })
      .eq('id_pago', id_pago)
      .select()
      .single();

    if (error) {
      throw new AppError('Error al actualizar estado de pago', 500);
    }

    return data;
  }
}