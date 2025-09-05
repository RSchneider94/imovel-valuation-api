/**
 * Location Proximity Service
 * Evaluates property proximity to important landmarks using Google Places API
 * Implements cost optimization through caching and field masks
 */

import { Landmark, LandmarkKeyword, ProximityResult } from '../types/common';

export interface LocationProximityOptions {
  lat: number;
  lng: number;
  radius?: number; // in meters, default 1000
  landmarkKeywords?: LandmarkKeyword[];
  maxResults?: number; // per type, default 3
}

export class LocationProximityService {
  private readonly GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  private readonly CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
  private cache = new Map<
    string,
    { data: ProximityResult; timestamp: number }
  >();

  // Default landmark types for property valuation
  private readonly DEFAULT_LANDMARK_KEYWORDS = [
    LandmarkKeyword.BEACH,
    LandmarkKeyword.SHOPPING_MALL,
    LandmarkKeyword.HOSPITAL,
    LandmarkKeyword.SCHOOL,
    LandmarkKeyword.PARK,
  ];

  // Weights for proximity scoring (higher = more important for property value)
  private readonly PROXIMITY_WEIGHTS: Record<LandmarkKeyword, number> = {
    [LandmarkKeyword.BEACH]: 0.25,
    [LandmarkKeyword.SHOPPING_MALL]: 0.15,
    [LandmarkKeyword.HOSPITAL]: 0.1,
    [LandmarkKeyword.SCHOOL]: 0.15,
    [LandmarkKeyword.PARK]: 0.1,
    [LandmarkKeyword.RESTAURANT]: 0.05,
    [LandmarkKeyword.BANK]: 0.05,
    [LandmarkKeyword.GYM]: 0.05,
    [LandmarkKeyword.PHARMACY]: 0.05,
  };

  private readonly THRESHOLDS: Record<LandmarkKeyword, number> = {
    [LandmarkKeyword.BEACH]: 200,
    [LandmarkKeyword.SHOPPING_MALL]: 1500,
    [LandmarkKeyword.HOSPITAL]: 200,
    [LandmarkKeyword.SCHOOL]: 100,
    [LandmarkKeyword.PARK]: 50,
    [LandmarkKeyword.RESTAURANT]: 1000,
    [LandmarkKeyword.BANK]: 1000,
    [LandmarkKeyword.GYM]: 500,
    [LandmarkKeyword.PHARMACY]: 500,
  };

  /**
   * Get proximity analysis for a property location
   */
  async getProximityAnalysis(
    options: LocationProximityOptions
  ): Promise<ProximityResult> {
    const {
      lat,
      lng,
      radius = 1000,
      landmarkKeywords = this.DEFAULT_LANDMARK_KEYWORDS,
      maxResults = 3,
    } = options;

    // Check cache first
    const cacheKey = this.generateCacheKey(lat, lng, radius, landmarkKeywords);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('🎯 Location proximity cache hit');
      return { ...cached, cacheHit: true };
    }

    console.log('🔍 Analyzing location proximity...', { lat, lng, radius });

    if (!this.GOOGLE_API_KEY) {
      console.warn(
        '⚠️ Google Places API key not found, returning empty proximity data'
      );
      return this.getEmptyProximityResult();
    }

