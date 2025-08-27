import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';

// Plugins
import supabasePlugin from './plugins/supabase';

// Routes
import evaluateRoutes from './routes/evaluate';

// Load environment variables
dotenv.config({
  debug: process.env.NODE_ENV === 'development',
});

const server = Fastify({
  logger:
    process.env.NODE_ENV === 'production'
      ? {
          level: 'info',
          serializers: {
            req: (req) => ({
              method: req.method,
              url: req.url,
              remoteAddress: req.ip,
            }),
            res: (res) => ({
              statusCode: res.statusCode,
            }),
          },
        }
      : true,
});

// Register plugins
server.register(supabasePlugin);

// Add CORS support
server.register(cors, {
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
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
    const port = Number(process.env.PORT) || 3001;
    const host = process.env.HOST || '0.0.0.0';

    await server.listen({ port, host });
    console.log(`Server is running on http://${host}:${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
