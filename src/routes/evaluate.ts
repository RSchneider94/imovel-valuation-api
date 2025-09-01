import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { EvaluationRequest } from '../types/common';
import calculate, { type MatchedProperty } from '../commands/calculate';
import { capitalize } from '../utils/formatters';
import {
  type ZonevalValidation,
  type MarketInsights,
} from '../services/zoneval';

type EvaluateResponse = {
  201: {
    processId: string;
  };
  400: { error: string };
  500: { error: string };
};

type ProcessResult = {
  200: {
    status: 'done';
    result: {
      estimatedPrice: number;
      refinedPrice: number;
      similarProperties: MatchedProperty[];
      avgPrice: number;
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
    Body: EvaluationRequest;
    Reply: EvaluateResponse;
  }>('/evaluate', async (request, reply) => {
    try {
      const userProperty: EvaluationRequest = request.body;

      if (!userProperty.usage || !userProperty.zipcode) {
        return reply.status(400).send({ error: 'Usage is required' });
      }

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
          zipcode: userProperty.zipcode,
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
