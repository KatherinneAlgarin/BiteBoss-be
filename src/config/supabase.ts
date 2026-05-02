import { createClient } from '@supabase/supabase-js';
import { envs } from './envs';

const supabase = createClient(envs.SUPABASE_URL, envs.SUPABASE_SERVICE_ROLE_KEY);

export default supabase;