import { GeocodingService } from '../services/geocoding';
import { cleanZipcode } from '../utils/formatters';
import { ZonevalService, ZonevalValidation } from '../services/zoneval';
import { ZonevalCacheService } from '../services/zoneval-cache';
import { FastifyInstance } from 'fastify';

type ProcessZonevalResponse = {
  avg_region_price: number | undefined;
  validation: ZonevalValidation | null;
};

export const processZoneval = async (
  zipcode: string,
  lat: number,
  lng: number,
  fastify: FastifyInstance
): Promise<ProcessZonevalResponse> => {
  // Fallback: Get zipcode from coordinates if not provided
  let finalZipcode = cleanZipcode(zipcode ?? '');
  if (!finalZipcode && lat && lng) {
    console.log('🔍 No zipcode provided, attempting reverse geocoding...');
    try {
      const geocodingService = new GeocodingService();
      const geocodingResult = await geocodingService.getZipcodeFromCoordinates({
        lat,
        lng,
      });

      if (geocodingResult?.zipcode) {
        finalZipcode = geocodingResult.zipcode;
        console.log(
          `✅ Retrieved zipcode via geocoding: ${finalZipcode} (source: ${geocodingResult.source})`
        );
      } else {
        console.log('⚠️ Could not retrieve zipcode from coordinates');
      }
    } catch (error) {
      console.warn('⚠️ Geocoding fallback failed:', error);
    }
  }

  // Get avg_region_price from Zoneval API
  let avg_region_price: number | undefined = undefined;
  let validation: ZonevalValidation | null = null;
  if (finalZipcode) {
    console.log('🔍 Fetching regional price data from Zoneval...');

    const zonevalService = new ZonevalService();
    const cacheService = new ZonevalCacheService(fastify);

    try {
      // Check cache first
      const cachedData = await cacheService.getCachedData(finalZipcode);

      if (cachedData) {
        console.log('✅ Using cached Zoneval data');
        // Extract price per m² from cached data
        avg_region_price = cachedData.zipcode_stats.per_m2.median;
        console.log(
          `✅ Regional price per m² (cached): R$ ${avg_region_price.toFixed(2)}`
        );
      } else {
        console.log('🌐 Fetching fresh data from Zoneval API');
        // Get fresh data from Zoneval API
        validation = await zonevalService.validateProperty(finalZipcode);

        if (validation) {
          avg_region_price = validation.pricePerM2Median;
          console.log(
            `✅ Regional price per m²: R$ ${avg_region_price.toFixed(2)}`
          );

          // Save to cache for future use
          await cacheService.saveToCache(finalZipcode, validation);
        } else {
          console.log('⚠️ Could not fetch regional price data from Zoneval');
        }
      }
    } catch (error) {
      console.warn('⚠️ Zoneval API error:', error);
    }
  } else {
    console.log('⚠️ No zipcode available for regional price lookup');
  }

  return { avg_region_price, validation };
};
