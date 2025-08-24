import OpenAI from 'openai';
import { FastifyInstance } from 'fastify';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function calculate(
  fastify: FastifyInstance,
  query: string
) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });

  const queryEmbedding = embeddingResponse.data[0].embedding;

  const { data: matches, error } = await fastify.supabase.rpc(
    'match_properties',
    {
      query_embedding: JSON.stringify(queryEmbedding),
      match_count: 5,
    }
  );

  if (error) throw error;

  const prices = matches.map((m) => Number(m.price));
  const avgPrice =
    prices.reduce((a: number, b: number) => a + b, 0) / prices.length;

  return {
    input: query,
    estimatedPrice: avgPrice,
    similarProperties: matches,
  };
}
