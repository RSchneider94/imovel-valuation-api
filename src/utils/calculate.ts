import OpenAI from 'openai';
import { FastifyInstance } from 'fastify';
import { SimilarProperty } from '../types/common';

export type MatchedProperty = Omit<SimilarProperty, 'usage'> & {
  usage: string;
};

export default async function calculate(
  fastify: FastifyInstance,
  query: string,
  userLat: number,
  userLng: number
) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  console.log('⏳ Starting calculation...');

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });

  const queryEmbedding = embeddingResponse.data[0].embedding;

  const radiusKm = 20;
  const embeddingWeight = 0.3;
  const geoWeight = 0.7;
  const matchCount = 5;

  const { data: matches, error } = await fastify.supabase.rpc(
    'match_properties_hybrid',
    {
      query_embedding: JSON.stringify(queryEmbedding),
      user_lat: userLat,
      user_lng: userLng,
      radius_km: radiusKm,
      embedding_weight: embeddingWeight,
      geo_weight: geoWeight,
      match_count: matchCount,
    }
  );

  console.log('✅ Matches found:', matches?.length ?? 0);

  if (error) throw error;

  const prices = matches.map((m) => Number(m.price));
  const avgPrice =
    prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
  const similarProperties: MatchedProperty[] = matches ?? [];

  // Calculate the average precision of the matches
  const scores = matches.map((item) => item.hybrid_score);
  const maxScore = Math.max(...scores);
  const avgPrecision = Math.round(
    scores.reduce((acc, s) => acc + (s / maxScore) * 100, 0) / scores.length
  );

  console.log('✅ Similar properties:', similarProperties.length);

  return {
    input: query,
    estimatedPrice: avgPrice,
    similarProperties,
    avgPrecision,
  };
}
