/**
 * Property Proximity Populator Service
 * Populates proximity data for properties in the database
 * Can be used for batch processing or individual property updates
 */

import { FastifyInstance } from 'fastify';
import { LocationProximityService } from './location-proximity';
import { LandmarkKeyword } from '../types/common';

export interface PropertyProximityData {
  id: string;
  lat: number;
  lng: number;
  proximity_score: number;
  has_beach_access: boolean;
  has_metro_access: boolean;
  has_shopping_access: boolean;
  has_hospital_access: boolean;
  has_school_access: boolean;
  has_park_access: boolean;
  proximity_landmarks: any[];
  proximity_updated_at: string;
}

export class PropertyProximityPopulator {
  private proximityService: LocationProximityService;

  constructor() {
    this.proximityService = new LocationProximityService();
  }

  /**
   * Populate proximity data for a single property
   */
  async populatePropertyProximity(
    fastify: FastifyInstance,
    propertyId: string
  ): Promise<PropertyProximityData | null> {
    try {
      // Get property data
      const { data: property, error } = await fastify.supabase
        .from('properties')
        .select('id, lat, lng')
        .eq('id', propertyId)
        .single();

      if (error || !property || !property.lat || !property.lng) {
        console.warn(
          `⚠️ Property ${propertyId} not found or missing coordinates`
        );
        return null;
      }

      // Get proximity analysis
      const proximityAnalysis =
        await this.proximityService.getProximityAnalysis({
          lat: property.lat,
          lng: property.lng,
          radius: 2000,
          landmarkTypes: [
            LandmarkKeyword.BEACH,
            LandmarkKeyword.METRO_STATION,
            LandmarkKeyword.SHOPPING_MALL,
            LandmarkKeyword.HOSPITAL,
            LandmarkKeyword.SCHOOL,
            LandmarkKeyword.PARK,
          ],
        });

      // Prepare proximity data for database
      const proximityData: PropertyProximityData = {
        id: propertyId,
        lat: property.lat,
        lng: property.lng,
        proximity_score: proximityAnalysis.overallProximityScore,
        has_beach_access: proximityAnalysis.hasBeachAccess,
        has_metro_access: proximityAnalysis.hasMetroAccess,
        has_shopping_access: proximityAnalysis.hasShoppingAccess,
        has_hospital_access: proximityAnalysis.landmarks.some(
          (l) => l.type === LandmarkKeyword.HOSPITAL
        ),
        has_school_access: proximityAnalysis.landmarks.some(
          (l) => l.type === LandmarkKeyword.SCHOOL
        ),
        has_park_access: proximityAnalysis.landmarks.some(
          (l) => l.type === LandmarkKeyword.PARK
        ),
        proximity_landmarks: proximityAnalysis.landmarks.map((landmark) => ({
          id: landmark.id,
          name: landmark.name,
          type: landmark.type,
          distance: landmark.distance,
          proximity_score: landmark.proximityScore,
          rating: landmark.rating,
        })),
        proximity_updated_at: new Date().toISOString(),
      };

      // Update property in database
      const { error: updateError } = await fastify.supabase
        .from('properties')
        .update({
          proximity_score: proximityData.proximity_score,
          has_beach_access: proximityData.has_beach_access,
          has_metro_access: proximityData.has_metro_access,
          has_shopping_access: proximityData.has_shopping_access,
          has_hospital_access: proximityData.has_hospital_access,
          has_school_access: proximityData.has_school_access,
          has_park_access: proximityData.has_park_access,
          proximity_landmarks: proximityData.proximity_landmarks,
          proximity_updated_at: proximityData.proximity_updated_at,
        })
        .eq('id', propertyId);

      if (updateError) {
        console.error(`❌ Error updating property ${propertyId}:`, updateError);
        return null;
      }

      console.log(`✅ Updated proximity data for property ${propertyId}`);
      return proximityData;
    } catch (error) {
      console.error(
        `❌ Error populating proximity for property ${propertyId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Populate proximity data for multiple properties (batch processing)
   */
  async populatePropertiesProximity(
    fastify: FastifyInstance,
    options: {
      batchSize?: number;
      offset?: number;
      limit?: number;
      propertyIds?: string[];
    } = {}
  ): Promise<{
    processed: number;
    successful: number;
    failed: number;
    results: PropertyProximityData[];
  }> {
    const { batchSize = 10, offset = 0, limit = 100, propertyIds } = options;
    const results: PropertyProximityData[] = [];
    let processed = 0;
    let successful = 0;
    let failed = 0;

    try {
      // Get properties to process
      let query = fastify.supabase
        .from('properties')
        .select('id, lat, lng')
        .not('lat', 'is', null)
        .not('lng', 'is', null);

      if (propertyIds) {
        query = query.in('id', propertyIds);
      } else {
        query = query.range(offset, offset + limit - 1);
      }

      const { data: properties, error } = await query;

      if (error) {
        console.error('❌ Error fetching properties:', error);
        return { processed, successful, failed, results };
      }

      if (!properties || properties.length === 0) {
        console.log('ℹ️ No properties found to process');
        return { processed, successful, failed, results };
      }

      console.log(`🔄 Processing ${properties.length} properties...`);

      // Process properties in batches
      for (let i = 0; i < properties.length; i += batchSize) {
        const batch = properties.slice(i, i + batchSize);
        const batchPromises = batch.map((property) =>
          this.populatePropertyProximity(fastify, property.id)
        );

        const batchResults = await Promise.allSettled(batchPromises);

        for (const result of batchResults) {
          processed++;
          if (result.status === 'fulfilled' && result.value) {
            successful++;
            results.push(result.value);
          } else {
            failed++;
          }
        }

        // Add delay between batches to avoid rate limiting
        if (i + batchSize < properties.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        console.log(
          `📊 Progress: ${processed}/${properties.length} processed (${successful} successful, ${failed} failed)`
        );
      }

      console.log(
        `✅ Batch processing complete: ${successful} successful, ${failed} failed`
      );
      return { processed, successful, failed, results };
    } catch (error) {
      console.error('❌ Error in batch processing:', error);
      return { processed, successful, failed, results };
    }
  }

  /**
   * Get properties that need proximity data updates
   */
  async getPropertiesNeedingUpdate(
    fastify: FastifyInstance,
    options: {
      olderThanDays?: number;
      limit?: number;
    } = {}
  ): Promise<
    {
      id: string;
      lat: number;
      lng: number;
      proximity_updated_at: string | null;
    }[]
  > {
    const { olderThanDays = 30, limit = 1000 } = options;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const { data: properties, error } = await fastify.supabase
      .from('properties')
      .select('id, lat, lng, proximity_updated_at')
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .or(
        `proximity_updated_at.is.null,proximity_updated_at.lt.${cutoffDate.toISOString()}`
      )
      .limit(limit);

    if (error) {
      console.error('❌ Error fetching properties needing update:', error);
      return [];
    }

    return properties || [];
  }

  /**
   * Clear proximity data for a property (useful for testing)
   */
  async clearPropertyProximity(
    fastify: FastifyInstance,
    propertyId: string
  ): Promise<boolean> {
    try {
      const { error } = await fastify.supabase
        .from('properties')
        .update({
          proximity_score: 0,
          has_beach_access: false,
          has_metro_access: false,
          has_shopping_access: false,
          has_hospital_access: false,
          has_school_access: false,
          has_park_access: false,
          proximity_landmarks: [],
          proximity_updated_at: null,
        })
        .eq('id', propertyId);

      if (error) {
        console.error(
          `❌ Error clearing proximity data for property ${propertyId}:`,
          error
        );
        return false;
      }

      console.log(`✅ Cleared proximity data for property ${propertyId}`);
      return true;
    } catch (error) {
      console.error(
        `❌ Error clearing proximity for property ${propertyId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Get proximity statistics
   */
  async getProximityStats(fastify: FastifyInstance): Promise<{
    totalProperties: number;
    withProximityData: number;
    withoutProximityData: number;
    averageProximityScore: number;
    beachAccessCount: number;
    metroAccessCount: number;
    shoppingAccessCount: number;
  }> {
    try {
      // Get total properties count
      const { count: totalProperties } = await fastify.supabase
        .from('properties')
        .select('*', { count: 'exact', head: true });

      // Get properties with proximity data
      const { count: withProximityData } = await fastify.supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .not('proximity_updated_at', 'is', null);

      // Get average proximity score
      const { data: avgData } = await fastify.supabase
        .from('properties')
        .select('proximity_score')
        .not('proximity_score', 'is', null);

      const averageProximityScore = avgData?.length
        ? avgData.reduce((sum, p) => sum + (p.proximity_score || 0), 0) /
          avgData.length
        : 0;

      // Get access counts
      const { count: beachAccessCount } = await fastify.supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('has_beach_access', true);

      const { count: metroAccessCount } = await fastify.supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('has_metro_access', true);

      const { count: shoppingAccessCount } = await fastify.supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('has_shopping_access', true);

      return {
        totalProperties: totalProperties || 0,
        withProximityData: withProximityData || 0,
        withoutProximityData: (totalProperties || 0) - (withProximityData || 0),
        averageProximityScore: Math.round(averageProximityScore),
        beachAccessCount: beachAccessCount || 0,
        metroAccessCount: metroAccessCount || 0,
        shoppingAccessCount: shoppingAccessCount || 0,
      };
    } catch (error) {
      console.error('❌ Error getting proximity stats:', error);
      return {
        totalProperties: 0,
        withProximityData: 0,
        withoutProximityData: 0,
        averageProximityScore: 0,
        beachAccessCount: 0,
        metroAccessCount: 0,
        shoppingAccessCount: 0,
      };
    }
  }
}
