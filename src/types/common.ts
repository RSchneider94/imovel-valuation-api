import { Tables } from './database';

export type Property = Tables<'properties'>;

export type SimilarProperty = Omit<
  Property,
  | 'coordinates'
  | 'link'
  | 'price'
  | 'created_at'
  | 'updated_at'
  | 'embedding'
  | 'lat'
  | 'lng'
> & {
  similarity: number;
};

export type SimilarProperties = SimilarProperty[];
