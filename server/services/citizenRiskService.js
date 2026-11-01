const fs = require('fs');
const path = require('path');

// Load precautions JSON dataset
let localPrecautions = {};
try {
  const jsonPath = path.join(__dirname, '../data/safetyPrecautions.json');
  if (fs.existsSync(jsonPath)) {
    localPrecautions = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  }
} catch (err) {
  console.warn('[CitizenRiskService] Could not load local safetyPrecautions.json:', err.message);
}

const DISASTER_RADIUS_CONFIG = {
  FIRE: 5000,             // 5 km
  CHEMICAL_SPILL: 10000,  // 10 km
  BUILDING_COLLAPSE: 3000,// 3 km
  FLOOD: 15000,           // 15 km
  LANDSLIDE: 10000,       // 10 km
  EARTHQUAKE: 30000,      // 30 km
  CYCLONE: 50000,         // 50 km
  TSUNAMI: 30000,         // 30 km
  ACCIDENT: 5000,         // 5 km
  DEFAULT: 10000          // 10 km
};

function getDisasterRadiusMeters(disasterType) {
  if (!disasterType) return DISASTER_RADIUS_CONFIG.DEFAULT;
  const key = disasterType.toUpperCase().replace(/\s+/g, '_');
  return DISASTER_RADIUS_CONFIG[key] || DISASTER_RADIUS_CONFIG.DEFAULT;
}

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function getPrecautionsForDisasterType(disasterType) {
  if (!disasterType) return localPrecautions.DEFAULT;
  const key = disasterType.toUpperCase().replace(/\s+/g, '_');
  return localPrecautions[key] || localPrecautions[disasterType.toUpperCase()] || localPrecautions.DEFAULT;
}

/**
 * Main function to evaluate all authenticated citizens against active disaster zones
 */
