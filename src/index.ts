import Fastify from 'fastify';
import dotenv from 'dotenv';

// Plugins
import supabasePlugin from './plugins/supabase';

// Routes
import evaluateRoutes from './routes/evaluate';

// Load environment variables
dotenv.config();

const server = Fastify({
  logger: true,
});

// Register plugins
server.register(supabasePlugin);

// Add CORS support
server.addHook('onRequest', async (request, reply) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  reply.header('Content-Type', 'application/json');

  if (request.method === 'OPTIONS') {
    reply.send();
  }
});

// Register routes
server.register(evaluateRoutes);

// Health check route
server.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Start server
const start = async () => {
  try {
    await server.listen({ port: Number(process.env.PORT), host: '0.0.0.0' });
    console.log(`Server is running on http://localhost:${process.env.PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
