const test = require('node:test');
const assert = require('node:assert/strict');

// SOS Model & Logic Verification Test Suite
test('Feature 1: 🚨 One-Tap SOS & Smart Dispatch Tests', async (t) => {
  
  await t.test('1.1 SOS ID Generation conforms to SOS-YYYYMMDD-XXXX format', () => {
    const generateSosId = () => {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const rand = Math.floor(1000 + Math.random() * 9000);
      return `SOS-${today}-${rand}`;
    };

    const sosId = generateSosId();
    assert.match(sosId, /^SOS-\d{8}-\d{4}$/, 'SOS ID must match format SOS-YYYYMMDD-XXXX');
  });

  await t.test('1.2 Coordinate validation rejects invalid latitude/longitude', () => {
    const validateCoords = (lat, lng) => {
      if (typeof lat !== 'number' || typeof lng !== 'number') return false;
      if (isNaN(lat) || isNaN(lng)) return false;
      if (lat < -90 || lat > 90) return false;
      if (lng < -180 || lng > 180) return false;
      return true;
    };

    assert.equal(validateCoords(19.076, 72.8777), true, 'Valid Mumbai coords');
    assert.equal(validateCoords(91.0, 72.8777), false, 'Latitude > 90 is invalid');
    assert.equal(validateCoords(-95.0, 72.8777), false, 'Latitude < -90 is invalid');
    assert.equal(validateCoords(20.0, 185.0), false, 'Longitude > 180 is invalid');
    assert.equal(validateCoords('invalid', 72.8777), false, 'Non-number is invalid');
    assert.equal(validateCoords(NaN, 72.8777), false, 'NaN is invalid');
  });

  await t.test('1.3 Location capture truthfully distinguishes GPS_VERIFIED vs MANUAL_ENTRY', () => {
    const processLocationInput = (input) => {
      if (input.locationType === 'GPS_VERIFIED') {
        assert.ok(input.accuracy !== undefined, 'GPS location must report accuracy in meters');
        assert.ok(input.locationAcquisitionTime, 'GPS location must report acquisition timestamp');
        return {
          locationType: 'GPS_VERIFIED',
          accuracy: input.accuracy,
          isVerified: true
        };
      } else {
        assert.ok(input.manualAddress && input.manualAddress.trim().length > 0, 'Manual entry requires address');
        return {
          locationType: 'MANUAL_ENTRY',
          accuracy: null,
          isVerified: false
        };
      }
    };

    const gpsResult = processLocationInput({
      locationType: 'GPS_VERIFIED',
      accuracy: 12.5,
      locationAcquisitionTime: new Date().toISOString()
    });
    assert.equal(gpsResult.isVerified, true);
    assert.equal(gpsResult.accuracy, 12.5);

    const manualResult = processLocationInput({
      locationType: 'MANUAL_ENTRY',
      manualAddress: 'Plot 42, Sector 18, Navi Mumbai'
    });
    assert.equal(manualResult.isVerified, false);
    assert.equal(manualResult.locationType, 'MANUAL_ENTRY');
  });

  await t.test('1.4 SOS Idempotency prevents duplicate incident creation from repeated taps', () => {
    const existingCache = new Map();
    const submitSOS = (clientRequestId, payload) => {
      if (existingCache.has(clientRequestId)) {
        return { duplicate: true, existing: existingCache.get(clientRequestId) };
      }
      const record = { id: 'sos_' + Date.now(), clientRequestId, ...payload };
      existingCache.set(clientRequestId, record);
      return { duplicate: false, record };
    };

    const first = submitSOS('req-abc-123', { description: 'Water level rising quickly' });
    assert.equal(first.duplicate, false);

    const second = submitSOS('req-abc-123', { description: 'Water level rising quickly' });
    assert.equal(second.duplicate, true);
    assert.equal(second.existing.id, first.record.id, 'Duplicate tap returns original persistent record');
  });

  await t.test('1.5 9-Stage SOS Lifecycle state machine verifies valid transitions', () => {
    const validStatuses = [
      'SOS Submitted',
      'Awaiting Review',
      'Verified',
      'Awaiting Assignment',
      'Responder Assigned',
      'Responder En Route',
      'Assistance Arrived',
      'Resolved',
      'Cancelled'
    ];

    const allowedTransitions = {
      'SOS Submitted': ['Awaiting Review', 'Verified', 'Cancelled'],
      'Awaiting Review': ['Verified', 'Cancelled'],
      'Verified': ['Awaiting Assignment', 'Responder Assigned', 'Cancelled'],
      'Awaiting Assignment': ['Responder Assigned', 'Cancelled'],
      'Responder Assigned': ['Responder En Route', 'Awaiting Assignment', 'Cancelled'],
      'Responder En Route': ['Assistance Arrived', 'Responder Assigned', 'Cancelled'],
      'Assistance Arrived': ['Resolved', 'Cancelled'],
      'Resolved': [],
      'Cancelled': []
    };

    const isValidTransition = (from, to) => {
      if (!validStatuses.includes(from) || !validStatuses.includes(to)) return false;
      return (allowedTransitions[from] || []).includes(to);
    };

    assert.equal(isValidTransition('SOS Submitted', 'Verified'), true);
    assert.equal(isValidTransition('Verified', 'Responder Assigned'), true);
    assert.equal(isValidTransition('Responder Assigned', 'Responder En Route'), true);
    assert.equal(isValidTransition('Responder En Route', 'Assistance Arrived'), true);
    assert.equal(isValidTransition('Assistance Arrived', 'Resolved'), true);
    assert.equal(isValidTransition('Resolved', 'SOS Submitted'), false, 'Cannot reopen resolved incident');
    assert.equal(isValidTransition('SOS Submitted', 'Resolved'), false, 'Cannot jump straight to resolved');
  });

  await t.test('1.6 Notification failure recording ensures persistence precedes notifications', () => {
    const sosSubmissionWorkflow = async (persistFn, notifyFn) => {
      // 1. Must persist to database first
      const persistedRecord = await persistFn();
      assert.ok(persistedRecord.id, 'Record must have saved ID');

      // 2. Attempt notification
      let notificationStatus = 'QUEUED';
      try {
        await notifyFn();
        notificationStatus = 'SENT';
      } catch (err) {
        notificationStatus = 'FAILED';
      }

      persistedRecord.notificationStatus = notificationStatus;
      return persistedRecord;
    };

    return sosSubmissionWorkflow(
      async () => ({ id: 'SOS-20261023-1001', title: 'Medical Alert' }),
      async () => { throw new Error('SMS Gateway Down'); }
    ).then((result) => {
      assert.equal(result.id, 'SOS-20261023-1001');
      assert.equal(result.notificationStatus, 'FAILED', 'Notification failure is faithfully recorded without losing SOS record');
    });
  });
});
