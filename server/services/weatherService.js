const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// WMO Weather Interpretation Codes (WW)
const WMO_CODE_MAP = {
  0: { label: 'Clear Sky', icon: '☀️', risk: 'Low' },
  1: { label: 'Mainly Clear', icon: '🌤️', risk: 'Low' },
  2: { label: 'Partly Cloudy', icon: '⛅', risk: 'Low' },
  3: { label: 'Overcast', icon: '☁️', risk: 'Low' },
  45: { label: 'Foggy', icon: '🌫️', risk: 'Medium' },
  48: { label: 'Depositing Rime Fog', icon: '🌫️', risk: 'Medium' },
  51: { label: 'Light Drizzle', icon: '🌦️', risk: 'Low' },
  53: { label: 'Moderate Drizzle', icon: '🌦️', risk: 'Medium' },
  55: { label: 'Dense Drizzle', icon: '🌧️', risk: 'Medium' },
  61: { label: 'Slight Rain', icon: '🌧️', risk: 'Medium' },
  63: { label: 'Moderate Rain', icon: '🌧️', risk: 'Medium' },
  65: { label: 'Heavy Rain', icon: '🌧️', risk: 'High' },
  71: { label: 'Slight Snow', icon: '🌨️', risk: 'Medium' },
  73: { label: 'Moderate Snow', icon: '🌨️', risk: 'High' },
  75: { label: 'Heavy Snow', icon: '❄️', risk: 'High' },
  80: { label: 'Slight Rain Showers', icon: '🌦️', risk: 'Medium' },
  81: { label: 'Moderate Rain Showers', icon: '🌧️', risk: 'High' },
  82: { label: 'Violent Rain Showers', icon: '⛈️', risk: 'Critical' },
  95: { label: 'Thunderstorm', icon: '⛈️', risk: 'High' },
  96: { label: 'Thunderstorm with Slight Hail', icon: '⛈️', risk: 'Critical' },
  99: { label: 'Thunderstorm with Heavy Hail', icon: '⛈️', risk: 'Critical' }
};

