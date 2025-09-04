import { Tables } from './database';

export type Property = Tables<'properties'>;

export type SimilarProperty = Omit<
  Property,
  'link' | 'price' | 'created_at' | 'updated_at' | 'embedding' | 'lat' | 'lng'
> & {
  distance_km: number;
};

export type SimilarProperties = SimilarProperty[];
