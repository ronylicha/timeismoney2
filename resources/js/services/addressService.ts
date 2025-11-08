import axios from 'axios';

export interface AddressSuggestion {
  label: string;
  value: string;
  context?: string;
  type?: string;
  id?: string;
  score?: number;
  postcode?: string;
  city?: string;
  name?: string;
  street?: string;
  housenumber?: string;
  lat?: string;
  lon?: string;
}

export interface AddressDetails {
  label: string;
  type: string;
  name: string;
  postcode: string;
  city: string;
  context: string;
  id: string;
  score: number;
  x: number;
  y: number;
  population: number;
  citycode: string;
  oldcitycode: string;
  oldcity: string;
  department: string;
  region: string;
  housenumber?: string;
  street?: string;
  lat?: string;
  lon?: string;
}

class AddressService {
  private readonly baseUrl = 'https://api-adresse.data.gouv.fr';

  /**
   * Search for address suggestions based on query
   * @param query The search query (address, city, postal code...)
   * @param limit Maximum number of results (default: 5)
   * @param autocomplete Enable autocomplete mode (default: true)
   * @returns Promise<AddressSuggestion[]>
   */
  async searchAddresses(
    query: string, 
    limit: number = 5, 
    autocomplete: boolean = true
  ): Promise<AddressSuggestion[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    try {
      const response = await axios.get(`${this.baseUrl}/search/`, {
        params: {
          q: query.trim(),
          limit,
          autocomplete: autocomplete ? '1' : '0',
          type: 'housenumber,street,locality,municipality'
        },
        timeout: 5000
      });

      return response.data.features.map((feature: any) => ({
        label: feature.properties.label,
        value: feature.properties.label,
        context: feature.properties.context,
        type: feature.properties.type,
        id: feature.properties.id,
        score: feature.properties.score,
        postcode: feature.properties.postcode,
        city: feature.properties.city,
        name: feature.properties.name,
        street: feature.properties.street,
        housenumber: feature.properties.housenumber,
        lat: feature.geometry?.coordinates?.[1]?.toString(),
        lon: feature.geometry?.coordinates?.[0]?.toString()
      }));
    } catch (error) {
      console.error('Error searching addresses:', error);
      return [];
    }
  }

  /**
   * Get detailed information about a specific address
   * @param addressId The ID of the address
   * @returns Promise<AddressDetails | null>
   */
  async getAddressDetails(addressId: string): Promise<AddressDetails | null> {
    if (!addressId) {
      return null;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/search/`, {
        params: {
          id: addressId
        },
        timeout: 5000
      });

      if (response.data.features.length === 0) {
        return null;
      }

      const feature = response.data.features[0];
      return {
        label: feature.properties.label,
        type: feature.properties.type,
        name: feature.properties.name,
        postcode: feature.properties.postcode,
        city: feature.properties.city,
        context: feature.properties.context,
        id: feature.properties.id,
        score: feature.properties.score,
        x: feature.geometry?.coordinates?.[0] || 0,
        y: feature.geometry?.coordinates?.[1] || 0,
        population: feature.properties.population || 0,
        citycode: feature.properties.citycode || '',
        oldcitycode: feature.properties.oldcitycode || '',
        oldcity: feature.properties.oldcity || '',
        department: feature.properties.context?.split(',')?.[0]?.trim() || '',
        region: feature.properties.context?.split(',')?.[1]?.trim() || '',
        housenumber: feature.properties.housenumber,
        street: feature.properties.street,
        lat: feature.geometry?.coordinates?.[1]?.toString(),
        lon: feature.geometry?.coordinates?.[0]?.toString()
      };
    } catch (error) {
      console.error('Error getting address details:', error);
      return null;
    }
  }

  /**
   * Reverse geocoding: get address from coordinates
   * @param lat Latitude
   * @param lon Longitude
   * @returns Promise<AddressSuggestion | null>
   */
  async reverseGeocode(lat: number, lon: number): Promise<AddressSuggestion | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/reverse/`, {
        params: {
          lat,
          lon,
          type: 'housenumber,street,locality,municipality'
        },
        timeout: 5000
      });

      if (response.data.features.length === 0) {
        return null;
      }

      const feature = response.data.features[0];
      return {
        label: feature.properties.label,
        value: feature.properties.label,
        context: feature.properties.context,
        type: feature.properties.type,
        id: feature.properties.id,
        score: feature.properties.score,
        postcode: feature.properties.postcode,
        city: feature.properties.city,
        name: feature.properties.name,
        street: feature.properties.street,
        housenumber: feature.properties.housenumber,
        lat: feature.geometry?.coordinates?.[1]?.toString(),
        lon: feature.geometry?.coordinates?.[0]?.toString()
      };
    } catch (error) {
      console.error('Error in reverse geocoding:', error);
      return null;
    }
  }

  /**
   * Parse address components from a selected suggestion
   * @param suggestion The address suggestion
   * @returns Object with parsed address components
   */
  parseAddressComponents(suggestion: AddressSuggestion) {
    return {
      address: suggestion.label,
      street: suggestion.street || '',
      housenumber: suggestion.housenumber || '',
      city: suggestion.city || '',
      postal_code: suggestion.postcode || '',
      country: 'France', // API is for French addresses only
      latitude: suggestion.lat || '',
      longitude: suggestion.lon || ''
    };
  }
}

export const addressService = new AddressService();
export default addressService;