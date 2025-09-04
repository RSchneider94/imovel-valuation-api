import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { Property } from '../types/common';
import calculate, { type MatchedProperty } from '../commands/calculate';
import { capitalize } from '../utils/formatters';

type EvaluateBody = Omit<
  Property,
  'id' | 'link' | 'price' | 'created_at' | 'updated_at' | 'embedding'
>;

type EvaluateResponse = {
  201: {
    processId: string;
  };
  500: { error: string };
};

type ProcessResult = {
  200: {
    status: 'done';
    result: {
      input: string;
      estimatedPrice: number;
      similarProperties: MatchedProperty[];
      avgPrecision: number;
    };
  };
  500: { status: 'error'; error: string };
};

const processResults: Record<
  string,
  ProcessResult['200'] | ProcessResult['500']
> = {};

export default async function evaluateRoutes(fastify: FastifyInstance) {
  fastify.post<{
    Body: EvaluateBody;
    Reply: EvaluateResponse;
  }>('/evaluate', async (request, reply) => {
    try {
      const userProperty = request.body;

      const processId = uuidv4();
      reply.status(201).send({
        processId,
      });

      try {
        const result = await calculate(fastify, {
          lat: userProperty.lat ?? 0,
          lng: userProperty.lng ?? 0,
          type: capitalize(userProperty.type),
          usage: userProperty.usage,
          rental_type: userProperty.rental_type,
          bedrooms: userProperty.bedrooms,
          bathrooms: userProperty.bathrooms,
          size: userProperty.size,
          parking_spaces: userProperty.parking_spaces,
          furnished: userProperty.furnished ?? false,
        });
        console.log('✅ Calculation completed');
        processResults[processId] = {
          status: 'done',
          result,
        };
      } catch (err: any) {
        console.error('❌ Error calculating:', err.message);
        processResults[processId] = {
          status: 'error',
          error: err.message,
        };
      }
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.get<{
    Params: {
      processId: string;
    };
    Reply: ProcessResult;
  }>('/evaluate/:processId', async (request, reply) => {
    const raw = reply.raw;
    const processId = request.params.processId;

    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000'];

    const requestOrigin = request.headers.origin;
    let origin = 'http://localhost:3000';
    if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
      origin = requestOrigin;
    }

    raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
    });

    const interval = setInterval(() => {
      if (processResults[processId]?.status === 'done') {
        reply.raw.write(
          `data: ${JSON.stringify(processResults[processId])}\n\n`
        );
        clearInterval(interval);
        delete processResults[processId];
        reply.raw.end();
      } else if (processResults[processId]?.status === 'error') {
        reply.raw.write(
          `data: ${JSON.stringify(processResults[processId])}\n\n`
        );
        clearInterval(interval);
        delete processResults[processId];
        reply.raw.end();
      }
    }, 1000);

    request.socket.on('close', () => {
      clearInterval(interval);
    });
  });
}
