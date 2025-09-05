/**
 * Command to populate proximity data for properties
 * This can be run as a batch job or for individual properties
 */

import { FastifyInstance } from 'fastify';
import { PropertyProximityPopulator } from '../services/property-proximity-populator';

export interface PopulateProximityOptions {
  propertyId?: string;
  batchSize?: number;
  offset?: number;
  limit?: number;
  propertyIds?: string[];
  olderThanDays?: number;
  clearExisting?: boolean;
}

export default async function populateProximity(
  fastify: FastifyInstance,
  options: PopulateProximityOptions = {}
): Promise<{
  success: boolean;
  message: string;
  stats?: any;
  results?: any;
}> {
  const populator = new PropertyProximityPopulator();

  try {
    // If specific property ID provided
    if (options.propertyId) {
      console.log(
        `🔄 Populating proximity data for property: ${options.propertyId}`
      );

      if (options.clearExisting) {
        await populator.clearPropertyProximity(fastify, options.propertyId);
      }

      const result = await populator.populatePropertyProximity(
        fastify,
        options.propertyId
      );

      if (result) {
        return {
          success: true,
          message: `Successfully populated proximity data for property ${options.propertyId}`,
          results: result,
        };
      } else {
        return {
          success: false,
          message: `Failed to populate proximity data for property ${options.propertyId}`,
        };
      }
    }

    // Batch processing
    console.log('🔄 Starting batch proximity data population...');

    // Get properties that need updates
    const propertiesNeedingUpdate = await populator.getPropertiesNeedingUpdate(
      fastify,
      {
        olderThanDays: options.olderThanDays || 30,
        limit: options.limit || 100,
      }
    );

    if (propertiesNeedingUpdate.length === 0) {
      return {
        success: true,
        message: 'No properties need proximity data updates',
        stats: await populator.getProximityStats(fastify),
      };
    }

    console.log(
      `📊 Found ${propertiesNeedingUpdate.length} properties needing updates`
    );

    // Process properties
    const results = await populator.populatePropertiesProximity(fastify, {
      batchSize: options.batchSize || 10,
      offset: options.offset || 0,
      limit: options.limit || 100,
      propertyIds: options.propertyIds,
    });

    // Get updated stats
    const stats = await populator.getProximityStats(fastify);

    return {
      success: true,
      message: `Batch processing complete: ${results.successful} successful, ${results.failed} failed`,
      stats,
      results,
    };
  } catch (error) {
    console.error('❌ Error in populate proximity command:', error);
    return {
      success: false,
      message: `Error: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    };
  }
}

// CLI usage example
if (require.main === module) {
  // This would be used if running the command directly
  console.log(
    'This command should be run through the API or as part of the application'
  );
}
