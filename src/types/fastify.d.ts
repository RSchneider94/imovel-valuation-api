import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database';

declare module 'fastify' {
  interface FastifyInstance {
    supabase: SupabaseClient<Database>;
  }
}
