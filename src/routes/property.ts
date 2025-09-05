import { FastifyInstance } from 'fastify';
import { Tables } from '../types/database-custom';

type PropertyTypesResponse = {
  200: Tables<'properties'>['type'][];
  500: { error: string };
};

export default async function propertyRoutes(fastify: FastifyInstance) {
  fastify.get<{ Reply: PropertyTypesResponse }>(
    '/property-types',
    async (_request, reply) => {
      try {
        fastify.log.info('Fetching property types from database');

        const { data, error } = await fastify.supabase
          .from('properties')
          .select('type');

        if (error) {
          fastify.log.error(error);
          return reply.status(500).send({
            error: 'Failed to fetch property types',
          });
        }

        if (!data || data.length === 0) {
          fastify.log.warn('No property types found in database');
          return reply.status(200).send([]);
        }

        // Extract just the type values from the response and get unique values
        const propertyTypes: Tables<'properties'>['type'][] = [
          ...new Set(
            data.map((item: { type: string }) => item.type).filter(Boolean)
          ),
        ].sort();

        fastify.log.info(
          `Successfully fetched ${propertyTypes.length} property types`
        );
        return reply.status(200).send(propertyTypes);
      } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({
          error: 'Internal server error',
        });
      }
    }
  );
}
