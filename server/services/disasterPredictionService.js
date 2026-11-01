const DisasterPrediction = require('../models/DisasterPrediction');
const weatherService = require('./weatherService');
const emailNotificationService = require('./emailNotificationService');

// Monitored High-Vulnerability Zones
const MONITORED_REGIONS = [
  { name: 'Delhi NCR & Yamuna Riverbed Basin', lat: 28.6304, lng: 77.2177, radiusKm: 25 },
  { name: 'Mumbai Coastal & Thane Watershed', lat: 19.0760, lng: 72.8777, radiusKm: 30 },
  { name: 'Nashik Godavari Flood Zone', lat: 20.0050, lng: 73.7880, radiusKm: 20 },
  { name: 'Pune Mutha River Corridor', lat: 18.5204, lng: 73.8567, radiusKm: 25 }
];

class DisasterPredictionService {
  /**
   * Evaluates meteorological risk for a specific geographic location
   */
  async evaluateLocationRisk(lat, lng, regionName = null) {
    const areaName = regionName || await weatherService.reverseGeocode(lat, lng);
    const currentWeather = await weatherService.getCurrentWeather(lat, lng);
    const outlook = await weatherService.get30DayOutlook(lat, lng);

    const todayForecast = outlook.days?.[0] || {};
    const tomorrowForecast = outlook.days?.[1] || {};

    const rainfallToday = todayForecast.rainfallMm || currentWeather.rainfall || 0;
    const rainfallTomorrow = tomorrowForecast.rainfallMm || 0;
    const total48hRainfall = Math.round(rainfallToday + rainfallTomorrow);

    const peakWind = Math.max(
      currentWeather.windSpeed || 0,
      todayForecast.windSpeed || 0,
      tomorrowForecast.windSpeed || 0
    );

    const maxTemp = Math.max(
      currentWeather.temperature || 30,
      todayForecast.maxTemp || 30,
      tomorrowForecast.maxTemp || 30
    );

    const rainProbability = Math.max(
      todayForecast.rainProbability || 0,
      tomorrowForecast.rainProbability || 0
    );

    const weatherCode = currentWeather.weatherCode || todayForecast.weatherCode || 0;

    // RULE-BASED MULTI-HAZARD RISK EVALUATION MATRIX
    const candidates = [];

    // 1. FLOOD & HEAVY PRECIPITATION EVALUATION
    if (total48hRainfall >= 110 || rainfallToday >= 70 || (total48hRainfall >= 60 && rainProbability >= 85)) {
      const isCritical = total48hRainfall >= 130 || rainfallToday >= 90;
      candidates.push({
        disasterType: 'Flood',
        title: isCritical
          ? `CRITICAL FLOOD INUNDATION PREDICTION: Severe Inundation in ${areaName}`
          : `HIGH FLOOD RISK PREDICTION: Rapid Surface Water Accumulation in ${areaName}`,
        description: `Meteorological models forecast intense cumulative rainfall of ${total48hRainfall}mm over the next 36 hours. Extreme potential for river overflow, submerged underpasses, and urban stormwater grid breach.`,
        predictedRiskLevel: isCritical ? 'Critical' : 'High',
        confidenceScore: isCritical ? 0.94 : 0.88,
        weatherMetrics: {
          rainfallForecastMm: total48hRainfall,
          peakWindSpeedKmh: peakWind,
          peakTemperatureC: maxTemp,
          atmosphericPressureHpa: currentWeather.pressure || 1010,
          floodRiskIndex: isCritical ? 92 : 78
        },
        safetyPrecautions: [
          'Move essential identification, battery backups, and prescription medications to upper levels.',
          'Never attempt to wade, drive, or cycle through submerged roadways or railway underpasses.',
          'Disconnect ground-level electrical circuit breakers and seal domestic drains if water approaches.',
          'Review nearby verified emergency relief camps on the ResQAI safe navigation dashboard.',
          'Keep portable radios and power banks fully charged; heed official NDRF / SDRF orders.'
        ],
        forecastHours: 36
      });
    } else if (total48hRainfall >= 35 || rainProbability >= 70) {
      candidates.push({
        disasterType: 'Heavy Rainfall',
        title: `MODERATE HEAVY RAINFALL ALERT: Localized Waterlogging in ${areaName}`,
        description: `Forecast predicts persistent moderate-to-heavy rain showers yielding ~${total48hRainfall}mm. Expect localized street ponding and slowed commute corridors.`,
        predictedRiskLevel: 'Moderate',
        confidenceScore: 0.82,
        weatherMetrics: {
          rainfallForecastMm: total48hRainfall,
          peakWindSpeedKmh: peakWind,
          peakTemperatureC: maxTemp,
          atmosphericPressureHpa: currentWeather.pressure || 1012,
          floodRiskIndex: 45
        },
        safetyPrecautions: [
          'Allow extra travel time and avoid low-lying stormwater drainage canals.',
          'Clear leaves and debris from residential storm grates and balconies.',
          'Monitor live ResQAI weather and road-closure telemetry.'
        ],
        forecastHours: 24
      });
    }

    // 2. CYCLONE & GALE-FORCE WIND HAZARD
    if (peakWind >= 65) {
      const isCriticalWind = peakWind >= 90;
      candidates.push({
        disasterType: 'Cyclone',
        title: isCriticalWind
          ? `CRITICAL CYCLONIC SQUALL WARNING: Damaging Winds (${peakWind} km/h) in ${areaName}`
          : `HIGH WINDSTORM HAZARD PREDICTION: Gale Force Gusts (${peakWind} km/h) in ${areaName}`,
        description: `Atmospheric pressure gradient indicates gale-force squalls reaching gusts of ${peakWind} km/h. Danger of falling trees, collapsed hoardings, and damaged overhead high-voltage lines.`,
        predictedRiskLevel: isCriticalWind ? 'Critical' : 'High',
        confidenceScore: isCriticalWind ? 0.95 : 0.87,
        weatherMetrics: {
          rainfallForecastMm: total48hRainfall,
          peakWindSpeedKmh: peakWind,
          peakTemperatureC: maxTemp,
          atmosphericPressureHpa: currentWeather.pressure || 998,
          floodRiskIndex: 50
        },
        safetyPrecautions: [
          'Anchor or store loose outdoor furniture, corrugated sheets, and equipment indoors.',
          'Park vehicles away from mature trees, tall hoardings, and overhead electrical wires.',
          'Remain indoors in structurally solid rooms away from exposed exterior glass windows.'
        ],
        forecastHours: 24
      });
    }

    // 3. HEATWAVE HAZARD
    if (maxTemp >= 40) {
      const isCriticalHeat = maxTemp >= 43;
      candidates.push({
        disasterType: 'Heatwave',
        title: isCriticalHeat
          ? `CRITICAL EXTREME HEATWAVE WARNING: Temperatures Exceeding ${maxTemp}°C in ${areaName}`
          : `HIGH HEATWAVE ADVISORY: Dangerous Daytime Temperatures (${maxTemp}°C) in ${areaName}`,
        description: `Sustained hot-air mass creates extreme thermal stress conditions with peak temperature approaching ${maxTemp}°C. Severe vulnerability to heat stroke and dehydration.`,
        predictedRiskLevel: isCriticalHeat ? 'Critical' : 'High',
        confidenceScore: 0.91,
        weatherMetrics: {
          rainfallForecastMm: 0,
          peakWindSpeedKmh: peakWind,
          peakTemperatureC: maxTemp,
          atmosphericPressureHpa: currentWeather.pressure || 1012,
          floodRiskIndex: 5
        },
        safetyPrecautions: [
          'Avoid direct sun exposure and strenuous outdoor activity between 11:30 AM and 4:30 PM.',
          'Maintain high hydration with oral rehydration solution (ORS), water, and electrolyte fluids.',
          'Check on elderly neighbors, outdoor laborers, and pets.'
        ],
        forecastHours: 48
      });
    }

    // 4. SEVERE THUNDERSTORM / HAILSTORM
    if (weatherCode === 95 || weatherCode === 96 || weatherCode === 99) {
      candidates.push({
        disasterType: 'Severe Thunderstorm',
        title: `HIGH SEVERE THUNDERSTORM & LIGHTNING SQUALL ALERT: ${areaName}`,
        description: `Active convective supercell detected with frequent cloud-to-ground lightning discharge and potential hail activity.`,
        predictedRiskLevel: 'High',
        confidenceScore: 0.89,
        weatherMetrics: {
          rainfallForecastMm: total48hRainfall,
          peakWindSpeedKmh: peakWind,
          peakTemperatureC: maxTemp,
          atmosphericPressureHpa: currentWeather.pressure || 1008,
          floodRiskIndex: 60
        },
        safetyPrecautions: [
          'Take shelter inside substantial enclosed buildings or hard-topped vehicles immediately.',
          'Never seek shelter beneath solitary trees or elevated open metallic structures.',
          'Unplug sensitive electronic appliances and stay away from plumbing fixtures during lightning.'
        ],
        forecastHours: 12
      });
    }

    // If no candidate met threshold, return baseline low-risk assessment
    if (candidates.length === 0) {
      candidates.push({
        disasterType: 'Heavy Rainfall',
        title: `LOW RISK METEOROLOGICAL MONITORING: ${areaName}`,
        description: `Standard seasonal weather conditions observed. No immediate severe meteorological disaster thresholds exceeded.`,
        predictedRiskLevel: 'Low',
        confidenceScore: 0.95,
        weatherMetrics: {
          rainfallForecastMm: total48hRainfall,
          peakWindSpeedKmh: peakWind,
          peakTemperatureC: maxTemp,
          atmosphericPressureHpa: currentWeather.pressure || 1013,
          floodRiskIndex: 12
        },
        safetyPrecautions: [
          'Regular seasonal awareness. Check weather app before travel.'
        ],
        forecastHours: 24
      });
    }

    // Pick candidate with highest risk severity
    const severityRank = { Critical: 4, High: 3, Moderate: 2, Low: 1 };
    candidates.sort((a, b) => severityRank[b.predictedRiskLevel] - severityRank[a.predictedRiskLevel]);
    const topCandidate = candidates[0];

    const now = new Date();
    const startTime = now;
    const endTime = new Date(now.getTime() + topCandidate.forecastHours * 3600000);
    const dateStr = now.toISOString().split('T')[0];

    // Deduplication Key: Type + Normalized Location + Forecast Day
    const dedupKey = `${topCandidate.disasterType.toUpperCase()}_${lat.toFixed(2)}_${lng.toFixed(2)}_${dateStr}_${topCandidate.predictedRiskLevel.toUpperCase()}`;

    return {
      predictionId: `pred_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      disasterType: topCandidate.disasterType,
      title: topCandidate.title,
      description: topCandidate.description,
      affectedArea: {
        name: areaName,
        center: { lat, lng },
        radiusKm: 25
      },
      predictedRiskLevel: topCandidate.predictedRiskLevel,
      confidenceScore: topCandidate.confidenceScore,
      predictionNature: 'RULE_BASED_AI_PREDICTION',
      forecastWindow: {
        startTime,
        endTime,
        durationHours: topCandidate.forecastHours
      },
      weatherMetrics: topCandidate.weatherMetrics,
      supportingDataSources: [
        'Open-Meteo Global Severe Weather Engine',
        'IMD Precipitation Grid Proxy',
        'Numerical Weather Hydrology Prediction Model'
      ],
      safetyPrecautions: topCandidate.safetyPrecautions,
      status: 'Predicted',
      operatorReview: {
        reviewed: false,
        reviewedBy: null,
        reviewedAt: null,
        notes: ''
      },
      deduplicationKey: dedupKey,
      expiresAt: endTime,
      auditLogs: [
        {
          action: 'PREDICTION_GENERATED',
          operatorOrSystem: 'ResQAI Automated Disaster Prediction Engine',
          timestamp: now,
          details: `Evaluated live meteorological telemetry for ${areaName}. Predicted ${topCandidate.predictedRiskLevel} ${topCandidate.disasterType} risk with ${Math.round(topCandidate.confidenceScore * 100)}% confidence.`
        }
      ]
    };
  }

  /**
   * Evaluates all monitored regions, persists new predictions, and triggers automatic emails
   */
  async evaluateAllRegions(io = null, forceNotify = false) {
    console.log('[DisasterPredictionService] 🛰️ Running multi-zone disaster prediction scan...');
    const results = [];

    for (const region of MONITORED_REGIONS) {
      try {
        const evalData = await this.evaluateLocationRisk(region.lat, region.lng, region.name);

        // Check for deduplication: do we already have an active unexpired prediction with this key?
        let existing = null;
        if (DisasterPrediction) {
          existing = await DisasterPrediction.findOne({
            deduplicationKey: evalData.deduplicationKey,
            expiresAt: { $gt: new Date() }
          });
        }

        if (existing) {
          console.log(`[DisasterPredictionService] ℹ️ Duplicate prediction suppressed for ${region.name} (${evalData.deduplicationKey}).`);
          
          // Check if this existing prediction was never notified and meets threshold, or if forceNotify is active
          const thresholdMet = emailNotificationService.isThresholdMet(existing.predictedRiskLevel);
          if ((thresholdMet || forceNotify) && 
              emailNotificationService.getConfig().autoEmailEnabled && 
              !existing.emailNotification?.triggered) {
            console.log(`[DisasterPredictionService] ⚡ Un-notified qualifying prediction ${existing.predictionId} now triggering alerts!`);
            emailNotificationService.dispatchDisasterWarningCampaign(existing, io, { forceNotify });
          }

          results.push(existing);
          continue;
        }

        // Persist new prediction in MongoDB
        let savedPrediction = null;
        if (DisasterPrediction) {
          savedPrediction = new DisasterPrediction(evalData);
          await savedPrediction.save();
        } else {
          savedPrediction = evalData;
        }

        console.log(`[DisasterPredictionService] 🎯 Generated prediction ${savedPrediction.predictionId}: ${savedPrediction.predictedRiskLevel} ${savedPrediction.disasterType} in ${region.name}`);

        // Broadcast to connected clients over Socket.IO
        if (io) {
          io.emit('prediction:new', savedPrediction);
        }

        // Check threshold for automated email alerts
        const thresholdMet = emailNotificationService.isThresholdMet(savedPrediction.predictedRiskLevel);
        if ((thresholdMet || forceNotify) && emailNotificationService.getConfig().autoEmailEnabled) {
          // Trigger automated email campaign to all registered users asynchronously
          emailNotificationService.dispatchDisasterWarningCampaign(savedPrediction, io, { forceNotify });
        }

        results.push(savedPrediction);
      } catch (err) {
        console.error(`[DisasterPredictionService] Error evaluating ${region.name}:`, err.message);
      }
    }

    return results;
  }

  /**
   * Operator review or confirmation of a prediction
   */
  async reviewPrediction(predictionId, reviewData, io = null) {
    const { operatorName, status, notes } = reviewData;
    const prediction = await DisasterPrediction.findOne({ predictionId });
    if (!prediction) throw new Error('Disaster prediction not found');

    prediction.operatorReview = {
      reviewed: true,
      reviewedBy: operatorName || 'Emergency Operator',
      reviewedAt: new Date(),
      notes: notes || ''
    };

    if (status) prediction.status = status;

    prediction.auditLogs.push({
      action: 'OPERATOR_REVIEW',
      operatorOrSystem: operatorName || 'Emergency Operator',
      timestamp: new Date(),
      details: `Operator reviewed prediction. Status set to ${prediction.status}. Notes: ${notes || 'None'}`
    });

    await prediction.save();

    if (io) {
      io.emit('prediction:updated', prediction);
    }

    return prediction;
  }
}

module.exports = new DisasterPredictionService();
