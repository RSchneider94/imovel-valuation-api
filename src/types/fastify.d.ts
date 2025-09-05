import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database-custom';

declare module 'fastify' {
  interface FastifyInstance {
    supabase: SupabaseClient<Database>;
  }
}
