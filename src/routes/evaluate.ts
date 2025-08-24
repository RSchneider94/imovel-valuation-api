import { FastifyInstance } from 'fastify';
import { Property, SimilarProperty } from '../types/common';
import calculate from '../utils/calculate';

type EvaluateBody = Omit<Property, 'coordinates' | 'link' | 'price'>;

type EvaluateResponse = {
  200: {
    input: string;
    estimatedPrice: number;
    similarProperties: SimilarProperty[];
  };
  500: { error: string };
};

export default async function evaluateRoutes(fastify: FastifyInstance) {
  fastify.post<{
    Body: EvaluateBody;
    Reply: EvaluateResponse;
  }>('/evaluate', async (request, reply) => {
    try {
      const userProperty = request.body;
      const query = `${userProperty.type} com ${userProperty.bedrooms} quartos, ${userProperty.bathrooms} banheiros, ${userProperty.size} m², ${userProperty.parking_spaces} vagas de garagem em ${userProperty.city}, ${userProperty.state}`;

      const result = await calculate(fastify, query);
      return result;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
}
