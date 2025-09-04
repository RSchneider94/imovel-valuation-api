import { FastifyInstance } from 'fastify';
import { SimilarProperty } from '../types/common';
import { Enums } from '../types/database';

export type MatchedProperty = Omit<SimilarProperty, 'usage'> & {
  usage: string;
};

export default async function calculate(
  fastify: FastifyInstance,
  userProperty: {
    lat: number;
    lng: number;
    type: string;
    usage: Enums<'usage'> | null;
    rental_type: Enums<'rental_type'> | null;
    bedrooms: number;
    bathrooms: number;
    size: number;
    parking_spaces: number;
    furnished: boolean;
  }
) {
  console.log('⏳ Starting structured calculation...');

  const radiusKm = 20;
  const matchCount = 20;

  console.log('🔍 User property:', {
    type: userProperty.type,
    usage: userProperty.usage,
    bedrooms: userProperty.bedrooms,
    bathrooms: userProperty.bathrooms,
    size: userProperty.size,
    parking_spaces: userProperty.parking_spaces,
    furnished: userProperty.furnished,
  });

  const { data: matches, error } = await fastify.supabase.rpc(
    'match_properties_structured' as any,
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

  const matchesArray = (matches as any[]) ?? [];
  const prices = matchesArray.map((m: any) => Number(m.price));
  const avgPrice =
    prices.length > 0
      ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length
      : 0;
  const similarProperties: MatchedProperty[] = matchesArray;

  // Calculate the average precision of the matches
  const scores = matchesArray.map((item: any) => item.similarity_score);
  const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
  const avgPrecision =
    scores.length > 0
      ? Math.round(
          scores.reduce(
            (acc: number, s: number) => acc + (s / maxScore) * 100,
            0
          ) / scores.length
        )
      : 0;

  console.log('✅ Similar properties:', similarProperties.length);
  console.log('✅ Average precision:', avgPrecision);

  return {
    input: `Structured search for ${userProperty.type} with ${userProperty.bedrooms} bedrooms, ${userProperty.bathrooms} bathrooms, ${userProperty.size}m², ${userProperty.parking_spaces} parking spaces`,
    estimatedPrice: avgPrice,
    similarProperties,
    avgPrecision,
  };
}
