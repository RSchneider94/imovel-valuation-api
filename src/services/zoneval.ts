interface ZonevalStats {
  average: number;
  median: number;
  support: number;
}

interface ZonevalStatsGroup {
  global: ZonevalStats;
  per_m2: ZonevalStats;
  per_room: ZonevalStats;
}

interface ZonevalResponse {
  by_zipcode: ZonevalStatsGroup;
  by_neighbourhood: ZonevalStatsGroup;
  by_city: ZonevalStatsGroup;
  by_uf: ZonevalStatsGroup;
}

export interface ZonevalValidation {
  zipcode: ZonevalStatsGroup;
  neighbourhood: ZonevalStatsGroup;
  city: ZonevalStatsGroup;
  state: ZonevalStatsGroup;
  confidence: number;
  pricePerM2: number;
  pricePerM2Median: number;
  marketReality: 'above_market' | 'below_market' | 'within_market';
  marketDeviation: number;
}

export interface MarketInsights {
  message: string;
  type: 'above_market_adjustment' | 'below_market_adjustment' | 'within_market';
}

export interface ZonevalCacheData {
  zipcode: string;
  zipcode_stats: any;
  neighbourhood_stats: any;
  city_stats: any;
  state_stats: any;
}

export class ZonevalService {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl = 'https://api.zoneval.com';

  constructor() {
    this.apiKey = process.env.ZONEVAL_API_KEY || '';
    this.apiSecret = process.env.ZONEVAL_API_SECRET || '';

    if (!this.apiKey || !this.apiSecret) {
      console.warn(
        '⚠️ Zoneval API credentials not configured. Market validation will be disabled.'
      );
    }
  }

  private async makeRequest(zipcode: string): Promise<ZonevalResponse> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Zoneval API credentials not configured');
    }

    const response = await fetch(`${this.baseUrl}/zipcodes/${zipcode}/stats`, {
      headers: {
        'x-api-key': this.apiKey,
        'x-api-secret': this.apiSecret,
      },
    });

    if (response.status === 403) {
      throw new Error('Zoneval API: Invalid credentials or plan restrictions');
    }

    if (response.status === 404) {
      throw new Error('Zoneval API: CEP not found in database');
    }

    if (response.status === 429) {
      throw new Error('Zoneval API: Rate limit exceeded');
    }

    if (!response.ok) {
      throw new Error(`Zoneval API: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  public async validateProperty(
    zipcode: string,
    estimatedPrice: number,
    propertySize: number
  ): Promise<ZonevalValidation | null> {
    try {
      // Remove non-numeric characters from CEP
      const cleanCep = zipcode.replace(/\D/g, '');

      if (cleanCep.length !== 8) {
        console.warn(`⚠️ Invalid CEP format: ${zipcode}`);
        return null;
      }

      const data = await this.makeRequest(cleanCep);

      // Calculate price per m² for our estimation
      const pricePerM2 = estimatedPrice / propertySize;
      const pricePerM2Median = data.by_zipcode.per_m2.median;

      // Calculate market deviation percentage
      const marketDeviation =
        ((pricePerM2 - pricePerM2Median) / pricePerM2Median) * 100;

      // Determine market reality based on deviation
      let marketReality: 'above_market' | 'below_market' | 'within_market';
      if (marketDeviation > 15) {
        marketReality = 'above_market';
      } else if (marketDeviation < -15) {
        marketReality = 'below_market';
      } else {
        marketReality = 'within_market';
      }

      // Calculate confidence based on support data
      const zipcodeSupport = data.by_zipcode.global.support;
      const neighbourhoodSupport = data.by_neighbourhood.global.support;
      const citySupport = data.by_city.global.support;

      // Weight confidence based on available data
      let confidence = 0;
      if (zipcodeSupport > 0) confidence += 40;
      if (neighbourhoodSupport > 0) confidence += 30;
      if (citySupport > 0) confidence += 20;
      confidence += 10; // Base confidence

      return {
        zipcode: data.by_zipcode,
        neighbourhood: data.by_neighbourhood,
        city: data.by_city,
        state: data.by_uf,
        confidence: Math.min(confidence, 100),
        pricePerM2,
        pricePerM2Median,
        marketReality,
        marketDeviation: Math.round(marketDeviation * 100) / 100,
      };
    } catch (error) {
      console.error('❌ Zoneval API error:', error);
      return null;
    }
  }

  public isAvailable(): boolean {
    return !!(this.apiKey && this.apiSecret);
  }

  private async getCachedData(
    zipcode: string
  ): Promise<ZonevalResponse | null> {
    try {
      // This will be called from the calculate function with fastify instance
      // For now, we'll return null and implement the cache logic in the calculate function
      return null;
    } catch (error) {
      console.error('❌ Error getting cached data:', error);
      return null;
    }
  }

  private async saveToCache(
    zipcode: string,
    data: ZonevalResponse
  ): Promise<void> {
    try {
      // This will be called from the calculate function with fastify instance
      // For now, we'll implement the cache logic in the calculate function
      console.log('💾 Saving Zoneval data to cache for CEP:', zipcode);
    } catch (error) {
      console.error('❌ Error saving to cache:', error);
    }
  }
}