class WeatherService {
  /**
   * Search city/district location using Open-Meteo Geocoding API
   */
  async searchLocation(query) {
    if (!query || query.trim().length < 2) return [];
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=8&language=en&format=json`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      if (!data.results) return [];

      return data.results.map(item => ({
        id: `${item.latitude}_${item.longitude}`,
        name: item.name,
        district: item.admin2 || item.admin1 || '',
        state: item.admin1 || '',
        country: item.country || '',
        latitude: item.latitude,
        longitude: item.longitude,
        displayName: `${item.name}, ${item.admin1 ? item.admin1 + ', ' : ''}${item.country}`
      }));
    } catch (err) {
      console.warn('[WeatherService] Geocoding search error:', err.message);
      return [];
    }
  }

  /**
   * Reverse Geocode coordinates to location name
   */
  async reverseGeocode(lat, lng) {
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${lat.toFixed(2)},${lng.toFixed(2)}&count=1`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results[0]) {
          const item = data.results[0];
          return `${item.name}, ${item.admin1 || item.country || ''}`;
        }
      }
    } catch (err) {}
    return `Location (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)`;
  }

  /**
   * Fetch current live weather observation from Open-Meteo
   */
  async getCurrentWeather(lat, lng) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,surface_pressure&daily=sunrise,sunset,uv_index_max,precipitation_probability_max&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);

      const data = await res.json();
      const current = data.current || {};
      const daily = data.daily || {};
      const weatherInfo = WMO_CODE_MAP[current.weather_code] || { label: 'Cloudy', icon: '☁️', risk: 'Low' };

      const locationName = await this.reverseGeocode(lat, lng);

      return {
        locationName,
        latitude: lat,
        longitude: lng,
        temperature: Math.round(current.temperature_2m),
        feelsLike: Math.round(current.apparent_temperature),
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m),
        windDirection: current.wind_direction_10m,
        rainfall: current.precipitation || 0,
        rainChance: daily.precipitation_probability_max ? daily.precipitation_probability_max[0] : 20,
        weatherCondition: weatherInfo.label,
        weatherIcon: weatherInfo.icon,
        weatherCode: current.weather_code,
        pressure: Math.round(current.surface_pressure || 1013),
        sunrise: daily.sunrise ? daily.sunrise[0].split('T')[1] : '06:00',
        sunset: daily.sunset ? daily.sunset[0].split('T')[1] : '18:30',
        uvIndex: daily.uv_index_max ? daily.uv_index_max[0] : 5,
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date().toISOString(),
        trustIndicator: 'LIVE',
        status: 'SUCCESS'
      };
    } catch (err) {
      console.warn('[WeatherService] Live weather error:', err.message);
      return {
        status: 'UNAVAILABLE',
        message: 'Weather data temporarily unavailable from meteorology server.',
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        trustIndicator: 'UNAVAILABLE'
      };
    }
  }

  /**
   * Fetch 30-Day Weather & Disaster Risk Outlook
   * Combines 16-day deterministic forecast + extended-range guidance for days 17-30
   */
  async get30DayOutlook(lat, lng) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&forecast_days=16&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);

      const data = await res.json();
      const daily = data.daily || {};

      const outlookList = [];
      const today = new Date();

      // Days 1 to 16: Deterministic Daily Forecast
      if (daily.time) {
        for (let i = 0; i < daily.time.length; i++) {
          const dateStr = daily.time[i];
          const wCode = daily.weather_code[i];
          const weatherInfo = WMO_CODE_MAP[wCode] || { label: 'Partly Cloudy', icon: '⛅', risk: 'Low' };

          const maxTemp = Math.round(daily.temperature_2m_max[i]);
          const minTemp = Math.round(daily.temperature_2m_min[i]);
          const rainProb = daily.precipitation_probability_max[i] || 0;
          const rainMm = daily.precipitation_sum ? daily.precipitation_sum[i] : 0;
          const windMax = daily.wind_speed_10m_max ? Math.round(daily.wind_speed_10m_max[i]) : 10;

          let riskSignal = 'No Active Warning';
          let trustIndicator = 'FORECAST';

          if (rainProb >= 70 || rainMm >= 30 || wCode === 95 || wCode === 96 || wCode === 99) {
            riskSignal = 'Heavy Rain / Storm Potential';
          } else if (rainProb >= 45 || rainMm >= 10) {
            riskSignal = 'Rain Shower Signal';
          } else if (maxTemp >= 40) {
            riskSignal = 'Heatwave Warning Signal';
          }

          outlookList.push({
            dayNumber: i + 1,
            date: dateStr,
            displayDate: new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
            dayOfWeek: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }),
            condition: weatherInfo.label,
            icon: weatherInfo.icon,
            maxTemp,
            minTemp,
            rainProbability: rainProb,
            rainfallMm: rainMm,
            windSpeed: windMax,
            riskSignal,
            trustIndicator,
            isReliableForecast: true
          });
        }
      }

      // Days 17 to 30: Extended-Range Meteorological Outlook (clearly marked)
      for (let d = 17; d <= 30; d++) {
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + (d - 1));
        const dateStr = futureDate.toISOString().split('T')[0];

        outlookList.push({
          dayNumber: d,
          date: dateStr,
          displayDate: futureDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
          dayOfWeek: futureDate.toLocaleDateString('en-US', { weekday: 'short' }),
          condition: 'Extended Outlook',
          icon: '🟠',
          maxTemp: null,
          minTemp: null,
          rainProbability: null,
          rainfallMm: null,
          windSpeed: null,
          riskSignal: 'Forecast unavailable beyond 16 days. Official extended-range outlook is available separately.',
          trustIndicator: 'OUTLOOK',
          isReliableForecast: false,
          notice: 'No reliable daily deterministic prediction available beyond day 16. Monitor official IMD seasonal updates.'
        });
      }

      return {
        locationLat: lat,
        locationLng: lng,
        totalDays: 30,
        forecastDaysAvailable: 16,
        extendedOutlookDays: 14,
        days: outlookList,
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'SUCCESS'
      };
    } catch (err) {
      console.warn('[WeatherService] 30-day outlook error:', err.message);
      return {
        status: 'UNAVAILABLE',
        message: 'Weather outlook feed temporarily offline.',
        days: []
      };
    }
  }
}

module.exports = new WeatherService();
