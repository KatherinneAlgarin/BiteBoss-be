import { createClient } from '@supabase/supabase-js';
import { envs } from './envs';

// Cliente para autenticacion con Supabase Auth (signInWithPassword)
export const supabaseAuth = createClient(envs.SUPABASE_URL, envs.SUPABASE_ANON_KEY);

// Cliente admin para consultas a la base de datos, siempre usa service role key
const supabase = createClient(envs.SUPABASE_URL, envs.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

export default supabase;
