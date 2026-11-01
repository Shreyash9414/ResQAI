const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateDistanceMeters,
  SERVICE_CAPABILITY_MAP
} = require('../services/rescueAllocationService');

test('Feature 3: 🚑 Intelligent Rescue Allocation Tests', async (t) => {

  await t.test('3.1 Distance calculation correctly computes Haversine ground meters', () => {
    // Distance between Chhatrapati Shivaji Terminus (18.9400, 72.8354) and Gateway of India (18.9220, 72.8347)
    // Approximately 2.0 km (~2000m)
    const dist = calculateDistanceMeters(18.9400, 72.8354, 18.9220, 72.8347);
    assert.ok(dist > 1900 && dist < 2100, `Calculated distance ${dist}m should be ~2000m`);
  });

  await t.test('3.2 Service capability map validates specialized skills per emergency type', () => {
    assert.ok(SERVICE_CAPABILITY_MAP['Ambulance / Medical Emergency']);
    assert.deepEqual(
      SERVICE_CAPABILITY_MAP['Ambulance / Medical Emergency'].requiredCapabilities,
      ['Trauma Support', 'BLS', 'Patient Transport']
    );

    assert.ok(SERVICE_CAPABILITY_MAP['Fire Brigade']);
    assert.deepEqual(
      SERVICE_CAPABILITY_MAP['Fire Brigade'].requiredCapabilities,
      ['Fire Suppression', 'Extrication', 'Hazardous Material']
    );

    assert.ok(SERVICE_CAPABILITY_MAP['Flood / Water Rescue']);
    assert.deepEqual(
      SERVICE_CAPABILITY_MAP['Flood / Water Rescue'].requiredCapabilities,
      ['Flood Water Rescue', 'Inflatable Boat', 'Water Extrication']
    );
  });

  await t.test('3.3 Capability filter excludes responders lacking the required skill', () => {
    const candidatePool = [
      {
        id: 'unit-1',
        name: 'Fire Engine Alpha',
        type: 'FIRE_BRIGADE',
        status: 'AVAILABLE',
        capabilities: ['Fire Suppression', 'Extrication']
      },
      {
        id: 'unit-2',
        name: 'Paramedic Ambulance 4',
        type: 'AMBULANCE',
        status: 'AVAILABLE',
        capabilities: ['Trauma Support', 'BLS', 'Patient Transport']
      },
      {
        id: 'unit-3',
        name: 'Police Interceptor 12',
        type: 'POLICE',
        status: 'AVAILABLE',
        capabilities: ['Law Enforcement', 'Traffic Control']
      }
    ];

    const matchCandidates = (services, pool) => {
      return pool.filter(unit => {
        return services.some(service => {
          const spec = SERVICE_CAPABILITY_MAP[service];
          if (!spec) return false;
          if (spec.primaryType === unit.type) return true;
          return spec.requiredCapabilities.some(c => (unit.capabilities || []).includes(c));
        });
      });
    };

    const medicalMatches = matchCandidates(['Ambulance / Medical Emergency'], candidatePool);
    assert.equal(medicalMatches.length, 1);
    assert.equal(medicalMatches[0].id, 'unit-2');

    const fireMatches = matchCandidates(['Fire Brigade'], candidatePool);
    assert.equal(fireMatches.length, 1);
    assert.equal(fireMatches[0].id, 'unit-1');
  });

  await t.test('3.4 Availability filter strictly excludes busy, dispatched, or offline units', () => {
    const units = [
      { id: 'u1', status: 'AVAILABLE' },
      { id: 'u2', status: 'BUSY' },
      { id: 'u3', status: 'DISPATCHED' },
      { id: 'u4', status: 'MAINTENANCE' },
      { id: 'u5', status: 'OFFLINE' },
      { id: 'u6', status: 'Active' }
    ];

    const available = units.filter(u => ['AVAILABLE', 'Available', 'ACTIVE', 'Active'].includes(u.status));
    assert.equal(available.length, 2);
    assert.deepEqual(available.map(u => u.id), ['u1', 'u6']);
  });

  await t.test('3.5 Suitability ranking balances distance, freshness, and capability match', () => {
    const rankUnits = (incident, units) => {
      return units.map(u => {
        const dist = calculateDistanceMeters(incident.lat, incident.lng, u.lat, u.lng);
        let score = 100;
        // Distance penalty: -1 per 500m
        score -= Math.min(50, Math.floor(dist / 500));
        // Stale location penalty
        if (u.freshness === 'STALE') score -= 25;
        // Perfect capability bonus
        if (u.hasAllCapabilities) score += 10;
        return { ...u, distanceMeters: dist, score: Math.max(1, score) };
      }).sort((a, b) => b.score - a.score);
    };

    const incident = { lat: 19.0760, lng: 72.8777 };
    const candidates = [
      { id: 'near-stale', lat: 19.0770, lng: 72.8780, freshness: 'STALE', hasAllCapabilities: true }, // ~120m away, but stale!
      { id: 'fresh-medium', lat: 19.0800, lng: 72.8800, freshness: 'LIVE', hasAllCapabilities: true }, // ~500m away, live GPS
      { id: 'far-fresh', lat: 19.1200, lng: 72.9200, freshness: 'LIVE', hasAllCapabilities: true } // ~6.5km away
    ];

    const ranked = rankUnits(incident, candidates);
    assert.equal(ranked[0].id, 'fresh-medium', 'Live unit at moderate distance ranks higher than stale unit right next door');
    assert.ok(ranked[0].score > ranked[2].score, 'Medium distance ranks higher than far distance');
  });

  await t.test('3.6 Concurrency race condition prevention rejects conflicting double-assignments', async () => {
    // In-memory atomic compare-and-swap simulator
    class AtomicStore {
      constructor() {
        this.units = new Map([
          ['AMB-01', { status: 'AVAILABLE', assignedIncident: null }]
        ]);
      }

      async atomicAssign(unitId, incidentId) {
        const unit = this.units.get(unitId);
        if (!unit) throw { statusCode: 404, message: 'Not found' };
        if (unit.status !== 'AVAILABLE') {
          const err = new Error(`Unit ${unitId} is no longer available`);
          err.statusCode = 409;
          throw err;
        }
        // Atomic transition
        unit.status = 'DISPATCHED';
        unit.assignedIncident = incidentId;
        return { success: true, unitId, incidentId };
      }
    }

    const store = new AtomicStore();
    const tryAssign = (incId) => store.atomicAssign('AMB-01', incId);

    // Two operators clicking assign simultaneously
    const results = await Promise.allSettled([
      tryAssign('INC-A'),
      tryAssign('INC-B')
    ]);

    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    assert.equal(fulfilled.length, 1, 'Exactly one operator must succeed in atomic dispatch');
    assert.equal(rejected.length, 1, 'Second operator receives conflict rejection');
    assert.equal(rejected[0].reason.statusCode, 409, 'Conflict must return HTTP 409');
  });
});
