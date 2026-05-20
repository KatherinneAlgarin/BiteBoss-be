import supabase from '../config/supabase';

type AuditoriaAccion = 'INSERT' | 'UPDATE' | 'DELETE';

interface RegistrarAuditoriaParams {
  entidad: string;
  accion: AuditoriaAccion;
  id_entidad: number;
  id_usuario: number;
  campos_cambiados: string[];
  valor_anterior: Record<string, unknown>;
  valor_nuevo: Record<string, unknown>;
}

export class AuditoriaService {

  async registrar(params: RegistrarAuditoriaParams): Promise<void> {
    const { error } = await supabase.from('auditoria').insert({
      entidad: params.entidad,
      accion: params.accion,
      id_entidad: params.id_entidad,
      id_usuario: params.id_usuario,
      campos_cambiados: params.campos_cambiados,
      valor_anterior: params.valor_anterior,
      valor_nuevo: params.valor_nuevo,
    });

    if (error) {
      console.warn('[AUDITORIA_FALLBACK]', JSON.stringify(params));
    }
  }
}
