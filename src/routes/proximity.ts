/**
 * Proximity Routes
 * Handles proximity data population and management
 */

import { FastifyInstance } from 'fastify';
import populateProximity, {
  PopulateProximityOptions,
} from '../commands/populate-proximity';
import { PropertyProximityPopulator } from '../services/property-proximity-populator';

type PopulateProximityResponse = {
  200: {
    success: boolean;
    message: string;
    stats?: any;
    results?: any;
  };
  400: { error: string };
  500: { error: string };
};

type ProximityStatsResponse = {
  200: {
    totalProperties: number;
    withProximityData: number;
    withoutProximityData: number;
    averageProximityScore: number;
    beachAccessCount: number;
    metroAccessCount: number;
    shoppingAccessCount: number;
  };
  500: { error: string };
};

export default async function proximityRoutes(fastify: FastifyInstance) {
  // Populate proximity data for properties
  fastify.post<{
    Body: PopulateProximityOptions;
    Reply: PopulateProximityResponse;
  }>('/proximity/populate', async (request, reply) => {
    try {
      const options = request.body;
      const result = await populateProximity(fastify, options);

      return reply.status(200).send(result);
    } catch (error) {
      console.error('❌ Error in proximity populate route:', error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get proximity statistics
  fastify.get<{
    Reply: ProximityStatsResponse;
  }>('/proximity/stats', async (request, reply) => {
    try {
      const populator = new PropertyProximityPopulator();
      const stats = await populator.getProximityStats(fastify);

      return reply.status(200).send(stats);
    } catch (error) {
      console.error('❌ Error getting proximity stats:', error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Populate proximity for a specific property
  fastify.post<{
    Params: { propertyId: string };
    Body: { clearExisting?: boolean };
    Reply: PopulateProximityResponse;
  }>('/proximity/populate/:propertyId', async (request, reply) => {
    try {
      const { propertyId } = request.params;
      const { clearExisting = false } = request.body;

      const result = await populateProximity(fastify, {
        propertyId,
        clearExisting,
      });

      return reply.status(200).send(result);
    } catch (error) {
      console.error('❌ Error populating proximity for property:', error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Clear proximity data for a specific property
  fastify.delete<{
    Params: { propertyId: string };
    Reply: { success: boolean; message: string };
  }>('/proximity/clear/:propertyId', async (request, reply) => {
    try {
      const { propertyId } = request.params;
      const populator = new PropertyProximityPopulator();

      const success = await populator.clearPropertyProximity(
        fastify,
        propertyId
      );

      if (success) {
        return reply.status(200).send({
          success: true,
          message: `Cleared proximity data for property ${propertyId}`,
        });
      } else {
        return reply.status(400).send({
          success: false,
          message: `Failed to clear proximity data for property ${propertyId}`,
        });
      }
    } catch (error) {
      console.error('❌ Error clearing proximity data:', error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get properties that need proximity updates
  fastify.get<{
    Querystring: {
      olderThanDays?: number;
      limit?: number;
    };
    Reply: {
      properties: Array<{
        id: string;
        lat: number;
        lng: number;
        proximity_updated_at: string | null;
      }>;
      count: number;
    };
  }>('/proximity/needing-update', async (request, reply) => {
    try {
      const { olderThanDays = 30, limit = 100 } = request.query;
      const populator = new PropertyProximityPopulator();

      const properties = await populator.getPropertiesNeedingUpdate(fastify, {
        olderThanDays,
        limit,
      });

      return reply.status(200).send({
        properties,
        count: properties.length,
      });
    } catch (error) {
      console.error('❌ Error getting properties needing update:', error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