async function evaluateCitizensAtRisk(usersStore = [], incidentsStore = [], mongoModels = {}) {
  const { User, Incident, SafetyAlertLog, SafetyPrecaution } = mongoModels;

  // 1. Gather all active citizens with valid email and location
  let allUsers = [...usersStore];
  try {
    if (User) {
      const dbUsers = await User.find({ email: { $regex: /@/i } }).lean();
      dbUsers.forEach(dbU => {
        const idx = allUsers.findIndex(u => u.id === dbU._id.toString() || u.email === dbU.email);
        const normUser = {
          id: dbU.id || dbU._id.toString(),
          name: dbU.name || dbU.fullName || 'Citizen User',
          email: dbU.email,
          role: dbU.role || 'citizen',
          location: dbU.location || (dbU.location?.coordinates ? { lat: dbU.location.coordinates[1], lng: dbU.location.coordinates[0] } : null),
          locationAccuracy: dbU.locationAccuracy || dbU.accuracy || 10,
          locationUpdatedAt: dbU.updatedAt || dbU.locationUpdatedAt || new Date().toISOString()
        };
        if (idx !== -1) {
          allUsers[idx] = { ...allUsers[idx], ...normUser };
        } else {
          allUsers.push(normUser);
        }
      });
    }
  } catch (e) {
    console.warn('[CitizenRiskService] Mongo User fetch warning:', e.message);
  }

  // Filter only authenticated citizens with valid email
  const validCitizens = allUsers.filter(u => u.email && u.email.includes('@') && u.role !== 'operator' && u.role !== 'admin');

  // 2. Gather active disasters
  let activeDisasters = [...incidentsStore];
  try {
    if (Incident) {
      const dbIncidents = await Incident.find({ status: { $ne: 'INCIDENT_RESOLVED' } }).lean();
      dbIncidents.forEach(inc => {
        const idx = activeDisasters.findIndex(i => i.id === inc.id || i.incidentId === inc.incidentId);
        const normInc = {
          id: inc.id || inc._id.toString(),
          incidentId: inc.incidentId || inc.id,
          title: inc.title || `${inc.disasterType} Emergency`,
          disasterType: inc.disasterType || inc.type || 'FIRE',
          severity: inc.severity || 'HIGH',
          location: inc.location || (inc.location?.coordinates ? { lat: inc.location.coordinates[1], lng: inc.location.coordinates[0], address: inc.location.address } : null),
          createdAt: inc.createdAt
        };
        if (idx !== -1) {
          activeDisasters[idx] = { ...activeDisasters[idx], ...normInc };
        } else {
          activeDisasters.push(normInc);
        }
      });
    }
  } catch (e) {
    console.warn('[CitizenRiskService] Mongo Incident fetch warning:', e.message);
  }

  // 3. Fetch audit logs for email delivery status
  let alertLogs = [];
  try {
    if (SafetyAlertLog) {
      alertLogs = await SafetyAlertLog.find().sort({ sentAt: -1 }).lean();
    }
  } catch (e) {
    console.warn('[CitizenRiskService] Mongo SafetyAlertLog fetch warning:', e.message);
  }

  const citizensAtRisk = [];

  // 4. Calculate Risk per Citizen
  for (const citizen of validCitizens) {
    const cLat = citizen.location?.lat !== undefined ? citizen.location.lat : (citizen.latitude !== undefined ? citizen.latitude : null);
    const cLng = citizen.location?.lng !== undefined ? citizen.location.lng : (citizen.longitude !== undefined ? citizen.longitude : null);
    const accuracy = citizen.locationAccuracy || citizen.accuracy || 10;
    const updatedAt = citizen.locationUpdatedAt || new Date().toISOString();

    const locationUncertain = cLat === null || cLng === null || isNaN(cLat) || isNaN(cLng) || accuracy > 100;

    let nearestDisaster = null;
    let minDistanceMeters = Infinity;

    for (const disaster of activeDisasters) {
      const dLat = disaster.location?.lat !== undefined ? disaster.location.lat : (Array.isArray(disaster.location?.coordinates) ? disaster.location.coordinates[1] : null);
      const dLng = disaster.location?.lng !== undefined ? disaster.location.lng : (Array.isArray(disaster.location?.coordinates) ? disaster.location.coordinates[0] : null);

      if (dLat === null || dLng === null || isNaN(dLat) || isNaN(dLng)) continue;

      const dist = calculateDistanceMeters(cLat || 0, cLng || 0, dLat, dLng);
      if (dist < minDistanceMeters) {
        minDistanceMeters = dist;
        nearestDisaster = disaster;
      }
    }

    if (!nearestDisaster) continue;

    const disasterType = nearestDisaster.disasterType || nearestDisaster.type || 'DEFAULT';
    const radiusMeters = getDisasterRadiusMeters(disasterType);

    // Skip citizens outside the disaster risk radius unless location is uncertain
    if (minDistanceMeters > radiusMeters && !locationUncertain) continue;

    // Calculate Risk Level
    let riskLevel = 'LOW';
    if (locationUncertain) {
      riskLevel = 'UNCERTAIN';
    } else if (minDistanceMeters <= (radiusMeters * 0.20) || (minDistanceMeters <= 1000 && (nearestDisaster.severity === 'CRITICAL' || nearestDisaster.severity === 'Critical'))) {
      riskLevel = 'CRITICAL';
    } else if (minDistanceMeters <= (radiusMeters * 0.50)) {
      riskLevel = 'HIGH';
    } else if (minDistanceMeters <= (radiusMeters * 0.80)) {
      riskLevel = 'MEDIUM';
    } else {
      riskLevel = 'LOW';
    }

    // Determine safety email status from alert logs
    const citizenLogs = alertLogs.filter(l => l.citizenId === citizen.id || l.recipientEmail === citizen.email);
    let emailStatus = 'Not Sent';
    let lastAlertSentAt = null;

    if (citizenLogs.length > 0) {
      const latest = citizenLogs[0];
      emailStatus = latest.status || 'Sent';
      lastAlertSentAt = latest.sentAt || latest.createdAt;
    }

    const precautions = getPrecautionsForDisasterType(disasterType);

    citizensAtRisk.push({
      citizenId: citizen.id,
      name: citizen.name || 'Citizen User',
      email: citizen.email,
      latitude: cLat,
      longitude: cLng,
      locationAccuracy: accuracy,
      locationStatus: locationUncertain ? 'Location Uncertain' : 'Accurate GPS',
      lastLocationUpdate: updatedAt,
      nearestDisasterId: nearestDisaster.id || nearestDisaster.incidentId,
      disasterTitle: nearestDisaster.title || `${disasterType} Incident`,
      disasterType: disasterType,
      disasterSeverity: nearestDisaster.severity || 'CRITICAL',
      distanceMeters: minDistanceMeters,
      distanceKm: (minDistanceMeters / 1000).toFixed(1),
      radiusMeters: radiusMeters,
      riskLevel: riskLevel,
      emailStatus: emailStatus,
      lastAlertSentAt: lastAlertSentAt,
      precautions: precautions
    });
  }

  // Sort citizens by risk severity priority: CRITICAL > HIGH > MEDIUM > LOW > UNCERTAIN
  const priorityMap = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4, UNCERTAIN: 5 };
  citizensAtRisk.sort((a, b) => priorityMap[a.riskLevel] - priorityMap[b.riskLevel]);

  // Group summary counts
  const summary = {
    totalAtRisk: citizensAtRisk.length,
    criticalCount: citizensAtRisk.filter(c => c.riskLevel === 'CRITICAL').length,
    highCount: citizensAtRisk.filter(c => c.riskLevel === 'HIGH').length,
    mediumCount: citizensAtRisk.filter(c => c.riskLevel === 'MEDIUM').length,
    lowCount: citizensAtRisk.filter(c => c.riskLevel === 'LOW').length,
    uncertainCount: citizensAtRisk.filter(c => c.riskLevel === 'UNCERTAIN').length
  };

  return { summary, citizens: citizensAtRisk };
}

module.exports = {
  evaluateCitizensAtRisk,
  getPrecautionsForDisasterType,
  getDisasterRadiusMeters,
  DISASTER_RADIUS_CONFIG
};
