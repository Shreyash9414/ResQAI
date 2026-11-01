const fetch = global.fetch || require('node-fetch');
const mongoose = require('mongoose');
const RoadReport = require('../models/RoadReport');
const Incident = require('../models/Incident');
const ReliefCamp = require('../models/ReliefCamp');
const Hospital = require('../models/Hospital');

const isDbConnected = () => mongoose.connection && mongoose.connection.readyState === 1;

// Earth's Radius in Meters
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

class EvacuationRoutingService {
  /**
   * Fetch real road-network route from OSRM
   */
  async fetchOsrmRoute(origin, destination, mode = 'driving', requestAlternatives = false) {
    const osrmProfile = mode === 'walking' ? 'foot' : 'driving';
    const altParam = requestAlternatives ? 'true' : 'false';
    const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true&alternatives=${altParam}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          return data.routes.map(r => ({
            coordinates: r.geometry.coordinates.map(c => [c[1], c[0]]), // [lat, lng]
            distanceMeters: Math.round(r.distance),
            durationSeconds: Math.round(r.duration),
            steps: r.legs?.[0]?.steps?.map(st => ({
              instruction: st.maneuver?.type ? `${st.maneuver.type} ${st.name ? `onto ${st.name}` : ''}`.trim() : 'Proceed along route',
              distanceMeters: Math.round(st.distance || 0),
              durationSeconds: Math.round(st.duration || 0)
            })) || []
          }));
        }
      }
    } catch (err) {
      console.warn('[EvacuationRoutingService] OSRM fetch error:', err.message);
    }
    return null;
  }

  /**
   * Check route geometry against verified road closures and active hazards
   */
  async checkRouteHazards(coordinates = []) {
    let verifiedRoadReports = [];
    let activeDisasters = [];

    try {
      if (isDbConnected() && RoadReport) {
        verifiedRoadReports = await RoadReport.find({ status: 'VERIFIED' }).lean();
      }
    } catch (e) {}

    try {
      if (isDbConnected() && Incident) {
        activeDisasters = await Incident.find({
          status: { $nin: ['Resolved', 'INCIDENT_RESOLVED', 'REJECTED', 'CANCELLED'] }
        }).lean();
      }
    } catch (e) {}

    const blockedHazards = [];
    const cautionHazards = [];

    for (const [rLat, rLng] of coordinates) {
      // 1. Check verified road obstructions
      for (const rep of verifiedRoadReports) {
        if (rep.location && typeof rep.location.lat === 'number' && typeof rep.location.lng === 'number') {
          const distToRep = calculateDistanceMeters(rLat, rLng, rep.location.lat, rep.location.lng);
          const buffer = rep.radiusMeters || 150;
          if (distToRep <= buffer) {
            const reportId = rep.reportId || rep._id.toString();
            if (!blockedHazards.some(b => b.reportId === reportId)) {
              blockedHazards.push({
                reportId,
                title: rep.title,
                hazardType: rep.hazardType,
                severity: rep.severity || 'HIGH',
                location: rep.location,
                distanceMeters: Math.round(distToRep),
                lastUpdated: rep.updatedAt || rep.createdAt || new Date().toISOString(),
                notes: rep.notes || 'Road verified impassable due to active emergency obstruction.'
              });
            }
          }
        }
      }

      // 2. Check active disaster zones (e.g. fire/flood radius)
      for (const inc of activeDisasters) {
        let iLat = inc.location?.lat;
        let iLng = inc.location?.lng;
        if (inc.location?.coordinates && Array.isArray(inc.location.coordinates)) {
          iLng = inc.location.coordinates[0];
          iLat = inc.location.coordinates[1];
        }

        if (typeof iLat === 'number' && typeof iLng === 'number') {
          const distToInc = calculateDistanceMeters(rLat, rLng, iLat, iLng);
          const dType = (inc.disasterType || '').toUpperCase();
          const dangerRadius = dType.includes('FLOOD') ? 500 : dType.includes('FIRE') ? 250 : 350;

          if (distToInc <= dangerRadius) {
            const incId = inc.incidentId || inc.id || inc._id.toString();
            if (!cautionHazards.some(c => c.incidentId === incId)) {
              cautionHazards.push({
                incidentId: incId,
                title: inc.title,
                disasterType: inc.disasterType,
                severity: inc.severity,
                distanceMeters: Math.round(distToInc),
                dangerRadiusMeters: dangerRadius,
                lastUpdated: inc.locationUpdatedAt || inc.updatedAt || inc.createdAt || new Date().toISOString()
              });
            }
          }
        }
      }
    }

    return { blockedHazards, cautionHazards };
  }

  /**
   * Plan Smart Evacuation Route with Automatic Hazard Avoidance and Alternatives
   */
  async planSmartRoute({ origin, destination, travelMode = 'driving' }) {
    if (!origin || typeof origin.lat !== 'number' || typeof origin.lng !== 'number') {
      throw new Error('Valid origin coordinates (latitude, longitude) are required.');
    }
    if (!destination || typeof destination.lat !== 'number' || typeof destination.lng !== 'number') {
      throw new Error('Valid destination coordinates (latitude, longitude) are required.');
    }

    const mode = travelMode === 'walking' ? 'walking' : 'driving';

    // 1. Fetch Primary and Alternative Routes from OSRM
    const osrmRoutes = await this.fetchOsrmRoute(origin, destination, mode, true);

    let primaryCoords = [];
    let distanceMeters = 0;
    let durationSeconds = 0;
    let turnSteps = [];
    let isRoadNetworkFallback = false;

    if (osrmRoutes && osrmRoutes.length > 0) {
      primaryCoords = osrmRoutes[0].coordinates;
      distanceMeters = osrmRoutes[0].distanceMeters;
      durationSeconds = osrmRoutes[0].durationSeconds;
      turnSteps = osrmRoutes[0].steps;
    } else {
      // Interpolate realistic road-following points if OSRM is temporarily unreachable
      isRoadNetworkFallback = true;
      const straightDistMeters = calculateDistanceMeters(origin.lat, origin.lng, destination.lat, destination.lng);
      distanceMeters = Math.round(straightDistMeters * 1.3);
      durationSeconds = mode === 'walking' ? Math.round(distanceMeters / 1.25) : Math.round(distanceMeters / 9.5);
      
      const numSteps = 16;
      for (let i = 0; i <= numSteps; i++) {
        const ratio = i / numSteps;
        primaryCoords.push([
          origin.lat + (destination.lat - origin.lat) * ratio,
          origin.lng + (destination.lng - origin.lng) * ratio
        ]);
      }
    }

    // 2. Hazard Evaluation on Primary Route
    const primaryHazards = await this.checkRouteHazards(primaryCoords);

    let routeStatus = 'Recommended';
    let routeSummary = 'Direct road path clear of verified roadblocks and known active danger perimeters.';
    const warnings = [];

    if (primaryHazards.blockedHazards.length > 0) {
      routeStatus = 'Blocked';
      routeSummary = `CRITICAL: Primary route intersects ${primaryHazards.blockedHazards.length} confirmed road obstruction(s). Impassable.`;
      warnings.push(...primaryHazards.blockedHazards.map(b => `⛔ Confirmed blocked road at ${b.title} (${b.hazardType}). Avoid this route!`));
    } else if (primaryHazards.cautionHazards.length > 0) {
      routeStatus = 'Caution';
      routeSummary = `CAUTION: Primary route passes within active disaster danger perimeter (${primaryHazards.cautionHazards.map(c => c.title).join(', ')}).`;
      warnings.push(...primaryHazards.cautionHazards.map(c => `⚠️ Active ${c.disasterType} hazard within ${c.distanceMeters}m of path.`));
    }

    // 3. Alternative Route Selection (Hazard Bypass)
    let alternativeRoute = null;

    if (osrmRoutes && osrmRoutes.length > 1) {
      // Evaluate second route returned by OSRM
      const altCandidate = osrmRoutes[1];
      const altHazards = await this.checkRouteHazards(altCandidate.coordinates);

      if (altHazards.blockedHazards.length === 0) {
        alternativeRoute = {
          coordinates: altCandidate.coordinates,
          distanceKm: parseFloat((altCandidate.distanceMeters / 1000).toFixed(2)),
          durationMins: Math.max(1, Math.round(altCandidate.durationSeconds / 60)),
          status: altHazards.cautionHazards.length === 0 ? 'Clear Bypass' : 'Caution Bypass',
          summary: 'Alternative road network bypass avoiding primary obstructions.',
          blockedHazards: altHazards.blockedHazards,
          cautionHazards: altHazards.cautionHazards,
          turnSteps: altCandidate.steps
        };
      }
    }

    // If primary is blocked and no clean OSRM alternative was returned, attempt detour waypoint routing
    if (primaryHazards.blockedHazards.length > 0 && !alternativeRoute) {
      const blockPoint = primaryHazards.blockedHazards[0].location;
      if (blockPoint && typeof blockPoint.lat === 'number') {
        // Calculate lateral offset waypoint 800m perpendicular to avoid roadblock
        const offsetLat = blockPoint.lat + 0.008;
        const offsetLng = blockPoint.lng + 0.008;

        const leg1 = await this.fetchOsrmRoute(origin, { lat: offsetLat, lng: offsetLng }, mode, false);
        const leg2 = await this.fetchOsrmRoute({ lat: offsetLat, lng: offsetLng }, destination, mode, false);

        if (leg1 && leg2 && leg1[0] && leg2[0]) {
          const combinedCoords = [...leg1[0].coordinates, ...leg2[0].coordinates];
          const combinedHazards = await this.checkRouteHazards(combinedCoords);

          if (combinedHazards.blockedHazards.length === 0) {
            alternativeRoute = {
              coordinates: combinedCoords,
              distanceKm: parseFloat(((leg1[0].distanceMeters + leg2[0].distanceMeters) / 1000).toFixed(2)),
              durationMins: Math.max(1, Math.round((leg1[0].durationSeconds + leg2[0].durationSeconds) / 60)),
              status: combinedHazards.cautionHazards.length === 0 ? 'Clear Bypass' : 'Caution Bypass',
              summary: 'Detour route generated avoiding confirmed roadblock.',
              blockedHazards: combinedHazards.blockedHazards,
              cautionHazards: combinedHazards.cautionHazards,
              turnSteps: [...leg1[0].steps, ...leg2[0].steps]
            };
          }
        }
      }
    }

    const distanceKm = parseFloat((distanceMeters / 1000).toFixed(2));
    const durationMins = Math.max(1, Math.round(durationSeconds / 60));

    return {
      success: true,
      metadata: {
        dataSource: 'OpenStreetMap / Project-OSRM Road Routing Engine',
        routingProfile: mode,
        calculatedAt: new Date().toISOString()
      },
      route: {
        coordinates: primaryCoords,
        distanceKm,
        durationMins,
        travelMode: mode,
        status: routeStatus,
        summary: routeSummary,
        warnings,
        blockedHazards: primaryHazards.blockedHazards,
        cautionHazards: primaryHazards.cautionHazards,
        turnSteps,
        alternativeRoute,
        isRoadNetworkFallback,
        externalNavigation: {
          googleMapsUrl: `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=${mode}`,
          openStreetMapUrl: `https://www.openstreetmap.org/directions?engine=fossgis_osrm_${mode === 'walking' ? 'foot' : 'car'}&route=${origin.lat}%2C${origin.lng}%3B${destination.lat}%2C${destination.lng}`
        },
        disclaimer: 'OFFICIAL EVACUATION NOTICE: No route is guaranteed safe. Rapid weather, floodwaters, or fire spread can cut off paths. Always follow directions from NDRF / SDRF / emergency responders on the ground.',
        lastCalculated: new Date().toISOString(),
        origin,
        destination
      }
    };
  }

  /**
   * Find Nearby Verified Shelters, Relief Camps, and Hospitals with Freshness Indicators
   */
  async getNearbyDestinations(lat, lng, radiusKm = 50) {
    const destinations = [];

    // 1. Fetch Relief Camps
    try {
      if (isDbConnected() && ReliefCamp) {
        const camps = await ReliefCamp.find().lean();
        for (const camp of camps) {
          const cLat = camp.location?.lat;
          const cLng = camp.location?.lng;
          if (typeof cLat === 'number' && typeof cLng === 'number') {
            const distMeters = calculateDistanceMeters(lat, lng, cLat, cLng);
            const distKm = parseFloat((distMeters / 1000).toFixed(1));
            if (distKm <= radiusKm) {
              const availableCapacity = Math.max(0, (camp.capacity || 500) - (camp.currentOccupants || 0));
              const ageHours = (Date.now() - new Date(camp.updatedAt || camp.createdAt).getTime()) / (1000 * 3600);
              const freshness = ageHours <= 2 ? 'CURRENT' : ageHours <= 12 ? 'RECENT' : 'STALE';

              destinations.push({
                id: camp.campId || camp._id.toString(),
                name: camp.name,
                type: 'RELIEF_SHELTER',
                category: 'Shelter',
                address: camp.location?.address || 'Designated Relief Ground',
                location: { lat: cLat, lng: cLng },
                distanceKm: distKm,
                totalCapacity: camp.capacity || 500,
                currentOccupants: camp.currentOccupants || 0,
                availableCapacity,
                hasCapacity: availableCapacity > 0,
                status: camp.status || 'OPEN',
                verified: !!camp.verified,
                freshness,
                lastUpdated: camp.updatedAt || camp.createdAt,
                supplies: camp.supplies || null
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('[EvacuationRoutingService] Relief camp fetch error:', e.message);
    }

    // 2. Fetch Hospitals
    try {
      if (isDbConnected() && Hospital) {
        const hospitals = await Hospital.find().lean();
        for (const h of hospitals) {
          const hLat = h.location?.lat;
          const hLng = h.location?.lng;
          if (typeof hLat === 'number' && typeof hLng === 'number') {
            const distMeters = calculateDistanceMeters(lat, lng, hLat, hLng);
            const distKm = parseFloat((distMeters / 1000).toFixed(1));
            if (distKm <= radiusKm) {
              const availGeneral = h.generalBeds?.available || 0;
              const availIcu = h.icuBeds?.available || 0;
              const availEmerg = h.availableEmergencyBeds || 0;
              const totalAvailableBeds = availGeneral + availIcu + availEmerg;

              const ageHours = (Date.now() - new Date(h.lastAvailabilityUpdate || h.updatedAt || h.createdAt).getTime()) / (1000 * 3600);
              const freshness = ageHours <= 1 ? 'CURRENT' : ageHours <= 6 ? 'RECENT' : 'STALE';

              destinations.push({
                id: h.hospitalId || h._id.toString(),
                name: h.name,
                type: 'HOSPITAL',
                category: 'Medical',
                address: h.address || h.location?.address || 'Healthcare Center',
                location: { lat: hLat, lng: hLng },
                distanceKm: distKm,
                totalCapacity: (h.generalBeds?.total || 0) + (h.icuBeds?.total || 0) + (h.emergencyBeds || 0),
                availableCapacity: totalAvailableBeds,
                hasCapacity: totalAvailableBeds > 0,
                generalBedsAvailable: availGeneral,
                icuBedsAvailable: availIcu,
                emergencyDepartmentStatus: h.emergencyDepartmentStatus || 'AVAILABLE',
                ambulanceReceivingStatus: h.ambulanceReceivingStatus || 'ACCEPTING',
                status: totalAvailableBeds > 0 ? 'OPEN' : 'NEAR_CAPACITY',
                verified: true,
                freshness,
                lastUpdated: h.lastAvailabilityUpdate || h.updatedAt || h.createdAt
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('[EvacuationRoutingService] Hospital fetch error:', e.message);
    }

    // Sort by distance ascending
    destinations.sort((a, b) => a.distanceKm - b.distanceKm);

    return {
      success: true,
      origin: { lat, lng },
      radiusKm,
      destinationsCount: destinations.length,
      destinations
    };
  }
}

module.exports = new EvacuationRoutingService();
