import { Tables } from './database';

export type Property = Tables<'properties'>;

export type SimilarProperty = Omit<
  Property,
  'link' | 'price' | 'created_at' | 'updated_at' | 'embedding' | 'lat' | 'lng'
> & {
  distance_km: number;
};

export type SimilarProperties = SimilarProperty[];

// Specific type for evaluation request with zipcode
export type EvaluationRequest = Omit<
  Property,
  'id' | 'link' | 'price' | 'created_at' | 'updated_at' | 'embedding'
> & {
  zipcode?: string;
};