    try {
      const landmarks: Landmark[] = [];

      // Search for each landmark type
      for (const landmarkKeyword of landmarkKeywords) {
        const keywordLandmarks = await this.searchNearbyLandmarks(
          lat,
          lng,
          radius,
          landmarkKeyword,
          maxResults
        );
        landmarks.push(...keywordLandmarks);
      }

      // Calculate proximity scores
      const scoredLandmarks = landmarks.map((landmark) => ({
        ...landmark,
        proximityScore: this.calculateProximityScore(
          landmark.distance,
          landmark.keyword
        ),
      }));

      // Calculate overall proximity score
      const overallProximityScore =
        this.calculateOverallProximityScore(scoredLandmarks);

      // More strict validation for beach access - must be within 200m and have good proximity score
      const hasBeachAccess = scoredLandmarks.some(
        (l) =>
          l.keyword === LandmarkKeyword.BEACH &&
          l.distance <= this.THRESHOLDS[LandmarkKeyword.BEACH] &&
          l.proximityScore > 20
      );

      const hasShoppingAccess = scoredLandmarks.some(
        (l) =>
          l.keyword === LandmarkKeyword.SHOPPING_MALL &&
          l.distance <= this.THRESHOLDS[LandmarkKeyword.SHOPPING_MALL] &&
          l.proximityScore > 20
      );

      const result: ProximityResult = {
        landmarks: scoredLandmarks,
        overallProximityScore,
        hasBeachAccess,
        hasShoppingAccess,
        cacheHit: false,
      };

      // Cache the result
      this.setCache(cacheKey, result);

      console.log('✅ Proximity analysis complete:', {
        landmarksFound: scoredLandmarks.length,
        overallScore: overallProximityScore,
        hasBeach: result.hasBeachAccess,
        hasShopping: result.hasShoppingAccess,
        beachLandmarks: scoredLandmarks
          .filter((l) => l.keyword === LandmarkKeyword.BEACH)
          .map((l) => ({
            name: l.name,
            distance: Math.round(l.distance),
            score: l.proximityScore,
          })),
      });

      return result;
    } catch (error) {
      console.error('❌ Error in proximity analysis:', error);
      return this.getEmptyProximityResult();
    }
  }

  /**
   * Search for nearby landmarks of a specific type
   */
  private async searchNearbyLandmarks(
    lat: number,
    lng: number,
    radius: number,
    keyword: LandmarkKeyword,
    maxResults: number
  ): Promise<Landmark[]> {
    const url = new URL(
      'https://maps.googleapis.com/maps/api/place/nearbysearch/json'
    );
    url.searchParams.set('location', `${lat},${lng}`);
    url.searchParams.set('radius', radius.toString());
    url.searchParams.set('key', this.GOOGLE_API_KEY!);
    url.searchParams.set('language', 'pt-BR');
    url.searchParams.set('keyword', keyword);

    console.log(`🔍 Searching for ${keyword} landmarks:`, {
      url: url.toString().replace(this.GOOGLE_API_KEY!, '***'),
    });

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK') {
      console.warn(
        `Google Places API error for ${keyword}:`,
        data.status,
        data.error_message
      );
      return [];
    }

    if (!data.results?.length) {
      console.log(`No ${keyword} landmarks found within ${radius}m`);
      return [];
    }

    // Filter and map results with distance validation
    const landmarks: Landmark[] = [];

    for (const place of data.results) {
      const placeLat = place.geometry.location.lat;
      const placeLng = place.geometry.location.lng;
      const placeName = place.name;
      const distance = this.calculateDistance(lat, lng, placeLat, placeLng);

      // Validate that the place is actually within the specified radius
      if (distance > radius) {
        console.log(
          `Skipping ${place.name} - distance ${Math.round(
            distance
          )}m exceeds radius ${radius}m`
        );
        continue;
      }

      // Additional validation for beaches - check name patterns to avoid false positives
      if (keyword === LandmarkKeyword.BEACH) {
        const isLikelyBeach = this.isLikelyBeach(placeName);
        if (!isLikelyBeach) {
          console.log(
            `Skipping ${place.name} - doesn't appear to be a real beach`
          );
          continue;
        }
      }

      landmarks.push({
        id: place.place_id,
        name: place.name,
        lat: placeLat,
        lng: placeLng,
        keyword,
        rating: place.rating,
        distance,
        proximityScore: 0, // Will be calculated later
      });

      // Stop if we have enough results
      if (landmarks.length >= maxResults) {
        break;
      }
    }

    console.log(
      `✅ Found ${landmarks.length} valid ${keyword} landmarks within ${radius}m`
    );
    return landmarks;
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Validate if a place is likely a real beach based on name and types
   */
  private isLikelyBeach(placeName: string): boolean {
    const name = placeName.toLowerCase();

    // Check for positive beach indicators in the name
    const beachKeywords = [
      'beach',
      'praia',
      'playa',
      'plage',
      'strand',
      'shore',
      'coast',
      'costa',
      'marina',
      'bay',
      'baía',
      'cove',
      'creek',
      'lagoon',
      'lagoa',
    ];

    const hasBeachKeyword = beachKeywords.some((keyword) =>
      name.includes(keyword)
    );

    // Check for negative indicators (places that might have "beach" in name but aren't beaches)
    const falsePositiveKeywords = [
      'beach club',
      'beach house',
      'beach resort',
      'beach hotel',
      'beach bar',
      'beach restaurant',
      'beach cafe',
      'beach store',
      'beach shop',
      'beach volleyball',
      'beach tennis',
      'beach soccer',
      'beach party',
      'beach wedding',
      'beach event',
      'beach festival',
    ];

    const hasFalsePositive = falsePositiveKeywords.some((keyword) =>
      name.includes(keyword)
    );

    // If it has beach keyword and no false positive indicators, it's likely a beach
    return hasBeachKeyword && !hasFalsePositive;
  }

  /**
   * Calculate proximity score based on distance and landmark type
   */
  private calculateProximityScore(
    distance: number,
    keyword: LandmarkKeyword
  ): number {
    const threshold = this.THRESHOLDS[keyword] || 1000;
    const score = Math.max(0, 100 - (distance / threshold) * 100);
    return Math.round(score);
  }

  /**
   * Calculate overall proximity score using weighted average
   */
  private calculateOverallProximityScore(landmarks: Landmark[]): number {
    if (landmarks.length === 0) return 0;

    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const landmark of landmarks) {
      const weight = this.PROXIMITY_WEIGHTS[landmark.keyword] || 0.05;
      totalWeightedScore += landmark.proximityScore * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
  }

  /**
   * Cache management
   */
  private generateCacheKey(
    lat: number,
    lng: number,
    radius: number,
    keywords: LandmarkKeyword[]
  ): string {
    const roundedLat = Math.round(lat * 1000) / 1000; // 3 decimal places precision
    const roundedLng = Math.round(lng * 1000) / 1000;
    return `${roundedLat},${roundedLng},${radius},${keywords.sort().join(',')}`;
  }

  private getFromCache(key: string): ProximityResult | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.CACHE_DURATION;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: ProximityResult): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  private getEmptyProximityResult(): ProximityResult {
    return {
      landmarks: [],
      overallProximityScore: 0,
      hasBeachAccess: false,
      hasShoppingAccess: false,
      cacheHit: false,
    };
  }

  /**
   * Clear expired cache entries (call periodically)
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}
