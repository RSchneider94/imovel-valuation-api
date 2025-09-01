import { ZonevalService, ZonevalValidation, MarketInsights } from './zoneval';
import { ZonevalCacheService } from './zoneval-cache';

export class MarketValidationService {
  private zonevalService: ZonevalService;
  private cacheService: ZonevalCacheService;

  constructor(
    zonevalService: ZonevalService,
    cacheService: ZonevalCacheService
  ) {
    this.zonevalService = zonevalService;
    this.cacheService = cacheService;
  }

  async validateProperty(
    zipcode: string,
    estimatedPrice: number,
    propertySize: number
  ): Promise<{
    validation: ZonevalValidation | null;
    insights: MarketInsights | null;
    refinedPrice: number;
  }> {
    if (!this.zonevalService.isAvailable()) {
      console.log('🔍 Zoneval API not available - skipping market validation');
      return {
        validation: null,
        insights: null,
        refinedPrice: estimatedPrice,
      };
    }

    try {
      // Check cache first
      const cachedData = await this.cacheService.getCachedData(zipcode);

      let validation: ZonevalValidation | null = null;

      if (cachedData) {
        console.log('✅ Using cached Zoneval data');
        validation = this.createZonevalValidation(
          cachedData,
          estimatedPrice,
          propertySize
        );
      } else {
        console.log('🌐 Fetching fresh data from Zoneval API');
        validation = await this.zonevalService.validateProperty(
          zipcode,
          estimatedPrice,
          propertySize
        );

        // Save to cache if we got valid data
        if (validation) {
          await this.cacheService.saveToCache(zipcode, validation);
        }
      }

      if (!validation) {
        return {
          validation: null,
          insights: null,
          refinedPrice: estimatedPrice,
        };
      }

      // Calculate refined price and insights
      const { refinedPrice, insights } = this.calculateRefinedPrice(
        validation,
        estimatedPrice
      );

      return {
        validation,
        insights,
        refinedPrice,
      };
    } catch (error) {
      console.warn('⚠️ Market validation failed:', error);
      return {
        validation: null,
        insights: null,
        refinedPrice: estimatedPrice,
      };
    }
  }

  private createZonevalValidation(
    data: any,
    estimatedPrice: number,
    propertySize: number
  ): ZonevalValidation {
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
  }

  private calculateRefinedPrice(
    validation: ZonevalValidation,
    originalPrice: number
  ): { refinedPrice: number; insights: MarketInsights | null } {
    let refinedPrice = originalPrice;
    let insights: MarketInsights | null = null;

    // Refine price based on market reality
    if (
      validation.marketReality === 'above_market' &&
      validation.confidence > 50
    ) {
      // If our estimate is above market, adjust down slightly
      const adjustmentFactor = Math.min(
        Math.abs(validation.marketDeviation) / 100,
        0.1
      );
      refinedPrice = originalPrice * (1 - adjustmentFactor);
      insights = {
        message: `Preço estimado está ${Math.abs(
          validation.marketDeviation
        )}% acima do mercado local. Ajuste aplicado para maior realismo.`,
        type: 'above_market_adjustment',
      };
    } else if (
      validation.marketReality === 'below_market' &&
      validation.confidence > 50
    ) {
      // If our estimate is below market, adjust up slightly
      const adjustmentFactor = Math.min(
        Math.abs(validation.marketDeviation) / 100,
        0.1
      );
      refinedPrice = originalPrice * (1 + adjustmentFactor);
      insights = {
        message: `Preço estimado está ${Math.abs(
          validation.marketDeviation
        )}% abaixo do mercado local. Ajuste aplicado para maior realismo.`,
        type: 'below_market_adjustment',
      };
    } else if (validation.marketReality === 'within_market') {
      insights = {
        message: `Preço estimado está alinhado com o mercado local (±${Math.abs(
          validation.marketDeviation
        )}% de variação).`,
        type: 'within_market',
      };
    }

    return {
      refinedPrice: Math.round(refinedPrice),
      insights,
    };
  }
}
