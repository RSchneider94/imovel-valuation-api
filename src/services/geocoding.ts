/**
 * Geocoding Service - Reverse geocoding to get zipcode from coordinates
 * Provides fallback mechanisms when Autocomplete API fails to return zipcode
 */

export interface GeocodingResult {
  zipcode?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  source: 'google' | 'nominatim';
}

export interface GeocodingOptions {
  lat: number;
  lng: number;
  language?: string; // default 'pt-BR'
}

export class GeocodingService {
  private readonly GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  private readonly NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

  /**
   * Get zipcode from coordinates using multiple fallback strategies
   */
  async getZipcodeFromCoordinates(
    options: GeocodingOptions
  ): Promise<GeocodingResult | null> {
    const { lat, lng, language = 'pt-BR' } = options;

    console.log(
      `🔍 Attempting reverse geocoding for coordinates: ${lat}, ${lng}`
    );

    // Strategy 1: OpenStreetMap Nominatim (free, good for Brazil)
    try {
      const result = await this.getZipcodeFromNominatim(lat, lng, language);
      if (result?.zipcode) {
        console.log(`✅ Found zipcode via Nominatim: ${result.zipcode}`);
        return result;
      }
    } catch (error) {
      console.warn('⚠️ Nominatim Geocoding failed:', error);
    }

    // Strategy 2: Google Geocoding API (most accurate)
    if (this.GOOGLE_API_KEY) {
      try {
        const result = await this.getZipcodeFromGoogle(lat, lng, language);
        if (result?.zipcode) {
          console.log(`✅ Found zipcode via Google: ${result.zipcode}`);
          return result;
        }
      } catch (error) {
        console.warn('⚠️ Google Geocoding failed:', error);
      }
    }

    console.log('❌ No zipcode found through any geocoding service');
    return null;
  }

  /**
   * Google Geocoding API - Most accurate but requires API key
   */
  private async getZipcodeFromGoogle(
    lat: number,
    lng: number,
    language: string
  ): Promise<GeocodingResult | null> {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('latlng', `${lat},${lng}`);
    url.searchParams.set('key', this.GOOGLE_API_KEY!);
    url.searchParams.set('language', language);
    url.searchParams.set('region', 'br'); // Brazil region bias

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK' || !data.results?.length) {
      return null;
    }

    const result = data.results[0];
    const addressComponents = result.address_components || [];

    // Find postal_code component
    const postalCodeComponent = addressComponents.find((component: any) =>
      component.types.includes('postal_code')
    );

    if (!postalCodeComponent) {
      return null;
    }

    // Find other components
    const neighborhoodComponent = addressComponents.find(
      (component: any) =>
        component.types.includes('sublocality') ||
        component.types.includes('sublocality_level_1')
    );

    const cityComponent = addressComponents.find(
      (component: any) =>
        component.types.includes('locality') ||
        component.types.includes('administrative_area_level_2')
    );

    const stateComponent = addressComponents.find((component: any) =>
      component.types.includes('administrative_area_level_1')
    );

    return {
      zipcode: postalCodeComponent.long_name.replace(/\D/g, ''), // Remove non-digits
      address: result.formatted_address,
      neighborhood: neighborhoodComponent?.long_name,
      city: cityComponent?.long_name,
      state: stateComponent?.short_name,
      source: 'google',
    };
  }

  /**
   * OpenStreetMap Nominatim - Free alternative
   */
  private async getZipcodeFromNominatim(
    lat: number,
    lng: number,
    language: string
  ): Promise<GeocodingResult | null> {
    const url = new URL(`${this.NOMINATIM_BASE_URL}/reverse`);
    url.searchParams.set('format', 'json');
    url.searchParams.set('lat', lat.toString());
    url.searchParams.set('lon', lng.toString());
    url.searchParams.set('zoom', '18'); // High detail level
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('accept-language', language);

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'ImovelValuationAPI/1.0',
      },
    });

    const data = await response.json();

    if (!data || !data.address) {
      return null;
    }

    const address = data.address;
    const zipcode = address.postcode;

    if (!zipcode) {
      return null;
    }

    return {
      zipcode: zipcode.replace(/\D/g, ''), // Remove non-digits
      address: data.display_name,
      neighborhood: address.suburb || address.neighbourhood || address.quarter,
      city: address.city || address.town || address.village,
      state: address.state,
      source: 'nominatim',
    };
  }
}
