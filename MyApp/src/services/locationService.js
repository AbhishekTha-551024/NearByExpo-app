import * as Location from 'expo-location';

export const LocationService = {
  /**
   * Request permissions and get current location
   */
  getCurrentLocation: async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission to access location was denied');
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error('Error getting location:', error);
      throw error;
    }
  },

  /**
   * Reverse geocode to get city and area (neighborhood)
   */
  getLocationDetails: async (latitude, longitude) => {
    try {
      let reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (reverseGeocode.length > 0) {
        const item = reverseGeocode[0];
        return {
          city: item.city || item.subregion || item.region || 'Unknown',
          area: item.district || item.name || item.street || 'Nearby'
        };
      }
      return { city: 'Unknown', area: 'Nearby' };
    } catch (error) {
      console.error('Error getting location details:', error);
      return { city: 'Unknown', area: 'Nearby' };
    }
  },
  /**
   * Search for a city/location and get coordinates
   */
  searchCity: async (query) => {
    try {
      const results = await Location.geocodeAsync(query);
      if (results.length > 0) {
        return {
          latitude: results[0].latitude,
          longitude: results[0].longitude,
        };
      }
      return null;
    } catch (error) {
      console.error('Error searching city:', error);
      return null;
    }
  }
};
