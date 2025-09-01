import { FastifyInstance } from 'fastify';
import { ZonevalValidation } from './zoneval';

export interface ZonevalCacheData {
  zipcode: string;
  zipcode_stats: any;
  neighbourhood_stats: any;
  city_stats: any;
  state_stats: any;
}

export class ZonevalCacheService {
  private fastify: FastifyInstance;
  private readonly CACHE_VALIDITY_DAYS = 7;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  async getCachedData(zipcode: string): Promise<any> {
    try {
      const { data, error } = await this.fastify.supabase
        .from('property_market_cache')
        .select('*')
        .eq('zipcode', zipcode)
        .single();

      if (error || !data) {
        return null;
      }

      if (this.isCacheExpired(data.updated_at)) {
        console.log('🔄 Cache expired, will fetch fresh data');
        return null;
      }

      return {
        by_zipcode: data.zipcode_stats,
        by_neighbourhood: data.neighbourhood_stats,
        by_city: data.city_stats,
        by_uf: data.state_stats,
      };
    } catch (error) {
      console.error('❌ Error getting cached data:', error);
      return null;
    }
  }

  async saveToCache(
    zipcode: string,
    validation: ZonevalValidation
  ): Promise<void> {
    try {
      const cacheData = {
        zipcode,
        zipcode_stats: validation.zipcode as any,
        neighbourhood_stats: validation.neighbourhood as any,
        city_stats: validation.city as any,
        state_stats: validation.state as any,
      };

      const { error } = await this.fastify.supabase
        .from('property_market_cache')
        .upsert(cacheData, { onConflict: 'zipcode' });

      if (error) {
        console.error('❌ Error saving to cache:', error);
      } else {
        console.log('💾 Zoneval data saved to cache');
      }
    } catch (error) {
      console.error('❌ Error saving to cache:', error);
    }
  }

  private isCacheExpired(updatedAt: string | null): boolean {
    if (!updatedAt) {
      return true;
    }
    const cacheAge = Date.now() - new Date(updatedAt).getTime();
    const maxAge = this.CACHE_VALIDITY_DAYS * 24 * 60 * 60 * 1000; // days in milliseconds
    return cacheAge > maxAge;
  }

  async getCacheStats(): Promise<{
    total: number;
    valid: number;
    expired: number;
  }> {
    try {
      const { data, error } = await this.fastify.supabase
        .from('property_market_cache')
        .select('updated_at');

      if (error || !data) {
        return { total: 0, valid: 0, expired: 0 };
      }

      const now = Date.now();
      const maxAge = this.CACHE_VALIDITY_DAYS * 24 * 60 * 60 * 1000;

      const stats = data.reduce(
        (acc, item) => {
          if (!item.updated_at) {
            return acc;
          }
          const age = now - new Date(item.updated_at).getTime();
          if (age <= maxAge) {
            acc.valid++;
          } else {
            acc.expired++;
          }
          return acc;
        },
        { total: data.length, valid: 0, expired: 0 }
      );

      return stats;
    } catch (error) {
      console.error('❌ Error getting cache stats:', error);
      return { total: 0, valid: 0, expired: 0 };
    }
  }
}
