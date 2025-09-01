import { FastifyInstance } from 'fastify';
import { SimilarProperty } from '../types/common';
import { Enums } from '../types/database';
import {
  ZonevalService,
  type ZonevalValidation,
  type MarketInsights,
} from '../services/zoneval';
import { ZonevalCacheService } from '../services/zoneval-cache';
import { MarketValidationService } from '../services/market-validation';

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

  // Market validation with cache
  let zonevalValidation: ZonevalValidation | null = null;
  let refinedPrice = avgPrice;
  let marketInsights: MarketInsights | null = null;

  if (userProperty.zipcode && userProperty.size > 0) {
    console.log('🔍 Validating with Zoneval API...');

    const zonevalService = new ZonevalService();
    const cacheService = new ZonevalCacheService(fastify);
    const marketValidationService = new MarketValidationService(
      zonevalService,
      cacheService
    );

    const validationResult = await marketValidationService.validateProperty(
      userProperty.zipcode,
      avgPrice,
      userProperty.size
    );

    zonevalValidation = validationResult.validation;
    refinedPrice = validationResult.refinedPrice;
    marketInsights = validationResult.insights;

    if (zonevalValidation) {
      console.log('✅ Zoneval validation completed');
      console.log(`📊 Market reality: ${zonevalValidation.marketReality}`);
      console.log(`📊 Deviation: ${zonevalValidation.marketDeviation}%`);
      console.log(`📊 Confidence: ${zonevalValidation.confidence}%`);
    }
  } else {
    console.log(
      '🔍 CEP or property size not available - skipping market validation'
    );
  }

  return {
    estimatedPrice: medianPrice,
    avgPrice,
    similarProperties,
  };
}
