import { Tables } from './database-custom';

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

// Location proximity types
export interface Landmark {
  id: string;
  name: string;
  lat: number;
  lng: number;
  keyword: LandmarkKeyword;
  rating?: number;
  distance: number; // in meters
  proximityScore: number; // 0-100, higher = closer
}

export enum LandmarkKeyword {
  BEACH = 'praia',
  SHOPPING_MALL = 'shopping',
  HOSPITAL = 'hospital',
  SCHOOL = 'escola',
  PARK = 'parque',
  RESTAURANT = 'restaurante',
  BANK = 'banco',
  GYM = 'academia',
  PHARMACY = 'farmacia',
}

export interface ProximityResult {
  landmarks: Landmark[];
  overallProximityScore: number; // 0-100, weighted average
  hasBeachAccess: boolean;
  hasShoppingAccess: boolean;
  cacheHit: boolean;
}

// Enhanced property evaluation result with proximity data
export interface PropertyEvaluationResult {
  estimatedPrice: number;
  medianPrice: number;
  avgPrice: number;
  similarProperties: SimilarProperty[];
  proximityAnalysis?: ProximityResult;
  marketInsights?: {
    proximityScore: number;
    beachAccess: boolean;
    shoppingAccess: boolean;
    keyLandmarks: string[];
  };
}
