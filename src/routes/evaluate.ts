import { FastifyInstance } from 'fastify';
import { PropertyWithCoordinates } from '../types/common';

type EvaluateBody = Omit<
  PropertyWithCoordinates,
  'coordinates' | 'link' | 'price'
>;

type EvaluateResponse = {
  200: {
    input: EvaluateBody;
    // idealPrice: number;
    similar: PropertyWithCoordinates[];
  };
  500: { error: string };
};

export default async function evaluateRoutes(fastify: FastifyInstance) {
  fastify.post<{
    Body: EvaluateBody;
    Reply: EvaluateResponse;
  }>('/evaluate', async (request, reply) => {
    const body = request.body;

    const { data, error } = await fastify.supabase
      .from('properties')
      .select('*')
      .limit(5);

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    // const idealPrice = body.price * 0.95;

    return {
      input: body,
      // idealPrice,
      similar: data,
    };
  });
}
