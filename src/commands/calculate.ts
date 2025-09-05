import { FastifyInstance } from 'fastify';
import { SimilarProperty, PropertyEvaluationResult } from '../types/common';
import { Enums } from '../types/database-custom';
import { processZoneval } from './process-zoneval';
import { LocationProximityService } from '../services/location-proximity';

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
): Promise<PropertyEvaluationResult> {
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

  const { avg_region_price } =
    userProperty.usage === 'venda'
      ? await processZoneval(
          userProperty.zipcode,
          userProperty.lat,
          userProperty.lng,
          fastify
        )
      : { avg_region_price: undefined };

  // First, get proximity analysis for the user property
  console.log('🏖️ Analyzing user property proximity...');
  const proximityService = new LocationProximityService();
  const userProximityAnalysis = await proximityService.getProximityAnalysis({
    lat: userProperty.lat,
    lng: userProperty.lng,
    radius: 1000, // 1km radius
  });

  // Use existing matching function for now (proximity filtering will be added later)
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
      max_price_deviation: 0.05,
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
      proximityAnalysis: userProximityAnalysis,
      marketInsights: {
        proximityScore: userProximityAnalysis.overallProximityScore,
        beachAccess: userProximityAnalysis.hasBeachAccess,
        shoppingAccess: userProximityAnalysis.hasShoppingAccess,
        keyLandmarks: [],
      },
    };
  }

  // Extract prices and sort them
  const prices = matchesArray
    .map((m: any) => Number(m.price))
    .sort((a: number, b: number) => a - b);

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

  // Generate market insights based on proximity analysis
  const marketInsights = {
    proximityScore: userProximityAnalysis.overallProximityScore,
    beachAccess: userProximityAnalysis.hasBeachAccess,
    shoppingAccess: userProximityAnalysis.hasShoppingAccess,
    keyLandmarks: userProximityAnalysis.landmarks
      .filter((l) => l.proximityScore > 50) // Only high-proximity landmarks
      .map((l) => l.name)
      .slice(0, 5), // Top 5 most relevant
  };

  console.log('✅ Proximity analysis complete:', {
    overallScore: userProximityAnalysis.overallProximityScore,
    beachAccess: userProximityAnalysis.hasBeachAccess,
    landmarksFound: userProximityAnalysis.landmarks.length,
    cacheHit: userProximityAnalysis.cacheHit,
  });

  return {
    estimatedPrice: medianPrice,
    medianPrice,
    avgPrice,
    similarProperties: similarProperties as SimilarProperty[],
    proximityAnalysis: userProximityAnalysis,
    marketInsights,
  };
}
