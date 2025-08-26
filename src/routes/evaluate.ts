import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { Property } from '../types/common';
import calculate, { type MatchedProperty } from '../utils/calculate';

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
      const query = `${userProperty.type} com a finalidade de ${userProperty.usage} com ${userProperty.bedrooms} quartos, ${userProperty.bathrooms} banheiros, ${userProperty.size} m², ${userProperty.parking_spaces} vagas de garagem na rua ${userProperty.street}, no bairro ${userProperty.neighborhood}, em ${userProperty.city}, ${userProperty.state}`;

      const processId = uuidv4();
      reply.status(201).send({
        processId,
      });

      try {
        const result = await calculate(fastify, query);
        processResults[processId] = {
          status: 'done',
          result,
        };
      } catch (err: any) {
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
    const processId = request.params.processId;

    reply.header('Content-Type', 'text/event-stream');
    reply.header('Cache-Control', 'no-cache');
    reply.header('Connection', 'keep-alive');

    const interval = setInterval(() => {
      if (processResults[processId]?.status === 'done') {
        reply.raw.write(
          `data: ${JSON.stringify(processResults[processId])}\n\n`
        );
        clearInterval(interval);
        delete processResults[processId];
        reply.raw.end();
      }
    }, 1000);
  });
}
