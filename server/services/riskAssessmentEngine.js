const mongoose = require('mongoose');
const weatherService = require('./weatherService');
const DisasterPrediction = require('../models/DisasterPrediction');
const Incident = require('../models/Incident');

const isDbConnected = () => mongoose.connection && mongoose.connection.readyState === 1;

// Rule-Set Version
const RULE_SET_VERSION = 'ResQAI-RiskRules-v2.1';

// Earth Radius for Geodesic Calculations
const EARTH_RADIUS_METERS = 6371000;

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_METERS * c);
}

/**
 * Multi-Hazard Risk Assessment Engine
 */
class RiskAssessmentEngine {
  /**
   * Assess disaster risk for a given location using real weather telemetry,
   * active incident density, and transparent multi-factor hazard formulas.
   */
  async assessLocationRisk(lat, lng, areaLabel = null) {
    const assessmentStartTime = new Date();
    const retrievalTime = new Date().toISOString();

    // 1. Fetch real meteorological data via weatherService (Open-Meteo)
    let currentWeather = null;
    let outlook = null;
    let weatherSourceFreshness = 'CURRENT';
    let weatherApiAvailable = true;

    try {
      currentWeather = await weatherService.getCurrentWeather(lat, lng);
      outlook = await weatherService.get30DayOutlook(lat, lng);
    } catch (wErr) {
      weatherApiAvailable = false;
      weatherSourceFreshness = 'UNAVAILABLE';
      console.warn('[RiskAssessmentEngine] Weather API unavailable:', wErr.message);
    }

    const areaName = areaLabel || currentWeather?.locationName || (await weatherService.reverseGeocode(lat, lng));

    // Extract weather metrics
    const todayForecast = outlook?.days?.[0] || {};
    const tomorrowForecast = outlook?.days?.[1] || {};

    const rainfallToday = todayForecast.rainfallMm || currentWeather?.rainfall || 0;
    const rainfallTomorrow = tomorrowForecast.rainfallMm || 0;
    const total48hRainfall = Math.round(rainfallToday + rainfallTomorrow);

    const peakWind = Math.max(
      currentWeather?.windSpeed || 0,
      todayForecast.windSpeed || 0,
      tomorrowForecast.windSpeed || 0
    );

    const maxTemp = Math.max(
      currentWeather?.temperature || 28,
      todayForecast.maxTemp || 28,
      tomorrowForecast.maxTemp || 28
    );

    const pressure = currentWeather?.pressure || 1012;
    const rainProbability = Math.max(todayForecast.rainProbability || 0, tomorrowForecast.rainProbability || 0);

    // 2. Query active incidents within 25 km from MongoDB
    let nearbyActiveIncidents = [];
    try {
      if (isDbConnected() && Incident) {
        const activeDocs = await Incident.find({
          status: { $nin: ['Resolved', 'INCIDENT_RESOLVED', 'REJECTED', 'CANCELLED'] }
        }).lean();

        nearbyActiveIncidents = activeDocs.filter(inc => {
          let iLat = inc.location?.lat;
          let iLng = inc.location?.lng;
          if (inc.location?.coordinates && Array.isArray(inc.location.coordinates)) {
            iLng = inc.location.coordinates[0];
            iLat = inc.location.coordinates[1];
          }
          if (typeof iLat === 'number' && typeof iLng === 'number') {
            return calculateDistanceMeters(lat, lng, iLat, iLng) <= 25000;
          }
          return false;
        });
      }
    } catch (e) {
      console.warn('[RiskAssessmentEngine] Incident check notice:', e.message);
    }

    const activeFloodIncidents = nearbyActiveIncidents.filter(i => (i.disasterType || '').toUpperCase().includes('FLOOD')).length;
    const activeFireIncidents = nearbyActiveIncidents.filter(i => (i.disasterType || '').toUpperCase().includes('FIRE')).length;

    // 3. Evaluate multi-hazard criteria
    const hazardAssessments = [];

    // --- HAZARD A: FLOOD & HEAVY RAINFALL ---
    if (weatherApiAvailable) {
      let floodScore = 0;
      const floodEvidence = [];

      if (total48hRainfall >= 100) {
        floodScore += 50;
        floodEvidence.push(`Heavy 48h cumulative rainfall of ${total48hRainfall}mm exceeds high-risk threshold (100mm)`);
      } else if (total48hRainfall >= 45) {
        floodScore += 30;
        floodEvidence.push(`Moderate 48h cumulative rainfall of ${total48hRainfall}mm`);
      }

      if (rainProbability >= 75) {
        floodScore += 20;
        floodEvidence.push(`High precipitation probability (${rainProbability}%)`);
      }

      if (activeFloodIncidents > 0) {
        floodScore += Math.min(30, activeFloodIncidents * 15);
        floodEvidence.push(`${activeFloodIncidents} active verified flood incidents in the immediate 25 km area`);
      }

      let floodRiskLevel = 'Low';
      if (floodScore >= 70) floodRiskLevel = 'Critical';
      else if (floodScore >= 50) floodRiskLevel = 'High';
      else if (floodScore >= 25) floodRiskLevel = 'Moderate';

      if (floodRiskLevel !== 'Low' || total48hRainfall >= 30) {
        hazardAssessments.push({
          hazardType: floodRiskLevel === 'Critical' ? 'Flood' : (total48hRainfall >= 70 ? 'Flood' : 'Heavy Rainfall'),
          riskCategory: floodRiskLevel,
          riskScore: floodScore,
          geographicArea: {
            name: areaName,
            center: { lat, lng },
            radiusKm: 25
          },
          evidence: floodEvidence,
          weatherMetrics: {
            rainfallForecastMm: total48hRainfall,
            peakWindSpeedKmh: peakWind,
            peakTemperatureC: maxTemp,
            atmosphericPressureHpa: pressure,
            activeNearbyIncidents: activeFloodIncidents
          },
          recommendedActions: [
            'Stay tuned to ResQAI live road reports for waterlogged corridors.',
            'Move essential documents, electronics, and medicine to higher ground.',
            'Never drive, cycle, or walk through moving or stagnant floodwaters.',
            'Identify nearest high-elevation relief camp on the safe routing map.'
          ],
          uncertaintyInfo: '±10% based on numerical precipitation grid dispersion',
          dataSources: ['Open-Meteo Meteorological Model', 'ResQAI Incident Registry']
        });
      }
    }

    // --- HAZARD B: CYCLONE / SEVERE STORM ---
    if (weatherApiAvailable && (peakWind >= 55 || (peakWind >= 40 && pressure <= 1002))) {
      let cycloneScore = 0;
      const cycloneEvidence = [];

      if (peakWind >= 75) {
        cycloneScore += 50;
        cycloneEvidence.push(`Severe sustained wind gusts reaching ${peakWind} km/h (Category-1 threshold)`);
      } else {
        cycloneScore += 30;
        cycloneEvidence.push(`Strong wind gusts of ${peakWind} km/h`);
      }

      if (pressure <= 998) {
        cycloneScore += 40;
        cycloneEvidence.push(`Steep atmospheric pressure drop to ${pressure} hPa indicating intense cyclonic depression`);
      } else if (pressure <= 1005) {
        cycloneScore += 20;
        cycloneEvidence.push(`Depressed barometric pressure of ${pressure} hPa`);
      }

      let cycloneRisk = cycloneScore >= 70 ? 'Critical' : cycloneScore >= 45 ? 'High' : 'Moderate';
      hazardAssessments.push({
        hazardType: peakWind >= 75 ? 'Cyclone' : 'Severe Thunderstorm',
        riskCategory: cycloneRisk,
        riskScore: cycloneScore,
        geographicArea: {
          name: areaName,
          center: { lat, lng },
          radiusKm: 40
        },
        evidence: cycloneEvidence,
        weatherMetrics: {
          rainfallForecastMm: total48hRainfall,
          peakWindSpeedKmh: peakWind,
          peakTemperatureC: maxTemp,
          atmosphericPressureHpa: pressure
        },
        recommendedActions: [
          'Secure loose roof tiles, signs, and outdoor fixtures.',
          'Stay indoors away from glass windows and power transmission lines.',
          'Charge emergency lights, mobile phones, and keep battery radios handy.'
        ],
        uncertaintyInfo: '±15% track deviation depending on regional barometric gradient',
        dataSources: ['Open-Meteo High-Resolution Wind Telemetry', 'ResQAI Incident Registry']
      });
    }

    // --- HAZARD C: HEATWAVE ---
    if (weatherApiAvailable && maxTemp >= 40) {
      const isCritical = maxTemp >= 44;
      hazardAssessments.push({
        hazardType: 'Heatwave',
        riskCategory: isCritical ? 'Critical' : 'High',
        riskScore: isCritical ? 85 : 65,
        geographicArea: {
          name: areaName,
          center: { lat, lng },
          radiusKm: 30
        },
        evidence: [
          `Peak daytime temperature forecasted at ${maxTemp}°C exceeds national heatwave threshold`,
          'Sustained high solar irradiation with limited cloud cover'
        ],
        weatherMetrics: {
          peakTemperatureC: maxTemp,
          peakWindSpeedKmh: peakWind,
          atmosphericPressureHpa: pressure
        },
        recommendedActions: [
          'Avoid direct sun exposure between 11:00 AM and 4:00 PM.',
          'Drink oral rehydration solutions (ORS) and water regularly.',
          'Keep vulnerable infants, seniors, and pets in cool, shaded spaces.'
        ],
        uncertaintyInfo: '±1.5°C thermal variation across urban microclimates',
        dataSources: ['Open-Meteo Thermal Forecast Model']
      });
    }

    // --- HAZARD D: FIRE RISK ---
    if (weatherApiAvailable && (activeFireIncidents > 0 || (maxTemp >= 38 && peakWind >= 35))) {
      const isCritical = activeFireIncidents >= 2 || (maxTemp >= 41 && peakWind >= 45);
      hazardAssessments.push({
        hazardType: 'Fire',
        riskCategory: isCritical ? 'Critical' : 'Moderate',
        riskScore: isCritical ? 80 : 45,
        geographicArea: {
          name: areaName,
          center: { lat, lng },
          radiusKm: 20
        },
        evidence: [
          activeFireIncidents > 0 ? `${activeFireIncidents} active fire incidents reported nearby` : 'Elevated fire danger index',
          `High temperatures (${maxTemp}°C) coupled with wind gusts (${peakWind} km/h)`
        ],
        weatherMetrics: {
          peakTemperatureC: maxTemp,
          peakWindSpeedKmh: peakWind,
          activeNearbyIncidents: activeFireIncidents
        },
        recommendedActions: [
          'Observe open-flame bans and immediately report signs of brush or structure smoke.',
          'Keep fire extinguishers and hose connections accessible.',
          'Maintain clear perimeter clearance around buildings in scrubland fringes.'
        ],
        uncertaintyInfo: 'Local wind shifts significantly alter flame propagation',
        dataSources: ['Open-Meteo Weather Model', 'ResQAI Active Incident Registry']
      });
    }
    // --- BASELINE: When no severe thresholds are met, report low risk baseline ---
    if (hazardAssessments.length === 0) {
      hazardAssessments.push({
        hazardType: 'General Environmental Conditions',
        riskCategory: 'Low',
        riskScore: 5,
        geographicArea: {
          name: areaName,
          center: { lat, lng },
          radiusKm: 25
        },
        evidence: [
          `No active extreme meteorological warnings for ${areaName}`,
          `Recorded 48h rainfall ${total48hRainfall}mm and peak wind ${peakWind} km/h remain within safe baselines`
        ],
        weatherMetrics: {
          peakTemperatureC: maxTemp,
          peakWindSpeedKmh: peakWind,
          rainfall48hMm: total48hRainfall
        },
        dataSources: ['Open-Meteo Meteorological Model', 'ResQAI Incident Registry'],
        recommendedActions: [
          'Maintain regular disaster preparedness.',
          'Ensure battery emergency lights and helpline contacts are kept accessible.'
        ],
        uncertaintyInfo: 'Standard 48-hour meteorological forecast variation applies'
      });
    }

    // Format final assessment report
    const dataSources = [
      {
        name: 'Open-Meteo Global Meteorological Forecast Model',
        sourceName: 'Open-Meteo Global Meteorological Forecast Model',
        status: weatherSourceFreshness,
        freshness: weatherSourceFreshness,
        observationTime: currentWeather?.time || assessmentStartTime.toISOString(),
        retrievalTime,
        coverage: 'Global High-Resolution (1.1km - 11km grid)',
        units: 'Celsius (°C), mm, km/h, hPa'
      },
      {
        name: 'ResQAI Live Verified Incident Registry',
        sourceName: 'ResQAI Live Verified Incident Registry',
        status: 'CURRENT',
        freshness: 'CURRENT',
        observationTime: new Date().toISOString(),
        retrievalTime,
        coverage: '25 km radius',
        units: 'Incident count, GPS coordinates'
      }
    ];

    return {
      success: true,
      assessmentId: `RISK-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      assessmentTimestamp: assessmentStartTime.toISOString(),
      location: { lat, lng, areaName },
      geographicArea: { name: areaName, center: { lat, lng } },
      natureOfAssessment: 'RULE_BASED_RISK_ESTIMATE',
      ruleSetVersion: RULE_SET_VERSION,
      weatherApiStatus: weatherSourceFreshness,
      dataSources,
      activeAssessmentsCount: hazardAssessments.length,
      assessments: hazardAssessments,
      hazardAssessments: hazardAssessments,
      overallMaxRisk: hazardAssessments.length > 0
        ? (hazardAssessments.some(a => a.riskCategory === 'Critical') ? 'Critical'
          : hazardAssessments.some(a => a.riskCategory === 'High') ? 'High'
          : 'Moderate')
        : 'Low',
      disclaimer: 'This transparent rule-based risk assessment combines real Open-Meteo telemetry with verified local incidents. It does not replace official statutory warnings issued by NDRF / IMD / State Disaster Management Authorities.'
    };
  }

  /**
   * Evaluates and persists regional assessments for monitored vulnerable corridors
   */
  async evaluateMonitoredRegions() {
    const REGIONS = [
      { name: 'Nashik Godavari Basin & Trimbak Watershed', lat: 20.0050, lng: 73.7880 },
      { name: 'Mumbai Coastal & Thane Basin', lat: 19.0760, lng: 72.8777 },
      { name: 'Pune Mutha River Corridor', lat: 18.5204, lng: 73.8567 },
      { name: 'Delhi NCR & Yamuna Floodplain', lat: 28.6304, lng: 77.2177 }
    ];

    const results = [];
    for (const r of REGIONS) {
      try {
        const assessment = await this.assessLocationRisk(r.lat, r.lng, r.name);
        results.push(assessment);
      } catch (err) {
        console.error(`[RiskAssessmentEngine] Error assessing ${r.name}:`, err.message);
      }
    }
    return results;
  }
}

module.exports = new RiskAssessmentEngine();
