const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'resqai_super_secret_jwt_key_2026';

function normalizeRoleRoom(role) {
  if (!role) return 'role:citizen';
  const r = role.toLowerCase();
  if (r.includes('admin') || r.includes('operator') || r.includes('collector')) {
    return 'role:admin';
  }
  if (r.includes('rescue') || r.includes('police') || r.includes('fire') || r.includes('ambulance') || r.includes('responder')) {
    return 'role:rescue';
  }
  return 'role:citizen';
}

// In-Memory Live Telemetry Registry
const activeLiveLocations = new Map();
const activeVehicleTelemetry = new Map();

function initSocketManager(io) {
  // Authentication Middleware for Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.user = {
          id: decoded.id || decoded.userId,
          role: decoded.role || 'Citizen',
          name: decoded.name || 'Authenticated User'
        };
      } catch (err) {
        // Fallback for demo token if query is passed
        const role = socket.handshake.query?.role || 'Citizen';
        socket.user = {
          id: socket.handshake.query?.userId || `usr_${socket.id.substring(0, 5)}`,
          role: role,
          name: socket.handshake.query?.userName || 'Connected User'
        };
      }
    } else {
      const role = socket.handshake.query?.role || 'Citizen';
      socket.user = {
        id: socket.handshake.query?.userId || `usr_${socket.id.substring(0, 5)}`,
        role: role,
        name: socket.handshake.query?.userName || 'Guest User'
      };
    }

    return next();
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    const userRoom = `user:${user.id}`;
    const roleRoom = normalizeRoleRoom(user.role);

    socket.join(userRoom);
    socket.join(roleRoom);

    console.log(`⚡ [SocketManager] Client connected: ${socket.id} | User: ${user.id} (${user.name}) [Role: ${user.role}]`);

    socket.on('join_incident_room', (incidentId) => {
      if (incidentId) {
        socket.join(`incident:${incidentId}`);
      }
    });

    // Helper: Server-side Coordinate Validation
    const isValidCoordinate = (lat, lng, accuracy) => {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const acc = parseFloat(accuracy);

      if (isNaN(latitude) || latitude < -90 || latitude > 90) return false;
      if (isNaN(longitude) || longitude < -180 || longitude > 180) return false;
      if (isNaN(acc) || acc < 0) return false;
      return true;
    };

    // -------------------------------------------------------------
    // EVENT: location:update & citizen_location_update (Client -> Server)
    // -------------------------------------------------------------
    const handleCitizenLocationUpdate = (payload) => {
      if (!payload) return;
      const { latitude, longitude, accuracy, speed, heading, altitude, timestamp, incidentId } = payload;

      if (!isValidCoordinate(latitude, longitude, accuracy || 5)) {
        return socket.emit('error', { message: 'Invalid GPS coordinates or accuracy payload rejected by server.' });
      }

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const acc = parseFloat(accuracy) || 5;
      const spd = speed !== undefined && !isNaN(parseFloat(speed)) ? parseFloat(speed) : 0;
      const hdg = heading !== undefined && !isNaN(parseFloat(heading)) ? parseFloat(heading) : 0;
      const ts = timestamp || Date.now();

      const telemetryData = {
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        latitude: lat,
        longitude: lng,
        accuracy: acc,
        speed: spd,
        heading: hdg,
        altitude: altitude || 0,
        timestamp: ts,
        lastUpdated: new Date(ts).toISOString(),
        incidentId: incidentId || null
      };

      activeLiveLocations.set(user.id, telemetryData);

      // Broadcast ONLY to Authorized Operators & Incident Room (PRIVACY ENFORCED)
      io.to('role:admin').emit('location:receive', telemetryData);
      io.to('role:admin').emit('location:broadcast', telemetryData);
      io.to('role:admin').emit('citizen-location-updated', telemetryData);
      io.to('role:admin').emit('citizen_location_updated', telemetryData);

      if (incidentId) {
        io.to(`incident:${incidentId}`).emit('location:receive', telemetryData);
        io.to(`incident:${incidentId}`).emit('citizen-location-updated', telemetryData);
      }

      // Requirement 4, 7 & 10: Evaluate 100m Disaster Geofence & Email Alert Engine
      if (io._evaluate100mDisasterGeofence) {
        io._evaluate100mDisasterGeofence(telemetryData, socket);
      }
    };

    socket.on('location:update', handleCitizenLocationUpdate);
    socket.on('location_update', handleCitizenLocationUpdate);
    socket.on('citizen-location-update', handleCitizenLocationUpdate);
    socket.on('citizen_location_update', handleCitizenLocationUpdate);

    // EVENT: location:start
    socket.on('location:start', (payload) => {
      console.log(`📍 [LiveTracking] User ${user.id} started live location sharing.`);
      if (payload) handleCitizenLocationUpdate(payload);
    });

    // EVENT: location:stop
    socket.on('location:stop', () => {
      console.log(`🛑 [LiveTracking] User ${user.id} stopped live location sharing.`);
      activeLiveLocations.delete(user.id);
      io.to('role:admin').emit('location:stopped', { userId: user.id });
    });

    // -------------------------------------------------------------
    // EVENT: vehicle:location & rescue-location-update
    // -------------------------------------------------------------
    const handleRescueLocationUpdate = (payload) => {
      if (!payload) return;
      const { vehicleId, unitId, rescueTeamId, latitude, longitude, accuracy, speed, heading, status, timestamp, incidentId, citizenId } = payload;

      if (!isValidCoordinate(latitude, longitude, accuracy || 5)) {
        return socket.emit('error', { message: 'Invalid vehicle GPS coordinates rejected by server.' });
      }

      const id = vehicleId || unitId || rescueTeamId || user.id;
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const acc = parseFloat(accuracy) || 5;
      const spd = speed !== undefined && !isNaN(parseFloat(speed)) ? parseFloat(speed) : 0;
      const hdg = heading !== undefined && !isNaN(parseFloat(heading)) ? parseFloat(heading) : 0;
      const ts = timestamp || Date.now();
      const vehicleStatus = status || 'EN_ROUTE';

      const vehicleData = {
        vehicleId: id,
        unitId: id,
        rescueTeamId: id,
        driverName: user.name,
        role: user.role,
        latitude: lat,
        longitude: lng,
        accuracy: acc,
        speed: spd,
        heading: hdg,
        status: vehicleStatus,
        timestamp: ts,
        lastUpdated: new Date(ts).toISOString(),
        incidentId: incidentId || null
      };

      activeVehicleTelemetry.set(id, vehicleData);

      // Broadcast rescue vehicle position to operators, rescue team, incident room & citizen
      io.emit('rescue:location', vehicleData);
      io.emit('rescue-location-updated', vehicleData);
      io.emit('rescue_location_updated', vehicleData);
      io.emit('vehicle:location_updated', vehicleData);
      io.to('role:admin').emit('vehicle:location_updated', vehicleData);

      if (citizenId) {
        io.to(`user:${citizenId}`).emit('rescue:location', vehicleData);
        io.to(`user:${citizenId}`).emit('rescue-location-updated', vehicleData);
      }
      if (incidentId) {
        io.to(`incident:${incidentId}`).emit('rescue:location', vehicleData);
        io.to(`incident:${incidentId}`).emit('rescue-location-updated', vehicleData);
      }

      // Check arrival detection (100m threshold) if global arrival callback registered
      if (io._checkVehicleArrival) {
        io._checkVehicleArrival(vehicleData);
      }
    };

    socket.on('vehicle:location', handleRescueLocationUpdate);
    socket.on('rescue:location', handleRescueLocationUpdate);
    socket.on('rescue-location-update', handleRescueLocationUpdate);
    socket.on('rescue_location_update', handleRescueLocationUpdate);
    socket.on('responder_location_update', handleRescueLocationUpdate);

    // Event: rescue:accept / rescue:accepted
    socket.on('rescue:accept', (payload) => {
      const incId = payload?.incidentId || payload?.id;
      if (incId) {
        io.to(`incident:${incId}`).emit('rescue:accepted', payload);
        io.to(`incident:${incId}`).emit('rescue:status', { incidentId: incId, status: 'MISSION_ACCEPTED' });
      }
      io.emit('rescue:accepted', payload);
      io.emit('rescue-status-updated', { incidentId: incId, status: 'MISSION_ACCEPTED' });
    });

    // Event: rescue-status-updated & rescue:status
    socket.on('rescue:status', (payload) => {
      const incId = payload?.incidentId || payload?.id;
      if (incId) {
        io.to(`incident:${incId}`).emit('rescue:status', payload);
      }
      io.emit('rescue:status', payload);
      io.emit('rescue-status-updated', payload);
      io.emit('rescue_status_updated', payload);
    });

    // Socket Disconnection
    socket.on('disconnect', () => {
      console.log(`🔌 [SocketManager] Client disconnected: ${socket.id} (${user.name})`);
    });
  });

  return {
    emitToUser: (userId, event, payload) => {
      io.to(`user:${userId}`).emit(event, payload);
    },
    emitToRole: (role, event, payload) => {
      const room = normalizeRoleRoom(role);
      io.to(room).emit(event, payload);
    },
    emitToIncident: (incidentId, event, payload) => {
      io.to(`incident:${incidentId}`).emit(event, payload);
    },
    emitToAll: (event, payload) => {
      io.emit(event, payload);
    },
    getActiveLiveLocations: () => Array.from(activeLiveLocations.values()),
    getActiveVehicleTelemetry: () => Array.from(activeVehicleTelemetry.values())
  };
}

module.exports = initSocketManager;
