import { FastifyInstance } from 'fastify';
import { SimilarProperty } from '../types/common';
import { Enums } from '../types/database-custom';
import { ZonevalService } from '../services/zoneval';
import { ZonevalCacheService } from '../services/zoneval-cache';
import { GeocodingService } from '../services/geocoding';
import { cleanZipcode } from '../utils/formatters';

export type MatchedProperty = Omit<SimilarProperty, 'usage'> & {
  usage: string;
};

export default async function calculate(
  fastify: FastifyInstance,
  userProperty: {
    lat: number;
    lng: number;
    type: string;
    usage: Enums<'usage'>;
    rental_type: Enums<'rental_type'> | null;
    bedrooms: number;
    bathrooms: number;
    size: number;
    parking_spaces: number;
    furnished: boolean;
    zipcode: string;
  }
) {
  console.log('⏳ Starting structured calculation...');

  const radiusKm = 1;
  const matchCount = 20;

  console.log('🔍 User property:', {
    type: userProperty.type,
    usage: userProperty.usage,
    bedrooms: userProperty.bedrooms,
    bathrooms: userProperty.bathrooms,
    size: userProperty.size,
    parking_spaces: userProperty.parking_spaces,
    furnished: userProperty.furnished,
    zipcode: userProperty.zipcode,
  });

  // Fallback: Get zipcode from coordinates if not provided
  let finalZipcode = cleanZipcode(userProperty.zipcode ?? '');
  if (!finalZipcode && userProperty.lat && userProperty.lng) {
    console.log('🔍 No zipcode provided, attempting reverse geocoding...');
    try {
      const geocodingService = new GeocodingService();
      const geocodingResult = await geocodingService.getZipcodeFromCoordinates({
        lat: userProperty.lat,
        lng: userProperty.lng,
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

  if (finalZipcode) {
    console.log('🔍 Fetching regional price data from Zoneval...');

    const zonevalService = new ZonevalService();
    const cacheService = new ZonevalCacheService(fastify);

    try {
      // Check cache first
      const cachedData = await cacheService.getCachedData(finalZipcode);
      let validation;

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
        validation = await zonevalService.validateProperty(
          finalZipcode,
          userProperty.size
        );

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

  const { data: matches, error } = await fastify.supabase.rpc(
    'match_properties_structured',
    {
      user_lat: userProperty.lat,
      user_lng: userProperty.lng,
      user_bedrooms: userProperty.bedrooms,
      user_bathrooms: userProperty.bathrooms,
      user_size: userProperty.size,
      user_parking_spaces: userProperty.parking_spaces,
      user_type: userProperty.type,
      user_usage: userProperty.usage,
      user_rental_type: userProperty.rental_type || undefined,
      user_furnished: userProperty.furnished,
      // Configurable tolerances
      bedrooms_tolerance: 1,
      bathrooms_tolerance: 1,
      size_tolerance_percent: 0.3, // 30% tolerance in size
      parking_tolerance: 1,
      radius_km: radiusKm,
      match_count: matchCount,
      // Regional price per m² from Zoneval API
      avg_region_price,
    }
  );

  console.log('✅ Matches found:', matches?.length ?? 0);

  if (error) throw error;

  const matchesArray = matches ?? [];

  if (matchesArray.length === 0) {
    return {
      estimatedPrice: 0,
      medianPrice: 0,
      similarProperties: [],
      avgPrice: 0,
    };
  }

  // Extract prices and sort them
  const prices = matchesArray.map((m) => Number(m.price)).sort((a, b) => a - b);

  // Calculate the median price
  const middle = Math.floor(prices.length / 2);
  const medianPrice =
    prices.length % 2 === 0
      ? (prices[middle - 1] + prices[middle]) / 2
      : prices[middle];

  // Calculate the robust average price: remove 10% of the highest and lowest prices
  const lowerIndex = Math.floor(prices.length * 0.1);
  const upperIndex = Math.ceil(prices.length * 0.9);
  const filteredPrices = prices.slice(lowerIndex, upperIndex);
  const avgPrice =
    filteredPrices.reduce((a, b) => a + b, 0) / filteredPrices.length;

  const similarProperties: MatchedProperty[] = matchesArray;

  console.log('✅ Similar properties:', similarProperties.length);

  return {
    estimatedPrice: medianPrice,
    avgPrice,
    similarProperties,
  };
}
