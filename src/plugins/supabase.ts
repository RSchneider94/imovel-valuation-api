import fp from 'fastify-plugin';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database-custom';

export default fp(
  async (fastify) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseKey);

    fastify.decorate('supabase', supabase);
  },
  {
    name: 'supabase',
  }
);
