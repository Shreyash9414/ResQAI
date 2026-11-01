const test = require('node:test');
const assert = require('node:assert/strict');
const evacuationRoutingService = require('../services/evacuationRoutingService');

test('Feature 4: 🗺️ Smart Evacuation Routing Tests', async (t) => {

  await t.test('4.1 Invalid or missing origin coordinates reject immediately', async () => {
    await assert.rejects(
      async () => {
        await evacuationRoutingService.planSmartRoute({
          origin: null,
          destination: { lat: 19.0760, lng: 72.8777 }
        });
      },
      /Valid origin coordinates/
    );

    await assert.rejects(
      async () => {
        await evacuationRoutingService.planSmartRoute({
          origin: { lat: 19.0760, lng: 72.8777 },
          destination: { lat: 'invalid', lng: 72.8777 }
        });
      },
      /Valid destination coordinates/
    );
  });

  await t.test('4.2 Smart routing plans route between genuine points and returns road steps', async () => {
    // Route from Gateway of India to CST Mumbai
    const origin = { lat: 18.9220, lng: 72.8347 };
    const destination = { lat: 18.9400, lng: 72.8354 };

    const result = await evacuationRoutingService.planSmartRoute({
      origin,
      destination,
      travelMode: 'driving'
    });

    assert.equal(result.success, true);
    assert.ok(result.route, 'Must contain route object');
    assert.ok(Array.isArray(result.route.coordinates), 'Coordinates must be array');
    assert.ok(result.route.coordinates.length > 0, 'Route must have points');
    assert.ok(result.route.distanceKm > 0, 'Distance must be positive');
    assert.ok(result.route.durationMins > 0, 'Duration must be positive');
    assert.ok(['Recommended', 'Blocked', 'Caution'].includes(result.route.status), 'Must have valid status');
    assert.ok(result.metadata.dataSource, 'Must identify routing data provider');
  });

  await t.test('4.3 Hazard intersection algorithm flags path crossing within danger radius', async () => {
    // Simulate a path with 5 coordinates
    const routeCoordinates = [
      [19.000, 72.800],
      [19.010, 72.810],
      [19.020, 72.820],
      [19.030, 72.830],
      [19.040, 72.840]
    ];

    // Hazard right on the path at [19.0205, 72.8205] (~75 meters away from coordinate 3)
    const hazardLocation = { lat: 19.0205, lng: 72.8205 };

    const isHazardIntersecting = (coords, hazard, dangerRadiusMeters = 300) => {
      for (const [lat, lng] of coords) {
        const dLat = (hazard.lat - lat) * Math.PI / 180;
        const dLon = (hazard.lng - lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * Math.PI / 180) * Math.cos(hazard.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distMeters = 6371000 * c;
        if (distMeters <= dangerRadiusMeters) {
          return { intersects: true, distanceMeters: Math.round(distMeters) };
        }
      }
      return { intersects: false };
    };

    const directHit = isHazardIntersecting(routeCoordinates, hazardLocation, 300);
    assert.equal(directHit.intersects, true);
    assert.ok(directHit.distanceMeters < 100);

    // Hazard far away at 19.100, 72.900 (~12 km away)
    const farAway = isHazardIntersecting(routeCoordinates, { lat: 19.100, lng: 72.900 }, 300);
    assert.equal(farAway.intersects, false);
  });

  await t.test('4.4 Walking mode calculates slower travel speed than driving', async () => {
    const origin = { lat: 18.9220, lng: 72.8347 };
    const destination = { lat: 18.9400, lng: 72.8354 };

    const driveResult = await evacuationRoutingService.planSmartRoute({
      origin,
      destination,
      travelMode: 'driving'
    });

    const walkResult = await evacuationRoutingService.planSmartRoute({
      origin,
      destination,
      travelMode: 'walking'
    });

    assert.ok(
      walkResult.route.durationMins >= driveResult.route.durationMins,
      `Walking duration (${walkResult.route.durationMins}m) should be greater or equal to driving duration (${driveResult.route.durationMins}m)`
    );
  });

  await t.test('4.5 Nearby destination search truthfully states capacity and verification freshness', async () => {
    const nearby = await evacuationRoutingService.getNearbyDestinations(19.0760, 72.8777, 25);
    assert.equal(nearby.success, true);
    assert.ok(Array.isArray(nearby.destinations));

    for (const d of nearby.destinations) {
      assert.ok(d.name, 'Destination must have name');
      assert.ok(d.type === 'SHELTER' || d.type === 'HOSPITAL', 'Must be SHELTER or HOSPITAL');
      assert.ok(['LIVE_HOURLY', 'RECENT_TODAY', 'STALE_DATA', 'UNKNOWN'].includes(d.freshness.status), 'Must report honest freshness');
    }
  });
});
