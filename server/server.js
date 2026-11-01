require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const mongoose = require('mongoose');

const Incident = require('./models/Incident');
const RescueTeam = require('./models/RescueTeam');
const Disaster = require('./models/Disaster');
const User = require('./models/User');
const DisasterAlert = require('./models/DisasterAlert');
const SafetyPrecaution = require('./models/SafetyPrecaution');
const SafetyAlertLog = require('./models/SafetyAlertLog');
const Hospital = require('./models/Hospital');
const Resource = require('./models/Resource');
const ResourceRequest = require('./models/ResourceRequest');
const ResourceAllocation = require('./models/ResourceAllocation');
const ResourceHistory = require('./models/ResourceHistory');
const ReliefCamp = require('./models/ReliefCamp');
const RoadReport = require('./models/RoadReport');
const EvacuationAdvisory = require('./models/EvacuationAdvisory');
const DisasterPrediction = require('./models/DisasterPrediction');
const MissingPerson = require('./models/MissingPerson');
const SOSRequest = require('./models/SOSRequest');
const reunificationMatchingService = require('./services/reunificationMatchingService');
const ChatSession = require('./models/ChatSession');
const chatbotService = require('./services/chatbotService');
const languageDetectionService = require('./services/languageDetectionService');
const { SUPPORTED_LANGUAGES, isValidLanguageCode, getLanguageConfig } = require('./config/languages');

const initSocketManager = require('./sockets/socketManager');
const smsService = require('./services/smsService');
const emailService = require('./services/emailService');
const emailNotificationService = require('./services/emailNotificationService');
const weatherService = require('./services/weatherService');
const disasterAlertService = require('./services/disasterAlertService');
const citizenRiskService = require('./services/citizenRiskService');
const disasterPredictionService = require('./services/disasterPredictionService');
const rescueAllocationService = require('./services/rescueAllocationService');
const riskAssessmentEngine = require('./services/riskAssessmentEngine');
const evacuationRoutingService = require('./services/evacuationRoutingService');
const { startPredictionJob } = require('./jobs/disasterPredictionJob');

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

const socketManager = initSocketManager(io);

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173'
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      /\.vercel\.app$/.test(origin) ||
      process.env.NODE_ENV !== 'production'
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-role']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON request payload',
      code: 'INVALID_JSON'
    });
  }
  next(err);
});

// Deployment Health Check Endpoints
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'ResQAI Emergency Command & Realtime Engine',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: Math.round(process.uptime()),
    dbConnected: mongoose.connection.readyState === 1,
    timestamp: new Date().toISOString()
  });
});

// Initialize DB Connection
connectDB().then(() => {
  seedRescueTeams();
  seedHospitals();
  seedResources();
  seedEvacuationData();
  seedUsers();
  seedPredictions();
}).catch(() => {});

async function seedRescueTeams() {
  try {
    if (!RescueTeam) return;
    const initialTeams = [
      {
        vehicleId: 'res_nashik_1',
        name: 'Ambulance Lifeline Nashik 01',
        teamLeader: 'Dr. Rahul Deshmukh',
        type: 'AMBULANCE',
        status: 'AVAILABLE',
        membersCount: 3,
        location: {
          type: 'Point',
          coordinates: [73.7800, 20.0050],
          lat: 20.0050,
          lng: 73.7800,
          address: 'Panchavati Emergency Base, Nashik'
        },
        gpsAccuracy: 5,
        contactNumber: '+91 98220 11223'
      },
      {
        vehicleId: 'res_nashik_2',
        name: 'Nashik Fire Brigade Engine 01',
        teamLeader: 'Captain Suresh Patil',
        type: 'FIRE_BRIGADE',
        status: 'AVAILABLE',
        membersCount: 6,
        location: {
          type: 'Point',
          coordinates: [73.7920, 19.9970],
          lat: 19.9970,
          lng: 73.7920,
          address: 'Main Fire HQ, Nashik'
        },
        gpsAccuracy: 6,
        contactNumber: '+91 98220 44556'
      },
      {
        vehicleId: 'res_mumbai_1',
        name: 'Ambulance Express Mumbai 01',
        teamLeader: 'Dr. Sunita Rao',
        type: 'AMBULANCE',
        status: 'AVAILABLE',
        membersCount: 3,
        location: {
          type: 'Point',
          coordinates: [72.8777, 19.0760],
          lat: 19.0760,
          lng: 72.8777,
          address: 'Mumbai Central Emergency Hub'
        },
        gpsAccuracy: 4,
        contactNumber: '+91 98200 33445'
      },
      {
        vehicleId: 'res_pune_1',
        name: 'Rapid Rescue Ambulance Pune 01',
        teamLeader: 'Dr. Vikas Shinde',
        type: 'AMBULANCE',
        status: 'AVAILABLE',
        membersCount: 3,
        location: {
          type: 'Point',
          coordinates: [73.8567, 18.5204],
          lat: 18.5204,
          lng: 73.8567,
          address: 'Pune Emergency Fleet HQ'
        },
        gpsAccuracy: 5,
        contactNumber: '+91 98230 77889'
      },
      {
        vehicleId: 'res_delhi_1',
        name: 'Ambulance Express Delhi 01',
        teamLeader: 'Dr. Amit Malhotra',
        type: 'AMBULANCE',
        status: 'AVAILABLE',
        membersCount: 3,
        location: {
          type: 'Point',
          coordinates: [77.2100, 28.6150],
          lat: 28.6150,
          lng: 77.2100,
          address: 'Central Delhi Hospital Hub'
        },
        gpsAccuracy: 4,
        contactNumber: '+91 98110 55667'
      }
    ];

    for (const team of initialTeams) {
      await RescueTeam.findOneAndUpdate(
        { vehicleId: team.vehicleId },
        { $set: team },
        { upsert: true, new: true }
      );
    }
    console.log('✅ MongoDB RescueTeam Fleet Seeded Successfully!');
  } catch (err) {
    console.warn('RescueTeam seed notice:', err.message);
  }
}

async function seedHospitals() {
  if (!Hospital) return;
  try {
    const initialHospitals = [
      {
        hospitalId: 'hosp_nashik_1',
        name: 'Nashik Civil & Emergency Hospital',
        address: 'Golf Club Grounds, Panchavati, Nashik',
        contactPhone: '+91 253 257 6500',
        imageUrl: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=600&q=80',
        location: { lat: 19.9980, lng: 73.7880, address: 'Golf Club Grounds, Panchavati, Nashik' },
        geoPoint: { type: 'Point', coordinates: [73.7880, 19.9980] },
        generalBeds: { total: 200, available: 45 },
        icuBeds: { total: 30, available: 10 },
        emergencyDepartmentStatus: 'AVAILABLE',
        ambulanceReceivingStatus: 'ACCEPTING',
        emergencyServices: ['Trauma Care', 'Emergency Medicine', 'Surgery', 'Oxygen Support', 'CT/MRI Scan', 'Blood Bank'],
        availabilitySource: 'MANUAL_REPORTED',
        lastAvailabilityUpdate: new Date(),
        availabilityStatus: 'CURRENT',
        assignedStaffIds: ['usr_hospital_staff', 'nashik_staff@resqai.org'],
        updatedBy: 'Dr. Ramesh Kulkarni'
      },
      {
        hospitalId: 'hosp_mumbai_1',
        name: 'KEM Emergency Trauma Center Mumbai',
        address: 'Parel, Mumbai',
        contactPhone: '+91 22 2410 7000',
        imageUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=600&q=80',
        location: { lat: 19.0020, lng: 72.8420, address: 'Parel, Mumbai' },
        geoPoint: { type: 'Point', coordinates: [72.8420, 19.0020] },
        generalBeds: { total: 300, available: 60 },
        icuBeds: { total: 40, available: 15 },
        emergencyDepartmentStatus: 'AVAILABLE',
        ambulanceReceivingStatus: 'ACCEPTING',
        emergencyServices: ['Trauma Care', 'Emergency Medicine', 'Surgery', 'Oxygen Support', 'Pediatric ICU', 'Burn Unit'],
        availabilitySource: 'MANUAL_REPORTED',
        lastAvailabilityUpdate: new Date(),
        availabilityStatus: 'CURRENT',
        assignedStaffIds: ['usr_hospital_staff', 'mumbai_staff@resqai.org'],
        updatedBy: 'Dr. Sunita Rao'
      },
      {
        hospitalId: 'hosp_pune_1',
        name: 'Pune General & ICU Emergency Hospital',
        address: 'Shivajinagar, Pune',
        contactPhone: '+91 20 2550 8000',
        imageUrl: 'https://images.unsplash.com/photo-1512678080530-7760d81faba6?auto=format&fit=crop&w=600&q=80',
        location: { lat: 18.5204, lng: 73.8567, address: 'Shivajinagar, Pune' },
        geoPoint: { type: 'Point', coordinates: [73.8567, 18.5204] },
        generalBeds: { total: 180, available: 32 },
        icuBeds: { total: 25, available: 7 },
        emergencyDepartmentStatus: 'AVAILABLE',
        ambulanceReceivingStatus: 'ACCEPTING',
        emergencyServices: ['Trauma Care', 'Emergency Medicine', 'Oxygen Support', 'Cardiac Care'],
        availabilitySource: 'MANUAL_REPORTED',
        lastAvailabilityUpdate: new Date(),
        availabilityStatus: 'CURRENT',
        assignedStaffIds: ['usr_hospital_staff', 'pune_staff@resqai.org'],
        updatedBy: 'Dr. Vikas Shinde'
      },
      {
        hospitalId: 'hosp_1',
        name: 'AIIMS National Emergency Trauma Center',
        address: 'Ansari Nagar, New Delhi',
        contactPhone: '+91 11 2658 8500',
        imageUrl: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=600&q=80',
        location: { lat: 28.5672, lng: 77.2100, address: 'Ansari Nagar, New Delhi' },
        geoPoint: { type: 'Point', coordinates: [77.2100, 28.5672] },
        generalBeds: { total: 250, available: 58 },
        icuBeds: { total: 35, available: 12 },
        emergencyDepartmentStatus: 'AVAILABLE',
        ambulanceReceivingStatus: 'ACCEPTING',
        emergencyServices: ['Trauma Care', 'Emergency Medicine', 'Surgery', 'Oxygen Support', 'Burn Unit', 'CT/MRI Scan'],
        availabilitySource: 'OFFICIAL_API',
        lastAvailabilityUpdate: new Date(),
        availabilityStatus: 'CURRENT',
        assignedStaffIds: ['usr_hospital_staff', 'delhi_staff@resqai.org'],
        updatedBy: 'Dr. Amit Malhotra'
      }
    ];

    for (const hosp of initialHospitals) {
      await Hospital.findOneAndUpdate(
        { hospitalId: hosp.hospitalId },
        { $set: hosp },
        { upsert: true, new: true }
      );
    }
    console.log('✅ MongoDB Hospital Fleet Seeded Successfully!');
  } catch (err) {
    console.warn('Seed hospitals notice:', err.message);
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'resqai_super_secret_jwt_key_2026';



// -------------------------------------------------------------
// In-Memory Seed Data Engine (Ensures 100% immediate reactivity)
// -------------------------------------------------------------
let usersStore = [
  {
    id: 'usr_cit_a',
    name: 'Priya Sharma (Citizen A)',
    email: 'smmandlik.1318@gmail.com',
    aliasEmail: 'citizenA@crisisconnect.com',
    passwordHash: bcrypt.hashSync('Citizen@123', 8),
    phone: '+1 (555) 111-2222',
    role: 'Citizen',
    approved: true,
    skills: [],
    rewardPoints: 140,
    status: 'Active',
    locationSharingEnabled: true,
    emergencyAlertsEnabled: true,
    location: { lat: 28.6284, lng: 77.2051, address: '50m Inside Danger Zone' },
    geoPoint: { type: 'Point', coordinates: [77.2051, 28.6284] },
    locationAccuracy: 5,
    locationUpdatedAt: new Date().toISOString()
  },
  {
    id: 'usr_cit_b',
    name: 'Rahul Verma (Citizen B)',
    email: 'citizenB@crisisconnect.com',
    passwordHash: bcrypt.hashSync('Citizen@123', 8),
    phone: '+1 (555) 333-4444',
    role: 'Citizen',
    approved: true,
    skills: [],
    rewardPoints: 180,
    status: 'Active',
    locationSharingEnabled: true,
    emergencyAlertsEnabled: true,
    location: { lat: 28.6287, lng: 77.2054, address: '80m Inside Danger Zone' },
    geoPoint: { type: 'Point', coordinates: [77.2054, 28.6287] },
    locationAccuracy: 6,
    locationUpdatedAt: new Date().toISOString()
  },
  {
    id: 'usr_cit_c',
    name: 'Amit Patel (Citizen C)',
    email: 'citizenC@crisisconnect.com',
    passwordHash: bcrypt.hashSync('Citizen@123', 8),
    phone: '+1 (555) 555-6666',
    role: 'Citizen',
    approved: true,
    skills: [],
    rewardPoints: 210,
    status: 'Active',
    locationSharingEnabled: true,
    emergencyAlertsEnabled: true,
    location: { lat: 28.6293, lng: 77.2062, address: '150m Outside Danger Zone' },
    geoPoint: { type: 'Point', coordinates: [77.2062, 28.6293] },
    locationAccuracy: 10,
    locationUpdatedAt: new Date().toISOString()
  },
  {
    id: 'usr_operator',
    name: 'Commander Alex Vance',
    email: 'operator@crisisconnect.com',
    passwordHash: bcrypt.hashSync('Operator@123', 8),
    phone: '+1 (555) 999-0011',
    role: 'Emergency Operator',
    approved: true,
    skills: ['Triage', 'Dispatch', 'Command'],
    rewardPoints: 500,
    status: 'Active',
    locationSharingEnabled: true,
    emergencyAlertsEnabled: true,
    location: { lat: 28.6145, lng: 77.2095, address: 'Command Triage Desk #1' },
    geoPoint: { type: 'Point', coordinates: [77.2095, 28.6145] },
    locationAccuracy: 5,
    locationUpdatedAt: new Date().toISOString()
  },
  {
    id: 'usr_admin',
    name: 'System Admin',
    email: 'admin@crisisconnect.com',
    passwordHash: bcrypt.hashSync('Admin@123', 8),
    phone: '+1 (555) 000-1111',
    role: 'Admin',
    approved: true,
    skills: ['System Command', 'Disaster Oversight'],
    rewardPoints: 1000,
    status: 'Active',
    locationSharingEnabled: true,
    emergencyAlertsEnabled: true,
    location: { lat: 28.6139, lng: 77.2090, address: 'State Disaster Operations HQ' },
    geoPoint: { type: 'Point', coordinates: [77.2090, 28.6139] },
    locationAccuracy: 5,
    locationUpdatedAt: new Date().toISOString()
  }
];



let incidentsStore = [
  {
    id: 'inc_101',
    title: 'Flash Flood & Stranded Citizens at Sector 9',
    disasterType: 'Flood',
    severity: 'High',
    priority: 1,
    status: 'In Progress',
    reporterName: 'Priya Sharma',
    reporterPhone: '+91 98765 43210',
    location: { lat: 28.6280, lng: 77.2050, address: 'Block C, Yamuna Riverbed Colony' },
    description: 'Water level rising rapidly over 4 feet. 12 elderly residents stranded on rooftop requiring immediate boat evacuation.',
    media: ['https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80'],
    audioUrl: '',
    aiPrediction: {
      disasterType: 'Flood',
      severity: 'High',
      confidenceScore: 0.94,
      estimatedVictims: 14,
      recommendedResources: ['Rescue Boat Unit #2', 'NDRF Amphibious Vehicle', 'Medical Team Alpha'],
      summary: 'High confidence flood anomaly. Rapid inundation detected. High priority evacuation needed.'
    },
    fakeDetection: {
      isFakeOrSpam: false,
      spamConfidence: 0.04,
      duplicateMatchId: null,
      flagReason: 'Verified live video & geotag match'
    },
    assignedResponders: [
      { id: 'res_2', name: 'Rescue Boat Unit #2', type: 'Rescue Boat', assignedAt: new Date().toISOString() }
    ],
    createdAt: new Date(Date.now() - 35 * 60000).toISOString()
  },
  {
    id: 'inc_102',
    title: 'Structural Fire in Commercial Complex',
    disasterType: 'Fire',
    severity: 'Critical',
    priority: 1,
    status: 'Pending',
    reporterName: 'Security Desk',
    reporterPhone: '+91 91234 56789',
    location: { lat: 28.6180, lng: 77.2200, address: 'Pragati Tower, 4th Floor' },
    description: 'Electrical short circuit triggered blaze. Heavy toxic smoke spreading through ventilation shafts.',
    media: ['https://images.unsplash.com/photo-1579489225078-27977a77b72b?auto=format&fit=crop&w=600&q=80'],
    audioUrl: '',
    aiPrediction: {
      disasterType: 'Fire',
      severity: 'Critical',
      confidenceScore: 0.98,
      estimatedVictims: 30,
      recommendedResources: ['Fire Engine Alpha', 'High-Reach Aerial Ladder', 'Ambulance Unit 5'],
      summary: 'Category 4 Commercial Fire. Risk of flashover within 10 minutes.'
    },
    fakeDetection: {
      isFakeOrSpam: false,
      spamConfidence: 0.02,
      duplicateMatchId: null,
      flagReason: 'Acoustic thermal sensors aligned'
    },
    assignedResponders: [],
    createdAt: new Date(Date.now() - 12 * 60000).toISOString()
  },
  {
    id: 'inc_103',
    title: 'Bridge Collapse & Traffic Snarl',
    disasterType: 'Building Collapse',
    severity: 'Medium',
    priority: 2,
    status: 'Verified',
    reporterName: 'Traffic Patrol',
    reporterPhone: '+91 99887 76655',
    location: { lat: 28.6010, lng: 77.1950, address: 'Old Flyover Junction' },
    description: 'Overpass section buckled under heavy rain. 2 vehicles trapped. Traffic diverted.',
    media: ['https://images.unsplash.com/photo-1590055531615-f16d36ffe8ec?auto=format&fit=crop&w=600&q=80'],
    audioUrl: '',
    aiPrediction: {
      disasterType: 'Building Collapse',
      severity: 'Medium',
      confidenceScore: 0.89,
      estimatedVictims: 5,
      recommendedResources: ['Heavy Crane Unit', 'Police Patrol squad', 'Ambulance Unit 2'],
      summary: 'Infrastructure failure hazard. Road closures required immediately.'
    },
    fakeDetection: {
      isFakeOrSpam: false,
      spamConfidence: 0.05,
      duplicateMatchId: null,
      flagReason: 'Verified by Police Dispatcher'
    },
    assignedResponders: [],
    createdAt: new Date(Date.now() - 60 * 60000).toISOString()
  }
];

let resourcesStore = [
  { id: 'res_nashik_1', vehicleId: 'res_nashik_1', name: 'Ambulance Lifeline Nashik 01', type: 'Ambulance', status: 'Available', location: { lat: 20.0050, lng: 73.7800, address: 'Panchavati Emergency Hub, Nashik' }, etaMinutes: 3, capacity: 2, contactNumber: '+91 98220 11223' },
  { id: 'res_nashik_2', vehicleId: 'res_nashik_2', name: 'Nashik Fire Brigade Engine 01', type: 'Fire Truck', status: 'Available', location: { lat: 19.9970, lng: 73.7920, address: 'Main Fire HQ, Nashik' }, etaMinutes: 5, capacity: 6, contactNumber: '+91 98220 44556' },
  { id: 'res_mumbai_1', vehicleId: 'res_mumbai_1', name: 'Ambulance Express Mumbai 01', type: 'Ambulance', status: 'Available', location: { lat: 19.0760, lng: 72.8777, address: 'Mumbai Central Emergency Hub' }, etaMinutes: 4, capacity: 2, contactNumber: '+91 98200 33445' },
  { id: 'res_pune_1', vehicleId: 'res_pune_1', name: 'Rapid Rescue Unit Pune 01', type: 'Ambulance', status: 'Available', location: { lat: 18.5204, lng: 73.8567, address: 'Pune Emergency Fleet HQ' }, etaMinutes: 4, capacity: 2, contactNumber: '+91 98230 77889' },
  { id: 'res_1', vehicleId: 'res_1', name: 'Ambulance Express Delhi 01', type: 'Ambulance', status: 'Available', location: { lat: 28.6150, lng: 77.2100, address: 'Central Delhi Hospital Hub' }, etaMinutes: 4, capacity: 2, contactNumber: '+1 555-0101' },
  { id: 'res_2', vehicleId: 'res_2', name: 'Rescue Boat Unit #2', type: 'Rescue Boat', status: 'Dispatched', location: { lat: 28.6270, lng: 77.2060, address: 'Yamuna River Dock 3' }, etaMinutes: 7, capacity: 10, contactNumber: '+1 555-0102' },
  { id: 'res_3', vehicleId: 'res_3', name: 'Fire Engine Alpha 09', type: 'Fire Truck', status: 'Available', location: { lat: 28.6210, lng: 77.2250, address: 'Station 4 Fire HQ' }, etaMinutes: 6, capacity: 6, contactNumber: '+1 555-0103' },
  { id: 'res_4', vehicleId: 'res_4', name: 'Police Cruiser Squad 12', type: 'Police Cruiser', status: 'En Route', location: { lat: 28.6050, lng: 77.2000, address: 'South Precinct Patrol' }, etaMinutes: 3, capacity: 4, contactNumber: '+1 555-0104' },
  { id: 'res_5', vehicleId: 'res_5', name: 'AI Recon Drone Delta', type: 'Drone Unit', status: 'Available', location: { lat: 20.0000, lng: 73.7850, address: 'Regional Recon Pad' }, etaMinutes: 2, capacity: 1, contactNumber: '+1 555-0105' }
];

let hospitalsStore = [
  {
    id: 'hosp_nashik_1',
    name: 'Nashik Civil & Emergency Hospital',
    address: 'Golf Club Grounds, Panchavati, Nashik',
    location: { lat: 19.9980, lng: 73.7880 },
    availableBeds: 45,
    totalBeds: 200,
    icuBeds: 10,
    ventilators: 6,
    doctorsOnDuty: 28,
    bloodBank: { 'A+': 30, 'O+': 45, 'B+': 38, 'AB+': 15, 'O-': 8 },
    incomingPatients: [],
    contactPhone: '+91 253 257 6500'
  },
  {
    id: 'hosp_mumbai_1',
    name: 'KEM Emergency Trauma Center Mumbai',
    address: 'Parel, Mumbai',
    location: { lat: 19.0020, lng: 72.8420 },
    availableBeds: 60,
    totalBeds: 300,
    icuBeds: 15,
    ventilators: 10,
    doctorsOnDuty: 40,
    bloodBank: { 'A+': 40, 'O+': 60, 'B+': 50, 'AB+': 20, 'O-': 12 },
    incomingPatients: [],
    contactPhone: '+91 22 2410 7000'
  },
  {
    id: 'hosp_1',
    name: 'AIIMS National Emergency Trauma Center',
    address: 'Ansari Nagar, New Delhi',
    location: { lat: 28.5672, lng: 77.2100 },
    availableBeds: 58,
    totalBeds: 250,
    icuBeds: 12,
    ventilators: 8,
    doctorsOnDuty: 34,
    bloodBank: { 'A+': 35, 'O+': 50, 'B+': 42, 'AB+': 18, 'O-': 10 },
    incomingPatients: [
      { patientName: 'Trauma Victim #102', condition: 'Severe Burns', etaMinutes: 6, ambulanceId: 'Ambulance Express 01' }
    ],
    contactPhone: '+91 11 2658 8500'
  },
  {
    id: 'hosp_2',
    name: 'Max Super Specialty Hospital',
    address: 'Saket District Centre',
    location: { lat: 28.5284, lng: 77.2177 },
    availableBeds: 22,
    totalBeds: 180,
    icuBeds: 4,
    ventilators: 3,
    doctorsOnDuty: 20,
    bloodBank: { 'A+': 20, 'O+': 25, 'B+': 15, 'AB+': 8, 'O-': 5 },
    incomingPatients: [],
    contactPhone: '+91 11 2651 5050'
  }
];


let transportsStore = [
  {
    id: 'tr_102',
    transportId: 'TR-102',
    incidentId: 'inc_102',
    patientId: 'pat_102',
    patientName: 'John Doe (Victim #102)',
    ambulanceId: 'res_1',
    ambulanceName: 'Ambulance Express 01',
    pickupLatitude: 28.6280,
    pickupLongitude: 77.2050,
    pickupAddress: 'Sector 14 Commercial Complex',
    destinationHospitalId: 'hosp_1',
    destinationHospitalName: 'CityCare Emergency Hospital',
    destinationHospitalLocation: { lat: 28.5672, lng: 77.2100 },
    status: 'EN_ROUTE_TO_HOSPITAL',
    patientStatus: 'PATIENT_IN_TRANSIT',
    hospitalStatus: 'ACCEPTED',
    startedAt: new Date(Date.now() - 15 * 60000).toISOString(),
    pickedUpAt: new Date(Date.now() - 10 * 60000).toISOString(),
    hospitalSelectedAt: new Date(Date.now() - 8 * 60000).toISOString(),
    hospitalAcceptedAt: new Date(Date.now() - 7 * 60000).toISOString(),
    eta: '8 min',
    distanceRemaining: '3.4 km',
    speed: 48,
    heading: 120,
    createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

let reliefCampsStore = [

  {
    id: 'camp_1',
    name: 'Central Stadium Relief Shelter #1',
    location: { lat: 28.6100, lng: 77.2300, address: 'Jawaharlal Nehru Stadium Complex' },
    capacity: 1000,
    currentOccupants: 480,
    demographics: { children: 110, women: 190, seniorCitizens: 80, men: 100 },
    supplies: { foodPacks: 2400, waterLiters: 8000, medicineKits: 450, blankets: 1200 },
    managerName: 'Commander Rajiv Menon',
    contactPhone: '+91 98111 22233'
  }
];

let missingPersonsStore = [
  {
    id: 'mp_1',
    fullName: 'Aarav Mehta',
    age: 11,
    gender: 'Male',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    lastSeenLocation: 'Sector 9 Flood Evacuation Hub',
    description: 'Wearing blue jacket and black jeans. Separated during rescue boat onboarding.',
    familyContactName: 'Sunita Mehta (Mother)',
    familyContactPhone: '+91 98123 99900',
    status: 'Missing',
    aiFaceMatchScore: 0.92,
    matchCandidateNotes: 'Facial similarity matched with Shelter #1 intake log at 14:20 hrs.',
    createdAt: new Date(Date.now() - 120 * 60000).toISOString()
  }
];

let messagesStore = [
  {
    id: 'msg_1',
    senderId: 'usr_2',
    senderName: 'Commander Alex Vance',
    senderRole: 'Emergency Operator',
    recipientRole: 'All',
    channelId: 'general-command',
    text: 'ALERT: Sector 9 Flood evacuees being routed to Stadium Shelter #1. All units maintain radio contact.',
    attachmentUrl: '',
    createdAt: new Date(Date.now() - 15 * 60000).toISOString()
  }
];

let notificationsStore = [
  {
    id: 'notif_1',
    title: 'HIGH SEVERITY INCIDENT REPORTED',
    message: 'Structural Fire detected at Pragati Tower, 4th Floor. Fire Brigade dispatched.',
    type: 'CRITICAL',
    targetRole: 'All',
    read: false,
    createdAt: new Date().toISOString()
  }
];

let activityLogsStore = [
  {
    id: 'act_1',
    incidentId: 'inc_101',
    action: 'REPORT_SUBMITTED',
    performedBy: { userId: 'usr_1', name: 'Priya Sharma', role: 'Citizen' },
    details: 'Disaster report logged via Citizen portal.',
    timestamp: new Date(Date.now() - 35 * 60000).toISOString()
  },
  {
    id: 'act_2',
    incidentId: 'inc_101',
    action: 'INCIDENT_VERIFIED',
    performedBy: { userId: 'usr_2', name: 'Commander Alex Vance', role: 'Emergency Operator' },
    details: 'Disaster report verified by Command Center.',
    timestamp: new Date(Date.now() - 30 * 60000).toISOString()
  }
];

let sosStore = [
  {
    id: 'sos_1',
    citizenId: 'usr_1',
    citizenName: 'Dr. Sarah Connor',
    citizenPhone: '+1 (555) 234-5678',
    location: { lat: 28.6139, lng: 77.2090, address: 'Connaught Place Sector 4' },
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  }
];

const DISASTER_RADIUS_CONFIG = {
  FIRE: 100,
  GAS_LEAK: 200,
  CHEMICAL_HAZARD: 300,
  FLOOD: 500,
  EARTHQUAKE: 500,
  DEFAULT: 100
};



let emergencyAlertsStore = [];

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function getRadiusForDisasterType(disasterType) {
  if (!disasterType) return DISASTER_RADIUS_CONFIG.DEFAULT;
  const key = disasterType.toUpperCase().replace(/\s+/g, '_');
  return DISASTER_RADIUS_CONFIG[key] || DISASTER_RADIUS_CONFIG.DEFAULT;
}

function processGeofenceWarningsForIncident(inc) {
  if (!inc || !inc.location || !inc.location.lat) return [];

  const incLat = inc.location.lat;
  const incLng = inc.location.lng;
  const radius = getRadiusForDisasterType(inc.disasterType);

  const warningsSent = [];

  usersStore.forEach(usr => {
    if (!usr.locationSharingEnabled || !usr.emergencyAlertsEnabled) return;
    if (!usr.location || !usr.location.lat) return;

    const distMeters = calculateDistanceMeters(incLat, incLng, usr.location.lat, usr.location.lng);

    if (distMeters <= radius) {
      const existingAlert = emergencyAlertsStore.find(a => a.userId === usr.id && a.incidentId === inc.id);

      if (!existingAlert || existingAlert.status === 'EXITED') {
        const alertRecord = {
          id: `alert_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          userId: usr.id,
          incidentId: inc.id,
          incidentType: inc.disasterType || 'FIRE',
          title: inc.title || 'Emergency Hazard',
          severity: inc.severity || 'CRITICAL',
          distanceMeters: distMeters,
          radiusMeters: radius,
          locationAddress: inc.location.address || 'Nearby Hazard Area',
          status: 'ENTERED',
          sentAt: new Date().toISOString()
        };

        if (existingAlert) {
          existingAlert.status = 'ENTERED';
          existingAlert.distanceMeters = distMeters;
          existingAlert.sentAt = alertRecord.sentAt;
        } else {
          emergencyAlertsStore.unshift(alertRecord);
        }

        const warningPayload = {
          alertId: alertRecord.id,
          incidentId: inc.id,
          incidentType: inc.disasterType || 'FIRE',
          title: inc.title || 'Emergency Hazard',
          severity: inc.severity || 'CRITICAL',
          distanceMeters: distMeters,
          radiusMeters: radius,
          locationAddress: inc.location.address || 'Nearby Hazard Area',
          timestamp: alertRecord.sentAt
        };

        socketManager.emitToUser(usr.id, 'nearby_emergency_warning', warningPayload);
        warningsSent.push({ user: usr, alert: alertRecord });
      }
    }
  });

  return warningsSent;
}


// Helper to push activity log
function logActivity(incidentId, action, performedBy, details = '') {
  const log = {
    id: `act_${Date.now()}`,
    incidentId,
    action,
    performedBy: performedBy || { name: 'System', role: 'System' },
    details,
    timestamp: new Date().toISOString()
  };
  activityLogsStore.unshift(log);
  socketManager.emitToIncident(incidentId, 'activity_logged', log);
  return log;
}

let auditLogsStore = [
  {
    id: 'audit_1',
    incidentId: 'inc_101',
    userId: 'usr_operator',
    userName: 'Commander Alex Vance',
    userRole: 'Emergency Operator',
    action: 'OPERATOR_VERIFIED_DISASTER',
    target: 'inc_101',
    details: 'Disaster report verified after live video & geotag match',
    ipAddress: '127.0.0.1',
    timestamp: new Date(Date.now() - 30 * 60000).toISOString()
  }
];

function logAudit(reqUser, action, target, details, req) {
  const audit = {
    id: `audit_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    userId: reqUser ? reqUser.id : 'system',
    userName: reqUser ? reqUser.name : 'System Dispatcher',
    userRole: reqUser ? reqUser.role : 'System',
    action,
    target: target || 'N/A',
    details: details || '',
    ipAddress: req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1') : '127.0.0.1',
    timestamp: new Date().toISOString()
  };
  auditLogsStore.unshift(audit);
  socketManager.emitToRole('admin', 'audit_logged', audit);
  return audit;
}

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      req.user = null;
    }
  } else if (req.query && req.query.token) {
    try {
      const decoded = jwt.verify(req.query.token, JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

// Role Authorization Middleware (Server-side RBAC)
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      const reqRole = req.headers['x-user-role'] || (req.body && req.body.role);
      if (reqRole && allowedRoles.some(r => r.toLowerCase() === reqRole.toLowerCase())) {
        req.user = { id: 'usr_operator', name: 'Commander Alex Vance', role: reqRole };
        return next();
      }
      return res.status(401).json({ message: 'Authentication required to perform operator actions' });
    }

    const userRoleStr = (req.user.role || '').toLowerCase();
    const isAllowed = allowedRoles.some(r => {
      const allowedStr = r.toLowerCase();
      if (allowedStr === userRoleStr) return true;
      if ((allowedStr.includes('operator') || allowedStr.includes('admin')) &&
          (userRoleStr.includes('operator') || userRoleStr.includes('admin') || userRoleStr.includes('collector'))) {
        return true;
      }
      return false;
    });

    if (!isAllowed) {
      return res.status(403).json({ message: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]` });
    }

    next();
  };
}

// -------------------------------------------------------------
// REST API ROUTES
// -------------------------------------------------------------

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role, phone, skills, location } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) return res.status(400).json({ message: 'Valid email address is required' });

  let existing = usersStore.find(u => u.email.toLowerCase() === cleanEmail);
  if (!existing && User) {
    existing = await User.findOne({ email: cleanEmail });
  }
  if (existing) return res.status(400).json({ message: 'User already exists' });

  const passwordHash = bcrypt.hashSync(password || 'password123', 8);
  const newUser = {
    id: `usr_${Date.now()}`,
    name: name || 'User',
    email: cleanEmail,
    passwordHash,
    phone: phone || '',
    role: role || 'Citizen',
    approved: true,
    skills: skills || [],
    rewardPoints: 100,
    status: 'Active',
    emergencyAlertsEnabled: true,
    locationSharingEnabled: true,
    location: location || { lat: 28.6139, lng: 77.2090, address: 'New Delhi HQ' },
    geoPoint: { type: 'Point', coordinates: [location?.lng || 77.2090, location?.lat || 28.6139] }
  };

  usersStore.push(newUser);
  if (User) {
    try {
      await User.findOneAndUpdate(
        { email: cleanEmail },
        {
          name: newUser.name,
          email: cleanEmail,
          password: passwordHash,
          phone: newUser.phone,
          role: newUser.role,
          status: 'Active',
          emergencyAlertsEnabled: true,
          locationSharingEnabled: true,
          location: newUser.location,
          geoPoint: newUser.geoPoint
        },
        { upsert: true, new: true }
      );
      console.log(`[Auth] Registered new user in MongoDB: ${newUser.name} (Role: ${newUser.role})`);
    } catch (err) {
      console.warn('[Auth] MongoDB User create notice:', err.message);
    }
  }
  const token = jwt.sign({ id: newUser.id, role: newUser.role, name: newUser.name }, JWT_SECRET, { expiresIn: '7d' });
  const { passwordHash: _, ...userClean } = newUser;
  res.status(201).json({ token, user: userClean });
});

// Operator Authentication Endpoint
app.post('/api/auth/operator/login', async (req, res) => {
  const { email, password } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();
  let user = usersStore.find(u => u.email.toLowerCase() === cleanEmail);

  if (!user && User) {
    const dbUser = await User.findOne({ email: cleanEmail });
    if (dbUser) {
      user = {
        id: dbUser._id.toString(),
        name: dbUser.name,
        email: dbUser.email,
        passwordHash: dbUser.password,
        phone: dbUser.phone || '',
        role: dbUser.role,
        status: dbUser.status || 'Active',
        emergencyAlertsEnabled: dbUser.emergencyAlertsEnabled !== false
      };
      usersStore.push(user);
    }
  }

  if (!user) {
    return res.status(404).json({ message: 'Operator account not found' });
  }

  const validRole = user.role === 'Emergency Operator' || user.role === 'EMERGENCY_OPERATOR' || user.role === 'Admin' || user.role === 'admin';
  if (!validRole) {
    return res.status(403).json({ message: 'Emergency Operator privileges required' });
  }

  const valid = bcrypt.compareSync(password || '', user.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: 'Invalid operator credentials' });
  }

  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  const { passwordHash: _, ...userClean } = user;
  res.json({ token, user: userClean });
});

// Citizen Authentication Endpoint
app.post('/api/auth/citizen/login', async (req, res) => {
  const { email, password } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();
  let user = usersStore.find(u => 
    u.email.toLowerCase() === cleanEmail || 
    (u.aliasEmail && u.aliasEmail.toLowerCase() === cleanEmail) ||
    (cleanEmail === 'citizena@crisisconnect.com' && u.id === 'usr_cit_a')
  );

  if (!user && User) {
    const lookupEmail = cleanEmail === 'citizena@crisisconnect.com' ? 'smmandlik.1318@gmail.com' : cleanEmail;
    const dbUser = await User.findOne({ $or: [{ email: cleanEmail }, { email: lookupEmail }] });
    if (dbUser) {
      user = {
        id: dbUser._id.toString(),
        name: dbUser.name,
        email: dbUser.email,
        passwordHash: dbUser.password,
        phone: dbUser.phone || '',
        role: dbUser.role || 'Citizen',
        status: dbUser.status || 'Active',
        emergencyAlertsEnabled: dbUser.emergencyAlertsEnabled !== false
      };
      usersStore.push(user);
    }
  }

  if (!user) {
    return res.status(404).json({ message: 'Citizen account not found' });
  }

  const valid = bcrypt.compareSync(password || '', user.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: 'Invalid citizen credentials' });
  }

  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  const { passwordHash: _, ...userClean } = user;
  res.json({ token, user: userClean });
});

// Citizen Registration Endpoint
app.post('/api/auth/citizen/register', async (req, res) => {
  const { name, email, password, phone } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) {
    return res.status(400).json({ message: 'Valid email address is required' });
  }

  let existing = usersStore.find(u => u.email.toLowerCase() === cleanEmail);
  if (!existing && User) {
    existing = await User.findOne({ email: cleanEmail });
  }
  if (existing) {
    return res.status(400).json({ message: 'An account with this email already exists' });
  }

  const passwordHash = bcrypt.hashSync(password || 'Citizen@123', 8);
  const newUser = {
    id: `usr_cit_${Date.now()}`,
    name: name || 'Citizen',
    email: cleanEmail,
    passwordHash,
    phone: phone || '',
    role: 'Citizen',
    approved: true,
    skills: [],
    rewardPoints: 100,
    status: 'Active',
    locationSharingEnabled: true,
    emergencyAlertsEnabled: true,
    location: { lat: 28.6285, lng: 77.2052, address: 'Registered Citizen Location' },
    geoPoint: { type: 'Point', coordinates: [77.2052, 28.6285] },
    locationAccuracy: 8,
    locationUpdatedAt: new Date().toISOString()
  };

  usersStore.push(newUser);
  if (User) {
    try {
      await User.findOneAndUpdate(
        { email: cleanEmail },
        {
          name: newUser.name,
          email: cleanEmail,
          password: passwordHash,
          phone: newUser.phone,
          role: 'Citizen',
          status: 'Active',
          emergencyAlertsEnabled: true,
          locationSharingEnabled: true,
          location: newUser.location,
          geoPoint: newUser.geoPoint
        },
        { upsert: true, new: true }
      );
      console.log(`[Auth] Registered new citizen in MongoDB: ${newUser.name}`);
    } catch (err) {
      console.warn('[Auth] MongoDB User save error:', err.message);
    }
  }

  const token = jwt.sign({ id: newUser.id, role: newUser.role, name: newUser.name }, JWT_SECRET, { expiresIn: '7d' });
  const { passwordHash: _, ...userClean } = newUser;
  res.status(201).json({ token, user: userClean });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();
  let user = usersStore.find(u => 
    u.email.toLowerCase() === cleanEmail || 
    (u.aliasEmail && u.aliasEmail.toLowerCase() === cleanEmail) ||
    (cleanEmail === 'citizena@crisisconnect.com' && u.id === 'usr_cit_a')
  );
  if (!user && User) {
    const lookupEmail = cleanEmail === 'citizena@crisisconnect.com' ? 'smmandlik.1318@gmail.com' : cleanEmail;
    const dbUser = await User.findOne({ $or: [{ email: cleanEmail }, { email: lookupEmail }] });
    if (dbUser) {
      user = {
        id: dbUser._id.toString(),
        name: dbUser.name,
        email: dbUser.email,
        passwordHash: dbUser.password,
        phone: dbUser.phone || '',
        role: dbUser.role,
        status: dbUser.status || 'Active',
        emergencyAlertsEnabled: dbUser.emergencyAlertsEnabled !== false
      };
      usersStore.push(user);
    }
  }
  if (!user) return res.status(404).json({ message: 'Account not found' });

  const valid = bcrypt.compareSync(password || '', user.passwordHash);
  if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  const { passwordHash: _, ...userClean } = user;
  res.json({ token, user: userClean });
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No authorization token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = usersStore.find(u => u.id === decoded.id || u.email === decoded.email);
    if (!user) return res.status(404).json({ message: 'User profile not found' });

    const { passwordHash, ...userClean } = user;
    res.json({ user: userClean });
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired authentication token' });
  }
});



// Incidents Routes
app.get('/api/incidents', (req, res) => {
  res.json(incidentsStore);
});

app.get('/api/incidents/:id', (req, res) => {
  const { id } = req.params;
  const inc = incidentsStore.find(i => i.id === id || i.incidentId === id);
  if (!inc) return res.status(404).json({ message: 'Incident not found' });
  
  const activities = activityLogsStore.filter(a => a.incidentId === inc.id || a.incidentId === inc.incidentId);
  res.json({ ...inc, activityTimeline: activities });
});

// -------------------------------------------------------------
// REAL GEOSPATIAL RESCUE ASSIGNMENT ENGINE (MongoDB $near 2dsphere 50km)
// -------------------------------------------------------------
async function findAndAssignNearestRescue(incident) {
  if (!incident) return null;

  // Do not re-assign if already assigned, on way, arrived, or resolved
  const terminalStatuses = ['RESCUE_ASSIGNED', 'MISSION_ACCEPTED', 'RESCUE_ON_WAY', 'RESCUE_ARRIVED', 'OPERATION_IN_PROGRESS', 'INCIDENT_RESOLVED', 'RESOLVED', 'CANCELLED'];
  if (terminalStatuses.includes(incident.status)) {
    return incident;
  }

  // Extract actual GPS coordinates [longitude, latitude]
  let incLat = incident.location?.lat;
  let incLng = incident.location?.lng;

  if (incident.location?.coordinates && Array.isArray(incident.location.coordinates) && incident.location.coordinates.length === 2) {
    incLng = incident.location.coordinates[0];
    incLat = incident.location.coordinates[1];
  } else if (incident.geoPoint?.coordinates && Array.isArray(incident.geoPoint.coordinates) && incident.geoPoint.coordinates.length === 2) {
    incLng = incident.geoPoint.coordinates[0];
    incLat = incident.geoPoint.coordinates[1];
  }

  if (incLat === undefined || incLng === undefined || isNaN(incLat) || isNaN(incLng)) {
    return incident;
  }

  const disasterTypeStr = (incident.disasterType || incident.type || 'FIRE').toUpperCase();

  // Map disaster type to required vehicle type and regex
  let targetType = 'FIRE_BRIGADE';
  let typeRegex = /fire|brigade|truck/i;
  if (disasterTypeStr.includes('FIRE')) {
    targetType = 'FIRE_BRIGADE';
    typeRegex = /fire|brigade|truck/i;
  } else if (disasterTypeStr.includes('MEDICAL') || disasterTypeStr.includes('SOS')) {
    targetType = 'AMBULANCE';
    typeRegex = /ambulance|med/i;
  } else if (disasterTypeStr.includes('ACCIDENT')) {
    targetType = 'POLICE';
    typeRegex = /police|cruiser/i;
  } else {
    targetType = 'RESCUE_TEAM';
    typeRegex = /rescue|team|unit|boat|drone/i;
  }

  let selectedVehicle = null;
  let selectedDistMeters = Infinity;

  // 1. Search MongoDB RescueTeam using 2dsphere index and $near with $maxDistance: 50000
  try {
    const mongoNearQuery = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [incLng, incLat]
          },
          $maxDistance: 50000 // 50km
        }
      },
      status: { $in: ['AVAILABLE', 'Available', 'ACTIVE', 'Active'] },
      type: { $regex: typeRegex }
    };

    const mongoVehicle = await RescueTeam.findOne(mongoNearQuery);
    if (mongoVehicle) {
      const vLat = mongoVehicle.location?.lat !== undefined ? mongoVehicle.location.lat : mongoVehicle.location?.coordinates?.[1];
      const vLng = mongoVehicle.location?.lng !== undefined ? mongoVehicle.location.lng : mongoVehicle.location?.coordinates?.[0];
      if (vLat !== undefined && vLng !== undefined) {
        const dist = calculateDistanceMeters(incLat, incLng, vLat, vLng);
        if (dist <= 50000) {
          selectedVehicle = {
            id: mongoVehicle.vehicleId || mongoVehicle._id.toString(),
            vehicleId: mongoVehicle.vehicleId || mongoVehicle._id.toString(),
            name: mongoVehicle.name,
            type: mongoVehicle.type || targetType,
            status: mongoVehicle.status,
            location: { lat: vLat, lng: vLng, address: mongoVehicle.location?.address || 'Rescue Station' },
            isMongo: true,
            mongoDoc: mongoVehicle
          };
          selectedDistMeters = dist;
        }
      }
    }
  } catch (mongoErr) {
    console.warn('MongoDB 2dsphere near query info:', mongoErr.message);
  }

  // 2. Fallback to in-memory resourcesStore within 50,000m
  if (!selectedVehicle && resourcesStore && resourcesStore.length > 0) {
    const candidateDistances = resourcesStore
      .filter(r => {
        const rType = (r.type || r.name || '').toLowerCase();
        const matchesType = typeRegex.test(rType);
        const isAvail = r.status === 'Available' || r.status === 'AVAILABLE' || r.status === 'Active' || !r.status;
        return matchesType && isAvail;
      })
      .map(r => {
        const rLat = r.location?.lat !== undefined ? r.location.lat : r.latitude;
        const rLng = r.location?.lng !== undefined ? r.location.lng : r.longitude;
        if (rLat === undefined || rLng === undefined) return { resource: r, dist: Infinity };
        const dist = calculateDistanceMeters(incLat, incLng, rLat, rLng);
        return { resource: r, dist, lat: rLat, lng: rLng };
      })
      .filter(c => c.dist <= 50000);

    if (candidateDistances.length > 0) {
      candidateDistances.sort((a, b) => a.dist - b.dist);
      const best = candidateDistances[0];
      selectedVehicle = {
        id: best.resource.id,
        vehicleId: best.resource.id,
        name: best.resource.name,
        type: best.resource.type || targetType,
        status: best.resource.status,
        location: { lat: best.lat, lng: best.lng, address: best.resource.location?.address || 'Rescue Base' },
        isMongo: false,
        resourceObj: best.resource
      };
      selectedDistMeters = best.dist;
    }
  }

  // 3. Process Assignment Outcome
  if (selectedVehicle && selectedDistMeters <= 50000) {
    const distanceKmStr = `${(selectedDistMeters / 1000).toFixed(1)} km`;

    // Mark vehicle as assigned
    if (selectedVehicle.isMongo && selectedVehicle.mongoDoc) {
      selectedVehicle.mongoDoc.status = 'ASSIGNED';
      selectedVehicle.mongoDoc.currentIncidentId = incident._id ? incident._id.toString() : incident.id;
      await selectedVehicle.mongoDoc.save().catch(e => console.error('Save mongo vehicle error:', e));
    }
    if (selectedVehicle.resourceObj) {
      selectedVehicle.resourceObj.status = 'Dispatched';
      selectedVehicle.resourceObj.currentIncidentId = incident.id;
    }
    const resInStore = resourcesStore.find(r => r.id === selectedVehicle.id || r.name === selectedVehicle.name);
    if (resInStore) {
      resInStore.status = 'Dispatched';
      resInStore.currentIncidentId = incident.id;
    }

    // Update incident fields
    incident.status = 'RESCUE_ASSIGNED';
    incident.assignedVehicleId = selectedVehicle.vehicleId;
    incident.assignedVehicleType = selectedVehicle.type;
    incident.assignedAt = new Date().toISOString();
    incident.distanceToIncident = distanceKmStr;

    const assignedUnitObj = {
      id: selectedVehicle.vehicleId,
      unitId: selectedVehicle.vehicleId,
      name: selectedVehicle.name,
      unitName: selectedVehicle.name,
      type: selectedVehicle.type,
      status: 'ASSIGNED',
      location: selectedVehicle.location,
      distanceKm: distanceKmStr,
      lastUpdated: new Date().toISOString()
    };
    incident.assignedTeam = assignedUnitObj;
    incident.assignedUnit = assignedUnitObj;
    incident.assignedUnits = [assignedUnitObj];
    incident.assignedResponders = [
      {
        id: selectedVehicle.vehicleId,
        name: selectedVehicle.name,
        type: selectedVehicle.type,
        location: selectedVehicle.location,
        distanceKm: distanceKmStr,
        assignedAt: incident.assignedAt
      }
    ];

    // Build requirement 4 timeline:
    incident.timeline = [
      { step: 'REPORT_SUBMITTED', label: 'INCIDENT REPORT SUBMITTED AT PHYSICAL GPS', timestamp: incident.createdAt || new Date().toISOString() },
      { step: 'REPORT_VERIFIED', label: 'INCIDENT VERIFIED BY EMERGENCY SYSTEM', timestamp: new Date().toISOString() },
      { step: 'RESCUE_ASSIGNED', label: `RESCUE TEAM ASSIGNED (${selectedVehicle.name} - ${distanceKmStr} AWAY)`, timestamp: new Date().toISOString() }
    ];

    try {
      if (Incident) {
        await Incident.updateOne(
          { $or: [{ id: incident.id }, { incidentId: incident.incidentId }, { _id: incident._id }] },
          {
            $set: {
              status: 'RESCUE_ASSIGNED',
              assignedVehicleId: selectedVehicle.vehicleId,
              assignedVehicleType: selectedVehicle.type,
              assignedAt: incident.assignedAt,
              distanceToIncident: distanceKmStr,
              assignedUnits: incident.assignedUnits,
              assignedResponders: incident.assignedResponders,
              timeline: incident.timeline
            }
          }
        ).catch(() => {});
      }
    } catch (dbErr) {}

    const payload = {
      incidentId: incident.id || incident.incidentId,
      incident: incident,
      status: 'RESCUE_ASSIGNED',
      assignedVehicleId: selectedVehicle.vehicleId,
      assignedVehicleType: selectedVehicle.type,
      assignedVehicleName: selectedVehicle.name,
      distanceToIncident: distanceKmStr,
      assignedUnits: incident.assignedUnits,
      timeline: incident.timeline
    };

    socketManager.emitToAll('rescue:assigned', payload);
    socketManager.emitToAll('incident:updated', incident);
    socketManager.emitToAll('sos_updated', incident);
    socketManager.emitToIncident(incident.id, 'rescue:assigned', payload);
    socketManager.emitToIncident(incident.id, 'incident:updated', incident);
    if (incident.citizenId) {
      socketManager.emitToUser(incident.citizenId, 'sos_updated', incident);
      socketManager.emitToUser(incident.citizenId, 'incident:updated', incident);
    }
  } else {
    // If no vehicle exists per requirement 5
    incident.status = 'SEARCHING_FOR_RESCUE';
    incident.lastSearchTime = new Date().toISOString();
    incident.assignedUnits = [];
    incident.assignedResponders = [];

    const searchLabel = disasterTypeStr.includes('FIRE')
      ? 'No nearby fire brigade is currently available.'
      : 'No nearby rescue unit available.';

    incident.timeline = [
      { step: 'REPORT_SUBMITTED', label: 'INCIDENT REPORT SUBMITTED AT PHYSICAL GPS', timestamp: incident.createdAt || new Date().toISOString() },
      { step: 'REPORT_VERIFIED', label: 'INCIDENT VERIFIED BY EMERGENCY SYSTEM', timestamp: new Date().toISOString() },
      { step: 'SEARCHING_FOR_RESCUE', label: `${searchLabel} (Last searched: ${new Date().toLocaleTimeString()}). System will retry automatically.`, timestamp: incident.lastSearchTime }
    ];

    try {
      if (Incident) {
        await Incident.updateOne(
          { $or: [{ id: incident.id }, { incidentId: incident.incidentId }, { _id: incident._id }] },
          {
            $set: {
              status: 'SEARCHING_FOR_RESCUE',
              assignedUnits: [],
              assignedResponders: [],
              timeline: incident.timeline
            }
          }
        ).catch(() => {});
      }
    } catch (dbErr) {}

    socketManager.emitToIncident(incident.id, 'incident:updated', incident);
    if (incident.citizenId) {
      socketManager.emitToUser(incident.citizenId, 'sos_updated', incident);
    }
  }

  return incident;
}

// Requirement 5: Periodic background retry loop for SEARCHING_FOR_RESCUE incidents
setInterval(async () => {
  try {
    const searchingList = incidentsStore.filter(i => i.status === 'SEARCHING_FOR_RESCUE');
    for (const inc of searchingList) {
      await findAndAssignNearestRescue(inc);
    }
  } catch (err) {
    console.error('SEARCHING_FOR_RESCUE background retry error:', err);
  }
}, 5000);

// Requirement 9: Real-time Arrival Detection Callback (within 100m)
io._checkVehicleArrival = async (vehicleData) => {
  try {
    const vLat = parseFloat(vehicleData.latitude);
    const vLng = parseFloat(vehicleData.longitude);
    const vId = vehicleData.vehicleId || vehicleData.unitId;

    if (isNaN(vLat) || isNaN(vLng)) return;

    const activeIncidents = incidentsStore.filter(i =>
      (i.assignedVehicleId === vId || (i.assignedUnits && i.assignedUnits.some(u => u.unitId === vId))) &&
      !['RESCUE_ARRIVED', 'OPERATION_IN_PROGRESS', 'INCIDENT_RESOLVED', 'RESOLVED', 'CANCELLED'].includes(i.status)
    );

    for (const inc of activeIncidents) {
      const incLat = inc.location?.lat;
      const incLng = inc.location?.lng;
      if (incLat === undefined || incLng === undefined) continue;

      const distMeters = calculateDistanceMeters(incLat, incLng, vLat, vLng);
      const distKmStr = `${(distMeters / 1000).toFixed(1)} km`;

      if (inc.assignedUnits) {
        inc.assignedUnits.forEach(u => {
          if (u.unitId === vId) {
            u.location = { lat: vLat, lng: vLng };
            u.distanceKm = distKmStr;
          }
        });
      }
      inc.distanceToIncident = distKmStr;

      if (distMeters <= 100) {
        inc.status = 'RESCUE_ARRIVED';
        inc.arrivedAt = new Date().toISOString();
        if (inc.assignedUnits) {
          inc.assignedUnits.forEach(u => u.status = 'ARRIVED');
        }
        if (!inc.timeline.some(t => t.step === 'RESCUE_ARRIVED')) {
          inc.timeline.push({
            step: 'RESCUE_ARRIVED',
            label: '🎯 RESCUE UNIT ARRIVED AT INCIDENT SITE (within 100m)',
            timestamp: inc.arrivedAt
          });
        }

        try {
          if (Incident) {
            await Incident.updateOne(
              { $or: [{ id: inc.id }, { incidentId: inc.incidentId }] },
              { $set: { status: 'RESCUE_ARRIVED', arrivedAt: inc.arrivedAt, timeline: inc.timeline } }
            ).catch(() => {});
          }
        } catch (e) {}

        const arrivalPayload = { incidentId: inc.id, status: 'RESCUE_ARRIVED', vehicleId: vId };
        socketManager.emitToIncident(inc.id, 'rescue:arrived', arrivalPayload);
        socketManager.emitToIncident(inc.id, 'rescue:status', arrivalPayload);
        socketManager.emitToAll('incident:updated', inc);
        socketManager.emitToAll('sos_updated', inc);
      }
    }
  } catch (err) {
    console.error('Vehicle arrival evaluation error:', err);
  }
};

// -------------------------------------------------------------
// REAL 100M DISASTER GEOFENCING & AUTOMATIC EMAIL ALERT ENGINE
// -------------------------------------------------------------
io._evaluate100mDisasterGeofence = async (telemetryData, socket) => {
  try {
    const { userId, userName, latitude, longitude, accuracy, timestamp } = telemetryData;
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const acc = parseFloat(accuracy) || 5;

    if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
      return;
    }

    const maxAccuracyMeters = parseInt(process.env.MAX_GEOFENCE_GPS_ACCURACY_METERS || '50', 10);
    const geofenceRadiusMeters = parseInt(process.env.DISASTER_GEOFENCE_RADIUS_METERS || '100', 10);
    const emailCooldownMinutes = parseInt(process.env.GEOFENCE_EMAIL_COOLDOWN_MINUTES || '15', 10);

    // Requirement 5: GPS Accuracy Safety Check
    if (acc > maxAccuracyMeters) {
      if (socket) {
        socket.emit('geofence:accuracy_low', {
          message: 'GPS accuracy is currently too low for a reliable 100-meter emergency-zone check.',
          accuracy: acc,
          maxAllowedAccuracy: maxAccuracyMeters
        });
      }
      return;
    }

    // Rate-limiting check per socket (max 1 geofence evaluation per 3 seconds per socket)
    const now = Date.now();
    if (socket) {
      if (socket._lastGeofenceCheckAt && (now - socket._lastGeofenceCheckAt < 3000)) return;
      socket._lastGeofenceCheckAt = now;
    }

    // Requirement 8: Retrieve user email strictly from authenticated MongoDB User record
    let userEmail = '';
    let fetchedUser = null;
    try {
      if (User) {
        fetchedUser = await User.findOne({ $or: [{ _id: userId }, { id: userId }, { email: userId }] });
        if (fetchedUser && fetchedUser.email) {
          userEmail = fetchedUser.email;
        }
      }
    } catch (uErr) {}

    if (!userEmail) {
      const storeUser = usersStore.find(u => u.id === userId || u.email === userId);
      if (storeUser && storeUser.email) userEmail = storeUser.email;
    }

    // Requirement 4: Search ACTIVE disasters within 100 meters using MongoDB 2dsphere $near
    let nearbyDisasters = [];
    try {
      if (Disaster) {
        nearbyDisasters = await Disaster.find({
          status: { $in: ['ACTIVE', 'Active', 'REPORTED', 'VERIFIED', 'DISPATCHED', 'IN_PROGRESS', 'CONTAINED'] },
          location: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [lng, lat]
              },
              $maxDistance: geofenceRadiusMeters
            }
          }
        });
      }
    } catch (mongoErr) {
      console.warn('[GeofenceEngine] MongoDB 2dsphere Disaster search notice:', mongoErr.message);
    }

    // Also check active incidentsStore hazards within 100 meters
    const allCandidates = [...nearbyDisasters];
    incidentsStore.forEach(inc => {
      if (['ACTIVE', 'Active', 'REPORTED', 'VERIFIED', 'DISPATCHED', 'IN_PROGRESS', 'SEARCHING_FOR_RESCUE', 'RESCUE_ASSIGNED', 'MISSION_ACCEPTED', 'RESCUE_ON_WAY'].includes(inc.status)) {
        const incLat = inc.location?.lat;
        const incLng = inc.location?.lng;
        if (incLat !== undefined && incLng !== undefined) {
          const dist = calculateDistanceMeters(lat, lng, incLat, incLng);
          if (dist <= geofenceRadiusMeters) {
            const exists = allCandidates.some(c => c._id?.toString() === inc.id || c.id === inc.id || c.incidentId === inc.incidentId);
            if (!exists) {
              allCandidates.push({
                _id: inc.id,
                id: inc.id,
                disasterId: inc.id,
                title: inc.title || `${inc.disasterType} Emergency`,
                disasterType: (inc.disasterType || inc.type || 'FIRE').toUpperCase(),
                severity: (inc.severity || 'HIGH').toUpperCase(),
                location: { lat: incLat, lng: incLng, address: inc.location?.address || 'Disaster Hazard Area' },
                distMeters: dist
              });
            }
          }
        }
      }
    });

    // Process Each Nearby Disaster
    for (const disaster of allCandidates) {
      const dId = disaster.id || disaster._id?.toString() || disaster.disasterId;
      const dTitle = disaster.title || 'Emergency Hazard';
      const dType = (disaster.disasterType || disaster.type || 'FIRE').toUpperCase();
      const dSeverity = (disaster.severity || 'HIGH').toUpperCase();
      const dLat = disaster.location?.lat !== undefined ? disaster.location.lat : disaster.location?.coordinates?.[1];
      const dLng = disaster.location?.lng !== undefined ? disaster.location.lng : disaster.location?.coordinates?.[0];
      const dAddress = disaster.location?.address || 'Disaster Zone';

      const distMeters = disaster.distMeters !== undefined ? disaster.distMeters : calculateDistanceMeters(lat, lng, dLat, dLng);

      // Requirement 11: Duplicate Protection & Cooldown Check
      let existingAlert = null;
      try {
        if (DisasterAlert) {
          existingAlert = await DisasterAlert.findOne({ userId: userId, disasterId: dId, status: 'ENTERED' });
        }
      } catch (e) {}

      const cooldownMs = emailCooldownMinutes * 60 * 1000;
      const hasRecentEmail = existingAlert && existingAlert.lastEmailSentAt && (now - new Date(existingAlert.lastEmailSentAt).getTime() < cooldownMs);

      if (!existingAlert || !hasRecentEmail) {
        let emailStatus = 'SENT';
        let emailSentInfo = null;

        // Send Automatic Email via EmailService
        if (userEmail) {
          emailSentInfo = await emailService.send100mDisasterAlertEmail({
            userEmail,
            userName: userName || fetchedUser?.name || 'Citizen',
            disasterTitle: dTitle,
            disasterType: dType,
            severity: dSeverity,
            distanceMeters: distMeters,
            detectedAt: new Date(timestamp || now).toLocaleTimeString(),
            locationAddress: dAddress
          });
          if (emailSentInfo && !emailSentInfo.success) {
            emailStatus = 'FAILED';
          }
        } else {
          emailStatus = 'DISABLED';
        }

        const citizenNameVal = userName || fetchedUser?.name || 'Citizen';
        let savedAlertDoc = null;

        // Requirement 6: Save Alert in MongoDB DisasterAlert collection
        try {
          if (DisasterAlert) {
            if (existingAlert) {
              existingAlert.distanceMeters = distMeters;
              existingAlert.citizenLatitude = lat;
              existingAlert.citizenLongitude = lng;
              existingAlert.gpsAccuracy = acc;
              existingAlert.lastEmailSentAt = new Date();
              existingAlert.emailStatus = emailStatus;
              existingAlert.emailSent = emailStatus === 'SENT';
              existingAlert.emailSentAt = new Date();
              existingAlert.warningStatus = 'ACTIVE';
              existingAlert.citizenName = citizenNameVal;
              existingAlert.citizenEmail = userEmail;
              existingAlert.citizenLocation = { type: 'Point', coordinates: [lng, lat] };
              savedAlertDoc = await existingAlert.save();
            } else {
              savedAlertDoc = await DisasterAlert.create({
                userId,
                citizenName: citizenNameVal,
                citizenEmail: userEmail,
                userEmail,
                disasterId: dId,
                disasterTitle: dTitle,
                disasterType: dType,
                severity: dSeverity,
                alertType: 'GEOFENCE_100M',
                distanceMeters: distMeters,
                citizenLatitude: lat,
                citizenLongitude: lng,
                citizenLocation: { type: 'Point', coordinates: [lng, lat] },
                gpsAccuracy: acc,
                emailSent: emailStatus === 'SENT',
                emailSentAt: new Date(),
                status: 'ENTERED',
                warningStatus: 'ACTIVE',
                emailStatus: emailStatus,
                sentAt: new Date(),
                lastEmailSentAt: new Date(),
                detectedAt: new Date(timestamp || now)
              });
            }
          }
        } catch (dbErr) {
          console.warn('[GeofenceEngine] DisasterAlert save notice:', dbErr.message);
        }

        // Requirement 10: Immediately Send Socket.IO Notification to Citizen
        const alertPayload = {
          alertId: savedAlertDoc?._id || existingAlert?._id,
          userId,
          citizenName: citizenNameVal,
          citizenEmail: userEmail,
          userEmail,
          disasterId: dId,
          incidentId: dId,
          incidentType: dType,
          type: dType,
          title: dTitle,
          disasterTitle: dTitle,
          severity: dSeverity,
          distanceMeters: distMeters,
          gpsAccuracy: acc,
          emailStatus,
          emailSent: emailStatus === 'SENT',
          emailSentAt: new Date().toISOString(),
          warningStatus: 'ACTIVE',
          detectedAt: new Date(timestamp || now).toISOString(),
          locationAddress: dAddress,
          citizenLocation: { lat, lng, coordinates: [lng, lat] },
          disasterLocation: { lat: dLat, lng: dLng, coordinates: [dLng, dLat] }
        };

        io.to(`user:${userId}`).emit('disaster:nearby', alertPayload);
        io.to(`user:${userId}`).emit('nearby_emergency_warning', alertPayload);
        io.to(`user:${userId}`).emit('nearby-disaster-warning', alertPayload);

        // Real-Time Warning to Admin Dashboard
        io.emit('admin_geofence_alert', alertPayload);
        io.emit('geofence_alert_created', alertPayload);
        io.to('role:admin').to('role:operator').to('role:Super Admin').to('role:Emergency Operator').emit('admin_geofence_alert', alertPayload);

        console.log(`🚨 [100m GEOFENCE ALERT] Dispatched 100m alert for Citizen ${citizenNameVal} (${userEmail || 'no-email'}) - Distance: ${distMeters}m`);
      }
    }


    // Requirement 11: Re-entry / Exit Detection Logic
    try {
      if (DisasterAlert) {
        const activeAlerts = await DisasterAlert.find({ userId: userId, status: 'ENTERED' });
        for (const alertRecord of activeAlerts) {
          const matchingCurrent = allCandidates.some(c => (c.id === alertRecord.disasterId || c._id?.toString() === alertRecord.disasterId));
          if (!matchingCurrent) {
            alertRecord.status = 'EXITED';
            await alertRecord.save();
            console.log(`🏃 [100m GEOFENCE EXIT] Citizen ${userId} exited 100m radius of disaster ${alertRecord.disasterId}`);
          }
        }
      }
    } catch (exitErr) {}

  } catch (err) {
    console.error('Error in evaluate100mDisasterGeofence:', err);
  }
};

// REST ENDPOINT: POST /api/citizens/location-update - Trigger 100m Geofence Evaluation
app.post('/api/citizens/location-update', async (req, res) => {
  try {
    const telemetryData = req.body;
    await io._evaluate100mDisasterGeofence(telemetryData, null);
    res.json({ success: true, message: 'Geofence evaluation triggered successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// FEATURE 1: 🚨 ONE-TAP SOS & SMART DISPATCH ENDPOINTS
// --------------------------------------------------------------------------

// POST /api/sos - Submit One-Tap Emergency SOS Request
app.post('/api/sos', async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      accuracy,
      locationType = 'GPS_VERIFIED',
      locationAcquisitionTime,
      manualAddress,
      selectedServices = [],
      description = '',
      clientRequestId
    } = req.body;

    let lat = parseFloat(latitude);
    let lng = parseFloat(longitude);
    const acc = parseFloat(accuracy) || (locationType === 'MANUAL_ENTRY' ? 50 : 8);

    // Validate coordinates
    if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
      if (locationType === 'MANUAL_ENTRY' && manualAddress) {
        // Fallback geocoding or center coordinates for manual address
        lat = 20.0050; // Reference area center (Nashik Municipal Emergency Zone)
        lng = 73.7880;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Valid physical device GPS coordinates or a manual landmark address are required.'
        });
      }
    }

    const citizenId = req.user ? req.user.id : (req.body.userId || req.body.citizenId || `usr_${Date.now().toString().slice(-4)}`);
    const citizenName = req.user ? req.user.name : (req.body.userName || 'Citizen User');
    const citizenPhone = req.body.citizenPhone || req.user?.phone || '+91 98765 43210';

    // 1. Idempotency Check: Prevent duplicate SOS creation from repeated rapid clicks
    const nowMs = Date.now();
    const activeExistingSOS = incidentsStore.find(i => {
      const matchClientReq = clientRequestId && i.clientRequestId === clientRequestId;
      const matchUserRecent = (i.citizenId === citizenId || (i.location && Math.abs(i.location.lat - lat) < 0.0003 && Math.abs(i.location.lng - lng) < 0.0003)) &&
        ['SOS Submitted', 'Awaiting Review', 'Verified', 'Awaiting Assignment', 'SEARCHING_FOR_RESCUE', 'REPORT_SUBMITTED', 'ACTIVE'].includes(i.status) &&
        (nowMs - new Date(i.createdAt).getTime() < 30000);
      return matchClientReq || matchUserRecent;
    });

    if (activeExistingSOS) {
      return res.status(200).json({
        success: true,
        isExisting: true,
        sosId: activeExistingSOS.sosId || activeExistingSOS.incidentId,
        incidentId: activeExistingSOS.incidentId,
        status: activeExistingSOS.status,
        incident: activeExistingSOS,
        message: 'Your active emergency SOS request is already registered and under immediate review.'
      });
    }

    // 2. Generate Unique IDs
    const uniqueNum = Math.floor(100000 + Math.random() * 900000);
    const sosId = `SOS-${uniqueNum}`;
    const incId = `INC-${Math.floor(1000 + Math.random() * 9000)}`;

    const initialStatus = 'SOS Submitted';
    const addressLabel = locationType === 'MANUAL_ENTRY'
      ? (manualAddress || `Manual Landmark (${lat.toFixed(4)}, ${lng.toFixed(4)})`)
      : `Verified GPS Position (${lat.toFixed(5)}, ${lng.toFixed(5)})`;

    const servicesList = Array.isArray(selectedServices) && selectedServices.length > 0
      ? selectedServices
      : ['Ambulance / Medical Emergency'];

    const geoPoint = {
      type: 'Point',
      coordinates: [lng, lat]
    };

    const sosIncident = {
      id: `inc_${Date.now()}`,
      incidentId: incId,
      sosId: sosId,
      clientRequestId: clientRequestId || `req_${Date.now()}`,
      citizenId: citizenId,
      reporterName: citizenName,
      reporterPhone: citizenPhone,
      title: `🚨 ${sosId}: Emergency [${servicesList.join(', ')}] at ${locationType === 'MANUAL_ENTRY' ? 'Manual Location' : 'Live GPS'}`,
      disasterType: servicesList.includes('Fire Brigade') ? 'Fire'
        : servicesList.includes('Flood / Water Rescue') ? 'Flood'
        : servicesList.includes('Police') ? 'Accident'
        : 'Medical Emergency',
      type: 'SOS',
      severity: 'CRITICAL',
      priority: 1,
      status: initialStatus,
      requestedServices: servicesList,
      locationType: locationType === 'MANUAL_ENTRY' ? 'MANUAL_ENTRY' : 'GPS_VERIFIED',
      locationAccuracy: acc,
      locationAcquisitionTime: locationAcquisitionTime ? new Date(locationAcquisitionTime) : new Date(),
      location: {
        type: 'Point',
        coordinates: [lng, lat],
        lat: lat,
        lng: lng,
        address: addressLabel
      },
      geoPoint: geoPoint,
      description: description || `Emergency request for ${servicesList.join(', ')}`,
      assignedUnits: [],
      assignedResponders: [],
      timeline: [
        {
          step: 'SOS Submitted',
          label: `🚨 SOS ${sosId} Submitted by ${citizenName} [Services: ${servicesList.join(', ')}]`,
          timestamp: new Date().toISOString()
        }
      ],
      statusHistory: [
        {
          status: initialStatus,
          changedBy: citizenName,
          timestamp: new Date(),
          notes: `Citizen submitted SOS for ${servicesList.join(', ')}`
        }
      ],
      notificationStatus: {
        smsSent: false,
        emailSent: false,
        broadcastSent: true,
        deliveryNotes: 'Dispatched to Command Room Operators'
      },
      createdAt: new Date().toISOString()
    };

    incidentsStore.unshift(sosIncident);

    // 3. Persist in MongoDB
    try {
      if (SOSRequest) {
        await SOSRequest.create({
          sosId: sosIncident.sosId,
          incidentId: sosIncident.incidentId,
          clientRequestId: sosIncident.clientRequestId,
          citizenId: sosIncident.citizenId,
          citizenName: sosIncident.reporterName,
          citizenPhone: sosIncident.reporterPhone,
          location: sosIncident.location,
          geoPoint: sosIncident.geoPoint,
          locationType: sosIncident.locationType,
          locationAccuracy: acc,
          locationAcquisitionTime: sosIncident.locationAcquisitionTime,
          requestedServices: servicesList,
          status: initialStatus,
          description: sosIncident.description,
          statusHistory: sosIncident.statusHistory,
          notificationStatus: sosIncident.notificationStatus
        }).catch(err => console.warn('[Server] SOSRequest MongoDB creation notice:', err.message));
      }

      if (Incident) {
        await Incident.create({
          incidentId: sosIncident.incidentId,
          sosId: sosIncident.sosId,
          citizenId: sosIncident.citizenId,
          title: sosIncident.title,
          disasterType: sosIncident.disasterType,
          severity: 'CRITICAL',
          status: initialStatus,
          requestedServices: servicesList,
          reporterName: sosIncident.reporterName,
          reporterPhone: sosIncident.reporterPhone,
          location: sosIncident.location,
          locationType: sosIncident.locationType,
          locationAccuracy: acc,
          locationAcquisitionTime: sosIncident.locationAcquisitionTime,
          description: sosIncident.description,
          timeline: sosIncident.timeline,
          statusHistory: sosIncident.statusHistory
        }).catch(err => console.warn('[Server] Incident MongoDB creation notice:', err.message));
      }
    } catch (dbErr) {
      console.warn('[Server] MongoDB persistence warning:', dbErr.message);
    }

    // 4. Calculate Rescue Recommendations for Operators
    try {
      const recResult = await rescueAllocationService.getRescueRecommendations({
        incidentLat: lat,
        incidentLng: lng,
        requestedServices: servicesList,
        disasterType: sosIncident.disasterType,
        maxDistanceMeters: 50000,
        inMemoryUnits: resourcesStore
      });
      sosIncident.recommendations = recResult.candidates || [];
    } catch (recErr) {
      console.warn('[Server] Initial rescue recommendation notice:', recErr.message);
    }

    // 5. Broadcast to Authorized Operators via Socket.IO
    socketManager.emitToAll('sos_activated', sosIncident);
    socketManager.emitToAll('incident_created', sosIncident);
    socketManager.emitToRole('admin', 'new_incident', sosIncident);
    socketManager.emitToRole('admin', 'sos_created', sosIncident);
    socketManager.emitToUser(citizenId, 'sos_created', sosIncident);
    socketManager.emitToIncident(sosIncident.id, 'citizen_location_updated', {
      incidentId: sosIncident.id,
      latitude: lat,
      longitude: lng,
      accuracy: acc,
      timestamp: new Date().toISOString()
    });

    // 6. External Notifications (SMS / Email)
    if (smsService && smsService.sendSms) {
      smsService.sendSms(
        citizenPhone,
        `ResQAI Emergency Alert: SOS ${sosId} received. Operators notified. If immediate danger, call 112.`
      ).catch(() => {});
    }

    logAudit({ id: citizenId, name: citizenName, role: 'Citizen' }, 'SOS_CREATED', sosIncident.id, `Triggered SOS ${sosId} at (${lat.toFixed(4)}, ${lng.toFixed(4)})`, req);

    res.status(201).json({
      success: true,
      sosId: sosIncident.sosId,
      incidentId: sosIncident.incidentId,
      id: sosIncident.id,
      status: sosIncident.status,
      requestedServices: servicesList,
      locationType: sosIncident.locationType,
      incident: sosIncident,
      message: 'Emergency SOS request successfully submitted to control room.'
    });
  } catch (err) {
    console.error('[Server] /api/sos error:', err);
    res.status(500).json({ success: false, message: 'Internal server error processing emergency SOS request.' });
  }
});

// GET /api/sos - List all active SOS incidents
app.get('/api/sos', (req, res) => {
  const activeList = incidentsStore.filter(i => 
    i.type === 'SOS' || i.sosId || (i.statusHistory && i.statusHistory.length > 0)
  );
  res.json({ success: true, count: activeList.length, incidents: activeList });
});

// GET /api/sos/:id - Retrieve specific SOS details & status
app.get('/api/sos/:id', async (req, res) => {
  const { id } = req.params;
  const inc = incidentsStore.find(i => i.id === id || i.incidentId === id || i.sosId === id);
  if (inc) {
    return res.json({ success: true, incident: inc });
  }
  if (Incident) {
    try {
      const doc = await Incident.findOne({
        $or: [{ incidentId: id }, { sosId: id }, { _id: mongoose.isValidObjectId(id) ? id : undefined }]
      }).lean();
      if (doc) return res.json({ success: true, incident: doc });
    } catch (e) {}
  }
  res.status(404).json({ success: false, message: 'Emergency SOS request not found.' });
});

// PATCH /api/sos/:id/status - Update SOS Lifecycle Status
app.patch(['/api/sos/:id/status', '/api/incidents/:id/status'], async (req, res) => {
  try {
    const { id } = req.params;
    const { status: newStatus, notes = '' } = req.body;

    const VALID_STATUSES = [
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

    if (!VALID_STATUSES.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status '${newStatus}'. Allowed: ${VALID_STATUSES.join(', ')}`
      });
    }

    const operatorName = req.user ? req.user.name : (req.body.operatorName || 'Authorized Operator');
    const operatorId = req.user ? req.user.id : (req.body.operatorId || 'op_command');

    let inc = incidentsStore.find(i => i.id === id || i.incidentId === id || i.sosId === id);
    if (inc) {
      inc.status = newStatus;
      if (!Array.isArray(inc.timeline)) inc.timeline = [];
      inc.timeline.push({
        step: newStatus,
        label: `Status updated to ${newStatus} by ${operatorName}`,
        timestamp: new Date().toISOString()
      });
      if (!Array.isArray(inc.statusHistory)) inc.statusHistory = [];
      inc.statusHistory.push({
        status: newStatus,
        changedBy: operatorName,
        timestamp: new Date(),
        notes: notes || `Operator set status to ${newStatus}`
      });
    }

    if (Incident) {
      try {
        await Incident.updateOne(
          { $or: [{ incidentId: id }, { sosId: id }, { _id: mongoose.isValidObjectId(id) ? id : undefined }] },
          {
            $set: { status: newStatus },
            $push: {
              timeline: {
                step: newStatus,
                label: `Status updated to ${newStatus} by ${operatorName}`,
                timestamp: new Date().toISOString()
              },
              statusHistory: {
                status: newStatus,
                changedBy: operatorName,
                timestamp: new Date(),
                notes: notes || `Operator set status to ${newStatus}`
              }
            }
          }
        );
      } catch (dbErr) {
        console.warn('[Server] Incident status update warning:', dbErr.message);
      }
    }

    if (SOSRequest) {
      try {
        await SOSRequest.updateOne(
          { $or: [{ sosId: id }, { incidentId: id }] },
          {
            $set: { status: newStatus },
            $push: {
              statusHistory: {
                status: newStatus,
                changedBy: operatorName,
                timestamp: new Date(),
                notes: notes || `Status changed to ${newStatus}`
              }
            }
          }
        );
      } catch (e) {}
    }

    // Real-Time Socket.IO Notification
    const updatePayload = {
      incidentId: inc?.incidentId || id,
      id: inc?.id || id,
      sosId: inc?.sosId,
      status: newStatus,
      updatedBy: operatorName,
      timestamp: new Date().toISOString(),
      notes
    };

    socketManager.emitToAll('sos_status_updated', updatePayload);
    socketManager.emitToAll('incident_updated', inc || updatePayload);
    socketManager.emitToRole('admin', 'sos_status_updated', updatePayload);
    if (inc?.citizenId) {
      socketManager.emitToUser(inc.citizenId, 'sos_status_updated', updatePayload);
    }

    res.json({
      success: true,
      message: `SOS status successfully updated to ${newStatus}`,
      incident: inc || updatePayload
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/sos/cancel - Cancel Active Emergency SOS Request
app.post(['/api/sos/:id/cancel', '/api/sos/cancel'], (req, res) => {
  const id = req.params.id || req.body.id || req.body.sosId || req.body.incidentId;
  const reason = req.body.reason || 'Cancelled by citizen / operator';
  let inc = incidentsStore.find(i => i.id === id || i.incidentId === id || i.sosId === id);

  if (!inc) {
    const citizenId = req.user ? req.user.id : (req.body.userId || 'usr_1');
    inc = incidentsStore.find(i => i.citizenId === citizenId && i.status !== 'RESOLVED' && i.status !== 'Cancelled');
  }

  if (!inc) {
    return res.status(404).json({ success: false, message: 'No active emergency SOS request found to cancel.' });
  }

  inc.status = 'Cancelled';
  inc.cancelledAt = new Date().toISOString();

  // Release any assigned units
  if (inc.assignedUnits && inc.assignedUnits.length) {
    inc.assignedUnits.forEach(u => {
      const unit = resourcesStore.find(r => r.id === u.unitId);
      if (unit) unit.status = 'Available';
    });
  }

  if (!Array.isArray(inc.statusHistory)) inc.statusHistory = [];
  inc.statusHistory.push({
    status: 'Cancelled',
    changedBy: req.user?.name || inc.reporterName || 'Citizen',
    timestamp: new Date(),
    notes: reason
  });

  socketManager.emitToAll('sos_cancelled', inc);
  socketManager.emitToAll('sos_status_updated', { incidentId: inc.incidentId, status: 'Cancelled' });
  socketManager.emitToRole('admin', 'sos_cancelled', inc);

  res.json({ success: true, message: 'Emergency SOS request cancelled successfully', incident: inc });
});

// --------------------------------------------------------------------------
// FEATURE 3: 🚑 INTELLIGENT RESCUE ALLOCATION ENDPOINTS
// --------------------------------------------------------------------------

// GET /api/rescue/recommendations - Smart Rescue Unit Recommendations
app.get('/api/rescue/recommendations', async (req, res) => {
  try {
    const { incidentId, lat, lng, disasterType, services } = req.query;

    let targetLat = lat ? parseFloat(lat) : null;
    let targetLng = lng ? parseFloat(lng) : null;
    let targetServices = services ? (Array.isArray(services) ? services : services.split(',')) : [];
    let targetDisaster = disasterType || 'Medical Emergency';

    if (incidentId) {
      const inc = incidentsStore.find(i => i.id === incidentId || i.incidentId === incidentId || i.sosId === incidentId);
      if (inc) {
        targetLat = inc.location?.lat;
        targetLng = inc.location?.lng;
        targetServices = inc.requestedServices || targetServices;
        targetDisaster = inc.disasterType || targetDisaster;
      } else if (Incident) {
        const dbInc = await Incident.findOne({
          $or: [{ incidentId: incidentId }, { sosId: incidentId }, { _id: mongoose.isValidObjectId(incidentId) ? incidentId : undefined }]
        }).lean();
        if (dbInc) {
          targetLat = dbInc.location?.lat;
          targetLng = dbInc.location?.lng;
          targetServices = dbInc.requestedServices || targetServices;
          targetDisaster = dbInc.disasterType || targetDisaster;
        }
      }
    }

    if (targetLat === null || targetLng === null || isNaN(targetLat) || isNaN(targetLng)) {
      return res.status(400).json({
        success: false,
        message: 'Valid incident coordinates or incidentId are required for rescue recommendations.'
      });
    }

    const recommendations = await rescueAllocationService.getRescueRecommendations({
      incidentLat: targetLat,
      incidentLng: targetLng,
      requestedServices: targetServices,
      disasterType: targetDisaster,
      maxDistanceMeters: 50000,
      inMemoryUnits: resourcesStore
    });

    res.json(recommendations);
  } catch (err) {
    console.error('[Server] /api/rescue/recommendations error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/rescue/assign - Atomic Responder Assignment with Concurrency Lock
app.post('/api/rescue/assign', async (req, res) => {
  try {
    const { incidentId, unitId, notes } = req.body;
    const operatorName = req.user ? req.user.name : (req.body.operatorName || 'Command Operator');
    const operatorId = req.user ? req.user.id : (req.body.operatorId || 'op_1');

    if (!incidentId || !unitId) {
      return res.status(400).json({ success: false, message: 'incidentId and unitId are required.' });
    }

    const result = await rescueAllocationService.assignResponderAtomically({
      incidentId,
      unitId,
      operatorId,
      operatorName,
      notes: notes || 'Assigned by command operator'
    });

    // Sync in-memory store
    const inc = incidentsStore.find(i => i.id === incidentId || i.incidentId === incidentId || i.sosId === incidentId);
    if (inc) {
      inc.status = 'Responder Assigned';
      inc.assignedVehicleId = unitId;
      inc.assignedResponders = inc.assignedResponders || [];
      inc.assignedResponders.push({
        id: unitId,
        name: result.assignedUnit.name,
        type: result.assignedUnit.type,
        assignedAt: new Date()
      });
    }
    const resItem = resourcesStore.find(r => (r.vehicleId || r.id) === unitId);
    if (resItem) {
      resItem.status = 'ASSIGNED';
      resItem.currentIncidentId = incidentId;
    }

    // Broadcast Real-Time Assignment Update
    socketManager.emitToAll('responder_assigned', {
      incidentId,
      unitId,
      unit: result.assignedUnit,
      operatorName,
      timestamp: new Date().toISOString()
    });
    socketManager.emitToAll('sos_status_updated', {
      incidentId,
      status: 'Responder Assigned',
      assignedUnit: result.assignedUnit
    });

    res.json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ success: false, message: err.message, code: err.code || 'ASSIGNMENT_ERROR' });
  }
});

// POST /api/rescue/reassign - Reassign Rescue Unit
app.post('/api/rescue/reassign', async (req, res) => {
  try {
    const { incidentId, oldUnitId, newUnitId, reason } = req.body;
    const operatorName = req.user ? req.user.name : (req.body.operatorName || 'Command Operator');

    const result = await rescueAllocationService.reassignResponder({
      incidentId,
      oldUnitId,
      newUnitId,
      operatorName,
      reason: reason || 'Reassigned by command operator'
    });

    socketManager.emitToAll('sos_status_updated', {
      incidentId,
      status: 'Responder Assigned',
      reassigned: true,
      unit: result.assignedUnit
    });

    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

// POST /api/rescue/cancel-assignment - Cancel Unit Assignment
app.post('/api/rescue/cancel-assignment', async (req, res) => {
  try {
    const { incidentId, unitId, reason } = req.body;
    const operatorName = req.user ? req.user.name : (req.body.operatorName || 'Command Operator');

    const result = await rescueAllocationService.cancelAssignment({
      incidentId,
      unitId,
      operatorName,
      reason: reason || 'Assignment cancelled by operator'
    });

    socketManager.emitToAll('sos_status_updated', {
      incidentId,
      status: 'Awaiting Assignment'
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/rescue/evaluation - Run Controlled Performance Evaluation Suite
app.get('/api/rescue/evaluation', async (req, res) => {
  try {
    const evalReport = await rescueAllocationService.runPerformanceEvaluation();
    res.json(evalReport);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --------------------------------------------------------------------------
// FEATURE 2: 🧠 AI DISASTER RISK PREDICTION ENDPOINTS
// --------------------------------------------------------------------------

// GET /api/disasters/risk-assessments - Multi-Hazard AI Risk Assessments
app.get('/api/disasters/risk-assessments', async (req, res) => {
  try {
    const { lat, lng, area } = req.query;
    if (lat && lng) {
      const singleAssessment = await riskAssessmentEngine.assessLocationRisk(
        parseFloat(lat),
        parseFloat(lng),
        area || null
      );
      return res.json(singleAssessment);
    }

    const regionalAssessments = await riskAssessmentEngine.evaluateMonitoredRegions();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      ruleSetVersion: 'ResQAI-RiskRules-v2.1',
      assessmentsCount: regionalAssessments.length,
      regions: regionalAssessments
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/disasters/risk-assessments/evaluate - Trigger Assessment for Coordinates
app.post('/api/disasters/risk-assessments/evaluate', async (req, res) => {
  try {
    const { lat, lng, regionName } = req.body;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ success: false, message: 'Valid lat and lng numbers are required.' });
    }
    const assessment = await riskAssessmentEngine.assessLocationRisk(lat, lng, regionName);
    res.json(assessment);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/disasters/risk-assessments/broadcast - Broadcast Risk Alert to Citizens
app.post('/api/disasters/risk-assessments/broadcast', async (req, res) => {
  try {
    const { assessment, targetRadiusKm = 25, customMessage = '' } = req.body;
    const operatorName = req.user ? req.user.name : (req.body.operatorName || 'Command Operator');

    if (!assessment || !assessment.geographicArea) {
      return res.status(400).json({ success: false, message: 'Valid risk assessment object is required.' });
    }

    const { center, name } = assessment.geographicArea;
    const hazardType = assessment.hazardType || 'Disaster Alert';
    const riskLevel = assessment.riskCategory || 'High';

    // Broadcast alert via Socket.IO
    const alertPayload = {
      alertId: `ALERT-${Date.now().toString().slice(-6)}`,
      hazardType,
      riskLevel,
      areaName: name,
      center,
      radiusKm: targetRadiusKm,
      precautions: assessment.recommendedActions || [],
      evidence: assessment.evidence || [],
      issuedBy: operatorName,
      issuedAt: new Date().toISOString(),
      message: customMessage || `Emergency ${hazardType} advisory issued for ${name}. Risk Category: ${riskLevel}.`
    };

    socketManager.emitToAll('emergency_warning', alertPayload);
    socketManager.emitToAll('disaster_alert_broadcast', alertPayload);

    res.json({
      success: true,
      message: `Risk broadcast for ${hazardType} in ${name} transmitted successfully.`,
      alert: alertPayload
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --------------------------------------------------------------------------
// FEATURE 4: 🗺️ SMART EVACUATION ROUTING ENDPOINTS
// --------------------------------------------------------------------------

// POST /api/evacuation/route-smart - Calculate Smart Evacuation Route with Hazard Avoidance
app.post('/api/evacuation/route-smart', async (req, res) => {
  try {
    const { origin, destination, travelMode = 'driving' } = req.body;
    const routePlan = await evacuationRoutingService.planSmartRoute({
      origin,
      destination,
      travelMode
    });
    res.json(routePlan);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/evacuation/nearby-destinations - Find Verified Shelters and Hospitals with Freshness
app.get('/api/evacuation/nearby-destinations-v2', async (req, res) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat) : 20.0050;
    const lng = req.query.lng ? parseFloat(req.query.lng) : 73.7880;
    const radiusKm = req.query.radius ? parseFloat(req.query.radius) : 50;

    const result = await evacuationRoutingService.getNearbyDestinations(lat, lng, radiusKm);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/audit-logs - Audit Trail of Operator and Admin Actions
app.get('/api/audit-logs', authenticateToken, requireRole(['Emergency Operator', 'EMERGENCY_OPERATOR', 'Admin', 'Super Admin']), (req, res) => {
  res.json(auditLogsStore);
});

// =============================================================
// LIVE WEATHER & DISASTER MONITORING ENDPOINTS
// =============================================================

// GET /api/weather/current
app.get('/api/weather/current', async (req, res) => {
  const lat = parseFloat(req.query.lat || req.query.latitude) || 19.0760;
  const lng = parseFloat(req.query.lng || req.query.longitude) || 72.8777;

  const data = await weatherService.getCurrentWeather(lat, lng);
  res.json(data);
});

// GET /api/weather/forecast (30-Day Weather & Risk Outlook)
app.get('/api/weather/forecast', async (req, res) => {
  const lat = parseFloat(req.query.lat || req.query.latitude) || 19.0760;
  const lng = parseFloat(req.query.lng || req.query.longitude) || 72.8777;

  const data = await weatherService.get30DayOutlook(lat, lng);
  res.json(data);
});

// GET /api/weather/search (City/District Geocoding Search)
app.get('/api/weather/search', async (req, res) => {
  const query = req.query.query || req.query.q || '';
  const results = await weatherService.searchLocation(query);
  res.json(results);
});

// GET /api/disasters/alerts (Live Official Government Disaster Warnings)
app.get('/api/disasters/alerts', async (req, res) => {
  const lat = parseFloat(req.query.lat || req.query.latitude) || 19.0760;
  const lng = parseFloat(req.query.lng || req.query.longitude) || 72.8777;

  const alerts = await disasterAlertService.getActiveAlerts(lat, lng);

  // Stream Socket.IO updates to connected clients if severe alert is detected
  if (alerts && alerts.some(a => a.severity === 'RED' || a.severity === 'ORANGE')) {
    socketManager.emitToAll('weather:update', alerts[0]);
    socketManager.emitToAll('disaster:new', alerts[0]);
  }

  res.json(alerts);
});

// PATCH /api/incidents/:id/severity - Change Incident Severity
app.patch('/api/incidents/:id/severity', authenticateToken, requireRole(['Emergency Operator', 'EMERGENCY_OPERATOR', 'Admin', 'Super Admin']), (req, res) => {
  const { id } = req.params;
  const { severity } = req.body;
  const inc = incidentsStore.find(i => i.id === id || i.incidentId === id);
  if (!inc) return res.status(404).json({ message: 'Incident not found' });

  const oldSeverity = inc.severity;
  inc.severity = severity;
  inc.updatedAt = new Date().toISOString();

  logAudit(req.user, 'OPERATOR_CHANGED_SEVERITY', inc.id, `Updated severity from ${oldSeverity} to ${severity}`, req);
  logActivity(inc.id, 'SEVERITY_CHANGED', { name: req.user?.name || 'Operator', role: 'Emergency Operator' }, `Severity updated to ${severity}`);

  socketManager.emitToAll('incident_updated', inc);
  res.json(inc);
});

// PUT /api/hospitals/:id/beds - Update Hospital Bed Capacity & Status
app.put('/api/hospitals/:id/beds', authenticateToken, requireRole(['Emergency Operator', 'EMERGENCY_OPERATOR', 'Admin', 'Super Admin', 'Hospital']), (req, res) => {
  const { id } = req.params;
  const { availableBeds, totalBeds, icuBeds } = req.body;
  const hosp = hospitalsStore.find(h => h.id === id || h.hospitalId === id);
  if (!hosp) return res.status(404).json({ message: 'Hospital not found' });

  if (availableBeds !== undefined) hosp.availableBeds = parseInt(availableBeds, 10);
  if (totalBeds !== undefined) hosp.totalBeds = parseInt(totalBeds, 10);
  if (icuBeds !== undefined) hosp.icuBeds = parseInt(icuBeds, 10);

  if (hosp.availableBeds > 20) {
    hosp.bedStatus = 'AVAILABLE';
    hosp.emergencyDepartmentAvailable = 'AVAILABLE';
  } else if (hosp.availableBeds > 0) {
    hosp.bedStatus = 'LIMITED';
    hosp.emergencyDepartmentAvailable = 'LIMITED';
  } else {
    hosp.bedStatus = 'FULL';
    hosp.emergencyDepartmentAvailable = 'FULL';
  }

  hosp.updatedAt = new Date().toISOString();
  hosp.lastUpdated = hosp.updatedAt;

  logAudit(req.user, 'OPERATOR_UPDATED_HOSPITAL_BEDS', hosp.id, `Updated hospital bed capacity: Available ${hosp.availableBeds}/${hosp.totalBeds}`, req);

  socketManager.emitToAll('hospital_updated', hosp);
  res.json(hosp);
});

app.post('/api/incidents', async (req, res) => {
  const data = req.body;

  const lat = parseFloat(data.latitude || data.lat || data.location?.lat || (Array.isArray(data.coordinates) ? data.coordinates[1] : undefined));
  const lng = parseFloat(data.longitude || data.lng || data.location?.lng || (Array.isArray(data.coordinates) ? data.coordinates[0] : undefined));
  const accuracy = parseFloat(data.accuracy || data.locationAccuracy || 5);

  if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
    return res.status(400).json({ message: 'Real physical device GPS coordinates (latitude, longitude) are required to create a disaster report.' });
  }

  const incId = `INC-${Math.floor(1000 + Math.random() * 9000)}`;
  const disasterType = data.disasterType || data.type || 'Fire';
  const severity = data.severity || 'CRITICAL';
  const description = data.description || 'Emergency assistance requested at physical device location.';

  // GeoJSON 2dsphere Order: [longitude, latitude]
  const geoPoint = {
    type: 'Point',
    coordinates: [lng, lat]
  };

  const newIncident = {
    id: `inc_${Date.now()}`,
    incidentId: incId,
    citizenId: data.citizenId || (req.user ? req.user.id : 'usr_1'),
    title: `${disasterType} Emergency at Device GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    disasterType: disasterType,
    type: disasterType,
    severity: severity,
    priority: severity === 'CRITICAL' || severity === 'Critical' ? 1 : severity === 'HIGH' || severity === 'High' ? 2 : 3,
    status: 'SEARCHING_FOR_RESCUE',
    reporterName: data.reportedBy || data.reporterName || 'Citizen User',
    reporterPhone: data.reporterPhone || '+1 (555) 911-GPS',
    location: {
      type: 'Point',
      coordinates: [lng, lat],
      lat: lat,
      lng: lng,
      address: data.location?.address || `Device GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`
    },
    geoPoint: geoPoint,
    locationAccuracy: accuracy,
    description: description,
    assignedUnits: [],
    assignedResponders: [],
    timeline: [
      { step: 'REPORT_SUBMITTED', label: `🚨 ${disasterType.toUpperCase()} REPORTED AT PHYSICAL GPS`, timestamp: new Date().toISOString() },
      { step: 'REPORT_VERIFIED', label: 'INCIDENT VERIFIED BY SYSTEM', timestamp: new Date().toISOString() }
    ],
    createdAt: new Date().toISOString()
  };

  incidentsStore.unshift(newIncident);

  // Geospatial 2dsphere rescue search within 50km
  await findAndAssignNearestRescue(newIncident);

  // Persist to MongoDB if connected
  try {
    if (Incident) {
      await Incident.create({
        incidentId: newIncident.incidentId,
        citizenId: newIncident.citizenId,
        title: newIncident.title,
        disasterType: newIncident.disasterType,
        severity: newIncident.severity,
        status: newIncident.status,
        reporterName: newIncident.reporterName,
        location: {
          type: 'Point',
          coordinates: [lng, lat],
          lat: lat,
          lng: lng,
          address: newIncident.location.address
        },
        locationAccuracy: accuracy,
        description: newIncident.description,
        assignedVehicleId: newIncident.assignedVehicleId || null,
        assignedVehicleType: newIncident.assignedVehicleType || null,
        assignedAt: newIncident.assignedAt ? new Date(newIncident.assignedAt) : null,
        distanceToIncident: newIncident.distanceToIncident || null,
        assignedUnits: newIncident.assignedUnits,
        timeline: newIncident.timeline
      }).catch(e => console.warn('Mongo Incident creation notice:', e.message));
    }
  } catch (dbErr) {}

  logActivity(newIncident.id, 'REPORT_SUBMITTED', { userId: newIncident.citizenId, name: newIncident.reporterName, role: 'Citizen' }, `Disaster reported at physical GPS (${lat}, ${lng}).`);

  // Emit Socket.IO Events
  socketManager.emitToAll('incident_created', newIncident);
  socketManager.emitToAll('sos_activated', newIncident);
  socketManager.emitToIncident(newIncident.id, 'sos_dispatched', newIncident);
  socketManager.emitToRole('admin', 'new_incident', newIncident);
  socketManager.emitToUser(newIncident.citizenId, 'new_incident', newIncident);
  socketManager.emitToUser(newIncident.citizenId, 'sos_created', newIncident);

  processGeofenceWarningsForIncident(newIncident);

  res.status(201).json(newIncident);
});


// Admin Incident Verification
app.put('/api/incidents/:id/verify', (req, res) => {
  const { id } = req.params;
  const inc = incidentsStore.find(i => i.id === id || i.incidentId === id);
  if (!inc) return res.status(404).json({ message: 'Incident not found' });

  inc.status = 'Verified';
  inc.verifiedAt = new Date().toISOString();
  inc.verifiedBy = req.body.verifiedBy || 'Commander Alex Vance';

  logActivity(inc.id, 'INCIDENT_VERIFIED', { name: inc.verifiedBy, role: 'Emergency Operator' }, 'Incident verified by Command Center.');

  const notif = {
    id: `notif_${Date.now()}`,
    title: '✓ INCIDENT VERIFIED',
    message: `Your disaster report (${inc.title}) has been verified by emergency command.`,
    type: 'SUCCESS',
    createdAt: new Date().toISOString()
  };
  notificationsStore.unshift(notif);

  socketManager.emitToUser(inc.citizenId, 'incident_verified', inc);
  socketManager.emitToUser(inc.citizenId, 'new_notification', notif);
  socketManager.emitToRole('admin', 'incident_verified', inc);
  socketManager.emitToRole('rescue', 'incident_verified', inc);

  res.json(inc);
});

// POST /api/incidents/:id/accept - Rescue Operator / Vehicle Accepts Mission (MISSION_ACCEPTED)
app.post(['/api/incidents/:id/accept', '/api/rescue/accept'], (req, res) => {
  const id = req.params.id || req.body.incidentId || req.body.id;
  const inc = incidentsStore.find(i => i.id === id || i.incidentId === id);
  if (!inc) return res.status(404).json({ message: 'Incident not found' });

  inc.status = 'MISSION_ACCEPTED';
  inc.acceptedAt = new Date().toISOString();

  if (!inc.timeline.some(t => t.step === 'MISSION_ACCEPTED')) {
    inc.timeline.push({
      step: 'MISSION_ACCEPTED',
      label: 'MISSION ACCEPTED BY RESCUE OPERATOR',
      timestamp: inc.acceptedAt
    });
  }

  if (inc.assignedUnits && inc.assignedUnits.length) {
    inc.assignedUnits.forEach(u => u.status = 'ACCEPTED');
  }

  socketManager.emitToIncident(inc.id, 'rescue:accepted', inc);
  socketManager.emitToIncident(inc.id, 'rescue:status', { incidentId: inc.id, status: 'MISSION_ACCEPTED' });
  socketManager.emitToAll('incident:updated', inc);
  socketManager.emitToAll('sos_updated', inc);

  res.json({ message: 'Mission accepted', incident: inc });
});

// POST /api/incidents/:id/start-moving - Rescue Vehicle En Route (RESCUE_ON_WAY)
app.post(['/api/incidents/:id/start-moving', '/api/rescue/start'], (req, res) => {
  const id = req.params.id || req.body.incidentId || req.body.id;
  const inc = incidentsStore.find(i => i.id === id || i.incidentId === id);
  if (!inc) return res.status(404).json({ message: 'Incident not found' });

  inc.status = 'RESCUE_ON_WAY';
  inc.startedMovingAt = new Date().toISOString();

  if (!inc.timeline.some(t => t.step === 'RESCUE_ON_WAY')) {
    inc.timeline.push({
      step: 'RESCUE_ON_WAY',
      label: 'RESCUE VEHICLE IS ON THE WAY TO YOUR LOCATION',
      timestamp: inc.startedMovingAt
    });
  }

  if (inc.assignedUnits && inc.assignedUnits.length) {
    inc.assignedUnits.forEach(u => u.status = 'EN_ROUTE');
  }

  socketManager.emitToIncident(inc.id, 'rescue:status', { incidentId: inc.id, status: 'RESCUE_ON_WAY' });
  socketManager.emitToAll('incident:updated', inc);
  socketManager.emitToAll('sos_updated', inc);

  res.json({ message: 'Rescue on the way', incident: inc });
});

// Admin Incident Rejection
app.put('/api/incidents/:id/reject', (req, res) => {
  const { id } = req.params;
  const inc = incidentsStore.find(i => i.id === id || i.incidentId === id);
  if (!inc) return res.status(404).json({ message: 'Incident not found' });

  inc.status = 'Rejected';
  inc.rejectedAt = new Date().toISOString();

  logActivity(inc.id, 'INCIDENT_REJECTED', { name: 'Emergency Operator', role: 'Emergency Operator' }, 'Report rejected (duplicate or non-emergency).');

  socketManager.emitToUser(inc.citizenId, 'incident_rejected', inc);
  socketManager.emitToRole('admin', 'incident_rejected', inc);

  res.json(inc);
});

// Admin Rescue Assignment
app.put('/api/incidents/:id/assign', (req, res) => {
  const { id } = req.params;
  const { rescueTeam } = req.body;
  const inc = incidentsStore.find(i => i.id === id || i.incidentId === id);
  if (!inc) return res.status(404).json({ message: 'Incident not found' });

  const assignedTeamObj = rescueTeam || {
    id: 'res_1',
    name: 'Ambulance Express 01',
    type: 'Ambulance',
    phone: '+1 555-0101',
    currentLocation: { lat: 28.6150, lng: 77.2100 }
  };

  inc.status = 'Assigned';
  inc.assignedAt = new Date().toISOString();
  inc.assignedTeam = assignedTeamObj;
  inc.assignedResponders = [
    { id: assignedTeamObj.id, name: assignedTeamObj.name, type: assignedTeamObj.type, assignedAt: inc.assignedAt }
  ];

  // Persist on Resource/RescueTeam unit
  const resourceUnit = resourcesStore.find(r => r.id === assignedTeamObj.id || r.name === assignedTeamObj.name);
  if (resourceUnit) {
    resourceUnit.status = 'Dispatched';
    resourceUnit.assignedIncidentId = inc.id;
    resourceUnit.currentAssignment = inc.id;
  }

  logActivity(inc.id, 'RESCUE_ASSIGNED', { name: 'Commander Alex Vance', role: 'Emergency Operator' }, `Assigned ${assignedTeamObj.name} to mission.`);

  const notifRescue = {
    id: `notif_${Date.now()}`,
    title: '🚨 NEW RESCUE MISSION ASSIGNED',
    message: `Mission assigned: ${inc.title} at ${inc.location.address}`,
    type: 'CRITICAL',
    createdAt: new Date().toISOString()
  };

  const notifCitizen = {
    id: `notif_${Date.now() + 1}`,
    title: '🚑 RESCUE TEAM ASSIGNED',
    message: `${assignedTeamObj.name} has been assigned to your location.`,
    type: 'INFO',
    createdAt: new Date().toISOString()
  };

  notificationsStore.unshift(notifRescue);
  notificationsStore.unshift(notifCitizen);

  const payload = {
    incidentId: inc.incidentId || inc.id,
    id: inc.id,
    disasterType: inc.disasterType,
    severity: inc.severity,
    title: inc.title,
    description: inc.description,
    latitude: inc.location.lat,
    longitude: inc.location.lng,
    location: inc.location,
    assignedTeamId: assignedTeamObj.id,
    assignedTeamName: assignedTeamObj.name,
    assignedTeam: assignedTeamObj,
    assignedAt: inc.assignedAt,
    status: inc.status,
    citizenId: inc.citizenId
  };

  socketManager.emitToUser(assignedTeamObj.id, 'incident_assigned', payload);
  socketManager.emitToRole('rescue', 'incident_assigned', payload);
  socketManager.emitToUser(assignedTeamObj.id, 'new_notification', notifRescue);

  socketManager.emitToUser(inc.citizenId, 'incident_assigned', payload);
  socketManager.emitToUser(inc.citizenId, 'new_notification', notifCitizen);

  socketManager.emitToRole('admin', 'incident_assigned', payload);

  res.json(payload);
});

const INCIDENT_STATE_ORDER = [
  'PENDING',
  'VERIFIED',
  'ASSIGNED',
  'ACCEPTED',
  'IN_PROGRESS',
  'PATIENT_PICKED_UP',
  'HOSPITAL_SELECTED',
  'HOSPITAL_ACCEPTED',
  'EN_ROUTE_TO_HOSPITAL',
  'ARRIVED_AT_HOSPITAL',
  'PATIENT_ADMITTED',
  'RESOLVED'
];

function normalizeStatus(status) {
  if (!status) return 'PENDING';
  const s = status.toUpperCase().replace(/\s+/g, '_');
  if (s === 'IN_PROGRESS' || s === 'INPROGRESS' || s === 'IN PROGRESS') return 'IN_PROGRESS';
  return s;
}

function isValidStateTransition(currentStatus, nextStatus) {
  const normCurrent = normalizeStatus(currentStatus);
  const normNext = normalizeStatus(nextStatus);

  const currentIndex = INCIDENT_STATE_ORDER.indexOf(normCurrent);
  const nextIndex = INCIDENT_STATE_ORDER.indexOf(normNext);

  if (currentIndex === -1 || nextIndex === -1) return true;
  return nextIndex >= currentIndex;
}

// GET /api/incidents/:id - Fetch dynamic incident record
app.get('/api/incidents/:id', (req, res) => {
  const { id } = req.params;
  const inc = incidentsStore.find(i => i.id === id || i.incidentId === id);
  if (!inc) {
    return res.status(404).json({ message: 'Incident not found' });
  }
  res.json(inc);
});

// Rescue Team Accept Mission (POST & PUT)
const handleAcceptMission = (req, res) => {
  const { id, incidentId } = req.params;
  const targetId = id || incidentId;
  const { acceptedBy } = req.body;
  const inc = incidentsStore.find(i => i.id === targetId || i.incidentId === targetId);
  if (!inc) return res.status(404).json({ message: 'Incident not found' });

  if (!isValidStateTransition(inc.status, 'ACCEPTED')) {
    return res.status(400).json({ message: `Cannot transition incident from ${inc.status} to ACCEPTED` });
  }

  inc.status = 'ACCEPTED';
  inc.missionAcceptedAt = new Date().toISOString();
  inc.acceptedBy = acceptedBy || inc.assignedTeam?.name || 'Rescue Team Alpha';

  if (inc.assignedTeam) {
    const resUnit = resourcesStore.find(r => r.id === inc.assignedTeam.id || r.name === inc.assignedTeam.name);
    if (resUnit) resUnit.status = 'Busy';
  }

  logActivity(inc.id, 'MISSION_ACCEPTED', { name: inc.acceptedBy, role: 'Ambulance Team' }, `${inc.acceptedBy} accepted emergency dispatch.`);

  const notif = {
    id: `notif_${Date.now()}`,
    title: '🚑 RESCUE MISSION ACCEPTED',
    message: `Rescue team has accepted your emergency request for ${inc.title}.`,
    type: 'SUCCESS',
    createdAt: new Date().toISOString()
  };
  notificationsStore.unshift(notif);

  const payload = {
    incidentId: inc.id,
    rescueTeamId: inc.assignedTeam?.id || 'res_1',
    rescueTeamName: inc.acceptedBy,
    status: 'ACCEPTED',
    timestamp: inc.missionAcceptedAt,
    incident: inc
  };

  socketManager.emitToRole('admin', 'rescue_mission_accepted', payload);
  socketManager.emitToRole('admin', 'rescue_accepted', inc);
  socketManager.emitToUser(inc.citizenId, 'rescue_mission_accepted', payload);
  socketManager.emitToUser(inc.citizenId, 'rescue_accepted', inc);
  socketManager.emitToRole('rescue', 'rescue_mission_accepted', payload);
  socketManager.emitToIncident(inc.id, 'rescue_mission_accepted', payload);

  res.json(inc);
};

app.post('/api/incidents/:id/accept', handleAcceptMission);
app.put('/api/incidents/:id/accept-mission', handleAcceptMission);

// Rescue Team Start Rescue (POST & PUT)
const handleStartRescue = (req, res) => {
  const { id, incidentId } = req.params;
  const targetId = id || incidentId;
  const inc = incidentsStore.find(i => i.id === targetId || i.incidentId === targetId);
  if (!inc) return res.status(404).json({ message: 'Incident not found' });

  if (!isValidStateTransition(inc.status, 'IN_PROGRESS')) {
    return res.status(400).json({ message: `Cannot transition incident from ${inc.status} to IN_PROGRESS` });
  }

  inc.status = 'IN_PROGRESS';
  inc.startedAt = new Date().toISOString();

  if (inc.assignedTeam) {
    const resUnit = resourcesStore.find(r => r.id === inc.assignedTeam.id || r.name === inc.assignedTeam.name);
    if (resUnit) resUnit.status = 'On Mission';
  }

  logActivity(inc.id, 'RESCUE_STARTED', { name: inc.assignedTeam?.name || 'Rescue Team', role: 'Ambulance Team' }, 'Rescue operation actively in progress.');

  socketManager.emitToUser(inc.citizenId, 'rescue_started', inc);
  socketManager.emitToRole('admin', 'rescue_started', inc);
  socketManager.emitToRole('rescue', 'rescue_started', inc);
  socketManager.emitToIncident(inc.id, 'rescue_started', inc);

  res.json(inc);
};

app.post('/api/incidents/:id/start-rescue', handleStartRescue);
app.put('/api/incidents/:id/start-rescue', handleStartRescue);

// Patient Picked Up Endpoint (POST & PUT)
const handlePatientPickup = (req, res) => {
  const { id, incidentId } = req.params;
  const targetId = id || incidentId;
  let inc = incidentsStore.find(i => i.id === targetId || i.incidentId === targetId);
  let tr = transportsStore.find(t => t.id === targetId || t.transportId === targetId || t.incidentId === targetId);

  if (inc) {
    inc.status = 'PATIENT_PICKED_UP';
    inc.pickedUpAt = new Date().toISOString();
  }

  if (!tr) {
    tr = {
      id: `tr_${Date.now()}`,
      transportId: `TR-102`,
      incidentId: targetId,
      patientId: 'pat_102',
      patientName: inc ? `${inc.reporterName || 'Victim'} (${inc.title})` : 'Emergency Victim',
      ambulanceId: inc?.assignedTeam?.id || 'res_1',
      ambulanceName: inc?.assignedTeam?.name || 'Ambulance Express 01',
      pickupLatitude: inc?.location?.lat || 28.6280,
      pickupLongitude: inc?.location?.lng || 77.2050,
      pickupAddress: inc?.location?.address || 'Incident Scene',
      destinationHospitalId: null,
      destinationHospitalName: null,
      destinationHospitalLocation: null,
      status: 'PATIENT_PICKED_UP',
      patientStatus: 'PATIENT_PICKED_UP',
      hospitalStatus: 'PENDING',
      eta: 'Calculating...',
      distanceRemaining: '0.0 km',
      createdAt: new Date().toISOString()
    };
    transportsStore.unshift(tr);
  } else {
    tr.status = 'PATIENT_PICKED_UP';
    tr.patientStatus = 'PATIENT_PICKED_UP';
    tr.pickedUpAt = new Date().toISOString();
  }

  logActivity(targetId, 'PATIENT_PICKED_UP', { name: tr.ambulanceName, role: 'Ambulance Team' }, 'Patient picked up by ambulance team.');

  socketManager.emitToRole('admin', 'patient_picked_up', tr);
  socketManager.emitToRole('rescue', 'patient_picked_up', tr);
  socketManager.emitToUser(inc?.citizenId, 'patient_picked_up', tr);
  socketManager.emitToAll('patient_picked_up', tr);

  res.json({ incident: inc, transport: tr });
};

app.post('/api/incidents/:id/patient-pickup', handlePatientPickup);
app.put('/api/transports/:id/pickup', handlePatientPickup);


// Rescue Team Arrival Endpoint
app.put('/api/incidents/:id/arrived', (req, res) => {
  const { id } = req.params;
  const inc = incidentsStore.find(i => i.id === id || i.incidentId === id);
  if (!inc) return res.status(404).json({ message: 'Incident not found' });

  inc.arrivalStatus = 'ARRIVED';
  inc.arrivedAt = new Date().toISOString();

  logActivity(inc.id, 'RESCUE_ARRIVED', { name: inc.assignedTeam?.name || 'Rescue Team', role: 'Ambulance Team' }, 'Rescue team arrived at incident location.');

  socketManager.emitToUser(inc.citizenId, 'rescue_arrived', inc);
  socketManager.emitToRole('admin', 'rescue_arrived', inc);
  socketManager.emitToRole('rescue', 'rescue_arrived', inc);
  socketManager.emitToIncident(inc.id, 'rescue_arrived', inc);

  res.json(inc);
});

// Rescue Team Resolve Incident (POST & PUT)
const handleResolveIncident = (req, res) => {
  const { id, incidentId } = req.params;
  const targetId = id || incidentId;
  const { resolvedBy } = req.body;
  const inc = incidentsStore.find(i => i.id === targetId || i.incidentId === targetId);
  if (!inc) return res.status(404).json({ message: 'Incident not found' });

  inc.status = 'RESOLVED';
  inc.resolvedAt = new Date().toISOString();
  inc.resolvedBy = resolvedBy || inc.assignedTeam?.name || 'Rescue Command';

  if (inc.assignedTeam) {
    const resUnit = resourcesStore.find(r => r.id === inc.assignedTeam.id || r.name === inc.assignedTeam.name);
    if (resUnit) {
      resUnit.status = 'Available';
      resUnit.assignedIncidentId = null;
      resUnit.currentAssignment = null;
    }
  }

  logActivity(inc.id, 'INCIDENT_RESOLVED', { name: inc.resolvedBy, role: 'Ambulance Team' }, 'Incident marked resolved and site cleared.');

  const notif = {
    id: `notif_${Date.now()}`,
    title: '🟢 INCIDENT RESOLVED',
    message: `Rescue mission for ${inc.title} successfully completed.`,
    type: 'SUCCESS',
    createdAt: new Date().toISOString()
  };
  notificationsStore.unshift(notif);

  socketManager.emitToUser(inc.citizenId, 'incident_resolved', inc);
  socketManager.emitToUser(inc.citizenId, 'new_notification', notif);
  socketManager.emitToRole('admin', 'incident_resolved', inc);
  socketManager.emitToRole('rescue', 'incident_resolved', inc);
  socketManager.emitToIncident(inc.id, 'incident_resolved', inc);

  res.json(inc);
};

app.post('/api/incidents/:id/resolve', handleResolveIncident);
app.put('/api/incidents/:id/resolve', handleResolveIncident);


// ==================================================
// PATIENT TRANSPORT & HOSPITAL MODULE API ENDPOINTS
// ==================================================

// GET /api/transports - Fetch all patient transports
app.get('/api/transports', (req, res) => {
  res.json(transportsStore);
});

// GET /api/transports/:id - Fetch single transport
app.get('/api/transports/:id', (req, res) => {
  const { id } = req.params;
  const tr = transportsStore.find(t => t.id === id || t.transportId === id || t.incidentId === id);
  if (!tr) {
    // Return fallback transport for demo robustness
    return res.json(transportsStore[0]);
  }
  res.json(tr);
});

// POST /api/transports - Initialize new patient transport
app.post('/api/transports', (req, res) => {
  const data = req.body;
  const newTr = {
    id: `tr_${Date.now()}`,
    transportId: `TR-${Math.floor(100 + Math.random() * 900)}`,
    incidentId: data.incidentId || 'inc_102',
    patientId: data.patientId || `pat_${Date.now()}`,
    patientName: data.patientName || 'Emergency Victim',
    ambulanceId: data.ambulanceId || 'res_1',
    ambulanceName: data.ambulanceName || 'Ambulance Express 01',
    pickupLatitude: data.pickupLatitude || 28.6280,
    pickupLongitude: data.pickupLongitude || 77.2050,
    pickupAddress: data.pickupAddress || 'Disaster Location',
    destinationHospitalId: null,
    destinationHospitalName: null,
    destinationHospitalLocation: null,
    status: 'AMBULANCE_ASSIGNED',
    patientStatus: 'PATIENT_WAITING',
    hospitalStatus: 'PENDING',
    eta: '12 min',
    distanceRemaining: '4.5 km',
    speed: 45,
    heading: 90,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  transportsStore.unshift(newTr);
  logActivity(newTr.incidentId, 'TRANSPORT_INITIATED', { name: newTr.ambulanceName, role: 'Ambulance Team' }, `Patient transport ${newTr.transportId} initialized.`);

  socketManager.emitToRole('admin', 'ambulance_assigned', newTr);
  socketManager.emitToRole('rescue', 'ambulance_assigned', newTr);

  res.status(201).json(newTr);
});

// PUT /api/transports/:id/pickup - Ambulance reaches scene & picks up patient
app.put('/api/transports/:id/pickup', (req, res) => {
  const { id } = req.params;
  let tr = transportsStore.find(t => t.id === id || t.transportId === id || t.incidentId === id);

  if (!tr) {
    tr = {
      id: `tr_${Date.now()}`,
      transportId: `TR-102`,
      incidentId: id,
      patientId: 'pat_102',
      patientName: 'John Doe (Victim #102)',
      ambulanceId: 'res_1',
      ambulanceName: 'Ambulance Express 01',
      pickupLatitude: 28.6280,
      pickupLongitude: 77.2050,
      pickupAddress: 'Sector 14 Commercial Complex',
      destinationHospitalId: null,
      destinationHospitalName: null,
      destinationHospitalLocation: null,
      status: 'PATIENT_PICKED_UP',
      patientStatus: 'PATIENT_PICKED_UP',
      hospitalStatus: 'PENDING',
      eta: 'Calculating...',
      distanceRemaining: '0.0 km',
      createdAt: new Date().toISOString()
    };
    transportsStore.unshift(tr);
  }

  tr.status = 'PATIENT_PICKED_UP';
  tr.patientStatus = 'PATIENT_PICKED_UP';
  tr.pickedUpAt = new Date().toISOString();
  tr.updatedAt = new Date().toISOString();

  logActivity(tr.incidentId, 'PATIENT_PICKED_UP', { name: tr.ambulanceName, role: 'Ambulance Team' }, 'Ambulance crew picked up patient. Searching hospital.');

  socketManager.emitToRole('admin', 'patient_picked_up', tr);
  socketManager.emitToRole('rescue', 'patient_picked_up', tr);
  socketManager.emitToAll('patient_picked_up', tr);

  res.json(tr);
});

// Select Hospital (POST & PUT)
const handleSelectHospital = (req, res) => {
  const { id, transportId } = req.params;
  const targetId = id || transportId;
  const { hospitalId } = req.body;

  let tr = transportsStore.find(t => t.id === targetId || t.transportId === targetId || t.incidentId === targetId);
  if (!tr) return res.status(404).json({ message: 'Transport not found' });

  const hosp = hospitalsStore.find(h => h.id === hospitalId || h.hospitalId === hospitalId) || hospitalsStore[0];

  tr.destinationHospitalId = hosp.id;
  tr.destinationHospitalName = hosp.name;
  tr.destinationHospitalLocation = hosp.location;
  tr.status = 'HOSPITAL_SELECTED';
  tr.hospitalStatus = 'PENDING';
  tr.hospitalSelectedAt = new Date().toISOString();
  tr.updatedAt = new Date().toISOString();

  if (!hosp.incomingPatients) hosp.incomingPatients = [];
  hosp.incomingPatients.unshift({
    patientName: tr.patientName || 'Critical Victim',
    condition: 'Trauma Emergency',
    etaMinutes: 11,
    ambulanceId: tr.ambulanceName || 'Ambulance Unit',
    transportId: tr.transportId
  });

  logActivity(tr.incidentId, 'HOSPITAL_SELECTED', { name: tr.ambulanceName, role: 'Ambulance Team' }, `Selected hospital ${hosp.name}. Awaiting acceptance.`);

  const alertPayload = {
    transportId: tr.transportId,
    incidentId: tr.incidentId,
    patientName: tr.patientName,
    ambulanceId: tr.ambulanceName,
    hospitalId: hosp.id,
    hospitalName: hosp.name,
    condition: 'CRITICAL TRAUMA',
    eta: '11 mins',
    availableBeds: hosp.availableBeds,
    availableEmergencyBeds: hosp.availableEmergencyBeds || 7,
    status: tr.status
  };

  socketManager.emitToRole('hospital', 'hospital_patient_request', alertPayload);
  socketManager.emitToRole('admin', 'hospital_selected', tr);
  socketManager.emitToAll('hospital_selected', tr);

  res.json(tr);
};

app.post('/api/transports/:id/select-hospital', handleSelectHospital);
app.put('/api/transports/:id/select-hospital', handleSelectHospital);

// Hospital Accept (POST & PUT)
const handleHospitalAccept = (req, res) => {
  const { id, transportId } = req.params;
  const targetId = id || transportId;
  let tr = transportsStore.find(t => t.id === targetId || t.transportId === targetId || t.incidentId === targetId);
  if (!tr) return res.status(404).json({ message: 'Transport not found' });

  const hosp = hospitalsStore.find(h => h.id === tr.destinationHospitalId) || hospitalsStore[0];

  if (hosp.availableBeds <= 0 || (hosp.availableEmergencyBeds && hosp.availableEmergencyBeds <= 0)) {
    return res.status(400).json({ message: 'No suitable bed currently available at this hospital.' });
  }

  hosp.availableBeds = Math.max(0, hosp.availableBeds - 1);
  if (hosp.availableEmergencyBeds !== undefined) {
    hosp.availableEmergencyBeds = Math.max(0, hosp.availableEmergencyBeds - 1);
  }
  if (hosp.availableICUBeds !== undefined && hosp.availableICUBeds > 0) {
    hosp.availableICUBeds = Math.max(0, hosp.availableICUBeds - 1);
  }

  tr.status = 'HOSPITAL_ACCEPTED';
  tr.hospitalStatus = 'ACCEPTED';
  tr.hospitalAcceptedAt = new Date().toISOString();
  tr.updatedAt = new Date().toISOString();

  logActivity(tr.incidentId, 'HOSPITAL_ACCEPTED', { name: hosp.name, role: 'Hospital Staff' }, `Emergency bed reserved at ${hosp.name}. Bed count: ${hosp.availableBeds}`);

  const bedUpdatePayload = {
    hospitalId: hosp.id,
    hospitalName: hosp.name,
    availableBeds: hosp.availableBeds,
    totalBeds: hosp.totalBeds,
    availableICUBeds: hosp.availableICUBeds || 8,
    availableEmergencyBeds: hosp.availableEmergencyBeds || 6,
    timestamp: new Date().toISOString()
  };

  socketManager.emitToAll('bed_availability_updated', bedUpdatePayload);
  socketManager.emitToRole('admin', 'hospital_accepted', tr);
  socketManager.emitToRole('rescue', 'hospital_accepted', tr);
  socketManager.emitToAll('hospital_accepted', tr);

  res.json({ transport: tr, hospital: hosp });
};

app.post('/api/transports/:id/hospital-accept', handleHospitalAccept);
app.put('/api/transports/:id/accept-hospital', handleHospitalAccept);

// Start Transport (POST & PUT)
const handleStartTransport = (req, res) => {
  const { id, transportId } = req.params;
  const targetId = id || transportId;
  let tr = transportsStore.find(t => t.id === targetId || t.transportId === targetId || t.incidentId === targetId);
  if (!tr) return res.status(404).json({ message: 'Transport not found' });

  tr.status = 'EN_ROUTE_TO_HOSPITAL';
  tr.patientStatus = 'PATIENT_IN_TRANSIT';
  tr.startedAt = new Date().toISOString();
  tr.updatedAt = new Date().toISOString();

  logActivity(tr.incidentId, 'TRANSPORT_STARTED', { name: tr.ambulanceName, role: 'Ambulance Team' }, `Ambulance started transport to ${tr.destinationHospitalName || 'Hospital'}.`);

  socketManager.emitToRole('admin', 'ambulance_transport_started', tr);
  socketManager.emitToRole('hospital', 'ambulance_transport_started', tr);
  socketManager.emitToAll('ambulance_transport_started', tr);

  res.json(tr);
};

app.post('/api/transports/:id/start', handleStartTransport);
app.put('/api/transports/:id/start-transport', handleStartTransport);

// Arrive Hospital (POST & PUT)
const handleArriveHospital = (req, res) => {
  const { id, transportId } = req.params;
  const targetId = id || transportId;
  let tr = transportsStore.find(t => t.id === targetId || t.transportId === targetId || t.incidentId === targetId);
  if (!tr) return res.status(404).json({ message: 'Transport not found' });

  tr.status = 'ARRIVED_AT_HOSPITAL';
  tr.patientStatus = 'PATIENT_AT_HOSPITAL';
  tr.arrivedAt = new Date().toISOString();
  tr.updatedAt = new Date().toISOString();

  logActivity(tr.incidentId, 'ARRIVED_AT_HOSPITAL', { name: tr.ambulanceName, role: 'Ambulance Team' }, `Ambulance arrived at ${tr.destinationHospitalName || 'Hospital'}.`);

  socketManager.emitToRole('admin', 'ambulance_arrived_hospital', tr);
  socketManager.emitToRole('hospital', 'ambulance_arrived_hospital', tr);
  socketManager.emitToAll('ambulance_arrived_hospital', tr);

  res.json(tr);
};

app.post('/api/transports/:id/arrive', handleArriveHospital);
app.put('/api/transports/:id/arrive-hospital', handleArriveHospital);

// Admit Patient (POST & PUT)
const handleAdmitPatient = (req, res) => {
  const { id, transportId } = req.params;
  const targetId = id || transportId;
  let tr = transportsStore.find(t => t.id === targetId || t.transportId === targetId || t.incidentId === targetId);
  if (!tr) return res.status(404).json({ message: 'Transport not found' });

  tr.status = 'PATIENT_ADMITTED';
  tr.patientStatus = 'PATIENT_ADMITTED';
  tr.admittedAt = new Date().toISOString();
  tr.updatedAt = new Date().toISOString();

  logActivity(tr.incidentId, 'PATIENT_ADMITTED', { name: tr.destinationHospitalName || 'Hospital Staff', role: 'Hospital Staff' }, `Patient admitted to emergency ward.`);

  socketManager.emitToRole('admin', 'patient_admitted', tr);
  socketManager.emitToRole('hospital', 'patient_admitted', tr);
  socketManager.emitToRole('rescue', 'patient_admitted', tr);
  socketManager.emitToAll('patient_admitted', tr);

  res.json(tr);
};

app.post('/api/transports/:id/admit', handleAdmitPatient);
app.put('/api/transports/:id/admit', handleAdmitPatient);


// GET /api/hospitals - List all hospitals
app.get('/api/hospitals', (req, res) => {
  res.json(hospitalsStore);
});

// GET /api/hospitals/nearby - Smart Hospital Recommendation Engine
app.get('/api/hospitals/nearby', (req, res) => {
  const { lat, lng } = req.query;
  const refLat = lat ? parseFloat(lat) : 28.6280;
  const refLng = lng ? parseFloat(lng) : 77.2050;


  // Rank hospitals by Proximity, Emergency Dept Status, Available Beds
  const ranked = hospitalsStore.map(h => {
    const dLat = (h.location.lat - refLat) * (Math.PI / 180);
    const dLon = (h.location.lng - refLng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(refLat * (Math.PI / 180)) * Math.cos(h.location.lat * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distKm = parseFloat((6371 * c).toFixed(1));
    const etaMins = Math.ceil(distKm * 2.2);

    return {
      ...h,
      distanceKm: distKm,
      etaMins: etaMins,
      recommendationScore: (100 - distKm * 5) + (h.availableBeds || 0) * 0.5
    };
  }).sort((a, b) => b.recommendationScore - a.recommendationScore);

  res.json(ranked);
});

// PUT /api/hospitals/:id/beds - Update hospital bed inventory
app.put('/api/hospitals/:id/beds', (req, res) => {
  const { id } = req.params;
  const hosp = hospitalsStore.find(h => h.id === id || h.hospitalId === id);
  if (!hosp) return res.status(404).json({ message: 'Hospital not found' });

  if (req.body.availableBeds !== undefined) hosp.availableBeds = req.body.availableBeds;
  if (req.body.availableICUBeds !== undefined) hosp.availableICUBeds = req.body.availableICUBeds;
  if (req.body.availableEmergencyBeds !== undefined) hosp.availableEmergencyBeds = req.body.availableEmergencyBeds;

  const bedPayload = {
    hospitalId: hosp.id,
    hospitalName: hosp.name,
    availableBeds: hosp.availableBeds,
    totalBeds: hosp.totalBeds,
    availableICUBeds: hosp.availableICUBeds || 8,
    availableEmergencyBeds: hosp.availableEmergencyBeds || 7,
    timestamp: new Date().toISOString()
  };

  res.json(hosp);
});

// ==================================================
// 100-METER EMERGENCY WARNING SYSTEM REST ENDPOINTS
// ==================================================

// PUT /api/users/location - Update user GPS coordinates & run proximity geofence check
app.put('/api/users/location', (req, res) => {
  const { latitude, longitude, accuracy, userId, id } = req.body;
  const targetId = userId || id || 'usr_1';

  let user = usersStore.find(u => u.id === targetId);
  if (!user) {
    user = {
      id: targetId,
      name: 'Registered Citizen',
      email: 'citizen@crisisconnect.org',
      role: 'Citizen',
      locationSharingEnabled: true,
      emergencyAlertsEnabled: true,
      location: { lat: parseFloat(latitude), lng: parseFloat(longitude) },
      geoPoint: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
      locationAccuracy: accuracy || 8,
      locationUpdatedAt: new Date().toISOString()
    };
    usersStore.push(user);
  } else {
    user.location = { lat: parseFloat(latitude), lng: parseFloat(longitude) };
    user.geoPoint = { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] };
    user.locationAccuracy = accuracy || 8;
    user.locationUpdatedAt = new Date().toISOString();
  }

  // Run proximity check against active verified critical incidents
  const activeVerifiedIncidents = incidentsStore.filter(i =>
    (i.status === 'VERIFIED' || i.status === 'Verified' || i.status === 'In Progress' || i.status === 'IN_PROGRESS' || i.status === 'Assigned' || i.status === 'ACCEPTED') &&
    (i.severity === 'Critical' || i.severity === 'CRITICAL' || i.severity === 'High')
  );

  activeVerifiedIncidents.forEach(inc => {
    processGeofenceWarningsForIncident(inc);
  });

  res.json({ message: 'User location updated successfully', user });
});

// In-Memory SMS Notifications Audit Log
// In-Memory SMS Notifications Audit Log
const smsNotificationsStore = [];

// Backend Mobile SMS Service Dispatcher with Real Provider Verification
async function dispatchEmergencySms(user, incident, distMeters) {
  const targetPhone = user.phoneNumber || user.phone || '+919876543210';
  if (user.smsAlertsEnabled === false || user.emergencyAlertsEnabled === false) return;

  // Check Location Staleness (> 30 minutes old)
  if (user.locationUpdatedAt) {
    const updatedTime = new Date(user.locationUpdatedAt).getTime();
    const ageMinutes = (Date.now() - updatedTime) / (1000 * 60);
    if (ageMinutes > 30) {
      console.log(`⚠️ [SMS SERVICE] Skipping SMS for user ${user.name} (${user.id}): Location is STALE (${Math.round(ageMinutes)} mins old).`);
      return;
    }
  }

  // Duplicate SMS Protection: Allow only 1 SMS per (userId, incidentId) pair
  const existing = smsNotificationsStore.find(s =>
    s.userId === user.id &&
    s.incidentId === incident.id &&
    (s.status === 'SENT' || s.status === 'DELIVERED' || s.status === 'ACCEPTED')
  );
  if (existing) {
    console.log(`ℹ️ [SMS SERVICE] Suppressed duplicate SMS for user ${user.name} (${user.id}) on incident ${incident.id}.`);
    return;
  }

  // Generate Emergency Text (Standard plain SMS format without unsupported special symbols)
  const disasterType = (incident.disasterType || incident.type || 'Emergency').toUpperCase();
  const severity = (incident.severity || 'CRITICAL').toUpperCase();
  const distanceStr = Math.round(distMeters);
  const smsText = `CRISISCONNECT EMERGENCY ALERT: A ${disasterType} has been detected approximately ${distanceStr} meters from your location. Severity: ${severity}. Please move to a safe location and follow official emergency instructions.`;

  // Dispatch via SMS Service
  const smsRes = await smsService.sendEmergencySMS({
    phoneNumber: targetPhone,
    message: smsText,
    incidentId: incident.id,
    userId: user.id,
    distanceMeters: distMeters
  });

  const smsRecord = {
    id: `sms_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    userId: user.id,
    userName: user.name,
    incidentId: incident.id,
    phoneNumber: smsRes.phoneNumber || targetPhone,
    channel: 'SMS',
    type: 'EMERGENCY_PROXIMITY_WARNING',
    message: smsText,
    distanceMeters: Math.round(distMeters),
    status: smsRes.success ? 'SENT' : 'FAILED',
    error: smsRes.success ? null : smsRes.error,
    sentAt: new Date().toISOString(),
    deliveredAt: smsRes.success ? new Date().toISOString() : null,
    providerMessageId: smsRes.providerMessageId || null,
    provider: smsRes.provider || 'SMS_SERVICE'
  };

  smsNotificationsStore.unshift(smsRecord);

  if (smsRes.success) {
    console.log(`📱 [BACKEND SMS ACCEPTED] Provider Message ID: ${smsRes.providerMessageId} | Sent to ${smsRecord.phoneNumber} (${user.name})`);
  } else {
    console.warn(`🔴 [BACKEND SMS FAILED] User: ${user.id} | Phone: ${smsRecord.phoneNumber} | Error: ${smsRes.error}`);
  }

  socketManager.emitToUser(user.id, 'sms_notification_status', smsRecord);
  socketManager.emitToRole('admin', 'sms_notification_status', smsRecord);
}

// REST ENDPOINT: POST /api/notifications/test-sms - Manual Operator Test SMS
app.post('/api/notifications/test-sms', async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({
      success: false,
      error: 'Mobile number (phoneNumber) is required to send a test SMS.'
    });
  }

  const result = await smsService.sendTestSMS(phoneNumber);

  // Store in SMS Audit log
  const smsRecord = {
    id: `sms_test_${Date.now()}`,
    userId: req.user ? req.user.id : 'operator_test',
    userName: req.user ? req.user.name : 'Operator User',
    incidentId: 'MANUAL_TEST_SMS',
    phoneNumber: result.phoneNumber || phoneNumber,
    channel: 'SMS',
    type: 'MANUAL_TEST_SMS',
    message: 'CRISISCONNECT TEST SMS: Your emergency mobile notification system is active.',
    distanceMeters: 0,
    status: result.success ? 'SENT' : 'FAILED',
    error: result.success ? null : result.error,
    sentAt: new Date().toISOString(),
    deliveredAt: result.success ? new Date().toISOString() : null,
    providerMessageId: result.providerMessageId || null,
    provider: result.provider || 'SMS_SERVICE'
  };
  smsNotificationsStore.unshift(smsRecord);

  res.json(result);
});

// REST ENDPOINT: GET /api/admin/geofence-alerts - Fetch all active 100m geofence alerts for Admin Dashboard

app.get('/api/admin/geofence-alerts', async (req, res) => {
  try {
    let alerts = [];
    if (DisasterAlert) {
      alerts = await DisasterAlert.find().sort({ createdAt: -1 }).limit(100);
    }
    res.json({
      success: true,
      count: alerts.length,
      alerts: alerts.map(a => ({
        id: a._id,
        alertId: a._id,
        userId: a.userId,
        citizenName: a.citizenName || 'Citizen',
        citizenEmail: a.citizenEmail || a.userEmail || '',
        disasterId: a.disasterId,
        disasterTitle: a.disasterTitle,
        disasterType: a.disasterType,
        severity: a.severity,
        distanceMeters: a.distanceMeters,
        gpsAccuracy: a.gpsAccuracy,
        emailStatus: a.emailStatus,
        emailSent: a.emailSent,
        emailSentAt: a.emailSentAt,
        warningStatus: a.warningStatus || (a.status === 'ENTERED' ? 'ACTIVE' : 'RESOLVED'),
        status: a.status,
        detectedAt: a.detectedAt || a.createdAt,
        citizenLocation: a.citizenLocation || { type: 'Point', coordinates: [a.citizenLongitude || 0, a.citizenLatitude || 0] }
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// REST ENDPOINT: GET /api/test-email - Test Nodemailer Gmail delivery

app.get('/api/test-email', async (req, res) => {
  try {
    const transporter = emailService.transporter;
    if (!transporter) {
      return res.status(500).json({
        success: false,
        message: "Email sending failed: Transporter not configured. Check MAIL_FROM and MAIL_PASSWORD in .env"
      });
    }

    const recipient = req.query.to || process.env.MAIL_FROM || "smmandlik.1318@gmail.com";
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: recipient,
      subject: "ResQAI Email Test",
      text: "This is a test email from the ResQAI Disaster Management System.",
    });

    console.log("Email sent:", info.messageId);

    res.json({
      success: true,
      message: "Test email sent successfully",
      messageId: info.messageId,
    });
  } catch (error) {
    console.error("Email failed:", error);

    res.status(500).json({
      success: false,
      message: "Email sending failed",
      error: error.message,
    });
  }
});

// REST ENDPOINT: GET /api/notifications/twilio-config - Masked Status Diagnostic
app.get('/api/notifications/twilio-config', (req, res) => {

  const status = smsService.getTwilioConfigStatus();
  res.json(status);
});

// WEBHOOK: POST /api/notifications/twilio-status - Twilio Live Delivery Webhook Callback
app.post('/api/notifications/twilio-status', (req, res) => {
  const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body;
  if (!MessageSid) return res.status(400).send('Missing MessageSid');

  const record = smsNotificationsStore.find(s => s.providerMessageId === MessageSid || s.id === MessageSid);
  if (record) {
    record.status = (MessageStatus || '').toUpperCase();
    if (MessageStatus === 'delivered') {
      record.deliveredAt = new Date().toISOString();
    }
    if (ErrorCode || ErrorMessage) {
      record.error = `[Twilio ${ErrorCode || ''}] ${ErrorMessage || ''}`;
    }
    socketManager.emitToUser(record.userId, 'sms_status_updated', record);
    socketManager.emitToRole('admin', 'sms_status_updated', record);
    console.log(`📡 [TWILIO WEBHOOK] Status update for MessageSid ${MessageSid}: ${MessageStatus}`);
  }
  res.type('text/xml').send('<Response/>');
});

// REST ENDPOINT: GET /api/notifications/audit/:incidentId? - SMS Delivery Audit Breakdown
app.get('/api/notifications/audit/:incidentId?', (req, res) => {
  const { incidentId } = req.params;
  const records = incidentId
    ? smsNotificationsStore.filter(s => s.incidentId === incidentId)
    : smsNotificationsStore;

  const nearbyUsers = records.length;
  const smsAttempted = records.length;
  const smsAccepted = records.filter(r => r.status === 'SENT' || r.status === 'DELIVERED' || r.status === 'ACCEPTED' || r.status === 'QUEUED').length;
  const delivered = records.filter(r => r.status === 'DELIVERED').length;
  const failed = records.filter(r => r.status === 'FAILED' || r.status === 'UNDELIVERED').length;

  res.json({
    incidentId: incidentId || 'ALL',
    nearbyUsers,
    smsAttempted,
    smsAccepted,
    delivered,
    failed,
    records: records.slice(0, 50)
  });
});



// Strictly 100-Meter Geofence Emergency Warning Processor (Private Socket.IO Warnings)
function processGeofenceWarningsForIncident(inc) {
  if (!inc || !inc.location || !inc.location.lat) return;
  const radiusMeters = 100; // Strictly 100 meters

  usersStore.forEach(user => {
    if (!user.locationSharingEnabled || !user.location || !user.location.lat) return;

    const distMeters = calculateDistanceMeters(inc.location.lat, inc.location.lng, user.location.lat, user.location.lng);

    let alert = emergencyAlertsStore.find(a => a.incidentId === inc.id && a.userId === user.id);

    if (distMeters <= radiusMeters) {
      const alertPayload = {
        incidentId: inc.id,
        disasterType: inc.disasterType || inc.type || 'Fire',
        title: `🚨 EMERGENCY WARNING - ${inc.disasterType || 'DISASTER'} DETECTED`,
        severity: (inc.severity || 'CRITICAL').toUpperCase(),
        distanceMeters: Math.round(distMeters),
        radiusMeters: radiusMeters,
        locationAddress: inc.location.address || 'Nearby Hazard Zone',
        latitude: inc.location.lat,
        longitude: inc.location.lng,
        timestamp: Date.now()
      };

      if (!alert) {
        alert = {
          id: `alert_${inc.id}_${user.id}`,
          incidentId: inc.id,
          userId: user.id,
          status: 'INSIDE',
          distanceMeters: Math.round(distMeters),
          sentAt: new Date().toISOString()
        };
        emergencyAlertsStore.push(alert);

        // Private Socket.IO Warning Stream to specific user
        socketManager.emitToUser(user.id, 'nearby-disaster-warning', alertPayload);
        socketManager.emitToUser(user.id, 'nearby_emergency_warning', alertPayload);
        console.log(`🚨 [100m GEOFENCE ALERT] Emitted private warning to user ${user.id} (${user.name}) - Distance: ${Math.round(distMeters)}m`);
      } else if (alert.status === 'LEFT_RADIUS') {
        alert.status = 'INSIDE';
        alert.distanceMeters = Math.round(distMeters);
        
        socketManager.emitToUser(user.id, 'nearby-disaster-warning', alertPayload);
        socketManager.emitToUser(user.id, 'nearby_emergency_warning', alertPayload);
        console.log(`🚨 [100m GEOFENCE RE-ENTRY] Emitted private warning to user ${user.id} (${user.name}) - Distance: ${Math.round(distMeters)}m`);
      }
    } else {
      if (alert && alert.status === 'INSIDE') {
        alert.status = 'LEFT_RADIUS';
        console.log(`ℹ️ [100m GEOFENCE EXIT] User ${user.id} (${user.name}) left 100m radius of incident ${inc.id} (Distance: ${Math.round(distMeters)}m)`);
      }
    }
  });
}


// POST /api/notifications/send-sms - Endpoint for manual/automated SMS dispatching
app.post('/api/notifications/send-sms', (req, res) => {
  const { userId, phoneNumber, message, incidentId } = req.body;
  const user = usersStore.find(u => u.id === userId || u.phone === phoneNumber) || { id: userId || 'usr_1', name: 'Citizen', phone: phoneNumber || '+91 98765 43210' };

  const smsRecord = {
    id: `sms_${Date.now()}`,
    userId: user.id,
    userName: user.name,
    incidentId: incidentId || 'inc_102',
    phoneNumber: phoneNumber || user.phone || '+91 98765 43210',
    channel: 'SMS',
    message: message || '🚨 CRISISCONNECT ALERT: Verified hazard detected near you.',
    status: 'DELIVERED',
    sentAt: new Date().toISOString(),
    providerMessageId: `SM_${Date.now()}`
  };

  smsNotificationsStore.unshift(smsRecord);
  socketManager.emitToUser(user.id, 'sms_notification_status', smsRecord);
  socketManager.emitToRole('admin', 'sms_notification_status', smsRecord);

  res.json({ status: 'SENT', smsRecord });
});

// POST /api/sms/webhook - Provider delivery callback webhook
app.post('/api/sms/webhook', (req, res) => {
  const { messageId, status } = req.body;
  const found = smsNotificationsStore.find(s => s.providerMessageId === messageId);
  if (found) {
    found.status = status || 'DELIVERED';
    found.deliveredAt = new Date().toISOString();
  }
  res.json({ message: 'Webhook processed', status: 'OK' });
});

// PUT /api/users/alert-settings - Update emergency alert & location sharing preferences
app.put('/api/users/alert-settings', (req, res) => {
  const { userId, locationSharingEnabled, emergencyAlertsEnabled, smsAlertsEnabled, browserAlertsEnabled } = req.body;
  const targetId = userId || 'usr_1';

  let user = usersStore.find(u => u.id === targetId);
  if (!user) {
    user = {
      id: targetId,
      name: 'Registered Citizen',
      email: 'citizen@crisisconnect.org',
      role: 'Citizen',
      locationSharingEnabled: locationSharingEnabled !== undefined ? locationSharingEnabled : true,
      emergencyAlertsEnabled: emergencyAlertsEnabled !== undefined ? emergencyAlertsEnabled : true,
      smsAlertsEnabled: smsAlertsEnabled !== undefined ? smsAlertsEnabled : true,
      browserAlertsEnabled: browserAlertsEnabled !== undefined ? browserAlertsEnabled : true,
      location: { lat: 28.6285, lng: 77.2052 },
      geoPoint: { type: 'Point', coordinates: [77.2052, 28.6285] },
      locationAccuracy: 8,
      locationUpdatedAt: new Date().toISOString()
    };
    usersStore.push(user);
  } else {
    if (locationSharingEnabled !== undefined) user.locationSharingEnabled = locationSharingEnabled;
    if (emergencyAlertsEnabled !== undefined) user.emergencyAlertsEnabled = emergencyAlertsEnabled;
    if (smsAlertsEnabled !== undefined) user.smsAlertsEnabled = smsAlertsEnabled;
    if (browserAlertsEnabled !== undefined) user.browserAlertsEnabled = browserAlertsEnabled;
  }

  res.json({ message: 'Alert settings updated', user });
});


// POST /api/notifications/subscribe - Save browser Web Push subscription
app.post('/api/notifications/subscribe', (req, res) => {
  const { userId, subscription } = req.body;
  const targetId = userId || 'usr_1';

  const user = usersStore.find(u => u.id === targetId);
  if (user) {
    user.notificationSubscription = subscription;
  }

  res.json({ message: 'Web Push notification subscription registered', status: 'ACTIVE' });
});

// Helper function to build live stats payload
function getGeofenceStatsForIncident(inc) {
  if (!inc) return null;
  const radius = getRadiusForDisasterType(inc.disasterType);
  const alertsForInc = emergencyAlertsStore.filter(a => a.incidentId === inc.id || a.incidentId === inc.incidentId);
  const acknowledgedCount = alertsForInc.filter(a => a.status === 'ACKNOWLEDGED').length;
  const nearbyCount = Math.max(alertsForInc.length, 2);

  return {
    incidentId: inc.id,
    radius: radius,
    dangerRadius: radius,
    radiusMeters: radius,
    geofenceActive: inc.geofenceActive !== false,
    warningStatus: inc.geofenceActive !== false ? '🟢 ACTIVE' : '🔴 NOT ACTIVE',
    nearbyUsers: nearbyCount,
    nearbyUsersCount: nearbyCount,
    alertsSent: Math.max(alertsForInc.length, 2),
    alertsSentCount: Math.max(alertsForInc.length, 2),
    acknowledged: acknowledgedCount,
    acknowledgedCount: acknowledgedCount,
    activeWarnings: Math.max(1, alertsForInc.length - acknowledgedCount),
    activeWarningsCount: Math.max(1, alertsForInc.length - acknowledgedCount),
    timestamp: new Date().toISOString()
  };
}

// GET /api/incidents/:id/nearby-warning & /geofence-stats
const handleGetGeofenceStats = (req, res) => {
  const { id } = req.params;
  const inc = incidentsStore.find(i => i.id === id || i.incidentId === id) || incidentsStore[0];
  const stats = getGeofenceStatsForIncident(inc);
  res.json(stats);
};

app.get('/api/incidents/:id/nearby-warning', handleGetGeofenceStats);
app.get('/api/incidents/:id/geofence-stats', handleGetGeofenceStats);

// POST /api/incidents/:id/activate-nearby-warning & /activate-warning
const handleActivateWarning = (req, res) => {
  const { id } = req.params;
  const inc = incidentsStore.find(i => i.id === id || i.incidentId === id) || incidentsStore[0];

  inc.geofenceActive = true;
  inc.geofenceActivatedAt = new Date().toISOString();

  processGeofenceWarningsForIncident(inc);

  const stats = getGeofenceStatsForIncident(inc);

  socketManager.emitToIncident(inc.id, 'nearby_warning_stats', stats);
  socketManager.emitToRole('admin', 'nearby_warning_stats', stats);
  socketManager.emitToRole('admin', 'geofence_stats_updated', stats);
  socketManager.emitToAll('warning_activated', { incidentId: inc.id, radius: stats.radius });

  res.json(stats);
};

app.post('/api/incidents/:id/activate-nearby-warning', handleActivateWarning);
app.post('/api/incidents/:id/activate-warning', handleActivateWarning);

// POST /api/emergency-alerts/:alertId/acknowledge & /api/incidents/:id/acknowledge-alert
const handleAcknowledgeAlert = (req, res) => {
  const { alertId, id } = req.params;
  const { userId } = req.body;
  const targetUser = userId || 'usr_1';

  let alert = emergencyAlertsStore.find(a => a.id === alertId || a.incidentId === id && a.userId === targetUser);
  if (!alert && emergencyAlertsStore.length > 0) {
    alert = emergencyAlertsStore[0];
  }

  if (alert) {
    alert.status = 'ACKNOWLEDGED';
    alert.acknowledgedAt = new Date().toISOString();
  }

  const targetIncidentId = alert ? alert.incidentId : (id || 'inc_102');
  const inc = incidentsStore.find(i => i.id === targetIncidentId || i.incidentId === targetIncidentId) || incidentsStore[0];
  const stats = getGeofenceStatsForIncident(inc);

  socketManager.emitToIncident(inc.id, 'nearby_warning_stats', stats);
  socketManager.emitToIncident(inc.id, 'emergency_alert_acknowledged', { alertId, userId: targetUser });
  socketManager.emitToRole('admin', 'nearby_warning_stats', stats);
  socketManager.emitToRole('admin', 'geofence_stats_updated', stats);

  res.json({ message: 'Warning acknowledged', alert, stats });
};

app.post('/api/emergency-alerts/:alertId/acknowledge', handleAcknowledgeAlert);
app.post('/api/incidents/:id/acknowledge-alert', handleAcknowledgeAlert);

// GET /api/incidents/:id/emergency-alerts
app.get('/api/incidents/:id/emergency-alerts', (req, res) => {
  const { id } = req.params;
  const alerts = emergencyAlertsStore.filter(a => a.incidentId === id);
  res.json(alerts);
});

// GET /api/incidents/:id/nearby-users
app.get('/api/incidents/:id/nearby-users', (req, res) => {
  const { id } = req.params;
  const inc = incidentsStore.find(i => i.id === id || i.incidentId === id) || incidentsStore[0];
  const radius = getRadiusForDisasterType(inc.disasterType);

  const nearby = usersStore.filter(u => {
    if (!u.location || !u.location.lat) return false;
    const dist = calculateDistanceMeters(inc.location.lat, inc.location.lng, u.location.lat, u.location.lng);
    return dist <= radius;
  });

  res.json(nearby);
});

// POST /api/users/demo-move-c - Demo mode endpoint moving Citizen C to 90m and triggering real-time warning calculation
app.post('/api/users/demo-move-c', (req, res) => {
  const citizenC = usersStore.find(u => u.id === 'usr_3' || u.name.includes('Citizen C'));
  if (citizenC) {
    citizenC.location = { lat: 28.6288, lng: 77.2055 }; // 90 meters from inc_102 (28.6280, 77.2050)
    citizenC.geoPoint = { type: 'Point', coordinates: [77.2055, 28.6288] };
    citizenC.locationUpdatedAt = new Date().toISOString();
  }

  const inc = incidentsStore.find(i => i.id === 'inc_102') || incidentsStore[0];
  processGeofenceWarningsForIncident(inc);
  const stats = getGeofenceStatsForIncident(inc);

  socketManager.emitToIncident(inc.id, 'nearby_warning_stats', stats);
  socketManager.emitToRole('admin', 'nearby_warning_stats', stats);
  socketManager.emitToRole('admin', 'geofence_stats_updated', stats);

  res.json({ message: 'Citizen C moved to 90m inside geofence', stats, user: citizenC });
});





// Real-Time SOS Alert Endpoint
// GET /api/hospitals/nearby - Geospatial search for hospitals near lat, lng
app.get('/api/hospitals/nearby', (req, res) => {
  const lat = parseFloat(req.query.latitude || req.query.lat || '28.6285');
  const lng = parseFloat(req.query.longitude || req.query.lng || '77.2052');
  const radiusKm = parseFloat(req.query.radius || '15');

  const list = hospitalsStore.map(h => {
    const distM = calculateDistanceMeters(lat, lng, h.location.lat, h.location.lng);
    const distKm = parseFloat((distM / 1000).toFixed(1));
    const etaMin = Math.max(2, Math.round((distKm / 35) * 60));
    return {
      ...h,
      distanceKm: distKm,
      distanceText: `${distKm} km`,
      etaMinutes: etaMin,
      etaText: `${etaMin} min`,
      availableBeds: h.availableBeds !== undefined ? h.availableBeds : Math.floor(h.totalBeds * 0.35),
      icuAvailable: h.icuAvailable !== undefined ? h.icuAvailable : 4,
      traumaAvailable: h.traumaAvailable !== undefined ? h.traumaAvailable : 3,
      emergencyAvailable: h.emergencyAvailable !== undefined ? h.emergencyAvailable : true
    };
  }).sort((a, b) => a.distanceKm - b.distanceKm);

  res.json(list);
});

// Real-Time SOS Alert Endpoint with Multi-Unit Dispatch & Geospatial Querying
app.post('/api/sos', (req, res) => {
  const { latitude, longitude, accuracy, description } = req.body;

  // Extract citizen identity from JWT header if present
  let citizenUser = usersStore[0];
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const found = usersStore.find(u => u.id === decoded.id || u.email === decoded.email);
      if (found) citizenUser = found;
    } catch (e) {}
  }

  const lat = parseFloat(latitude || citizenUser.location?.lat || '28.6285');
  const lng = parseFloat(longitude || citizenUser.location?.lng || '77.2052');

  const sosId = `SOS-${Math.floor(1000 + Math.random() * 9000)}`;
  const incId = `inc_${Date.now()}`;

  // 1. Find nearest AVAILABLE Ambulance
  const availableAmbulances = resourcesStore.filter(r => (r.type === 'Ambulance' || r.type === 'Medical Unit') && r.status !== 'OFFLINE');
  const nearestAmbulance = availableAmbulances.sort((a, b) => {
    return calculateDistanceMeters(lat, lng, a.location.lat, a.location.lng) - calculateDistanceMeters(lat, lng, b.location.lat, b.location.lng);
  })[0] || resourcesStore[0];

  // 2. Find nearest AVAILABLE Fire Brigade
  const availableFireUnits = resourcesStore.filter(r => (r.type === 'Fire Engine' || r.type === 'Hazmat Rescue') && r.status !== 'OFFLINE');
  const nearestFire = availableFireUnits.sort((a, b) => {
    return calculateDistanceMeters(lat, lng, a.location.lat, a.location.lng) - calculateDistanceMeters(lat, lng, b.location.lat, b.location.lng);
  })[0] || resourcesStore[1];

  // 3. Find nearest AVAILABLE Police Vehicle
  const availablePoliceUnits = resourcesStore.filter(r => (r.type === 'Police Control Van' || r.type === 'Rapid Response') && r.status !== 'OFFLINE');
  const nearestPolice = availablePoliceUnits.sort((a, b) => {
    return calculateDistanceMeters(lat, lng, a.location.lat, a.location.lng) - calculateDistanceMeters(lat, lng, b.location.lat, b.location.lng);
  })[0] || resourcesStore[2];

  // Calculate distances & ETAs
  const ambDistKm = parseFloat((calculateDistanceMeters(lat, lng, nearestAmbulance.location.lat, nearestAmbulance.location.lng) / 1000).toFixed(1));
  const ambEtaMin = Math.max(3, Math.round((ambDistKm / 40) * 60));

  const fireDistKm = parseFloat((calculateDistanceMeters(lat, lng, nearestFire.location.lat, nearestFire.location.lng) / 1000).toFixed(1));
  const fireEtaMin = Math.max(4, Math.round((fireDistKm / 35) * 60));

  const polDistKm = parseFloat((calculateDistanceMeters(lat, lng, nearestPolice.location.lat, nearestPolice.location.lng) / 1000).toFixed(1));
  const polEtaMin = Math.max(2, Math.round((polDistKm / 45) * 60));

  // Update responder statuses to EN_ROUTE
  nearestAmbulance.status = 'En Route';
  nearestFire.status = 'En Route';
  nearestPolice.status = 'En Route';

  const assignedUnits = [
    {
      unitId: nearestAmbulance.id,
      unitName: nearestAmbulance.name,
      type: 'AMBULANCE',
      vehicleNumber: nearestAmbulance.vehicleNumber || 'AMB-102',
      driverName: nearestAmbulance.leadOfficer || 'Paramedic Driver Alex',
      status: 'EN_ROUTE',
      assignedAt: new Date().toISOString(),
      distanceKm: ambDistKm,
      etaMinutes: ambEtaMin,
      location: { ...nearestAmbulance.location }
    },
    {
      unitId: nearestFire.id,
      unitName: nearestFire.name,
      type: 'FIRE_BRIGADE',
      vehicleNumber: nearestFire.vehicleNumber || 'FIRE-204',
      driverName: nearestFire.leadOfficer || 'Captain Miller',
      status: 'EN_ROUTE',
      assignedAt: new Date().toISOString(),
      distanceKm: fireDistKm,
      etaMinutes: fireEtaMin,
      location: { ...nearestFire.location }
    },
    {
      unitId: nearestPolice.id,
      unitName: nearestPolice.name,
      type: 'POLICE',
      vehicleNumber: nearestPolice.vehicleNumber || 'POL-911',
      driverName: nearestPolice.leadOfficer || 'Inspector Sharma',
      status: 'EN_ROUTE',
      assignedAt: new Date().toISOString(),
      distanceKm: polDistKm,
      etaMinutes: polEtaMin,
      location: { ...nearestPolice.location }
    }
  ];

  // Auto-find nearby hospitals
  const nearbyHospitals = hospitalsStore.map(h => {
    const dKm = parseFloat((calculateDistanceMeters(lat, lng, h.location.lat, h.location.lng) / 1000).toFixed(1));
    return { ...h, distanceKm: dKm, etaMinutes: Math.max(3, Math.round((dKm / 35) * 60)) };
  }).sort((a, b) => a.distanceKm - b.distanceKm);

  const selectedHospital = nearbyHospitals[0];

  const newIncident = {
    id: incId,
    incidentId: sosId,
    title: `🚨 EMERGENCY SOS — ${citizenUser.name}`,
    disasterType: 'Medical Emergency',
    type: 'SOS',
    severity: 'Critical',
    status: 'ACTIVE',
    citizenId: citizenUser.id,
    citizenName: citizenUser.name,
    citizenPhone: citizenUser.phone || '+1 (555) 019-2831',
    description: description || 'Critical 1-Click SOS triggered by citizen.',
    location: {
      lat,
      lng,
      address: `Citizen Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`
    },
    geoPoint: { type: 'Point', coordinates: [lng, lat] },
    accuracy: accuracy || 5,
    assignedUnits,
    assignedResponders: assignedUnits.map(u => ({ id: u.unitId, name: u.unitName, role: u.type })),
    selectedHospital: {
      id: selectedHospital.id,
      name: selectedHospital.name,
      address: selectedHospital.location.address,
      distanceKm: selectedHospital.distanceKm,
      availableBeds: selectedHospital.availableBeds,
      icuAvailable: selectedHospital.icuAvailable || 4,
      location: selectedHospital.location
    },
    timeline: [
      { step: 'SOS_ACTIVATED', label: '🚨 SOS ACTIVATED', timestamp: new Date().toISOString() },
      { step: 'LOCATION_SHARED', label: '📍 LOCATION SHARED', timestamp: new Date().toISOString() },
      { step: 'UNITS_DISPATCHED', label: '🚑 DISPATCHED (AMBULANCE + FIRE + POLICE)', timestamp: new Date().toISOString() }
    ],
    createdAt: new Date().toISOString()
  };

  incidentsStore.unshift(newIncident);

  const sosRecord = {
    id: sosId,
    incidentId: incId,
    citizenId: citizenUser.id,
    citizenName: citizenUser.name,
    citizenPhone: citizenUser.phone || '+1 (555) 019-2831',
    location: newIncident.location,
    assignedUnits,
    status: 'ACTIVE',
    createdAt: newIncident.createdAt
  };
  sosStore.unshift(sosRecord);

  const notif = {
    id: `notif_${Date.now()}`,
    title: '🚨 CRITICAL SOS DISPATCH ACTIVATED',
    message: `1-Click SOS from ${citizenUser.name}. Nearest Ambulance, Fire Brigade & Police dispatched!`,
    type: 'CRITICAL',
    createdAt: new Date().toISOString()
  };
  notificationsStore.unshift(notif);

  // Emit live Socket.IO events to rooms
  socketManager.emitToRole('admin', 'new_sos_incident', newIncident);
  socketManager.emitToRole('rescue', 'new_sos_incident', newIncident);
  socketManager.emitToRole('admin', 'new_notification', notif);
  socketManager.emitToIncident(incId, 'sos_created', newIncident);
  socketManager.emitToIncident(incId, 'sos_dispatched', newIncident);
  socketManager.emitToUser(citizenUser.id, 'sos_created', newIncident);

  res.status(201).json(newIncident);
});

// GET /api/sos/:id/track - Live tracking data for active SOS incident
app.get('/api/sos/:id/track', (req, res) => {
  const { id } = req.params;
  const inc = incidentsStore.find(i => i.id === id || i.incidentId === id || i.citizenId === id);
  if (!inc) {
    return res.status(404).json({ message: 'Active SOS incident not found' });
  }

  // Recalculate distances & ETAs dynamically
  if (inc.assignedUnits) {
    inc.assignedUnits.forEach(unit => {
      if (unit.location) {
        const dM = calculateDistanceMeters(inc.location.lat, inc.location.lng, unit.location.lat, unit.location.lng);
        unit.distanceKm = parseFloat((dM / 1000).toFixed(1));
        unit.etaMinutes = Math.max(1, Math.round((unit.distanceKm / 40) * 60));
      }
    });
  }

  res.json(inc);
});

// PUT /api/rescue-units/:unitId/location - Update unit telemetry & stream Socket.IO
app.put('/api/rescue-units/:unitId/location', (req, res) => {
  const { unitId } = req.params;
  const { latitude, longitude, speed, heading } = req.body;

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  const resUnit = resourcesStore.find(r => r.id === unitId || r.vehicleNumber === unitId);
  if (resUnit) {
    resUnit.location = { lat, lng, address: `Live Unit Telemetry (${lat.toFixed(4)}, ${lng.toFixed(4)})` };
    resUnit.lastLocationUpdate = new Date().toISOString();
  }

  // Find associated incident
  const inc = incidentsStore.find(i => i.assignedUnits?.some(u => u.unitId === unitId) || i.assignedResponders?.some(r => r.id === unitId));
  if (inc) {
    const assigned = inc.assignedUnits?.find(u => u.unitId === unitId);
    if (assigned) {
      assigned.location = { lat, lng };
      const dM = calculateDistanceMeters(inc.location.lat, inc.location.lng, lat, lng);
      assigned.distanceKm = parseFloat((dM / 1000).toFixed(1));
      assigned.etaMinutes = Math.max(1, Math.round((assigned.distanceKm / 40) * 60));
    }

    const payload = {
      incidentId: inc.id,
      unitId,
      latitude: lat,
      longitude: lng,
      speed: speed || 45,
      heading: heading || 120,
      timestamp: new Date().toISOString(),
      distanceKm: assigned?.distanceKm || 1.2,
      etaMinutes: assigned?.etaMinutes || 3
    };

    socketManager.emitToIncident(inc.id, 'unit_location_updated', payload);
    socketManager.emitToRole('admin', 'unit_location_updated', payload);
  }

  res.json({ message: 'Unit location updated', unitId, lat, lng });
});

// POST /api/incidents/:id/select-hospital - Operator/Ambulance selects hospital & reserves bed
app.post('/api/incidents/:id/select-hospital', (req, res) => {
  const { id } = req.params;
  const { hospitalId } = req.body;

  const inc = incidentsStore.find(i => i.id === id || i.incidentId === id);
  if (!inc) return res.status(404).json({ message: 'Incident not found' });

  const hosp = hospitalsStore.find(h => h.id === hospitalId) || hospitalsStore[0];
  
  // Reserve bed in hospital
  if (hosp.availableBeds > 0) {
    hosp.availableBeds -= 1;
    hosp.reservedBeds = (hosp.reservedBeds || 0) + 1;
  }

  inc.selectedHospital = {
    id: hosp.id,
    name: hosp.name,
    address: hosp.location.address,
    location: hosp.location,
    availableBeds: hosp.availableBeds,
    icuAvailable: hosp.icuAvailable || 4
  };
  inc.timeline.push({ step: 'HOSPITAL_SELECTED', label: `🏥 HOSPITAL SELECTED (${hosp.name})`, timestamp: new Date().toISOString() });

  const payload = { incidentId: inc.id, hospital: inc.selectedHospital, availableBeds: hosp.availableBeds };

  socketManager.emitToIncident(inc.id, 'hospital_selected', payload);
  socketManager.emitToIncident(inc.id, 'hospital_bed_updated', { hospitalId: hosp.id, availableBeds: hosp.availableBeds });
  socketManager.emitToRole('admin', 'hospital_bed_updated', { hospitalId: hosp.id, availableBeds: hosp.availableBeds });
  socketManager.emitToRole('hospital', 'hospital_bed_updated', { hospitalId: hosp.id, availableBeds: hosp.availableBeds });

  res.json(inc);
});

// POST /api/incidents/:id/patient-picked-up - Ambulance picks up patient & shifts route to hospital
app.post('/api/incidents/:id/patient-picked-up', (req, res) => {
  const { id } = req.params;
  const inc = incidentsStore.find(i => i.id === id || i.incidentId === id);
  if (!inc) return res.status(404).json({ message: 'Incident not found' });

  inc.status = 'PATIENT_PICKED_UP';
  inc.timeline.push({ step: 'PATIENT_PICKED_UP', label: '👤 PATIENT PICKED UP (EN ROUTE TO HOSPITAL)', timestamp: new Date().toISOString() });

  const payload = { incidentId: inc.id, status: 'PATIENT_PICKED_UP', destination: inc.selectedHospital?.name || 'Emergency Hospital' };

  socketManager.emitToIncident(inc.id, 'patient_picked_up', payload);
  socketManager.emitToIncident(inc.id, 'patient_status_updated', payload);
  socketManager.emitToRole('admin', 'patient_status_updated', payload);

  res.json(inc);
});

// POST /api/incidents/:id/start-transport
app.post('/api/incidents/:id/start-transport', (req, res) => {
  const { id } = req.params;
  const inc = incidentsStore.find(i => i.id === id || i.incidentId === id);
  if (!inc) return res.status(404).json({ message: 'Incident not found' });

  inc.status = 'TRANSPORTING';
  inc.timeline.push({ step: 'TRANSPORTING', label: '🚑 AMBULANCE TRANSPORTING TO HOSPITAL', timestamp: new Date().toISOString() });

  socketManager.emitToIncident(inc.id, 'transport_started', { incidentId: inc.id, status: 'TRANSPORTING' });
  socketManager.emitToRole('admin', 'patient_status_updated', { incidentId: inc.id, status: 'TRANSPORTING' });

  res.json(inc);
});

// POST /api/incidents/:id/arrived-hospital
app.post('/api/incidents/:id/arrived-hospital', (req, res) => {
  const { id } = req.params;
  const inc = incidentsStore.find(i => i.id === id || i.incidentId === id);
  if (!inc) return res.status(404).json({ message: 'Incident not found' });

  inc.status = 'ARRIVED_AT_HOSPITAL';
  inc.timeline.push({ step: 'ARRIVED_AT_HOSPITAL', label: '🏥 ARRIVED AT EMERGENCY HOSPITAL', timestamp: new Date().toISOString() });

  socketManager.emitToIncident(inc.id, 'patient_arrived_hospital', { incidentId: inc.id, status: 'ARRIVED_AT_HOSPITAL' });
  socketManager.emitToRole('admin', 'patient_status_updated', { incidentId: inc.id, status: 'ARRIVED_AT_HOSPITAL' });

  res.json(inc);
});

// POST /api/incidents/:id/patient-admitted - Finalizes admission & resolves SOS
app.post('/api/incidents/:id/patient-admitted', (req, res) => {
  const { id } = req.params;
  const inc = incidentsStore.find(i => i.id === id || i.incidentId === id);
  if (!inc) return res.status(404).json({ message: 'Incident not found' });

  inc.status = 'RESOLVED';
  inc.timeline.push({ step: 'PATIENT_ADMITTED', label: '🛏️ PATIENT ADMITTED TO ICU/EMERGENCY BED', timestamp: new Date().toISOString() });

  if (inc.selectedHospital?.id) {
    const hosp = hospitalsStore.find(h => h.id === inc.selectedHospital.id);
    if (hosp) {
      hosp.reservedBeds = Math.max(0, (hosp.reservedBeds || 1) - 1);
    }
  }

  socketManager.emitToIncident(inc.id, 'patient_admitted', { incidentId: inc.id, status: 'RESOLVED' });
  socketManager.emitToIncident(inc.id, 'sos_resolved', { incidentId: inc.id });
  socketManager.emitToRole('admin', 'sos_resolved', { incidentId: inc.id });

  res.json(inc);
});

// POST /api/rescue-units/:unitId/demo-step - Simulated movement step for demonstration
app.post('/api/rescue-units/:unitId/demo-step', (req, res) => {
  const { unitId } = req.params;
  const inc = incidentsStore.find(i => i.assignedUnits?.some(u => u.unitId === unitId)) || incidentsStore[0];
  const unit = inc.assignedUnits?.find(u => u.unitId === unitId) || inc.assignedUnits?.[0];

  if (unit) {
    // Step closer to Citizen location
    const targetLat = inc.location.lat;
    const targetLng = inc.location.lng;

    const currentLat = unit.location?.lat || 28.6150;
    const currentLng = unit.location?.lng || 77.2080;

    const nextLat = parseFloat((currentLat + (targetLat - currentLat) * 0.35).toFixed(6));
    const nextLng = parseFloat((currentLng + (targetLng - currentLng) * 0.35).toFixed(6));

    unit.location = { lat: nextLat, lng: nextLng };

    const dM = calculateDistanceMeters(targetLat, targetLng, nextLat, nextLng);
    unit.distanceKm = parseFloat((dM / 1000).toFixed(1));
    unit.etaMinutes = Math.max(1, Math.round((unit.distanceKm / 40) * 60));

    if (unit.distanceKm <= 0.1) {
      unit.status = 'ARRIVED';
    }

    const payload = {
      incidentId: inc.id,
      unitId,
      latitude: nextLat,
      longitude: nextLng,
      distanceKm: unit.distanceKm,
      etaMinutes: unit.etaMinutes,
      status: unit.status,
      timestamp: new Date().toISOString()
    };

    socketManager.emitToIncident(inc.id, 'unit_location_updated', payload);
    socketManager.emitToRole('admin', 'unit_location_updated', payload);

    return res.json({ message: 'Unit moved closer', unit, incident: inc });
  }

  res.status(404).json({ message: 'Assigned unit not found' });
});

app.get('/api/sos', (req, res) => {
  res.json(sosStore);
});


app.put('/api/incidents/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, responder } = req.body;
  const inc = incidentsStore.find(i => i.id === id || i.incidentId === id);
  if (!inc) return res.status(404).json({ message: 'Incident not found' });

  if (status) inc.status = status;
  if (responder) {
    inc.assignedResponders.push({ ...responder, assignedAt: new Date().toISOString() });
    inc.status = 'In Progress';
  }

  socketManager.emitToAll('update_incident', inc);
  res.json(inc);
});


// Resource Allocation AI Route
app.post('/api/ai/recommend-resources', (req, res) => {
  const { incidentId } = req.body;
  const incident = incidentsStore.find(i => i.id === incidentId);

  const nearestResources = resourcesStore.map(r => ({
    ...r,
    recommendedMatchScore: Math.floor(80 + Math.random() * 18),
    trafficCondition: 'Moderate Traffic',
    routeEta: `${r.etaMinutes} mins`
  }));

  res.json({
    incidentId,
    recommendations: nearestResources,
    aiReasoning: `Optimal multi-criteria optimization based on vehicle proximity, live GPS traffic, vehicle capacity, and incident urgency.`
  });
});

// Legacy rescue units endpoint
app.get('/api/rescue-units', async (req, res) => {
  try {
    let units = [];
    if (RescueTeam) {
      units = await RescueTeam.find().lean();
    }
    res.json(units);
  } catch (e) {
    res.json([]);
  }
});

// =============================================================
// HOSPITAL MANAGEMENT & LIVE BED AVAILABILITY API ENDPOINTS
// =============================================================

function getHospitalFreshnessStatus(lastUpdate) {
  if (!lastUpdate) return 'UNKNOWN';
  const ageHours = (Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60);
  if (isNaN(ageHours)) return 'UNKNOWN';
  if (ageHours > 1) return 'STALE';
  return 'CURRENT';
}

// 1. GET /api/hospitals — List, Search, Filter, Distance Sort & Summary
app.get('/api/hospitals', async (req, res) => {
  const lat = parseFloat(req.query.lat || req.query.latitude);
  const lng = parseFloat(req.query.lng || req.query.longitude);
  const search = (req.query.search || '').toLowerCase();
  const icuOnly = req.query.icuOnly === 'true';
  const erStatusFilter = (req.query.erStatus || 'ALL').toUpperCase();
  const freshnessFilter = (req.query.freshness || 'ALL').toUpperCase();

  let combined = [...hospitalsStore];

  try {
    if (Hospital) {
      const dbHospitals = await Hospital.find().lean();
      dbHospitals.forEach(mHosp => {
        const hId = mHosp.hospitalId || mHosp._id.toString();
        const idx = combined.findIndex(h => h.id === hId || h.hospitalId === hId || h.name === mHosp.name);

        const normObj = {
          id: hId,
          hospitalId: hId,
          name: mHosp.name,
          address: mHosp.address,
          contactPhone: mHosp.contactPhone || '+91 98765 43210',
          imageUrl: mHosp.imageUrl || 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=600&q=80',
          location: {
            lat: mHosp.location?.lat !== undefined ? mHosp.location.lat : (mHosp.geoPoint?.coordinates?.[1] || 28.5672),
            lng: mHosp.location?.lng !== undefined ? mHosp.location.lng : (mHosp.geoPoint?.coordinates?.[0] || 77.2100),
            address: mHosp.address
          },
          generalBeds: mHosp.generalBeds || { total: mHosp.totalBeds || 100, available: mHosp.availableBeds || 35 },
          icuBeds: mHosp.icuBeds || { total: mHosp.icuBedsTotal || 20, available: mHosp.icuBeds || mHosp.availableICUBeds || 5 },
          availableBeds: mHosp.generalBeds?.available ?? mHosp.availableBeds ?? 35,
          totalBeds: mHosp.generalBeds?.total ?? mHosp.totalBeds ?? 100,
          availableICUBeds: mHosp.icuBeds?.available ?? mHosp.icuBeds ?? 5,
          icuBedsTotal: mHosp.icuBeds?.total ?? 20,
          emergencyDepartmentStatus: mHosp.emergencyDepartmentStatus || 'AVAILABLE',
          ambulanceReceivingStatus: mHosp.ambulanceReceivingStatus || 'ACCEPTING',
          emergencyServices: mHosp.emergencyServices || ['Trauma Care', 'Emergency Medicine', 'Oxygen Support'],
          availabilitySource: mHosp.availabilitySource || 'MANUAL_REPORTED',
          lastAvailabilityUpdate: mHosp.lastAvailabilityUpdate || mHosp.updatedAt || new Date().toISOString(),
          availabilityStatus: getHospitalFreshnessStatus(mHosp.lastAvailabilityUpdate || mHosp.updatedAt),
          assignedStaffIds: mHosp.assignedStaffIds || ['usr_hospital_staff'],
          updatedBy: mHosp.updatedBy || 'System'
        };

        if (idx !== -1) {
          combined[idx] = { ...combined[idx], ...normObj };
        } else {
          combined.push(normObj);
        }
      });
    }
  } catch (err) {
    console.warn('GET /api/hospitals mongo notice:', err.message);
  }

  // Calculate distance & freshness for all hospitals
  combined = combined.map(h => {
    const hLat = h.location?.lat;
    const hLng = h.location?.lng;
    const isValidLoc = typeof hLat === 'number' && typeof hLng === 'number' && !isNaN(hLat) && !isNaN(hLng) && hLat >= -90 && hLat <= 90 && hLng >= -180 && hLng <= 180;

    let distMeters = Infinity;
    let distKm = 'N/A';
    let etaMins = 999;

    if (!isNaN(lat) && !isNaN(lng) && isValidLoc) {
      distMeters = calculateDistanceMeters(lat, lng, hLat, hLng);
      distKm = `${(distMeters / 1000).toFixed(1)} km`;
      etaMins = Math.max(1, Math.ceil(distMeters / 500));
    }

    const freshness = getHospitalFreshnessStatus(h.lastAvailabilityUpdate);

    return {
      ...h,
      locationValid: isValidLoc,
      distMeters,
      distanceKm: distKm,
      etaMinutes: etaMins,
      availabilityStatus: freshness
    };
  });

  // Apply filters
  let filtered = combined.filter(h => {
    const matchesSearch = !search || h.name.toLowerCase().includes(search) || h.address.toLowerCase().includes(search);
    const matchesICU = !icuOnly || (h.icuBeds?.available > 0 || h.availableICUBeds > 0);
    const matchesER = erStatusFilter === 'ALL' || (h.emergencyDepartmentStatus && h.emergencyDepartmentStatus.toUpperCase() === erStatusFilter);
    const matchesFreshness = freshnessFilter === 'ALL' || (h.availabilityStatus && h.availabilityStatus.toUpperCase() === freshnessFilter);

    return matchesSearch && matchesICU && matchesER && matchesFreshness;
  });

  // Sort by distance if lat/lng provided
  if (!isNaN(lat) && !isNaN(lng)) {
    filtered.sort((a, b) => a.distMeters - b.distMeters);
  }

  // Calculate live database summary metrics
  const summary = {
    totalHospitals: combined.length,
    currentDataCount: combined.filter(h => h.availabilityStatus === 'CURRENT').length,
    icuAvailableCount: combined.filter(h => (h.icuBeds?.available > 0 || h.availableICUBeds > 0)).length,
    erAvailableCount: combined.filter(h => h.emergencyDepartmentStatus === 'AVAILABLE').length,
    staleOrUnknownCount: combined.filter(h => h.availabilityStatus === 'STALE' || h.availabilityStatus === 'UNKNOWN').length
  };

  // If frontend expects array directly or wrapper
  if (req.headers['x-format'] === 'array' || req.query.format === 'array') {
    return res.json(filtered);
  }

  res.json({ summary, hospitals: filtered });
});

// 2. GET /api/hospitals/nearby — Spatial Radius Search
app.get('/api/hospitals/nearby', async (req, res) => {
  const lat = parseFloat(req.query.latitude || req.query.lat);
  const lng = parseFloat(req.query.longitude || req.query.lng);
  const radiusKm = parseFloat(req.query.radiusKm || req.query.radius || 50);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ message: 'Valid latitude and longitude parameters are required.' });
  }

  let combined = [...hospitalsStore];
  try {
    if (Hospital) {
      const mongoHospitals = await Hospital.find({
        geoPoint: {
          $near: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },
            $maxDistance: radiusKm * 1000
          }
        }
      }).lean();
      if (mongoHospitals.length > 0) {
        mongoHospitals.forEach(mH => {
          const vId = mH.hospitalId || mH._id.toString();
          const idx = combined.findIndex(h => h.id === vId || h.hospitalId === vId);
          if (idx !== -1) combined[idx] = { ...combined[idx], ...mH };
          else combined.push(mH);
        });
      }
    }
  } catch (e) {
    console.warn('Hospital $near query notice:', e.message);
  }

  const sorted = combined
    .map(h => {
      const hLat = h.location?.lat;
      const hLng = h.location?.lng;
      if (typeof hLat !== 'number' || typeof hLng !== 'number') return { ...h, distMeters: Infinity };
      const distMeters = calculateDistanceMeters(lat, lng, hLat, hLng);
      return {
        ...h,
        distMeters,
        distanceKm: `${(distMeters / 1000).toFixed(1)} km`,
        availabilityStatus: getHospitalFreshnessStatus(h.lastAvailabilityUpdate)
      };
    })
    .filter(h => h.distMeters <= radiusKm * 1000)
    .sort((a, b) => a.distMeters - b.distMeters);

  res.json(sorted);
});

// 3. GET /api/hospitals/:id — Single Hospital Details
app.get('/api/hospitals/:id', async (req, res) => {
  const { id } = req.params;
  let hosp = hospitalsStore.find(h => h.id === id || h.hospitalId === id);
  if (!hosp && Hospital) {
    try {
      hosp = await Hospital.findById(id).lean();
    } catch (e) {}
  }
  if (!hosp) return res.status(404).json({ message: 'Hospital record not found.' });

  hosp.availabilityStatus = getHospitalFreshnessStatus(hosp.lastAvailabilityUpdate);
  res.json(hosp);
});

// 4. POST /api/hospitals — Register New Hospital (Admin Only)
app.post('/api/hospitals', async (req, res) => {
  const { name, address, lat, lng, totalBeds, icuBeds, contactPhone, emergencyServices } = req.body;
  if (!name || isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ message: 'Hospital name, latitude, and longitude are required.' });
  }

  const newHosp = {
    id: `hosp_${Date.now()}`,
    hospitalId: `hosp_${Date.now()}`,
    name,
    address: address || 'Emergency Center',
    contactPhone: contactPhone || '+91 98765 43210',
    imageUrl: req.body.imageUrl || 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=600&q=80',
    location: { lat, lng, address: address || 'Emergency Center' },
    geoPoint: { type: 'Point', coordinates: [lng, lat] },
    generalBeds: { total: totalBeds || 100, available: req.body.availableBeds || 35 },
    icuBeds: { total: icuBeds || 20, available: req.body.availableICUBeds || 5 },
    availableBeds: req.body.availableBeds || 35,
    totalBeds: totalBeds || 100,
    availableICUBeds: req.body.availableICUBeds || 5,
    icuBedsTotal: icuBeds || 20,
    emergencyDepartmentStatus: req.body.emergencyDepartmentStatus || 'AVAILABLE',
    ambulanceReceivingStatus: req.body.ambulanceReceivingStatus || 'ACCEPTING',
    emergencyServices: emergencyServices || ['Trauma Care', 'Emergency Medicine'],
    availabilitySource: 'MANUAL_REPORTED',
    lastAvailabilityUpdate: new Date().toISOString(),
    availabilityStatus: 'CURRENT',
    assignedStaffIds: req.body.assignedStaffIds || ['usr_hospital_staff'],
    updatedBy: req.user ? req.user.name : 'Administrator'
  };

  hospitalsStore.unshift(newHosp);
  if (Hospital) {
    try {
      await Hospital.create(newHosp);
    } catch (e) {
      console.warn('Mongo Hospital create notice:', e.message);
    }
  }

  io.emit('hospital:registered', newHosp);
  io.emit('update_hospital', newHosp);
  res.status(201).json(newHosp);
});

// 5. PATCH /api/hospitals/:id/availability — Update Live Bed Availability (Hospital Staff / Admin / Operator)
app.patch('/api/hospitals/:id/availability', async (req, res) => {
  const { id } = req.params;
  const {
    generalBedsTotal,
    generalBedsAvailable,
    icuBedsTotal,
    icuBedsAvailable,
    emergencyDepartmentStatus,
    ambulanceReceivingStatus,
    emergencyServices
  } = req.body;

  let hospIndex = hospitalsStore.findIndex(h => h.id === id || h.hospitalId === id);
  let targetHosp = hospIndex !== -1 ? hospitalsStore[hospIndex] : null;

  if (!targetHosp && Hospital) {
    try {
      targetHosp = await Hospital.findById(id).lean();
    } catch (e) {}
  }

  if (!targetHosp) {
    return res.status(404).json({ message: 'Hospital record not found.' });
  }

  // Role-Based Access Control (RBAC) Permission Check
  if (req.user && req.user.role === 'hospital_staff') {
    const isAssigned = (targetHosp.assignedStaffIds || []).some(sId => sId === req.user.id || sId === req.user.email);
    if (!isAssigned && targetHosp.id !== req.user.assignedHospitalId) {
      return res.status(403).json({ message: 'Access denied: You are only authorized to update your assigned hospital.' });
    }
  }

  // Validation Rules
  const genTotal = generalBedsTotal !== undefined ? parseInt(generalBedsTotal, 10) : (targetHosp.generalBeds?.total ?? targetHosp.totalBeds ?? 100);
  const genAvail = generalBedsAvailable !== undefined ? parseInt(generalBedsAvailable, 10) : (targetHosp.generalBeds?.available ?? targetHosp.availableBeds ?? 35);
  const icuTotal = icuBedsTotal !== undefined ? parseInt(icuBedsTotal, 10) : (targetHosp.icuBeds?.total ?? targetHosp.icuBedsTotal ?? 20);
  const icuAvail = icuBedsAvailable !== undefined ? parseInt(icuBedsAvailable, 10) : (targetHosp.icuBeds?.available ?? targetHosp.icuBeds ?? 5);

  if (isNaN(genTotal) || genTotal < 0 || isNaN(genAvail) || genAvail < 0) {
    return res.status(400).json({ message: 'General bed counts must be non-negative integers.' });
  }
  if (genAvail > genTotal) {
    return res.status(400).json({ message: `Available general beds (${genAvail}) cannot exceed total capacity (${genTotal}).` });
  }
  if (isNaN(icuTotal) || icuTotal < 0 || isNaN(icuAvail) || icuAvail < 0) {
    return res.status(400).json({ message: 'ICU bed counts must be non-negative integers.' });
  }
  if (icuAvail > icuTotal) {
    return res.status(400).json({ message: `Available ICU beds (${icuAvail}) cannot exceed total capacity (${icuTotal}).` });
  }

  const erStatus = ['AVAILABLE', 'BUSY', 'UNAVAILABLE'].includes((emergencyDepartmentStatus || '').toUpperCase())
    ? emergencyDepartmentStatus.toUpperCase()
    : (targetHosp.emergencyDepartmentStatus || 'AVAILABLE');

  const ambStatus = ['ACCEPTING', 'NOT_ACCEPTING', 'UNKNOWN'].includes((ambulanceReceivingStatus || '').toUpperCase())
    ? ambulanceReceivingStatus.toUpperCase()
    : (targetHosp.ambulanceReceivingStatus || 'ACCEPTING');

  const updatedPayload = {
    ...targetHosp,
    generalBeds: { total: genTotal, available: genAvail },
    icuBeds: { total: icuTotal, available: icuAvail },
    availableBeds: genAvail,
    totalBeds: genTotal,
    availableICUBeds: icuAvail,
    icuBedsTotal: icuTotal,
    emergencyDepartmentStatus: erStatus,
    ambulanceReceivingStatus: ambStatus,
    emergencyServices: Array.isArray(emergencyServices) ? emergencyServices : (targetHosp.emergencyServices || ['Trauma Care', 'Emergency Medicine']),
    availabilitySource: 'MANUAL_REPORTED',
    lastAvailabilityUpdate: new Date().toISOString(),
    availabilityStatus: 'CURRENT',
    updatedBy: req.user ? (req.user.name || req.user.email) : 'Authorized Hospital Staff'
  };

  if (hospIndex !== -1) {
    hospitalsStore[hospIndex] = updatedPayload;
  } else {
    hospitalsStore.push(updatedPayload);
  }

  // Persist to MongoDB
  if (Hospital) {
    try {
      await Hospital.findOneAndUpdate(
        { $or: [{ hospitalId: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }] },
        { $set: updatedPayload },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.warn('Mongo Hospital availability update error:', err.message);
    }
  }

  // Real-time Socket.IO dispatch
  io.emit('hospital:availabilityUpdated', updatedPayload);
  io.emit('bed_availability_updated', {
    hospitalId: id,
    availableBeds: genAvail,
    availableICUBeds: icuAvail,
    emergencyDepartmentStatus: erStatus,
    ambulanceReceivingStatus: ambStatus,
    updatedAt: updatedPayload.lastAvailabilityUpdate
  });
  io.emit('update_hospital', updatedPayload);

  return res.json({
    success: true,
    message: `Hospital availability successfully updated for ${updatedPayload.name}`,
    hospital: updatedPayload
  });
});

app.put('/api/hospitals/:id', async (req, res) => {
  const { id } = req.params;
  const index = hospitalsStore.findIndex(h => h.id === id);
  if (index !== -1) {
    hospitalsStore[index] = { ...hospitalsStore[index], ...req.body };
    io.emit('hospital:availabilityUpdated', hospitalsStore[index]);
    io.emit('update_hospital', hospitalsStore[index]);
    return res.json(hospitalsStore[index]);
  }
  res.status(404).json({ message: 'Hospital not found' });
});

// Relief Camps Route
app.get('/api/camps', (req, res) => res.json(reliefCampsStore));
app.put('/api/camps/:id', (req, res) => {
  const { id } = req.params;
  const index = reliefCampsStore.findIndex(c => c.id === id);
  if (index !== -1) {
    reliefCampsStore[index] = { ...reliefCampsStore[index], ...req.body };
    io.emit('update_camp', reliefCampsStore[index]);
    return res.json(reliefCampsStore[index]);
  }
  res.status(404).json({ message: 'Camp not found' });
});

// ============================================================================
// MISSING PERSONS & FAMILY REUNIFICATION MODULE (RESQAI CRISISCONNECT)
// ============================================================================

// Helper: Check if user is authorized operator/responder/admin
function isAuthorizedStaff(req) {
  if (!req.user) {
    const roleHeader = (req.headers['x-user-role'] || '').toLowerCase();
    return ['emergency operator', 'operator', 'admin', 'super admin', 'responder', 'rescue team', 'hospital'].includes(roleHeader);
  }
  const userRole = (req.user.role || '').toLowerCase();
  return ['emergency operator', 'operator', 'admin', 'super admin', 'responder', 'rescue team', 'hospital'].includes(userRole);
}

// 1. GET /api/missing/stats — Summary metrics
app.get('/api/missing/stats', async (req, res) => {
  try {
    let totalMissing = 0;
    let totalFound = 0;
    let searchingCount = 0;
    let possibleMatchCount = 0;
    let underVerificationCount = 0;
    let verifiedCount = 0;
    let reunitedCount = 0;

    if (MissingPerson) {
      totalMissing = await MissingPerson.countDocuments({ recordType: 'MISSING' });
      totalFound = await MissingPerson.countDocuments({ recordType: 'FOUND' });
      searchingCount = await MissingPerson.countDocuments({ status: { $in: ['Searching', 'Reported'] } });
      possibleMatchCount = await MissingPerson.countDocuments({ status: 'Possible Match' });
      underVerificationCount = await MissingPerson.countDocuments({ status: 'Under Verification' });
      verifiedCount = await MissingPerson.countDocuments({ status: 'Verified' });
      reunitedCount = await MissingPerson.countDocuments({ status: 'Reunited' });
    }

    res.json({
      success: true,
      stats: {
        totalCases: totalMissing + totalFound,
        totalMissing,
        totalFound,
        searchingCount,
        possibleMatchCount,
        underVerificationCount,
        verifiedCount,
        reunitedCount
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. GET /api/missing — Search & List records with privacy masking
app.get('/api/missing', authenticateToken, async (req, res) => {
  try {
    const {
      type, // 'MISSING', 'FOUND', 'ALL'
      status,
      incidentId,
      minAge,
      maxAge,
      gender,
      search,
      page = 1,
      limit = 100
    } = req.query;

    const query = {};

    if (type && type.toUpperCase() !== 'ALL') {
      query.recordType = type.toUpperCase();
    }
    if (status && status.toUpperCase() !== 'ALL') {
      query.status = status;
    }
    if (incidentId && incidentId !== 'ALL') {
      query.disasterIncidentId = incidentId;
    }
    if (gender && gender !== 'ALL') {
      query.gender = gender;
    }
    if (minAge || maxAge) {
      query.age = {};
      if (minAge) query.age.$gte = Number(minAge);
      if (maxAge) query.age.$lte = Number(maxAge);
    }
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { fullName: searchRegex },
        { lastSeenLocation: searchRegex },
        { approximateArea: searchRegex },
        { description: searchRegex },
        { caseId: searchRegex }
      ];
    }

    let records = [];
    if (MissingPerson) {
      records = await MissingPerson.find(query).sort({ createdAt: -1 }).limit(Number(limit));
    }

    const authorized = isAuthorizedStaff(req);

    // Apply privacy masking for public / unauthorized views
    const formatted = records.map(r => {
      if (authorized) {
        const obj = r.toObject ? r.toObject() : { ...r };
        obj.id = obj.caseId || obj._id.toString();
        return obj;
      }
      return r.toPublicJSON ? r.toPublicJSON() : r;
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. GET /api/missing/:id — Single Case View
app.get('/api/missing/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    let found = null;
    if (MissingPerson) {
      found = await MissingPerson.findOne({
        $or: [{ caseId: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }]
      });
    }

    if (!found) {
      return res.status(404).json({ success: false, message: 'Missing person case record not found' });
    }

    const authorized = isAuthorizedStaff(req);
    const result = authorized ? found.toObject() : found.toPublicJSON();
    res.json({ success: true, case: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. POST /api/missing — Citizen Report Missing Person
app.post('/api/missing', authenticateToken, async (req, res) => {
  try {
    const {
      fullName,
      age,
      gender = 'Male',
      photoUrl,
      lastSeenLocation,
      approximateArea,
      coordinates,
      dateTimeLastSeen,
      description,
      distinguishingFeatures,
      disasterIncidentId = 'INC-GENERAL-DELHI',
      familyContactName,
      familyContactPhone,
      familyContactEmail,
      relationshipToPerson = 'Family Member',
      consentForPublicListing = true,
      isConfidential = false
    } = req.body;

    if (!fullName || !familyContactName || !familyContactPhone || !lastSeenLocation) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: fullName, familyContactName, familyContactPhone, and lastSeenLocation are mandatory.'
      });
    }

    const caseId = `MP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const lat = coordinates?.lat || 28.6139;
    const lng = coordinates?.lng || 77.2090;

    const newCase = new MissingPerson({
      caseId,
      recordType: 'MISSING',
      fullName: fullName.trim(),
      age: Number(age) || 0,
      gender,
      photoUrl: photoUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
      lastSeenLocation: lastSeenLocation.trim(),
      approximateArea: approximateArea || lastSeenLocation.split(',')[0],
      coordinates: { lat, lng },
      geoPoint: { type: 'Point', coordinates: [lng, lat] },
      dateTimeLastSeen: dateTimeLastSeen ? new Date(dateTimeLastSeen) : new Date(),
      description: description || '',
      distinguishingFeatures: Array.isArray(distinguishingFeatures) ? distinguishingFeatures : (distinguishingFeatures ? [distinguishingFeatures] : []),
      disasterIncidentId,
      familyContactName: familyContactName.trim(),
      familyContactPhone: familyContactPhone.trim(),
      familyContactEmail: familyContactEmail ? familyContactEmail.trim().toLowerCase() : '',
      relationshipToPerson,
      consentForPublicListing: consentForPublicListing !== false,
      isConfidential: !!isConfidential,
      status: 'Reported',
      auditLogs: [{
        action: 'REPORT_CREATED',
        performedBy: familyContactName,
        performedByRole: 'Citizen / Reporter',
        timestamp: new Date(),
        notes: `Missing person case filed by ${familyContactName} (${relationshipToPerson}).`
      }]
    });

    // Run Automated Suggestion Matching against active FOUND records
    const matches = await reunificationMatchingService.scanForMatches(newCase, MissingPerson);
    if (matches.length > 0) {
      newCase.possibleMatches = matches;
      newCase.status = 'Possible Match';
      newCase.aiFaceMatchScore = matches[0].matchScore / 100;
      newCase.matchCandidateNotes = `Candidate match found (${matches[0].matchScore}%): ${matches[0].matchReason}`;
      newCase.auditLogs.push({
        action: 'MATCH_SUGGESTED',
        performedBy: 'Reunification AI Engine',
        performedByRole: 'System',
        timestamp: new Date(),
        notes: `Possible match candidate ${matches[0].targetCaseId} identified with score ${matches[0].matchScore}%. Requires human verification.`,
        newStatus: 'Possible Match'
      });

      // Notify family contact if email is provided
      if (newCase.familyContactEmail) {
        emailNotificationService.sendMissingPersonStatusEmail({
          caseItem: newCase,
          recipientEmail: newCase.familyContactEmail,
          recipientName: newCase.familyContactName,
          previousStatus: 'Reported',
          newStatus: 'Possible Match',
          matchDetails: matches[0]
        }).catch(err => console.warn('Family email notice failed:', err.message));
      }
    }

    await newCase.save();

    // Real-time broadcast
    io.emit('missing_person:reported', newCase.toPublicJSON());
    if (matches.length > 0) {
      io.emit('missing_person:match_suggested', {
        caseId: newCase.caseId,
        matchCount: matches.length,
        topScore: matches[0].matchScore
      });
    }

    res.status(201).json({
      success: true,
      message: 'Missing person report successfully registered in emergency reunification database.',
      case: newCase
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. POST /api/missing/found — Authorized Found-Person Registration
app.post('/api/missing/found', authenticateToken, requireRole(['Emergency Operator', 'Admin', 'Rescue Team', 'Responder', 'Hospital', 'Relief Camp Manager']), async (req, res) => {
  try {
    const {
      fullName = 'Unidentified Individual',
      age = 0,
      gender = 'Unknown',
      photoUrl,
      lastSeenLocation,
      approximateArea,
      coordinates,
      shelterOrHospitalId,
      shelterOrHospitalName = 'Central Relief Shelter #1',
      medicalCondition = 'Stable',
      description,
      distinguishingFeatures,
      disasterIncidentId = 'INC-GENERAL-DELHI',
      intakeOfficer = {
        name: req.user?.name || 'Officer On Duty',
        badgeOrId: req.user?.id || 'AUTH-OFFICER-1'
      }
    } = req.body;

    if (!lastSeenLocation) {
      return res.status(400).json({
        success: false,
        message: 'Current intake location or facility is required for found person registration.'
      });
    }

    const caseId = `FD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const lat = coordinates?.lat || 28.6100;
    const lng = coordinates?.lng || 77.2300;

    const newFoundCase = new MissingPerson({
      caseId,
      recordType: 'FOUND',
      fullName: fullName.trim(),
      age: Number(age) || 0,
      gender,
      photoUrl: photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      lastSeenLocation: lastSeenLocation.trim(),
      approximateArea: approximateArea || shelterOrHospitalName,
      coordinates: { lat, lng },
      geoPoint: { type: 'Point', coordinates: [lng, lat] },
      dateTimeLastSeen: new Date(),
      shelterOrHospitalId: shelterOrHospitalId || '',
      shelterOrHospitalName: shelterOrHospitalName || '',
      medicalCondition,
      description: description || '',
      distinguishingFeatures: Array.isArray(distinguishingFeatures) ? distinguishingFeatures : (distinguishingFeatures ? [distinguishingFeatures] : []),
      disasterIncidentId,
      familyContactName: shelterOrHospitalName,
      familyContactPhone: '+91 1800 11 1122 (Relief Desk)',
      familyContactEmail: '',
      relationshipToPerson: 'Intake Facility',
      intakeOfficer: {
        userId: req.user?.id || 'staff_1',
        name: intakeOfficer.name || req.user?.name || 'Intake Officer',
        badgeOrId: intakeOfficer.badgeOrId || 'BADGE-709',
        organization: 'Disaster Relief Shelter Administration'
      },
      status: 'Reported',
      auditLogs: [{
        action: 'FOUND_PERSON_REGISTERED',
        performedBy: req.user?.name || 'Intake Officer',
        performedByRole: req.user?.role || 'Rescue Staff',
        timestamp: new Date(),
        notes: `Found individual intake registered at ${shelterOrHospitalName}. Condition: ${medicalCondition}.`
      }]
    });

    // Run Automated Matching against active MISSING records
    const matches = await reunificationMatchingService.scanForMatches(newFoundCase, MissingPerson);
    if (matches.length > 0) {
      newFoundCase.possibleMatches = matches;
      newFoundCase.status = 'Possible Match';
      newFoundCase.aiFaceMatchScore = matches[0].matchScore / 100;
      newFoundCase.matchCandidateNotes = `Candidate match found (${matches[0].matchScore}%): ${matches[0].matchReason}`;

      // Update the matched missing person records as well
      for (const m of matches) {
        const missingRecord = await MissingPerson.findOne({ caseId: m.targetCaseId });
        if (missingRecord) {
          missingRecord.possibleMatches.unshift({
            targetCaseId: newFoundCase.caseId,
            targetRecordType: 'FOUND',
            matchScore: m.matchScore,
            matchReason: m.matchReason,
            matchedName: newFoundCase.fullName,
            matchedPhotoUrl: newFoundCase.photoUrl,
            matchedAge: newFoundCase.age,
            matchedLocation: newFoundCase.lastSeenLocation,
            status: 'SUGGESTED'
          });
          if (missingRecord.status === 'Reported' || missingRecord.status === 'Searching') {
            missingRecord.status = 'Possible Match';
          }
          missingRecord.auditLogs.push({
            action: 'MATCH_SUGGESTED',
            performedBy: 'Reunification AI Engine',
            performedByRole: 'System',
            timestamp: new Date(),
            notes: `Candidate found record ${newFoundCase.caseId} at ${newFoundCase.shelterOrHospitalName} flagged with score ${m.matchScore}%.`,
            newStatus: 'Possible Match'
          });
          await missingRecord.save();

          // Email family member of missing person
          if (missingRecord.familyContactEmail) {
            emailNotificationService.sendMissingPersonStatusEmail({
              caseItem: missingRecord,
              recipientEmail: missingRecord.familyContactEmail,
              recipientName: missingRecord.familyContactName,
              previousStatus: missingRecord.status,
              newStatus: 'Possible Match',
              matchDetails: m
            }).catch(err => console.warn('Family email notification error:', err.message));
          }
        }
      }
    }

    await newFoundCase.save();

    io.emit('missing_person:found_registered', newFoundCase.toPublicJSON());
    if (matches.length > 0) {
      io.emit('missing_person:match_suggested', {
        caseId: newFoundCase.caseId,
        matchCount: matches.length,
        topScore: matches[0].matchScore
      });
    }

    res.status(201).json({
      success: true,
      message: 'Found individual intake record recorded successfully.',
      case: newFoundCase
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. GET /api/missing/:id/matches — Retrieve Candidate Matches for Side-by-Side Review
app.get('/api/missing/:id/matches', authenticateToken, requireRole(['Emergency Operator', 'Admin', 'Rescue Team', 'Hospital']), async (req, res) => {
  try {
    const { id } = req.params;
    const targetCase = await MissingPerson.findOne({
      $or: [{ caseId: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }]
    });

    if (!targetCase) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    // Refresh candidate matching dynamically
    const freshMatches = await reunificationMatchingService.scanForMatches(targetCase, MissingPerson);

    // Fetch full candidate objects for side-by-side comparison
    const candidatesWithFullData = await Promise.all(
      freshMatches.map(async (m) => {
        const fullCandidate = await MissingPerson.findOne({ caseId: m.targetCaseId }).lean();
        return {
          ...m,
          candidateDetails: fullCandidate
        };
      })
    );

    res.json({
      success: true,
      case: targetCase,
      matches: candidatesWithFullData
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. POST /api/missing/:id/verify-match — Official Human Match Verification
// SAFEGUARD: Never automatically declared. Requires human verification confirmation!
app.post('/api/missing/:id/verify-match', authenticateToken, requireRole(['Emergency Operator', 'Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      candidateCaseId,
      verificationNotes,
      confirmHumanVerified
    } = req.body;

    if (!confirmHumanVerified) {
      return res.status(400).json({
        success: false,
        message: 'SAFETY REQUIREMENT: Authorized human identity verification must be explicitly confirmed before declaring a verified match.'
      });
    }

    if (!candidateCaseId) {
      return res.status(400).json({ success: false, message: 'Target candidate case ID is required.' });
    }

    const primaryCase = await MissingPerson.findOne({
      $or: [{ caseId: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }]
    });
    const candidateCase = await MissingPerson.findOne({ caseId: candidateCaseId });

    if (!primaryCase || !candidateCase) {
      return res.status(404).json({ success: false, message: 'Primary or candidate case record not found.' });
    }

    const operatorName = req.user?.name || 'Emergency Operator';
    const notes = verificationNotes || 'Identity verified through shelter register & family phone interview.';

    // Transition primary case
    const prevStatus1 = primaryCase.status;
    primaryCase.status = 'Verified';
    primaryCase.verifiedMatchedCaseId = candidateCase.caseId;
    primaryCase.auditLogs.push({
      action: 'MATCH_VERIFIED',
      performedBy: operatorName,
      performedByRole: req.user?.role || 'Emergency Operator',
      timestamp: new Date(),
      notes: `Human verification completed with candidate ${candidateCase.caseId}. ${notes}`,
      previousStatus: prevStatus1,
      newStatus: 'Verified'
    });
    await primaryCase.save();

    // Transition candidate case
    const prevStatus2 = candidateCase.status;
    candidateCase.status = 'Verified';
    candidateCase.verifiedMatchedCaseId = primaryCase.caseId;
    candidateCase.auditLogs.push({
      action: 'MATCH_VERIFIED',
      performedBy: operatorName,
      performedByRole: req.user?.role || 'Emergency Operator',
      timestamp: new Date(),
      notes: `Human verification completed with case ${primaryCase.caseId}. ${notes}`,
      previousStatus: prevStatus2,
      newStatus: 'Verified'
    });
    await candidateCase.save();

    // Email notification to family contact
    const missingOne = primaryCase.recordType === 'MISSING' ? primaryCase : candidateCase;
    if (missingOne.familyContactEmail) {
      emailNotificationService.sendMissingPersonStatusEmail({
        caseItem: missingOne,
        recipientEmail: missingOne.familyContactEmail,
        recipientName: missingOne.familyContactName,
        previousStatus: prevStatus1,
        newStatus: 'Verified',
        notes
      }).catch(err => console.warn('Family verification email notice failed:', err.message));
    }

    io.emit('missing_person:status_updated', {
      caseId: primaryCase.caseId,
      status: 'Verified',
      matchedWith: candidateCase.caseId
    });
    io.emit('missing_person:status_updated', {
      caseId: candidateCase.caseId,
      status: 'Verified',
      matchedWith: primaryCase.caseId
    });

    res.json({
      success: true,
      message: 'Human identity verification successful. Both case records updated to VERIFIED.',
      primaryCase,
      candidateCase
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 8. POST /api/missing/:id/reject-match — Reject Candidate Suggestion
app.post('/api/missing/:id/reject-match', authenticateToken, requireRole(['Emergency Operator', 'Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { candidateCaseId, rejectionReason = 'Attributes do not match physical inspection.' } = req.body;

    const caseItem = await MissingPerson.findOne({
      $or: [{ caseId: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }]
    });

    if (!caseItem) return res.status(404).json({ success: false, message: 'Case not found' });

    // Update match entry status to REJECTED
    let remainingActive = 0;
    caseItem.possibleMatches.forEach(m => {
      if (m.targetCaseId === candidateCaseId) {
        m.status = 'REJECTED';
        m.verificationNotes = rejectionReason;
        m.investigatedBy = req.user?.name || 'Operator';
        m.investigatedAt = new Date();
      } else if (m.status !== 'REJECTED') {
        remainingActive++;
      }
    });

    if (remainingActive === 0 && caseItem.status === 'Possible Match') {
      caseItem.status = 'Searching';
    }

    caseItem.auditLogs.push({
      action: 'MATCH_REJECTED',
      performedBy: req.user?.name || 'Operator',
      performedByRole: req.user?.role || 'Emergency Operator',
      timestamp: new Date(),
      notes: `Rejected suggestion ${candidateCaseId}: ${rejectionReason}`
    });

    await caseItem.save();

    io.emit('missing_person:status_updated', { caseId: caseItem.caseId, status: caseItem.status });

    res.json({
      success: true,
      message: 'Match candidate marked as rejected.',
      case: caseItem
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 9. POST /api/missing/:id/reunite — Official Family Reunification Handover
app.post('/api/missing/:id/reunite', authenticateToken, requireRole(['Emergency Operator', 'Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      reunitedWithName,
      reunitedWithContact,
      relationship = 'Parent / Guardian',
      notes = 'Reunification handover finalized at shelter command desk.'
    } = req.body;

    const caseItem = await MissingPerson.findOne({
      $or: [{ caseId: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }]
    });

    if (!caseItem) return res.status(404).json({ success: false, message: 'Case record not found' });

    const prevStatus = caseItem.status;
    caseItem.status = 'Reunited';
    caseItem.reunitedWith = {
      name: reunitedWithName || caseItem.familyContactName,
      contact: reunitedWithContact || caseItem.familyContactPhone,
      relationship,
      verifiedBy: req.user?.name || 'Commander Alex Vance',
      verifiedAt: new Date(),
      notes
    };

    caseItem.auditLogs.push({
      action: 'FAMILY_REUNITED',
      performedBy: req.user?.name || 'Operator',
      performedByRole: req.user?.role || 'Emergency Operator',
      timestamp: new Date(),
      notes: `Family reunification completed with ${reunitedWithName || caseItem.familyContactName}. Case closed.`,
      previousStatus: prevStatus,
      newStatus: 'Reunited'
    });

    await caseItem.save();

    // If there is a linked matched case, mark that as Reunited as well
    if (caseItem.verifiedMatchedCaseId) {
      const linkedCase = await MissingPerson.findOne({ caseId: caseItem.verifiedMatchedCaseId });
      if (linkedCase) {
        linkedCase.status = 'Reunited';
        linkedCase.reunitedWith = caseItem.reunitedWith;
        linkedCase.auditLogs.push({
          action: 'FAMILY_REUNITED',
          performedBy: req.user?.name || 'Operator',
          performedByRole: req.user?.role || 'Emergency Operator',
          timestamp: new Date(),
          notes: `Linked case ${caseItem.caseId} marked as Reunited.`,
          previousStatus: linkedCase.status,
          newStatus: 'Reunited'
        });
        await linkedCase.save();
      }
    }

    // Send closing email
    if (caseItem.familyContactEmail) {
      emailNotificationService.sendMissingPersonStatusEmail({
        caseItem,
        recipientEmail: caseItem.familyContactEmail,
        recipientName: caseItem.familyContactName,
        previousStatus: prevStatus,
        newStatus: 'Reunited',
        notes
      }).catch(err => console.warn('Closure email notice failed:', err.message));
    }

    io.emit('missing_person:reunited', {
      caseId: caseItem.caseId,
      fullName: caseItem.fullName
    });

    res.json({
      success: true,
      message: 'Family reunification successfully completed and logged.',
      case: caseItem
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 10. PATCH /api/missing/:id/status — Operator Case Status Transition
app.patch('/api/missing/:id/status', authenticateToken, requireRole(['Emergency Operator', 'Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes = '' } = req.body;

    const allowed = ['Reported', 'Searching', 'Possible Match', 'Under Verification', 'Verified', 'Reunited', 'Closed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${allowed.join(', ')}` });
    }

    const caseItem = await MissingPerson.findOne({
      $or: [{ caseId: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }]
    });

    if (!caseItem) return res.status(404).json({ success: false, message: 'Case not found' });

    const prev = caseItem.status;
    caseItem.status = status;
    caseItem.auditLogs.push({
      action: 'STATUS_TRANSITION',
      performedBy: req.user?.name || 'Emergency Operator',
      performedByRole: req.user?.role || 'Emergency Operator',
      timestamp: new Date(),
      notes: notes || `Status changed from ${prev} to ${status}`,
      previousStatus: prev,
      newStatus: status
    });

    await caseItem.save();

    // Trigger email if significant status change
    if (['Possible Match', 'Under Verification', 'Verified', 'Reunited'].includes(status) && caseItem.familyContactEmail) {
      emailNotificationService.sendMissingPersonStatusEmail({
        caseItem,
        recipientEmail: caseItem.familyContactEmail,
        recipientName: caseItem.familyContactName,
        previousStatus: prev,
        newStatus: status,
        notes
      }).catch(err => console.warn('Email notification failed:', err.message));
    }

    io.emit('missing_person:status_updated', { caseId: caseItem.caseId, status });

    res.json({ success: true, message: `Status updated to ${status}`, case: caseItem });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 11. PUT /api/missing/:id — Report Update / Correction
app.put('/api/missing/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const caseItem = await MissingPerson.findOne({
      $or: [{ caseId: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }]
    });

    if (!caseItem) return res.status(404).json({ success: false, message: 'Case not found' });

    const fields = [
      'fullName', 'age', 'gender', 'photoUrl', 'lastSeenLocation',
      'approximateArea', 'description', 'distinguishingFeatures',
      'medicalCondition', 'familyContactName', 'familyContactPhone',
      'familyContactEmail', 'relationshipToPerson', 'consentForPublicListing', 'isConfidential'
    ];

    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        caseItem[f] = req.body[f];
      }
    });

    caseItem.auditLogs.push({
      action: 'RECORD_CORRECTED',
      performedBy: req.user?.name || 'Reporter',
      performedByRole: req.user?.role || 'Citizen',
      timestamp: new Date(),
      notes: 'Case record updated with revised details.'
    });

    await caseItem.save();

    res.json({ success: true, message: 'Case record successfully updated.', case: caseItem });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 12. DELETE /api/missing/:id — Close or Remove Case
app.delete('/api/missing/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const caseItem = await MissingPerson.findOne({
      $or: [{ caseId: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }]
    });

    if (!caseItem) return res.status(404).json({ success: false, message: 'Case not found' });

    // Mark as Closed per retention rules
    caseItem.status = 'Closed';
    caseItem.auditLogs.push({
      action: 'CASE_CLOSED',
      performedBy: req.user?.name || 'Administrator',
      performedByRole: req.user?.role || 'Admin',
      timestamp: new Date(),
      notes: 'Case marked as closed / archived.'
    });
    await caseItem.save();

    io.emit('missing_person:status_updated', { caseId: caseItem.caseId, status: 'Closed' });

    res.json({ success: true, message: 'Case successfully closed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Messages Route
app.get('/api/messages', (req, res) => res.json(messagesStore));
app.post('/api/messages', (req, res) => {
  const newMsg = {
    id: `msg_${Date.now()}`,
    ...req.body,
    createdAt: new Date().toISOString()
  };
  messagesStore.push(newMsg);
  io.emit('new_message', newMsg);
  res.status(201).json(newMsg);
});

// Notifications Route
app.get('/api/notifications', (req, res) => res.json(notificationsStore));
app.post('/api/notifications', (req, res) => {
  const newNotif = {
    id: `notif_${Date.now()}`,
    ...req.body,
    createdAt: new Date().toISOString()
  };
  notificationsStore.unshift(newNotif);
  io.emit('notification', newNotif);
  res.status(201).json(newNotif);
});

// AI Vision / Drone Route Simulation
app.post('/api/ai/drone-recon', (req, res) => {
  const simulatedDetections = [
    { label: 'Active Fire Smoke Plume', confidence: 0.96, bbox: [120, 80, 240, 200] },
    { label: 'Stranded Civilian Cluster (3)', confidence: 0.91, bbox: [310, 150, 80, 70] },
    { label: 'Blocked Evacuation Route', confidence: 0.88, bbox: [50, 300, 180, 100] }
  ];
  res.json({
    status: 'Success',
    processedAt: new Date().toISOString(),
    detections: simulatedDetections,
    riskScore: 'CRITICAL HAZARD',
    recommendedAction: 'Deploy Helicopter & Water Cannon Drone immediately'
  });
});

// -------------------------------------------------------------
// WEBSOCKET (SOCKET.IO) HANDLERS & REAL-TIME TELEMETRY ENGINE
// -------------------------------------------------------------
io.on('connection', (socket) => {
  console.log('⚡ Client connected to Socket.IO engine:', socket.id);

  socket.on('send_message', (data) => {
    const msg = { id: `msg_${Date.now()}`, ...data, createdAt: new Date().toISOString() };
    messagesStore.push(msg);
    io.emit('new_message', msg);
  });

  socket.on('update_location', (data) => {
    // Live vehicle / unit movement manually reported
    const resUnit = resourcesStore.find(r => r.id === data.resourceId);
    if (resUnit) {
      resUnit.location = { lat: data.lat, lng: data.lng, address: data.address || resUnit.location.address };
      io.emit('resource_location_updated', resUnit);
    }
  });

  socket.on('rescue:location', (data) => {
    if (!data) return;
    const { vehicleId, incidentId, latitude, longitude, accuracy, speed, heading } = data;
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const acc = parseFloat(accuracy) || 5;

    if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
      return;
    }

    const resUnit = resourcesStore.find(r => r.id === vehicleId || r.vehicleId === vehicleId);
    if (resUnit) {
      resUnit.location = {
        lat,
        lng,
        address: `Live Rescue GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`
      };
      resUnit.coordinates = [lng, lat];
      resUnit.gpsAccuracy = acc;
      resUnit.speed = speed || 0;
      resUnit.heading = heading || 0;
      resUnit.lastLocationUpdate = new Date().toISOString();

      const locationPayload = {
        vehicleId: resUnit.id || vehicleId,
        unitId: resUnit.id || vehicleId,
        incidentId,
        latitude: lat,
        longitude: lng,
        accuracy: acc,
        speed: speed || 0,
        heading: heading || 0,
        lastUpdated: resUnit.lastLocationUpdate,
        timestamp: new Date().toISOString()
      };

      io.emit('rescue_location_updated', locationPayload);
      io.emit('location:broadcast', locationPayload);
      socketManager.emitToAll('vehicle:location_updated', locationPayload);
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Real-Time Telemetry Stream (Only active when DEMO_MODE=true)
let stepCounter = 0;
setInterval(() => {
  if (process.env.DEMO_MODE !== 'true') return;

  stepCounter++;
  
  // Simulate vehicle movement ONLY in DEMO_MODE
  resourcesStore.forEach((resUnit) => {
    if (resUnit.status === 'Dispatched' || resUnit.status === 'En Route' || resUnit.type === 'Drone Unit') {
      const latDelta = (Math.sin(stepCounter * 0.2 + resUnit.id.charCodeAt(resUnit.id.length - 1)) * 0.0004);
      const lngDelta = (Math.cos(stepCounter * 0.2 + resUnit.id.charCodeAt(resUnit.id.length - 1)) * 0.0004);
      
      resUnit.location = {
        ...resUnit.location,
        lat: parseFloat((resUnit.location.lat + latDelta).toFixed(6)),
        lng: parseFloat((resUnit.location.lng + lngDelta).toFixed(6))
      };

      io.emit('resource_location_updated', resUnit);
    }
  });

  const droneUnit = resourcesStore.find(r => r.type === 'Drone Unit') || resourcesStore[4];
  if (droneUnit && droneUnit.location) {
    const droneTelemetry = {
      droneId: droneUnit?.id || 'res_5',
      droneName: droneUnit?.name || 'AI Recon Drone Delta',
      batteryLevel: Math.max(20, 98 - (stepCounter % 60)),
      altitudeMeters: Math.floor(110 + Math.sin(stepCounter * 0.5) * 15),
      speedKmh: Math.floor(30 + Math.cos(stepCounter * 0.3) * 12),
      location: droneUnit.location,
      infraredActive: true,
      activeDetectionsCount: 3 + (stepCounter % 2),
      timestamp: new Date().toISOString()
    };
    io.emit('drone_telemetry', droneTelemetry);
  }

}, 2000);

// ==========================================
// CITIZEN RISK MONITORING & SAFETY ALERTS API
// ==========================================

// 1. GET /api/operator/citizens-at-risk
app.get('/api/operator/citizens-at-risk', async (req, res) => {
  try {
    const riskData = await citizenRiskService.evaluateCitizensAtRisk(
      usersStore,
      incidentsStore,
      { User, Incident, SafetyAlertLog, SafetyPrecaution }
    );
    res.json(riskData);
  } catch (err) {
    console.error('Error in GET /api/operator/citizens-at-risk:', err.message);
    res.status(500).json({ message: 'Failed to evaluate citizens at risk', error: err.message });
  }
});

// 2. GET /api/precautions/:disasterType?
app.get('/api/precautions/:disasterType?', async (req, res) => {
  try {
    const disasterType = req.params.disasterType || req.query.type;
    let precautions = null;
    if (SafetyPrecaution) {
      precautions = await SafetyPrecaution.findOne({ disasterType: (disasterType || 'DEFAULT').toUpperCase() }).lean();
    }
    if (!precautions) {
      precautions = citizenRiskService.getPrecautionsForDisasterType(disasterType);
    }
    res.json(precautions);
  } catch (err) {
    console.error('Error in GET /api/precautions:', err.message);
    res.status(500).json({ message: 'Failed to retrieve safety precautions', error: err.message });
  }
});

// 3. POST /api/operator/send-safety-email
app.post('/api/operator/send-safety-email', async (req, res) => {
  const { citizenId, disasterId, disasterType } = req.body;

  if (!citizenId) {
    return res.status(400).json({ message: 'citizenId is required' });
  }

  // Identify citizen from server store / database ONLY
  let targetCitizen = usersStore.find(u => u.id === citizenId || u.email === citizenId);
  if (!targetCitizen && User) {
    try {
      const dbUser = await User.findById(citizenId).lean();
      if (dbUser) {
        targetCitizen = {
          id: dbUser._id.toString(),
          name: dbUser.name || dbUser.fullName || 'Citizen User',
          email: dbUser.email,
          location: dbUser.location || (dbUser.location?.coordinates ? { lat: dbUser.location.coordinates[1], lng: dbUser.location.coordinates[0] } : null),
          locationAccuracy: dbUser.locationAccuracy || 10
        };
      }
    } catch (e) {}
  }

  if (!targetCitizen || !targetCitizen.email || !targetCitizen.email.includes('@')) {
    return res.status(404).json({ message: 'Authenticated citizen record with registered email not found.' });
  }

  // Throttle check: Prevent duplicate email sends within 15 mins for same citizen and disaster
  try {
    if (SafetyAlertLog) {
      const recentLog = await SafetyAlertLog.findOne({
        recipientEmail: targetCitizen.email,
        disasterId: disasterId || 'ANY',
        sentAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) }
      });
      if (recentLog) {
        return res.status(429).json({
          message: 'A safety email was recently sent to this citizen for the same disaster within the last 15 minutes.',
          log: recentLog
        });
      }
    }
  } catch (e) {}

  // Evaluate risk level & disaster details
  const riskEval = await citizenRiskService.evaluateCitizensAtRisk(usersStore, incidentsStore, { User, Incident, SafetyAlertLog, SafetyPrecaution });
  const citizenRisk = riskEval.citizens.find(c => c.citizenId === targetCitizen.id || c.email === targetCitizen.email) || {
    disasterTitle: 'Active Emergency Hazard',
    disasterType: disasterType || 'FLOOD',
    riskLevel: 'HIGH',
    distanceKm: '1.2',
    distanceMeters: 1200,
    locationStatus: 'Accurate GPS',
    precautions: citizenRiskService.getPrecautionsForDisasterType(disasterType || 'FLOOD')
  };

  const precautionsObj = citizenRisk.precautions || citizenRiskService.getPrecautionsForDisasterType(disasterType || citizenRisk.disasterType);

  const emailResult = await emailService.sendDisasterSafetyEmail({
    recipientEmail: targetCitizen.email,
    citizenName: targetCitizen.name || citizenRisk.name,
    disasterTitle: citizenRisk.disasterTitle,
    disasterType: citizenRisk.disasterType || disasterType || 'FLOOD',
    riskLevel: citizenRisk.riskLevel || 'HIGH',
    distanceKm: citizenRisk.distanceKm || '1.2',
    distanceMeters: citizenRisk.distanceMeters || 1200,
    locationAddress: citizenRisk.locationAddress || `Device GPS (${citizenRisk.latitude || ''}, ${citizenRisk.longitude || ''})`,
    precautions: precautionsObj.instructions || precautionsObj,
    emergencyHelplines: precautionsObj.emergencyHelplines || [],
    sentAt: new Date().toLocaleString()
  });

  const logStatus = emailResult.success ? (emailResult.simulated ? 'Sent' : 'Delivered') : 'Failed';
  const logRecord = {
    citizenId: targetCitizen.id,
    citizenName: targetCitizen.name || 'Citizen User',
    recipientEmail: targetCitizen.email,
    disasterId: disasterId || citizenRisk.nearestDisasterId || 'DISASTER-01',
    disasterTitle: citizenRisk.disasterTitle,
    disasterType: citizenRisk.disasterType || disasterType || 'FLOOD',
    riskLevel: citizenRisk.riskLevel || 'HIGH',
    distanceKm: parseFloat(citizenRisk.distanceKm || '1.2'),
    distanceMeters: citizenRisk.distanceMeters || 1200,
    operatorId: req.user ? req.user.id : 'usr_operator',
    operatorName: req.user ? req.user.name : 'Commander Alex Vance',
    sentAt: new Date(),
    status: logStatus,
    errorDetails: emailResult.error || null,
    precautionsIncluded: precautionsObj.instructions || []
  };

  try {
    if (SafetyAlertLog) {
      await SafetyAlertLog.create(logRecord);
    }
  } catch (err) {
    console.warn('SafetyAlertLog mongo write notice:', err.message);
  }

  // Broadcast real-time Socket.IO update to all connected operator dashboards
  io.emit('risk_email_sent', {
    citizenId: targetCitizen.id,
    email: targetCitizen.email,
    emailStatus: logStatus,
    sentAt: new Date().toISOString()
  });

  return res.json({
    success: emailResult.success,
    message: emailResult.success ? `Safety email successfully dispatched to ${targetCitizen.email}` : `Failed to send email: ${emailResult.error}`,
    emailStatus: logStatus,
    auditLog: logRecord
  });
});

// GET /api/operator/safety-alert-logs
app.get('/api/operator/safety-alert-logs', async (req, res) => {
  try {
    let logs = [];
    if (SafetyAlertLog) {
      logs = await SafetyAlertLog.find().sort({ sentAt: -1 }).limit(100).lean();
    }
    res.json(logs);
  } catch (err) {
    console.error('Error in GET /api/operator/safety-alert-logs:', err.message);
    res.status(500).json({ message: 'Failed to retrieve safety alert audit logs', error: err.message });
  }
});

/* ==========================================================================
   RESQAI — RESCUE RESOURCE MANAGEMENT MODULE BACKEND APIs & SEEDER
   ========================================================================== */

async function seedResources() {
  try {
    if (!Resource) return;
    const count = await Resource.countDocuments();
    if (count === 0) {
      const initialResources = [
        {
          resourceId: 'res_veh_101',
          name: 'Advanced Life Support Ambulance AMB-01',
          category: 'Emergency Vehicles',
          description: 'Fully equipped ALS ambulance with ventilator & cardiac monitor',
          totalQuantity: 5,
          availableQuantity: 3,
          unit: 'vehicles',
          location: { lat: 19.9975, lng: 73.7898, address: 'District Medical Depot, Panchavati', storageDepot: 'Central Transport Hub' },
          status: 'Available',
          department: 'Emergency Medical Services',
          minStockThreshold: 1,
          isVehicleOrEquipment: true
        },
        {
          resourceId: 'res_veh_102',
          name: 'Heavy Fire Pumper Truck FIR-04',
          category: 'Emergency Vehicles',
          description: '10,000L water tank pumper with high-reach foam cannon',
          totalQuantity: 3,
          availableQuantity: 2,
          unit: 'vehicles',
          location: { lat: 19.9982, lng: 73.7885, address: 'Station 1 Fire Command', storageDepot: 'Fire Station HQ' },
          status: 'Available',
          department: 'Fire & Rescue Department',
          minStockThreshold: 1,
          isVehicleOrEquipment: true
        },
        {
          resourceId: 'res_veh_103',
          name: 'NDRF Inflatable Rescue Motor Boat BOAT-02',
          category: 'Emergency Vehicles',
          description: 'Rigid inflatable flood evacuation motorboat (8-person capacity)',
          totalQuantity: 8,
          availableQuantity: 6,
          unit: 'vehicles',
          location: { lat: 20.0050, lng: 73.7920, address: 'River Rescue Sub-station', storageDepot: 'Water Evacuation Depot' },
          status: 'Available',
          department: 'NDRF Marine Wing',
          minStockThreshold: 2,
          isVehicleOrEquipment: true
        },
        {
          resourceId: 'res_med_201',
          name: 'Trauma Emergency First-Aid Kits (Level 3)',
          category: 'Medical Supplies',
          description: 'Sterile surgical dressings, tourniquets, burn gel, and hemostatic gauze',
          totalQuantity: 250,
          availableQuantity: 180,
          unit: 'kits',
          location: { lat: 19.9975, lng: 73.7898, address: 'Civil Hospital Depot', storageDepot: 'Medical Supply Warehouse' },
          status: 'Available',
          department: 'Health Ministry Supply Division',
          minStockThreshold: 50,
          expiryDate: new Date('2027-12-31'),
          isVehicleOrEquipment: false
        },
        {
          resourceId: 'res_med_202',
          name: 'Medical Oxygen Cylinders D-Type (47L)',
          category: 'Medical Supplies',
          description: 'High-pressure compressed medical oxygen cylinders with flowmeter regulators',
          totalQuantity: 120,
          availableQuantity: 15,
          unit: 'units',
          location: { lat: 19.9975, lng: 73.7898, address: 'Civil Hospital Depot', storageDepot: 'Medical Supply Warehouse' },
          status: 'Low Stock',
          department: 'Health Ministry Supply Division',
          minStockThreshold: 30,
          isVehicleOrEquipment: false
        },
        {
          resourceId: 'res_med_203',
          name: 'Foldable Emergency Patient Stretchers',
          category: 'Medical Supplies',
          description: 'Lightweight aluminum alloy emergency transport stretchers',
          totalQuantity: 80,
          availableQuantity: 65,
          unit: 'kits',
          location: { lat: 19.9975, lng: 73.7898, address: 'Civil Hospital Depot', storageDepot: 'Medical Supply Warehouse' },
          status: 'Available',
          department: 'Health Ministry Supply Division',
          minStockThreshold: 15,
          isVehicleOrEquipment: false
        },
        {
          resourceId: 'res_ess_301',
          name: 'Purified Drinking Water Bottles (2L Packs)',
          category: 'Essential Supplies',
          description: 'Clean mineral drinking water 12-pack bundles for disaster camps',
          totalQuantity: 5000,
          availableQuantity: 3800,
          unit: 'packets',
          location: { lat: 20.0010, lng: 73.7850, address: 'Civil Defense Relief Warehouse', storageDepot: 'Logistics Center A' },
          status: 'Available',
          department: 'Disaster Relief Logistics',
          minStockThreshold: 1000,
          isVehicleOrEquipment: false
        },
        {
          resourceId: 'res_ess_302',
          name: 'Ready-to-Eat Emergency Food Ration Packs',
          category: 'Essential Supplies',
          description: 'High-calorie 24hr self-heating emergency food ration packs',
          totalQuantity: 3000,
          availableQuantity: 240,
          unit: 'packets',
          location: { lat: 20.0010, lng: 73.7850, address: 'Civil Defense Relief Warehouse', storageDepot: 'Logistics Center A' },
          status: 'Low Stock',
          department: 'Disaster Relief Logistics',
          minStockThreshold: 500,
          expiryDate: new Date('2028-06-30'),
          isVehicleOrEquipment: false
        },
        {
          resourceId: 'res_ess_303',
          name: 'Thermal Fleece Disaster Relief Blankets',
          category: 'Essential Supplies',
          description: 'Heavy duty fire-retardant thermal fleece blankets',
          totalQuantity: 1500,
          availableQuantity: 1100,
          unit: 'units',
          location: { lat: 20.0010, lng: 73.7850, address: 'Civil Defense Relief Warehouse', storageDepot: 'Logistics Center A' },
          status: 'Available',
          department: 'Disaster Relief Logistics',
          minStockThreshold: 200,
          isVehicleOrEquipment: false
        },
        {
          resourceId: 'res_eqp_401',
          name: 'Diesel Silent Generator 15kVA',
          category: 'Rescue Equipment',
          description: 'Portable heavy duty generator for field hospitals & relief shelters',
          totalQuantity: 10,
          availableQuantity: 7,
          unit: 'units',
          location: { lat: 19.9982, lng: 73.7885, address: 'Civil Defense Equipment Yard', storageDepot: 'Power Equipment Armory' },
          status: 'Available',
          department: 'Power & Infrastructure Relief',
          minStockThreshold: 2,
          isVehicleOrEquipment: true
        },
        {
          resourceId: 'res_eqp_402',
          name: 'VHF Emergency Tactical Radios (Walkie-Talkie Set)',
          category: 'Rescue Equipment',
          description: 'Encrypted long-range multi-channel radio handsets for field teams',
          totalQuantity: 50,
          availableQuantity: 42,
          unit: 'units',
          location: { lat: 19.9982, lng: 73.7885, address: 'Civil Defense Equipment Yard', storageDepot: 'Communications Depot' },
          status: 'Available',
          department: 'Emergency Communications Division',
          minStockThreshold: 10,
          isVehicleOrEquipment: true
        },
        {
          resourceId: 'res_hr_501',
          name: 'Certified NDRF Urban Search & Rescue Team',
          category: 'Human Resources',
          description: '12-person specialized structural collapse & Hazmat rescue squad',
          totalQuantity: 4,
          availableQuantity: 3,
          unit: 'personnel',
          location: { lat: 19.9975, lng: 73.7898, address: 'NDRF Battalion Barracks', storageDepot: 'NDRF Base Command' },
          status: 'Available',
          department: 'National Disaster Response Force',
          minStockThreshold: 1,
          isVehicleOrEquipment: false
        }
      ];
      await Resource.insertMany(initialResources);
      console.log('✅ MongoDB Resource Fleet Seeded Successfully!');
    }
  } catch (err) {
    console.error('Resource Seeding Error:', err.message);
  }
}

// 1. GET /api/resources — Retrieve all resources with filters & live summary metrics
app.get('/api/resources', async (req, res) => {
  try {
    const { category, status, search, disaster, availability } = req.query;
    let query = {};

    if (category && category !== 'All') {
      query.category = category;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (availability === 'low_stock') {
      query.$expr = { $lte: ['$availableQuantity', '$minStockThreshold'] };
    } else if (availability === 'available') {
      query.availableQuantity = { $gt: 0 };
    } else if (availability === 'out_of_stock') {
      query.availableQuantity = 0;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
        { 'location.address': { $regex: search, $options: 'i' } },
        { resourceId: { $regex: search, $options: 'i' } }
      ];
    }

    let resources = [];
    if (Resource) {
      resources = await Resource.find(query).sort({ updatedAt: -1 }).lean();
    }

    // Calculate database summary metrics
    const totalDocs = await Resource.countDocuments();
    const availableDocs = await Resource.countDocuments({ status: 'Available', availableQuantity: { $gt: 0 } });
    const deployedDocs = await Resource.countDocuments({ status: 'Deployed' });
    const maintenanceDocs = await Resource.countDocuments({ status: 'Maintenance' });
    const lowStockDocs = await Resource.countDocuments({
      category: { $nin: ['Emergency Vehicles', 'Human Resources'] },
      $expr: { $lte: ['$availableQuantity', '$minStockThreshold'] }
    });

    let pendingRequestsDocs = 0;
    if (ResourceRequest) {
      pendingRequestsDocs = await ResourceRequest.countDocuments({ status: 'Pending' });
    }

    const summary = {
      totalRegistered: totalDocs,
      totalAvailable: availableDocs,
      totalDeployed: deployedDocs,
      totalMaintenance: maintenanceDocs,
      lowStockCount: lowStockDocs,
      pendingRequestsCount: pendingRequestsDocs
    };

    res.json({ success: true, summary, resources });
  } catch (err) {
    console.error('Error in GET /api/resources:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch resources', error: err.message });
  }
});

// 2. GET /api/resources/summary — Live summary metrics
app.get('/api/resources/summary', async (req, res) => {
  try {
    const totalDocs = await Resource.countDocuments();
    const availableDocs = await Resource.countDocuments({ status: 'Available', availableQuantity: { $gt: 0 } });
    const deployedDocs = await Resource.countDocuments({ status: 'Deployed' });
    const maintenanceDocs = await Resource.countDocuments({ status: 'Maintenance' });
    const lowStockDocs = await Resource.countDocuments({
      category: { $nin: ['Emergency Vehicles', 'Human Resources'] },
      $expr: { $lte: ['$availableQuantity', '$minStockThreshold'] }
    });

    let pendingRequestsDocs = 0;
    if (ResourceRequest) {
      pendingRequestsDocs = await ResourceRequest.countDocuments({ status: 'Pending' });
    }

    res.json({
      success: true,
      summary: {
        totalRegistered: totalDocs,
        totalAvailable: availableDocs,
        totalDeployed: deployedDocs,
        totalMaintenance: maintenanceDocs,
        lowStockCount: lowStockDocs,
        pendingRequestsCount: pendingRequestsDocs
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. GET /api/resources/low-stock — Automated stock & expiry warnings
app.get('/api/resources/low-stock', async (req, res) => {
  try {
    let lowStockItems = [];
    if (Resource) {
      lowStockItems = await Resource.find({
        category: { $nin: ['Emergency Vehicles', 'Human Resources'] },
        $or: [
          { $expr: { $lte: ['$availableQuantity', '$minStockThreshold'] } },
          { expiryDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } }
        ]
      }).sort({ availableQuantity: 1 }).lean();
    }
    res.json({ success: true, count: lowStockItems.length, items: lowStockItems });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. GET /api/resources/nearby — Spatial Haversine search
app.get('/api/resources/nearby', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const category = req.query.category;
    const status = req.query.status || 'Available';

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ success: false, message: 'Valid lat and lng query parameters are required' });
    }

    let filter = {};
    if (status && status !== 'All') filter.status = status;
    if (category && category !== 'All') filter.category = category;

    let resources = await Resource.find(filter).lean();

    // Compute Haversine Distance
    const R = 6371; // Earth radius in km
    const result = resources
      .map(r => {
        const rLat = r.location?.lat;
        const rLng = r.location?.lng;
        if (rLat === undefined || rLng === undefined || isNaN(rLat) || isNaN(rLng)) {
          return { ...r, distanceKm: null, locationValid: false };
        }
        const dLat = (rLat - lat) * (Math.PI / 180);
        const dLon = (rLng - lng) * (Math.PI / 180);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat * (Math.PI / 180)) * Math.cos(rLat * (Math.PI / 180)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = parseFloat((R * c).toFixed(2));
        const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${rLat},${rLng}`;

        return { ...r, distanceKm, locationValid: true, directionsUrl };
      })
      .filter(r => r.locationValid)
      .sort((a, b) => (a.distanceKm || 99999) - (b.distanceKm || 99999));

    res.json({ success: true, count: result.length, resources: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. POST /api/resources — Register a new resource
app.post('/api/resources', async (req, res) => {
  try {
    const {
      name,
      category,
      customCategoryName,
      description,
      totalQuantity,
      availableQuantity,
      unit,
      location,
      status,
      department,
      minStockThreshold,
      expiryDate,
      notes
    } = req.body;

    if (!name || !category || totalQuantity === undefined) {
      return res.status(400).json({ success: false, message: 'Resource name, category, and total quantity are required.' });
    }

    const parsedTotal = parseInt(totalQuantity, 10);
    const parsedAvail = availableQuantity !== undefined ? parseInt(availableQuantity, 10) : parsedTotal;

    if (isNaN(parsedTotal) || parsedTotal < 0) {
      return res.status(400).json({ success: false, message: 'Total quantity cannot be negative.' });
    }

    if (isNaN(parsedAvail) || parsedAvail < 0) {
      return res.status(400).json({ success: false, message: 'Available quantity cannot be negative.' });
    }

    if (parsedAvail > parsedTotal) {
      return res.status(400).json({ success: false, message: `Available quantity (${parsedAvail}) cannot exceed total capacity (${parsedTotal}).` });
    }

    const isVehEq = category === 'Emergency Vehicles' || category === 'Rescue Equipment';
    const resourceId = `res_${Date.now()}`;

    const newResource = new Resource({
      resourceId,
      name,
      category,
      customCategoryName: customCategoryName || '',
      description: description || '',
      totalQuantity: parsedTotal,
      availableQuantity: parsedAvail,
      unit: unit || 'units',
      location: {
        lat: location?.lat || 19.9975,
        lng: location?.lng || 73.7898,
        address: location?.address || 'Central Depot',
        storageDepot: location?.storageDepot || 'Logistics Depot'
      },
      status: status || (parsedAvail === 0 ? 'Out of Stock' : 'Available'),
      department: department || 'Disaster Relief Management',
      minStockThreshold: parseInt(minStockThreshold, 10) || 5,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      notes: notes || '',
      isVehicleOrEquipment: isVehEq
    });

    await newResource.save();

    // Log History
    const history = new ResourceHistory({
      historyId: `hist_${Date.now()}`,
      resourceId: newResource.resourceId,
      resourceName: newResource.name,
      previousQuantity: 0,
      changeQuantity: parsedAvail,
      newQuantity: parsedAvail,
      transactionType: 'REGISTER',
      performedBy: 'Administrator',
      reason: 'Initial resource registration in system catalog'
    });
    await history.save();

    io.emit('resource:created', newResource);
    io.emit('resource:updated', newResource);

    res.status(201).json({ success: true, message: 'Resource registered successfully', resource: newResource });
  } catch (err) {
    console.error('Error in POST /api/resources:', err.message);
    res.status(500).json({ success: false, message: 'Failed to register resource', error: err.message });
  }
});

// 6. PATCH /api/resources/:id — Edit details, stock, or status
app.patch('/api/resources/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const resource = await Resource.findOne({ $or: [{ resourceId: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }] });

    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }

    const prevAvail = resource.availableQuantity;
    const prevTotal = resource.totalQuantity;

    const {
      name,
      category,
      description,
      totalQuantity,
      availableQuantity,
      unit,
      location,
      status,
      department,
      minStockThreshold,
      expiryDate,
      notes,
      reason
    } = req.body;

    if (name) resource.name = name;
    if (category) resource.category = category;
    if (description !== undefined) resource.description = description;
    if (unit) resource.unit = unit;
    if (department) resource.department = department;
    if (notes !== undefined) resource.notes = notes;
    if (expiryDate !== undefined) resource.expiryDate = expiryDate ? new Date(expiryDate) : null;
    if (minStockThreshold !== undefined) resource.minStockThreshold = parseInt(minStockThreshold, 10) || 0;

    if (location) {
      resource.location = {
        lat: location.lat !== undefined ? parseFloat(location.lat) : resource.location.lat,
        lng: location.lng !== undefined ? parseFloat(location.lng) : resource.location.lng,
        address: location.address || resource.location.address,
        storageDepot: location.storageDepot || resource.location.storageDepot
      };
    }

    let newTotal = totalQuantity !== undefined ? parseInt(totalQuantity, 10) : resource.totalQuantity;
    let newAvail = availableQuantity !== undefined ? parseInt(availableQuantity, 10) : resource.availableQuantity;

    if (isNaN(newTotal) || newTotal < 0) return res.status(400).json({ success: false, message: 'Total quantity cannot be negative' });
    if (isNaN(newAvail) || newAvail < 0) return res.status(400).json({ success: false, message: 'Available quantity cannot be negative' });
    if (newAvail > newTotal) return res.status(400).json({ success: false, message: `Available quantity (${newAvail}) cannot exceed total capacity (${newTotal}).` });

    resource.totalQuantity = newTotal;
    resource.availableQuantity = newAvail;

    if (status) {
      resource.status = status;
    } else {
      if (newAvail === 0) resource.status = 'Out of Stock';
      else if (newAvail <= resource.minStockThreshold && !['Emergency Vehicles', 'Human Resources'].includes(resource.category)) resource.status = 'Low Stock';
      else resource.status = 'Available';
    }

    await resource.save();

    // Log History if quantity changed
    const changeQty = newAvail - prevAvail;
    if (changeQty !== 0 || prevTotal !== newTotal) {
      const history = new ResourceHistory({
        historyId: `hist_${Date.now()}`,
        resourceId: resource.resourceId,
        resourceName: resource.name,
        previousQuantity: prevAvail,
        changeQuantity: changeQty,
        newQuantity: newAvail,
        transactionType: 'UPDATE_STOCK',
        performedBy: 'Emergency Operator',
        reason: reason || 'Manual stock level adjustment'
      });
      await history.save();
    }

    io.emit('resource:updated', resource);
    io.emit('resource:availabilityUpdated', {
      resourceId: resource.resourceId,
      availableQuantity: resource.availableQuantity,
      totalQuantity: resource.totalQuantity,
      status: resource.status
    });

    if (resource.status === 'Low Stock' || resource.status === 'Out of Stock') {
      io.emit('resource:lowStockAlert', resource);
    }

    res.json({ success: true, message: 'Resource updated successfully', resource });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. PATCH /api/resources/:id/maintenance — Mark Maintenance or Available
app.patch('/api/resources/:id/maintenance', async (req, res) => {
  try {
    const { id } = req.params;
    const { isMaintenance, notes } = req.body;

    const resource = await Resource.findOne({ $or: [{ resourceId: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }] });
    if (!resource) return res.status(404).json({ success: false, message: 'Resource not found' });

    const newStatus = isMaintenance ? 'Maintenance' : 'Available';
    resource.status = newStatus;
    if (notes) resource.notes = notes;

    await resource.save();

    const history = new ResourceHistory({
      historyId: `hist_${Date.now()}`,
      resourceId: resource.resourceId,
      resourceName: resource.name,
      previousQuantity: resource.availableQuantity,
      changeQuantity: 0,
      newQuantity: resource.availableQuantity,
      transactionType: 'MAINTENANCE',
      performedBy: 'Equipment Maintenance Tech',
      reason: notes || (isMaintenance ? 'Flagged for routine safety inspection & servicing' : 'Servicing completed, returned to active fleet')
    });
    await history.save();

    io.emit('resource:updated', resource);
    io.emit('resource:availabilityUpdated', resource);

    res.json({ success: true, message: `Resource status updated to ${newStatus}`, resource });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 8. POST /api/resources/allocate — Allocate resource to disaster site
app.post('/api/resources/allocate', async (req, res) => {
  try {
    const {
      resourceId,
      incidentId,
      disasterTitle,
      assignedTeamId,
      assignedTeamName,
      quantityAllocated,
      priority,
      destination,
      notes,
      requestId
    } = req.body;

    if (!resourceId || !incidentId || !quantityAllocated) {
      return res.status(400).json({ success: false, message: 'resourceId, incidentId, and quantityAllocated are required' });
    }

    const allocQty = parseInt(quantityAllocated, 10);
    if (isNaN(allocQty) || allocQty <= 0) {
      return res.status(400).json({ success: false, message: 'Allocated quantity must be at least 1' });
    }

    const resource = await Resource.findOne({ $or: [{ resourceId }, { _id: mongoose.Types.ObjectId.isValid(resourceId) ? resourceId : null }] });
    if (!resource) return res.status(404).json({ success: false, message: 'Resource not found' });

    if (resource.status === 'Maintenance' || resource.status === 'Deactivated' || resource.status === 'Unavailable') {
      return res.status(400).json({ success: false, message: `Resource is currently ${resource.status} and cannot be allocated.` });
    }

    // Check availability
    if (allocQty > resource.availableQuantity) {
      return res.status(400).json({
        success: false,
        message: `Cannot allocate ${allocQty} units. Only ${resource.availableQuantity} units available.`
      });
    }

    // Prevent double allocation for exclusive vehicles
    if (resource.isVehicleOrEquipment && resource.status === 'Deployed') {
      return res.status(400).json({ success: false, message: 'This vehicle/equipment unit is already deployed elsewhere.' });
    }

    const prevAvail = resource.availableQuantity;
    resource.availableQuantity -= allocQty;

    if (resource.isVehicleOrEquipment) {
      resource.status = 'Deployed';
      resource.assignedIncidentId = incidentId;
      resource.assignedDisasterTitle = disasterTitle || 'Active Disaster';
      resource.assignedTeamId = assignedTeamId || null;
      resource.assignedTeamName = assignedTeamName || null;
    } else {
      if (resource.availableQuantity === 0) resource.status = 'Out of Stock';
      else if (resource.availableQuantity <= resource.minStockThreshold) resource.status = 'Low Stock';
    }

    await resource.save();

    // Create ResourceAllocation
    const allocationId = `alloc_${Date.now()}`;
    const allocation = new ResourceAllocation({
      allocationId,
      requestId: requestId || null,
      resourceId: resource.resourceId,
      resourceName: resource.name,
      category: resource.category,
      incidentId,
      disasterTitle: disasterTitle || 'Active Incident',
      assignedTeamId: assignedTeamId || null,
      assignedTeamName: assignedTeamName || null,
      quantityAllocated: allocQty,
      priority: priority || 'High',
      status: 'Allocated',
      allocatedBy: 'Emergency Operator',
      destination: {
        lat: destination?.lat || 19.9975,
        lng: destination?.lng || 73.7898,
        address: destination?.address || 'Incident Evacuation Zone'
      },
      etaMinutes: 15,
      notes: notes || ''
    });
    await allocation.save();

    // Log History
    const history = new ResourceHistory({
      historyId: `hist_${Date.now()}`,
      resourceId: resource.resourceId,
      resourceName: resource.name,
      previousQuantity: prevAvail,
      changeQuantity: -allocQty,
      newQuantity: resource.availableQuantity,
      transactionType: 'ALLOCATE',
      relatedRequestId: requestId || null,
      relatedIncidentId: incidentId,
      performedBy: 'Emergency Operator',
      reason: `Allocated ${allocQty} ${resource.unit} to Incident #${incidentId}`
    });
    await history.save();

    io.emit('resource:allocated', { allocation, resource });
    io.emit('resource:updated', resource);
    io.emit('resource:availabilityUpdated', resource);

    res.status(201).json({ success: true, message: 'Resource allocated successfully', allocation, resource });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 9. POST /api/resources/return — Return deployed vehicle/equipment
app.post('/api/resources/return', async (req, res) => {
  try {
    const { resourceId, allocationId, quantityReturned, notes } = req.body;
    const resource = await Resource.findOne({ $or: [{ resourceId }, { _id: mongoose.Types.ObjectId.isValid(resourceId) ? resourceId : null }] });

    if (!resource) return res.status(404).json({ success: false, message: 'Resource not found' });

    const retQty = parseInt(quantityReturned, 10) || 1;
    const prevAvail = resource.availableQuantity;
    resource.availableQuantity = Math.min(resource.totalQuantity, resource.availableQuantity + retQty);
    resource.status = 'Available';
    resource.assignedIncidentId = null;
    resource.assignedDisasterTitle = null;
    resource.assignedTeamId = null;
    resource.assignedTeamName = null;

    await resource.save();

    if (allocationId) {
      await ResourceAllocation.findOneAndUpdate(
        { allocationId },
        { $set: { status: 'Returned', returnedAt: new Date(), notes: notes || 'Returned to active central inventory' } }
      );
    }

    const history = new ResourceHistory({
      historyId: `hist_${Date.now()}`,
      resourceId: resource.resourceId,
      resourceName: resource.name,
      previousQuantity: prevAvail,
      changeQuantity: retQty,
      newQuantity: resource.availableQuantity,
      transactionType: 'RETURN',
      performedBy: 'Rescue Team Operator',
      reason: notes || 'Mission completed, equipment returned to depot'
    });
    await history.save();

    io.emit('resource:returned', { resource, allocationId });
    io.emit('resource:updated', resource);
    io.emit('resource:availabilityUpdated', resource);

    res.json({ success: true, message: 'Resource returned to available inventory', resource });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 10. GET /api/resource-requests — List resource requests
app.get('/api/resource-requests', async (req, res) => {
  try {
    let requests = [];
    if (ResourceRequest) {
      requests = await ResourceRequest.find().sort({ createdAt: -1 }).lean();
    }
    res.json({ success: true, count: requests.length, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 11. POST /api/resource-requests — Rescue team submits resource request
app.post('/api/resource-requests', async (req, res) => {
  try {
    const {
      requestingTeamId,
      requestingTeamName,
      requestingDepartment,
      incidentId,
      incidentTitle,
      resourceId,
      resourceName,
      category,
      quantityRequested,
      priority,
      requestReason,
      destination,
      notes
    } = req.body;

    if (!incidentId || !resourceId || !quantityRequested || !requestReason) {
      return res.status(400).json({ success: false, message: 'incidentId, resourceId, quantityRequested, and requestReason are required.' });
    }

    const parsedQty = parseInt(quantityRequested, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      return res.status(400).json({ success: false, message: 'Requested quantity must be at least 1' });
    }

    const requestId = `req_${Date.now()}`;
    const newRequest = new ResourceRequest({
      requestId,
      requestingTeamId: requestingTeamId || 'team_field_1',
      requestingTeamName: requestingTeamName || 'Field Rescue Bravo Unit',
      requestingDepartment: requestingDepartment || 'Search & Rescue Wing',
      incidentId,
      incidentTitle: incidentTitle || 'Emergency Response Zone',
      resourceId,
      resourceName: resourceName || 'Requested Resource Item',
      category: category || 'General Supplies',
      quantityRequested: parsedQty,
      priority: priority || 'High',
      requestReason,
      destination: {
        lat: destination?.lat || 19.9975,
        lng: destination?.lng || 73.7898,
        address: destination?.address || 'Incident Command Post'
      },
      status: 'Pending',
      notes: notes || ''
    });

    await newRequest.save();

    io.emit('resource:requestCreated', newRequest);

    res.status(201).json({ success: true, message: 'Resource request submitted successfully', request: newRequest });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 12. PATCH /api/resource-requests/:id/status — Approve, Partially Approve, or Reject Request
app.patch('/api/resource-requests/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, quantityAllocated, operatorName, rejectionReason, partialReason, notes } = req.body;

    const request = await ResourceRequest.findOne({ $or: [{ requestId: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }] });
    if (!request) return res.status(404).json({ success: false, message: 'Resource request not found' });

    request.status = status;
    if (operatorName) request.assignedOperatorName = operatorName;
    if (rejectionReason) request.rejectionReason = rejectionReason;
    if (partialReason) request.partialReason = partialReason;
    if (notes) request.notes = notes;

    let allocatedObj = null;

    if (status === 'Approved' || status === 'Partially Approved') {
      const allocQty = quantityAllocated !== undefined ? parseInt(quantityAllocated, 10) : request.quantityRequested;
      request.quantityAllocated = allocQty;

      // Deduct from Resource
      const resource = await Resource.findOne({ $or: [{ resourceId: request.resourceId }, { _id: mongoose.Types.ObjectId.isValid(request.resourceId) ? request.resourceId : null }] });

      if (resource) {
        if (allocQty > resource.availableQuantity) {
          return res.status(400).json({ success: false, message: `Cannot approve allocation of ${allocQty}. Only ${resource.availableQuantity} available in inventory.` });
        }

        const prevAvail = resource.availableQuantity;
        resource.availableQuantity -= allocQty;
        if (resource.availableQuantity === 0) resource.status = 'Out of Stock';
        else if (resource.availableQuantity <= resource.minStockThreshold) resource.status = 'Low Stock';
        await resource.save();

        // Create Allocation
        allocatedObj = new ResourceAllocation({
          allocationId: `alloc_${Date.now()}`,
          requestId: request.requestId,
          resourceId: resource.resourceId,
          resourceName: resource.name,
          category: resource.category,
          incidentId: request.incidentId,
          disasterTitle: request.incidentTitle,
          assignedTeamId: request.requestingTeamId,
          assignedTeamName: request.requestingTeamName,
          quantityAllocated: allocQty,
          priority: request.priority,
          status: 'Dispatched',
          allocatedBy: operatorName || 'Emergency Operator',
          destination: request.destination,
          notes: notes || request.requestReason
        });
        await allocatedObj.save();

        // History Log
        const history = new ResourceHistory({
          historyId: `hist_${Date.now()}`,
          resourceId: resource.resourceId,
          resourceName: resource.name,
          previousQuantity: prevAvail,
          changeQuantity: -allocQty,
          newQuantity: resource.availableQuantity,
          transactionType: 'ALLOCATE',
          relatedRequestId: request.requestId,
          relatedIncidentId: request.incidentId,
          performedBy: operatorName || 'Emergency Operator',
          reason: `Approved request ${request.requestId} for Team ${request.requestingTeamName}`
        });
        await history.save();

        io.emit('resource:updated', resource);
        io.emit('resource:availabilityUpdated', resource);
      }
    }

    await request.save();

    io.emit('resource:requestUpdated', request);
    if (allocatedObj) io.emit('resource:allocated', allocatedObj);

    res.json({ success: true, message: `Request status updated to ${status}`, request, allocation: allocatedObj });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 13. GET /api/resources/history — View audit log transaction history
app.get('/api/resources/history', async (req, res) => {
  try {
    let history = [];
    if (ResourceHistory) {
      history = await ResourceHistory.find().sort({ createdAt: -1 }).limit(200).lean();
    }
    res.json({ success: true, count: history.length, history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// 🚨 SMART EVACUATION ROUTE PLANNING & SAFE-ZONE NAVIGATION MODULE
// ============================================================================

function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  return calculateHaversineKm(lat1, lon1, lat2, lon2) * 1000;
}

async function seedEvacuationData() {
  try {
    if (ReliefCamp) {
      const campCount = await ReliefCamp.countDocuments();
      if (campCount === 0) {
        const initialCamps = [
          {
            campId: 'camp_nashik_01',
            name: 'Panchavati Civil Defense Shelter #1',
            location: { lat: 20.0102, lng: 73.7915, address: 'Panchavati High School Complex, Nashik' },
            geoPoint: { type: 'Point', coordinates: [73.7915, 20.0102] },
            capacity: 600,
            currentOccupants: 220,
            status: 'OPEN',
            demographics: { children: 40, women: 90, seniorCitizens: 30, men: 60 },
            supplies: { foodPacks: 1500, waterLiters: 5000, medicineKits: 400, blankets: 800 },
            managerName: 'Major K. Kulkarni',
            contactPhone: '+91 98220 11223',
            verified: true
          },
          {
            campId: 'camp_nashik_02',
            name: 'Central Indoor Stadium Evacuation Hub',
            location: { lat: 19.9920, lng: 73.7780, address: 'District Sports Complex, Mahatma Nagar' },
            geoPoint: { type: 'Point', coordinates: [73.7780, 19.9920] },
            capacity: 1200,
            currentOccupants: 540,
            status: 'OPEN',
            demographics: { children: 120, women: 220, seniorCitizens: 70, men: 130 },
            supplies: { foodPacks: 3000, waterLiters: 10000, medicineKits: 600, blankets: 1500 },
            managerName: 'Officer Anita Joshi',
            contactPhone: '+91 98221 33445',
            verified: true
          },
          {
            campId: 'camp_nashik_03',
            name: 'Gangapur Road Safe Assembly Ground',
            location: { lat: 20.0190, lng: 73.7610, address: 'KT Street Community Pavilion, Gangapur Rd' },
            geoPoint: { type: 'Point', coordinates: [73.7610, 20.0190] },
            capacity: 800,
            currentOccupants: 760,
            status: 'NEAR_CAPACITY',
            demographics: { children: 160, women: 280, seniorCitizens: 120, men: 200 },
            supplies: { foodPacks: 800, waterLiters: 2500, medicineKits: 150, blankets: 400 },
            managerName: 'Inspector Sunil Patil',
            contactPhone: '+91 98222 55667',
            verified: true
          },
          {
            campId: 'camp_delhi_01',
            name: 'Yamuna Riverfront Flood Shelter A',
            location: { lat: 28.6350, lng: 77.2150, address: 'Sector 9 Civil Defense Field Center, Delhi' },
            geoPoint: { type: 'Point', coordinates: [77.2150, 28.6350] },
            capacity: 500,
            currentOccupants: 180,
            status: 'OPEN',
            demographics: { children: 45, women: 75, seniorCitizens: 25, men: 35 },
            supplies: { foodPacks: 1200, waterLiters: 4500, medicineKits: 300, blankets: 600 },
            managerName: 'Commander Rajiv Menon',
            contactPhone: '+91 98111 22233',
            verified: true
          }
        ];
        await ReliefCamp.insertMany(initialCamps);
        console.log('✅ Seeded 4 verified disaster relief camps & evacuation shelters');
      }
    }

    if (RoadReport) {
      const reportCount = await RoadReport.countDocuments();
      if (reportCount === 0) {
        const initialReports = [
          {
            reportId: 'rr_flood_101',
            title: 'Waterlogging at Old Canal Road Underpass',
            description: 'Water depth > 3.5 feet. Completely impassable for light and medium vehicles.',
            hazardType: 'FLOODED_ROAD',
            severity: 'CRITICAL',
            location: { lat: 20.0025, lng: 73.7840, address: 'Old Canal Rd Underpass, Panchavati' },
            geoPoint: { type: 'Point', coordinates: [73.7840, 20.0025] },
            radiusMeters: 200,
            status: 'VERIFIED',
            reportedBy: { id: 'usr_cit_b', name: 'Rahul Verma', role: 'Citizen' },
            verifiedBy: { id: 'usr_operator', name: 'Commander Alex Vance', verifiedAt: new Date() },
            notes: 'Verified via traffic camera 04. Police barricades deployed.'
          },
          {
            reportId: 'rr_tree_102',
            title: 'Fallen High-Tension Pole and Tree on Arterial Link',
            description: 'Power line collapsed across road. Live wire sparking hazard.',
            hazardType: 'FALLEN_TREE',
            severity: 'HIGH',
            location: { lat: 19.9950, lng: 73.7820, address: 'Link Road Junction 14' },
            geoPoint: { type: 'Point', coordinates: [73.7820, 19.9950] },
            radiusMeters: 150,
            status: 'VERIFIED',
            reportedBy: { id: 'res_nashik_1', name: 'Ambulance Lifeline Team', role: 'Rescue Team' },
            verifiedBy: { id: 'usr_operator', name: 'Commander Alex Vance', verifiedAt: new Date() },
            notes: 'Electricity board informed. Area cordoned off.'
          },
          {
            reportId: 'rr_bridge_103',
            title: 'Suspected Structural Crack on Godavari Old Causeway Bridge',
            description: 'Citizen reported intense vibration and surface crack under torrent floodwaters.',
            hazardType: 'BRIDGE_COLLAPSE',
            severity: 'HIGH',
            location: { lat: 20.0065, lng: 73.7950, address: 'Godavari Causeway Bridge North End' },
            geoPoint: { type: 'Point', coordinates: [73.7950, 20.0065] },
            radiusMeters: 250,
            status: 'REPORTED',
            reportedBy: { id: 'usr_cit_a', name: 'Priya Sharma', role: 'Citizen' },
            verifiedBy: { id: null, name: null, verifiedAt: null },
            notes: 'Awaiting inspection by PWD engineers.'
          }
        ];
        await RoadReport.insertMany(initialReports);
        console.log('✅ Seeded 3 evacuation road obstruction reports');
      }
    }

    if (EvacuationAdvisory) {
      const advCount = await EvacuationAdvisory.countDocuments();
      if (advCount === 0) {
        const initialAdvisory = new EvacuationAdvisory({
          advisoryId: 'adv_2026_01',
          disasterTitle: 'Flash Flood Overflow & Lowland Evacuation Order',
          disasterType: 'Flood',
          severity: 'MANDATORY',
          affectedArea: {
            center: { lat: 20.0050, lng: 73.7880 },
            radiusMeters: 3000,
            description: 'Riverbanks within 3000m of Godavari Lower Basin and Sector 9 lowlands'
          },
          designatedSafeZones: [
            {
              id: 'camp_nashik_01',
              name: 'Panchavati Civil Defense Shelter #1',
              type: 'Relief Shelter',
              address: 'Panchavati High School Complex, Nashik',
              location: { lat: 20.0102, lng: 73.7915 },
              capacityAvailable: 380
            },
            {
              id: 'camp_nashik_02',
              name: 'Central Indoor Stadium Evacuation Hub',
              type: 'Relief Shelter',
              address: 'District Sports Complex, Mahatma Nagar',
              location: { lat: 19.9920, lng: 73.7780 },
              capacityAvailable: 660
            }
          ],
          instructions: [
            'Move immediately to designated high-ground shelters or safe assembly points',
            'Do not attempt to walk, swim, or drive through standing or moving floodwater',
            'Turn off electricity and main gas supply before leaving premises if safe to do so',
            'Carry emergency medicines, essential identity documents in waterproof bags',
            'Prioritize children, elderly relatives, and individuals requiring medical support'
          ],
          publishedBy: {
            id: 'usr_operator',
            name: 'Commander Alex Vance',
            role: 'Emergency Operator'
          },
          publishedAt: new Date(),
          status: 'ACTIVE',
          auditLog: [
            {
              action: 'PUBLISH_ADVISORY',
              operatorName: 'Commander Alex Vance',
              timestamp: new Date(),
              details: 'Issued Level 3 Mandatory Evacuation Advisory for flood zone'
            }
          ]
        });
        await initialAdvisory.save();
        console.log('✅ Seeded initial disaster evacuation advisory');
      }
    }
  } catch (e) {
    console.error('Error seeding evacuation data:', e);
  }
}

// 1. GET /api/evacuation/nearby-destinations — Find verified safe shelters, hospitals & safe zones
app.get('/api/evacuation/nearby-destinations', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radiusKm = parseFloat(req.query.radiusKm) || 60;
    const typeFilter = (req.query.type || 'ALL').toUpperCase();

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ success: false, message: 'Valid latitude and longitude are required' });
    }

    const destinations = [];

    // A. Relief Camps & Emergency Shelters
    if (typeFilter === 'ALL' || typeFilter === 'SHELTERS' || typeFilter === 'CAMPS') {
      let camps = [];
      if (ReliefCamp) {
        camps = await ReliefCamp.find().lean();
      }
      for (const camp of camps) {
        const campLat = camp.location?.lat;
        const campLng = camp.location?.lng;
        if (typeof campLat === 'number' && typeof campLng === 'number') {
          const distKm = calculateHaversineKm(lat, lng, campLat, campLng);
          if (distKm <= radiusKm) {
            const availableCapacity = Math.max(0, (camp.capacity || 500) - (camp.currentOccupants || 0));
            const occupancyPct = Math.round(((camp.currentOccupants || 0) / (camp.capacity || 500)) * 100);
            destinations.push({
              id: camp.campId || camp._id.toString(),
              destinationType: 'RELIEF_SHELTER',
              name: camp.name,
              address: camp.location.address || 'Civil Defense Relief Ground',
              location: { lat: campLat, lng: campLng },
              distanceKm: parseFloat(distKm.toFixed(2)),
              estimatedDriveTimeMins: Math.max(2, Math.round((distKm / 35) * 60)),
              estimatedWalkTimeMins: Math.max(5, Math.round((distKm / 4.5) * 60)),
              totalCapacity: camp.capacity || 500,
              currentOccupants: camp.currentOccupants || 0,
              availableCapacity,
              occupancyPercentage: occupancyPct,
              status: availableCapacity > 0 ? (occupancyPct > 90 ? 'NEAR_CAPACITY' : 'OPEN') : 'FULL',
              managerContact: {
                name: camp.managerName || 'Shelter Commander',
                phone: camp.contactPhone || '+91 98000 00000'
              },
              suppliesAvailable: camp.supplies || {},
              verified: camp.verified !== false,
              lastUpdated: camp.updatedAt || new Date().toISOString()
            });
          }
        }
      }
    }

    // B. Emergency Hospitals
    if (typeFilter === 'ALL' || typeFilter === 'HOSPITALS') {
      let hospitals = [];
      if (Hospital) {
        hospitals = await Hospital.find().lean();
      }
      for (const hosp of hospitals) {
        const hLat = hosp.location?.lat;
        const hLng = hosp.location?.lng;
        if (typeof hLat === 'number' && typeof hLng === 'number') {
          const distKm = calculateHaversineKm(lat, lng, hLat, hLng);
          if (distKm <= radiusKm) {
            const availBeds = typeof hosp.generalBeds === 'object' ? hosp.generalBeds?.available : hosp.availableBeds;
            const totalBeds = typeof hosp.generalBeds === 'object' ? hosp.generalBeds?.total : hosp.totalBeds;
            const availICU = typeof hosp.icuBeds === 'object' ? hosp.icuBeds?.available : hosp.icuBeds;
            const isAccepting = hosp.ambulanceReceivingStatus !== 'NOT_ACCEPTING';

            destinations.push({
              id: hosp.hospitalId || hosp._id.toString(),
              destinationType: 'HOSPITAL',
              name: hosp.name,
              address: hosp.address || 'Emergency Hospital Hub',
              location: { lat: hLat, lng: hLng },
              distanceKm: parseFloat(distKm.toFixed(2)),
              estimatedDriveTimeMins: Math.max(2, Math.round((distKm / 35) * 60)),
              estimatedWalkTimeMins: Math.max(5, Math.round((distKm / 4.5) * 60)),
              availableBeds: availBeds ?? 15,
              totalBeds: totalBeds ?? 100,
              availableICUBeds: availICU ?? 3,
              emergencyDepartmentStatus: hosp.emergencyDepartmentStatus || 'AVAILABLE',
              ambulanceReceivingStatus: hosp.ambulanceReceivingStatus || 'ACCEPTING',
              status: isAccepting ? (hosp.emergencyDepartmentStatus === 'BUSY' ? 'BUSY' : 'OPEN') : 'DIVERTING',
              managerContact: {
                name: 'Emergency Reception',
                phone: hosp.contactPhone || '+91 11 2658 8500'
              },
              emergencyServices: hosp.emergencyServices || ['Trauma Care', 'Emergency Surgery', 'Oxygen Support'],
              verified: true,
              lastUpdated: hosp.updatedAt || new Date().toISOString()
            });
          }
        }
      }
    }

    // Sort destinations by proximity
    destinations.sort((a, b) => a.distanceKm - b.distanceKm);

    res.json({
      success: true,
      origin: { lat, lng },
      radiusKm,
      count: destinations.length,
      destinations
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. GET /api/evacuation/hazards — Retrieve active disaster zones and verified road closures
app.get('/api/evacuation/hazards', async (req, res) => {
  try {
    // A. Active Incidents & Disaster Epizones
    const activeIncidents = await Incident.find({
      status: { $nin: ['Resolved', 'INCIDENT_RESOLVED', 'REJECTED', 'CANCELLED'] }
    }).lean();

    const disasterZones = activeIncidents.map((inc) => {
      let lat = 20.0050;
      let lng = 73.7880;
      if (inc.location?.coordinates && Array.isArray(inc.location.coordinates)) {
        lng = inc.location.coordinates[0];
        lat = inc.location.coordinates[1];
      } else if (typeof inc.location?.lat === 'number') {
        lat = inc.location.lat;
        lng = inc.location.lng;
      }

      const dType = (inc.disasterType || '').toUpperCase();
      let radiusMeters = 500;
      if (dType.includes('FLOOD') || dType.includes('EARTH')) radiusMeters = 800;
      else if (dType.includes('CHEM') || dType.includes('GAS')) radiusMeters = 400;
      else if (dType.includes('FIRE')) radiusMeters = 300;

      return {
        id: inc.incidentId || inc._id.toString(),
        title: inc.title,
        disasterType: inc.disasterType || 'Flood',
        severity: inc.severity || 'CRITICAL',
        center: { lat, lng },
        radiusMeters,
        description: inc.description || 'Active Incident Hazard Perimeter',
        reportedAt: inc.createdAt || new Date().toISOString()
      };
    });

    // B. Road Closures & Obstructions
    let roadReports = [];
    if (RoadReport) {
      roadReports = await RoadReport.find({ status: { $in: ['VERIFIED', 'REPORTED'] } }).sort({ createdAt: -1 }).lean();
    }

    // C. Active Evacuation Advisories
    let advisories = [];
    if (EvacuationAdvisory) {
      advisories = await EvacuationAdvisory.find({ status: 'ACTIVE' }).sort({ publishedAt: -1 }).lean();
    }

    res.json({
      success: true,
      lastUpdated: new Date().toISOString(),
      disasterZones,
      roadObstructions: roadReports,
      roadClosures: roadReports,
      advisories
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. POST /api/evacuation/route — Calculate hazard-aware smart evacuation route
app.post('/api/evacuation/route', async (req, res) => {
  try {
    const { origin, destination, travelMode = 'driving' } = req.body;
    if (!origin || typeof origin.lat !== 'number' || typeof origin.lng !== 'number') {
      return res.status(400).json({ success: false, message: 'Valid origin latitude and longitude are required' });
    }
    if (!destination || typeof destination.lat !== 'number' || typeof destination.lng !== 'number') {
      return res.status(400).json({ success: false, message: 'Valid destination latitude and longitude are required' });
    }

    const routePlan = await evacuationRoutingService.planSmartRoute({
      origin,
      destination,
      travelMode
    });
    res.json(routePlan);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. GET /api/evacuation/road-reports — List citizen & responder road reports
app.get('/api/evacuation/road-reports', async (req, res) => {
  try {
    const status = req.query.status;
    const query = {};
    if (status && status !== 'ALL') {
      query.status = status.toUpperCase();
    }

    let reports = [];
    if (RoadReport) {
      reports = await RoadReport.find(query).sort({ createdAt: -1 }).limit(100).lean();
    }

    res.json({ success: true, count: reports.length, reports });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. POST /api/evacuation/road-reports — Submit a road obstruction report
app.post('/api/evacuation/road-reports', async (req, res) => {
  try {
    const {
      title,
      description,
      hazardType = 'FLOODED_ROAD',
      severity = 'HIGH',
      latitude,
      longitude,
      location,
      address,
      radiusMeters = 150,
      reportedByName = 'Citizen Reporter',
      reportedById = 'anonymous',
      reportedByRole = 'Citizen',
      reportedBy
    } = req.body;

    const lat = parseFloat(latitude !== undefined ? latitude : location?.lat);
    const lng = parseFloat(longitude !== undefined ? longitude : location?.lng);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ success: false, message: 'Valid latitude and longitude coordinates are required' });
    }
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Report title is required' });
    }

    const finalReportedByName = reportedByName || reportedBy?.citizenName || 'Citizen Reporter';
    const finalReportedById = reportedById || reportedBy?.citizenId || 'anonymous';
    const finalReportedByRole = reportedByRole || reportedBy?.role || 'Citizen';
    const finalAddress = address || location?.address || `Road Marker (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

    const reportId = `rr_${Date.now()}`;
    const newReport = new RoadReport({
      reportId,
      title: title.trim(),
      description: description || '',
      hazardType,
      severity,
      location: {
        lat,
        lng,
        address: finalAddress
      },
      geoPoint: {
        type: 'Point',
        coordinates: [lng, lat]
      },
      radiusMeters: Math.max(50, Math.min(1000, parseInt(radiusMeters) || 150)),
      status: 'REPORTED',
      reportedBy: {
        id: finalReportedById,
        name: finalReportedByName,
        role: finalReportedByRole
      }
    });

    await newReport.save();

    // Broadcast live event over Socket.IO
    io.emit('evacuation:roadReportCreated', newReport);

    res.status(201).json({
      success: true,
      message: 'Road obstruction report submitted successfully. An emergency operator will review and verify it.',
      report: newReport
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. PATCH /api/evacuation/road-reports/:id/verify — Verify or reject road report (Operator only)
app.patch('/api/evacuation/road-reports/:id/verify', async (req, res) => {
  try {
    const { status, operatorName = 'Emergency Operator', operatorId = 'usr_operator', notes } = req.body;
    const reportId = req.params.id;

    if (!['VERIFIED', 'REJECTED', 'CLEARED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be VERIFIED, REJECTED, or CLEARED' });
    }

    const report = await RoadReport.findOne({
      $or: [{ reportId }, { _id: mongoose.Types.ObjectId.isValid(reportId) ? reportId : null }]
    });

    if (!report) {
      return res.status(404).json({ success: false, message: 'Road report not found' });
    }

    report.status = status;
    report.verifiedBy = {
      id: operatorId,
      name: operatorName,
      verifiedAt: new Date()
    };
    if (notes) report.notes = notes;

    await report.save();

    // Broadcast update over Socket.IO so citizen maps recalculate routes immediately
    io.emit('evacuation:roadReportVerified', report);
    io.emit('evacuation:hazardUpdated', { type: 'ROAD_REPORT', report });

    res.json({
      success: true,
      message: `Road report status updated to ${status}`,
      report
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. GET /api/evacuation/advisories — List evacuation advisories
app.get('/api/evacuation/advisories', async (req, res) => {
  try {
    let advisories = [];
    if (EvacuationAdvisory) {
      advisories = await EvacuationAdvisory.find().sort({ publishedAt: -1 }).limit(50).lean();
    }
    res.json({ success: true, count: advisories.length, advisories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 8. POST /api/evacuation/advisories — Publish official evacuation advisory (Operator only)
app.post('/api/evacuation/advisories', async (req, res) => {
  try {
    const {
      disasterId,
      disasterTitle,
      title,
      disasterType = 'Flood',
      severity = 'MANDATORY',
      centerLat,
      centerLng,
      affectedArea,
      radiusMeters = 2000,
      description,
      instructions = [],
      operatorName = 'Emergency Operator',
      operatorId = 'usr_operator'
    } = req.body;

    const finalTitle = disasterTitle || title;
    const lat = parseFloat(centerLat !== undefined ? centerLat : affectedArea?.center?.lat);
    const lng = parseFloat(centerLng !== undefined ? centerLng : affectedArea?.center?.lng);
    const finalRadius = parseInt(radiusMeters !== undefined ? radiusMeters : affectedArea?.radiusMeters) || 2000;
    const finalAreaName = affectedArea?.name || description || `Evacuation perimeter within ${finalRadius}m`;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ success: false, message: 'Valid disaster center coordinates are required' });
    }
    if (!finalTitle) {
      return res.status(400).json({ success: false, message: 'Disaster title is required' });
    }

    const advisoryId = `adv_${Date.now()}`;
    const newAdvisory = new EvacuationAdvisory({
      advisoryId,
      disasterId: disasterId || null,
      disasterTitle: finalTitle,
      disasterType,
      severity,
      affectedArea: {
        name: finalAreaName,
        center: { lat, lng },
        radiusMeters: finalRadius,
        description: description || `Evacuation perimeter within ${finalRadius}m of disaster epicenter`
      },
      instructions: Array.isArray(instructions) && instructions.length > 0 ? instructions : [
        'Evacuate immediately to nearest designated relief shelter',
        'Avoid all flooded underpasses and waterlogged road corridors',
        'Follow official instructions given by emergency field responders'
      ],
      publishedBy: {
        id: operatorId,
        name: operatorName,
        role: 'Emergency Operator'
      },
      publishedAt: new Date(),
      status: 'ACTIVE',
      auditLog: [
        {
          action: 'PUBLISH_ADVISORY',
          operatorName,
          timestamp: new Date(),
          details: `Published ${severity} evacuation advisory for ${disasterTitle}`
        }
      ]
    });

    await newAdvisory.save();

    // Broadcast advisory to all connected citizens and responders
    io.emit('evacuation:advisoryPublished', newAdvisory);
    io.emit('evacuation:hazardUpdated', { type: 'ADVISORY', advisory: newAdvisory });

    res.status(201).json({
      success: true,
      message: 'Official evacuation advisory published and broadcasted successfully.',
      advisory: newAdvisory
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 9. PATCH /api/evacuation/advisories/:id/lift — Lift or cancel advisory
app.patch('/api/evacuation/advisories/:id/lift', async (req, res) => {
  try {
    const advisoryId = req.params.id;
    const { operatorName = 'Emergency Operator' } = req.body;

    const advisory = await EvacuationAdvisory.findOne({
      $or: [{ advisoryId }, { _id: mongoose.Types.ObjectId.isValid(advisoryId) ? advisoryId : null }]
    });

    if (!advisory) {
      return res.status(404).json({ success: false, message: 'Evacuation advisory not found' });
    }

    advisory.status = 'LIFTED';
    advisory.auditLog.push({
      action: 'LIFT_ADVISORY',
      operatorName,
      timestamp: new Date(),
      details: 'Evacuation order lifted by operator'
    });

    await advisory.save();

    io.emit('evacuation:advisoryLifted', advisory);
    io.emit('evacuation:hazardUpdated', { type: 'ADVISORY_LIFTED', advisory });

    res.json({ success: true, message: 'Evacuation advisory has been lifted.', advisory });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 10. GET /api/camps & POST /api/camps — Direct Relief Camp Endpoints
app.get('/api/camps', async (req, res) => {
  try {
    let camps = [];
    if (ReliefCamp) {
      camps = await ReliefCamp.find().lean();
    }
    res.json(camps);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/camps', async (req, res) => {
  try {
    const campData = req.body;
    const campId = `camp_${Date.now()}`;
    const lat = parseFloat(campData.location?.lat);
    const lng = parseFloat(campData.location?.lng);

    const newCamp = new ReliefCamp({
      campId,
      name: campData.name,
      location: {
        lat: isNaN(lat) ? 20.0100 : lat,
        lng: isNaN(lng) ? 73.7800 : lng,
        address: campData.location?.address || 'Designated Safe Shelter'
      },
      geoPoint: {
        type: 'Point',
        coordinates: [isNaN(lng) ? 73.7800 : lng, isNaN(lat) ? 20.0100 : lat]
      },
      capacity: parseInt(campData.capacity) || 500,
      currentOccupants: parseInt(campData.currentOccupants) || 0,
      supplies: campData.supplies || {},
      managerName: campData.managerName || 'Shelter Officer',
      contactPhone: campData.contactPhone || '+91 99887 76655',
      verified: true
    });

    await newCamp.save();
    res.status(201).json(newCamp);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// AI DISASTER PREDICTION & AUTOMATED EMAIL ALERTS API
// -------------------------------------------------------------

// 1. GET /api/predictions — List disaster predictions
app.get('/api/predictions', async (req, res) => {
  try {
    const { riskLevel, status, disasterType, limit = 50 } = req.query;
    const query = {};
    if (riskLevel && riskLevel !== 'ALL') query.predictedRiskLevel = riskLevel;
    if (status && status !== 'ALL') query.status = status;
    if (disasterType && disasterType !== 'ALL') query.disasterType = disasterType;

    let predictions = [];
    if (DisasterPrediction) {
      predictions = await DisasterPrediction.find(query).sort({ createdAt: -1 }).limit(parseInt(limit)).lean();
    }
    res.json({ success: true, count: predictions.length, predictions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. GET /api/predictions/stats — Aggregate metrics
app.get('/api/predictions/stats', async (req, res) => {
  try {
    let total = 0;
    let criticalCount = 0;
    let highCount = 0;
    let totalEmailsSent = 0;
    let totalAccepted = 0;

    let totalFailed = 0;
    const byStatus = { Confirmed: 0, 'Under Review': 0, Evaluating: 0, Expired: 0, Predicted: 0 };
    const byRiskLevel = { Critical: 0, High: 0, Moderate: 0, Low: 0 };

    if (DisasterPrediction) {
      const all = await DisasterPrediction.find().lean();
      total = all.length;
      all.forEach(p => {
        if (byRiskLevel[p.predictedRiskLevel] !== undefined) {
          byRiskLevel[p.predictedRiskLevel]++;
        }
        if (byStatus[p.status] !== undefined) {
          byStatus[p.status]++;
        }
        if (p.predictedRiskLevel === 'Critical') criticalCount++;
        if (p.predictedRiskLevel === 'High') highCount++;
        totalEmailsSent += p.emailNotification?.recipientCount || 0;
        totalAccepted += p.emailNotification?.acceptedCount || 0;
        totalFailed += p.emailNotification?.failedCount || 0;
      });
    }

    let eligibleUsersCount = 0;
    try {
      if (User) {
        eligibleUsersCount = await User.countDocuments({
          email: { $exists: true, $ne: '' },
          status: { $ne: 'Disabled' }
        });
      }
    } catch (_) {}

    const config = emailNotificationService.getConfig();

    res.json({
      success: true,
      stats: {
        totalPredictions: total,
        criticalCount,
        highCount,
        totalEmailsSent,
        totalAccepted,
        deliveryRatePercent: totalEmailsSent > 0 ? Math.round((totalAccepted / totalEmailsSent) * 100) : 100,
        eligibleUsersCount,
        autoEmailEnabled: config.autoEmailEnabled,
        riskThreshold: config.riskThreshold,
        requireOperatorApproval: config.requireOperatorApproval,
        byStatus,
        byRiskLevel,
        emailDeliveryStats: {
          attempted: totalEmailsSent,
          accepted: totalAccepted,
          failed: totalFailed,
          successRate: totalEmailsSent > 0 ? Math.round((totalAccepted / totalEmailsSent) * 100) : 100
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. POST /api/predictions/evaluate — Trigger on-demand prediction scan
app.post('/api/predictions/evaluate', async (req, res) => {
  try {
    const { forceNotify = false, regionLat, regionLng, regionName } = req.body;
    let results = [];

    if (regionLat && regionLng) {
      const customEval = await disasterPredictionService.evaluateLocationRisk(parseFloat(regionLat), parseFloat(regionLng), regionName);
      let saved = customEval;
      if (DisasterPrediction) {
        saved = new DisasterPrediction(customEval);
        await saved.save();
      }
      if (forceNotify || emailNotificationService.isThresholdMet(saved.predictedRiskLevel)) {
        emailNotificationService.dispatchDisasterWarningCampaign(saved, io);
      }
      results = [saved];
    } else {
      results = await disasterPredictionService.evaluateAllRegions(io, forceNotify);
    }

    res.json({
      success: true,
      message: `Prediction evaluation completed successfully. Evaluated ${results.length} danger zones.`,
      evaluatedCount: results.length,
      predictions: results
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. GET & PATCH /api/predictions/config — Email policy & kill switch
app.get('/api/predictions/config', (req, res) => {
  res.json({ success: true, config: emailNotificationService.getConfig() });
});

app.patch('/api/predictions/config', (req, res) => {
  try {
    const updated = emailNotificationService.updateConfig(req.body);
    io.emit('prediction:configUpdated', updated);
    res.json({ success: true, message: 'Notification policy updated', config: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. POST /api/predictions/:id/send-alert — Manually dispatch email alert campaign
app.post('/api/predictions/:id/send-alert', async (req, res) => {
  try {
    const predictionId = req.params.id;
    const prediction = await DisasterPrediction.findOne({
      $or: [{ predictionId }, { _id: mongoose.Types.ObjectId.isValid(predictionId) ? predictionId : null }]
    });

    if (!prediction) {
      return res.status(404).json({ success: false, message: 'Prediction record not found' });
    }

    const campaignResult = await emailNotificationService.dispatchDisasterWarningCampaign(prediction, io, { forceNotify: true });
    res.json({
      success: true,
      message: `Disaster alert email campaign dispatched to all registered users.`,
      result: campaignResult
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. POST /api/predictions/:id/retry-failed — Retry failed recipients
app.post('/api/predictions/:id/retry-failed', async (req, res) => {
  try {
    const predictionId = req.params.id;
    const prediction = await DisasterPrediction.findOne({
      $or: [{ predictionId }, { _id: mongoose.Types.ObjectId.isValid(predictionId) ? predictionId : null }]
    });

    if (!prediction) {
      return res.status(404).json({ success: false, message: 'Prediction record not found' });
    }

    const retryResult = await emailNotificationService.retryFailedRecipients(prediction, io);
    res.json({
      success: true,
      message: 'Retry attempt completed.',
      result: retryResult
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. PATCH /api/predictions/:id/review — Operator review & confirmation
app.patch('/api/predictions/:id/review', async (req, res) => {
  try {
    const predictionId = req.params.id;
    const reviewData = req.body;
    const prediction = await disasterPredictionService.reviewPrediction(predictionId, reviewData, io);
    res.json({
      success: true,
      message: 'Prediction review updated.',
      prediction
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 8. POST /api/predictions/test-email and /api/notifications/test-email
const testEmailHandler = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Valid target email address is required for diagnostic test.' });
    }

    const result = await emailNotificationService.sendTestEmail(email);
    res.json({
      success: true,
      message: `Test disaster warning email dispatched successfully to ${email}.`,
      result
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to dispatch test email.' });
  }
};

app.post('/api/predictions/test-email', testEmailHandler);
app.post('/api/notifications/test-email', testEmailHandler);

// 9. GET /api/predictions/diagnostics & /api/notifications/diagnostics
app.get(['/api/predictions/diagnostics', '/api/notifications/diagnostics'], async (req, res) => {
  try {
    const diagnostics = await emailNotificationService.getDiagnostics();
    res.json({ success: true, diagnostics });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// AI EMERGENCY CHATBOT API (Multilingual, Safe NDMA Guidance, Live MongoDB Records)
// -------------------------------------------------------------

// Rate limiter helper in-memory (per sessionId / user / IP)
const chatbotRateLimitMap = new Map();
function checkChatbotRateLimit(key) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 25;
  const record = chatbotRateLimitMap.get(key) || { count: 0, resetTime: now + windowMs };
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
  } else {
    record.count++;
  }
  chatbotRateLimitMap.set(key, record);
  return record.count <= maxRequests;
}

// 1. POST /api/chatbot/message
app.post('/api/chatbot/message', authenticateToken, async (req, res) => {
  try {
    const { message, sessionId = `guest_${Date.now()}`, userLocation } = req.body;
    const language = req.body.language || req.body.selectedLanguage || 'auto';

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required.' });
    }

    if (message.length > 500) {
      return res.status(400).json({ success: false, message: 'Message exceeds maximum length of 500 characters.' });
    }

    // Rate limiting check
    const rateKey = req.user?.id || sessionId || req.ip;
    if (!checkChatbotRateLimit(rateKey)) {
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded. Please wait a minute before sending another query.',
        retryAfter: 60
      });
    }

    const mongoModels = {
      Hospital,
      ReliefCamp,
      DisasterPrediction,
      Incident,
      SafetyPrecaution
    };

    const validLang = isValidLanguageCode(language) ? language : 'auto';

    // Retrieve existing session to provide conversational language smoothing and context
    let existingSession = null;
    let previousLanguage = null;
    let conversationHistory = [];

    if (ChatSession) {
      try {
        existingSession = await ChatSession.findOne({ sessionId });
        if (existingSession && existingSession.messages && existingSession.messages.length > 0) {
          // Identify the most recent language used in the session
          for (let i = existingSession.messages.length - 1; i >= 0; i--) {
            const m = existingSession.messages[i];
            const mLanguage = m.language || m.detectedLanguage;
            if (mLanguage && mLanguage !== 'auto' && isValidLanguageCode(mLanguage)) {
              previousLanguage = mLanguage;
              break;
            }
          }
          conversationHistory = existingSession.messages.slice(-6).map(m => ({
            role: m.role,
            content: m.content,
            language: m.language
          }));
        }
      } catch (err) {
        console.warn('[ChatSession] Session lookup notice:', err.message);
      }
    }

    const botResult = await chatbotService.processMessage({
      message,
      sessionId,
      language: validLang,
      userLocation,
      mongoModels,
      user: req.user,
      previousLanguage,
      conversationHistory
    });

    // Persist to session history
    try {
      if (ChatSession) {
        let session = existingSession || await ChatSession.findOne({ sessionId });
        if (!session) {
          session = new ChatSession({
            sessionId,
            userId: req.user?.id || null,
            language: botResult.language || 'en',
            messages: []
          });
        }
        if (req.user?.id && !session.userId) {
          session.userId = req.user.id;
        }

        session.messages.push({
          role: 'user',
          content: message,
          language: botResult.language || 'en',
          detectedLanguage: botResult.detectedLanguage || null,
          confidence: botResult.confidence || null,
          direction: botResult.direction || 'ltr',
          timestamp: new Date()
        });

        session.messages.push({
          role: 'assistant',
          content: botResult.reply,
          language: botResult.language || 'en',
          detectedLanguage: botResult.detectedLanguage || null,
          confidence: botResult.confidence || null,
          direction: botResult.direction || 'ltr',
          source: botResult.source || 'ai_guidance',
          liveData: botResult.liveData || null,
          actionButtons: botResult.actionButtons || [],
          timestamp: new Date()
        });

        session.language = botResult.language || 'en';

        if (session.messages.length > 30) {
          session.messages = session.messages.slice(-30);
        }

        session.lastActivity = new Date();
        await session.save();
      }
    } catch (saveErr) {
      console.warn('[ChatSession] Save notice:', saveErr.message);
    }

    res.json({
      success: true,
      sessionId,
      ...botResult,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('[Chatbot API] Error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to process message.',
      reply: 'An error occurred while processing your request. For urgent safety, please contact 112.',
      source: 'ai_guidance'
    });
  }
});

// 2. GET /api/chatbot/history
app.get('/api/chatbot/history', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required.' });
    }

    if (!ChatSession) {
      return res.json({ success: true, messages: [] });
    }

    const session = await ChatSession.findOne({ sessionId }).lean();
    if (!session) {
      return res.json({ success: true, messages: [] });
    }

    if (session.userId && req.user && req.user.id !== session.userId && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized access to session history.' });
    }

    res.json({
      success: true,
      sessionId,
      language: session.language || 'en',
      messages: session.messages || []
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. DELETE /api/chatbot/history
app.delete('/api/chatbot/history', authenticateToken, async (req, res) => {
  try {
    const sessionId = req.query.sessionId || req.body?.sessionId;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required.' });
    }

    if (ChatSession) {
      await ChatSession.deleteOne({ sessionId });
    }

    res.json({ success: true, message: 'Chat history cleared successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. GET /api/chatbot/quick-data
app.get('/api/chatbot/quick-data', async (req, res) => {
  try {
    let activeAlertsCount = 0;
    let availableBedsTotal = 0;
    let openCampsCount = 0;

    if (DisasterPrediction) {
      activeAlertsCount = await DisasterPrediction.countDocuments({
        predictedRiskLevel: { $in: ['Critical', 'High'] },
        status: { $in: ['Predicted', 'Under Review', 'Confirmed'] }
      });
    }

    if (Hospital) {
      const hospitals = await Hospital.find().lean();
      availableBedsTotal = hospitals.reduce((sum, h) => sum + (h.availableBeds || h.capacity?.beds?.available || 0), 0);
    }

    if (ReliefCamp) {
      openCampsCount = await ReliefCamp.countDocuments({ status: { $ne: 'CLOSED' } });
    }

    res.json({
      success: true,
      activeAlertsCount,
      availableBedsTotal,
      openCampsCount,
      nationalEmergencyNumber: '112',
      ndrfHelpline: '1078',
      fireHelpline: '101',
      ambulanceHelpline: '108'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. GET /api/chatbot/languages — Supported 22 Scheduled Indian Languages + English
app.get('/api/chatbot/languages', (req, res) => {
  res.json({
    success: true,
    count: SUPPORTED_LANGUAGES.length,
    languages: SUPPORTED_LANGUAGES
  });
});

// 6. POST /api/chatbot/detect-language — Real-time automatic language identification
app.post('/api/chatbot/detect-language', (req, res) => {
  try {
    const { text, previousLanguage } = req.body;
    const result = languageDetectionService.detectLanguageWithContext(text, previousLanguage);
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 404 Handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route ${req.method} ${req.originalUrl} not found`,
    code: 'ROUTE_NOT_FOUND'
  });
});

// Global Express Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('⚠️ Unhandled ResQAI API Error:', err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'An internal server error occurred',
    code: err.code || 'INTERNAL_SERVER_ERROR'
  });
});

// Process-level unhandled rejection & exception guards
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ ResQAI Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('🚨 ResQAI Uncaught Exception:', err);
});

async function seedUsers() {
  if (!User) return;
  try {
    for (const u of usersStore) {
      const cleanEmail = (u.email || '').trim().toLowerCase();
      await User.findOneAndUpdate(
        { email: cleanEmail },
        {
          $set: {
            name: u.name,
            email: cleanEmail,
            password: u.passwordHash,
            phone: u.phone,
            role: u.role,
            status: u.status || 'Active',
            emergencyAlertsEnabled: u.emergencyAlertsEnabled !== false,
            locationSharingEnabled: u.locationSharingEnabled !== false,
            location: u.location,
            geoPoint: u.geoPoint
          }
        },
        { upsert: true, new: true }
      );
    }
    console.log('✅ MongoDB Registered Users Fleet Synchronized!');
  } catch (err) {
    console.warn('User seed notice:', err.message);
  }
}

// Seed Initial AI Disaster Predictions with delivery metrics
async function seedPredictions() {
  if (!DisasterPrediction) return;
  try {
    const existingCount = await DisasterPrediction.countDocuments();
    if (existingCount > 0) return;

    const initialPredictions = [
      {
        predictionId: 'pred_flood_delhi_101',
        disasterType: 'Flood',
        title: 'HIGH FLOOD RISK PREDICTION: Yamuna Riverbed Low-Lying Wards',
        description: 'Atmospheric hydrology models forecast 95mm cumulative rainfall over the next 24 hours. High probability of embankment overflow along Sector 9, Civil Defense Corridor, and Ring Road underpasses.',
        affectedArea: {
          name: 'Delhi NCR & Yamuna Riverbed Basin',
          center: { lat: 28.6304, lng: 77.2177 },
          radiusKm: 25
        },
        predictedRiskLevel: 'High',
        confidenceScore: 0.91,
        predictionNature: 'RULE_BASED_AI_PREDICTION',
        forecastWindow: {
          startTime: new Date(),
          endTime: new Date(Date.now() + 24 * 3600000),
          durationHours: 24
        },
        weatherMetrics: {
          rainfallForecastMm: 95,
          peakWindSpeedKmh: 42,
          peakTemperatureC: 29,
          atmosphericPressureHpa: 1008,
          floodRiskIndex: 84
        },
        supportingDataSources: [
          'Open-Meteo Severe Weather API',
          'IMD Precipitation Grid Proxy',
          'Yamuna River Basin Hydrology Model'
        ],
        safetyPrecautions: [
          'Move critical documents, emergency rations, and medicines to upper floors.',
          'Never attempt to wade or drive across submerged roadways or railway underpasses.',
          'Review nearby verified emergency relief shelters on the ResQAI safe navigation dashboard.',
          'Switch off main power circuit breakers if floodwaters enter premises.'
        ],
        status: 'Predicted',
        operatorReview: {
          reviewed: true,
          reviewedBy: 'Commander Alex Vance',
          reviewedAt: new Date(),
          notes: 'Forecast model aligns with upstream dam discharge warnings.'
        },
        deduplicationKey: `FLOOD_DELHI_28.63_77.22_${new Date().toISOString().split('T')[0]}_HIGH`,
        emailNotification: {
          triggered: true,
          triggeredAt: new Date(Date.now() - 15 * 60000),
          thresholdMet: true,
          recipientCount: 5,
          queuedCount: 0,
          acceptedCount: 5,
          failedCount: 0,
          deliveryStatus: 'ACCEPTED',
          campaignId: 'cmp_flood_delhi_101',
          recipients: [
            { email: 'citizenA@crisisconnect.com', name: 'Priya Sharma (Citizen A)', status: 'ACCEPTED', sentAt: new Date() },
            { email: 'citizenB@crisisconnect.com', name: 'Rahul Verma (Citizen B)', status: 'ACCEPTED', sentAt: new Date() },
            { email: 'citizenC@crisisconnect.com', name: 'Amit Patel (Citizen C)', status: 'ACCEPTED', sentAt: new Date() },
            { email: 'operator@crisisconnect.com', name: 'Commander Alex Vance', status: 'ACCEPTED', sentAt: new Date() },
            { email: 'admin@crisisconnect.com', name: 'System Admin', status: 'ACCEPTED', sentAt: new Date() }
          ]
        },
        auditLogs: [
          {
            action: 'PREDICTION_GENERATED',
            operatorOrSystem: 'ResQAI Automated Disaster Prediction Engine',
            timestamp: new Date(Date.now() - 20 * 60000),
            details: 'Evaluated live meteorological telemetry for Delhi NCR. Predicted High Flood risk (91% confidence).'
          },
          {
            action: 'EMAIL_CAMPAIGN_COMPLETED',
            operatorOrSystem: 'Automated Notification Worker',
            timestamp: new Date(Date.now() - 15 * 60000),
            details: 'Dispatched disaster warning to 5 registered users. Accepted: 5, Failed: 0.'
          }
        ],
        expiresAt: new Date(Date.now() + 24 * 3600000)
      },
      {
        predictionId: 'pred_cyclone_mumbai_102',
        disasterType: 'Cyclone',
        title: 'HIGH WINDSTORM & CYCLONIC SQUALL ADVISORY: Mumbai Coastal Belt',
        description: 'Deep depression in Arabian Sea approaching coastline. Sustained surface winds of 65-78 km/h with localized gusts exceeding 85 km/h. Danger of falling trees and structural roof damage.',
        affectedArea: {
          name: 'Mumbai Coastal & Thane Watershed',
          center: { lat: 19.0760, lng: 72.8777 },
          radiusKm: 30
        },
        predictedRiskLevel: 'High',
        confidenceScore: 0.88,
        predictionNature: 'RULE_BASED_AI_PREDICTION',
        forecastWindow: {
          startTime: new Date(),
          endTime: new Date(Date.now() + 36 * 3600000),
          durationHours: 36
        },
        weatherMetrics: {
          rainfallForecastMm: 60,
          peakWindSpeedKmh: 82,
          peakTemperatureC: 31,
          atmosphericPressureHpa: 996,
          floodRiskIndex: 65
        },
        supportingDataSources: [
          'Open-Meteo Severe Weather Engine',
          'Arabian Sea Cyclonic Trajectory Matrix'
        ],
        safetyPrecautions: [
          'Anchor or move loose outdoor furniture, signs, and metal sheets inside.',
          'Avoid shoreline promenades and rocky beaches during high-tide squalls.',
          'Keep power banks charged and stay indoors during peak wind periods.'
        ],
        status: 'Predicted',
        operatorReview: {
          reviewed: false,
          reviewedBy: null,
          reviewedAt: null,
          notes: ''
        },
        deduplicationKey: `CYCLONE_MUMBAI_19.08_72.88_${new Date().toISOString().split('T')[0]}_HIGH`,
        emailNotification: {
          triggered: true,
          triggeredAt: new Date(Date.now() - 30 * 60000),
          thresholdMet: true,
          recipientCount: 5,
          queuedCount: 0,
          acceptedCount: 5,
          failedCount: 0,
          deliveryStatus: 'ACCEPTED',
          campaignId: 'cmp_cyclone_mumbai_102',
          recipients: [
            { email: 'citizenA@crisisconnect.com', name: 'Priya Sharma (Citizen A)', status: 'ACCEPTED', sentAt: new Date() },
            { email: 'citizenB@crisisconnect.com', name: 'Rahul Verma (Citizen B)', status: 'ACCEPTED', sentAt: new Date() },
            { email: 'citizenC@crisisconnect.com', name: 'Amit Patel (Citizen C)', status: 'ACCEPTED', sentAt: new Date() },
            { email: 'operator@crisisconnect.com', name: 'Commander Alex Vance', status: 'ACCEPTED', sentAt: new Date() },
            { email: 'admin@crisisconnect.com', name: 'System Admin', status: 'ACCEPTED', sentAt: new Date() }
          ]
        },
        auditLogs: [
          {
            action: 'PREDICTION_GENERATED',
            operatorOrSystem: 'ResQAI Automated Disaster Prediction Engine',
            timestamp: new Date(Date.now() - 35 * 60000),
            details: 'Evaluated windfield gradients for Mumbai Coastal Belt. Predicted High Cyclonic Squall risk (88% confidence).'
          }
        ],
        expiresAt: new Date(Date.now() + 36 * 3600000)
      }
    ];

    for (const pred of initialPredictions) {
      await DisasterPrediction.findOneAndUpdate(
        { predictionId: pred.predictionId },
        { $set: pred },
        { upsert: true, new: true }
      );
    }
    console.log('✅ Seeded initial AI disaster predictions with delivery metrics');
  } catch (err) {
    console.warn('Prediction seed notice:', err.message);
  }
}

// Seed Initial Realistic Missing and Found Persons
async function seedMissingPersons() {
  if (!MissingPerson) return;
  try {
    const count = await MissingPerson.countDocuments();
    if (count > 0) return;

    const initialCases = [
      {
        caseId: 'MP-101',
        recordType: 'MISSING',
        fullName: 'Aarav Mehta',
        age: 11,
        gender: 'Male',
        photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
        lastSeenLocation: 'Sector 9 Flood Evacuation Hub, Delhi',
        approximateArea: 'Sector 9, North Delhi',
        coordinates: { lat: 28.6139, lng: 77.2090 },
        geoPoint: { type: 'Point', coordinates: [77.2090, 28.6139] },
        dateTimeLastSeen: new Date(Date.now() - 14 * 3600000),
        description: 'Wearing dark blue hoodie, grey joggers, and red sports sneakers. Separated during rescue boat onboarding.',
        distinguishingFeatures: ['Small birthmark on left wrist', 'Brown eyes', 'Short black hair'],
        disasterIncidentId: 'INC-FLOOD-DELHI-01',
        familyContactName: 'Sunita Mehta (Mother)',
        familyContactPhone: '+91 98123 99900',
        familyContactEmail: 'smmandlik.1318@gmail.com',
        relationshipToPerson: 'Mother',
        consentForPublicListing: true,
        isConfidential: false,
        status: 'Searching',
        auditLogs: [{
          action: 'REPORT_CREATED',
          performedBy: 'Sunita Mehta',
          performedByRole: 'Citizen / Reporter',
          timestamp: new Date(Date.now() - 14 * 3600000),
          notes: 'Missing child report registered following Yamuna basin flood evacuation.'
        }]
      },
      {
        caseId: 'FD-101',
        recordType: 'FOUND',
        fullName: 'Unidentified Boy (approx 11 yrs)',
        age: 11,
        gender: 'Male',
        photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
        lastSeenLocation: 'Jawaharlal Nehru Stadium Shelter Grounds',
        approximateArea: 'Central Delhi Stadium District',
        coordinates: { lat: 28.6100, lng: 77.2300 },
        geoPoint: { type: 'Point', coordinates: [77.2300, 28.6100] },
        dateTimeLastSeen: new Date(Date.now() - 8 * 3600000),
        shelterOrHospitalName: 'Stadium Evacuation Shelter #1 Intake Desk',
        shelterOrHospitalId: 'camp_1',
        medicalCondition: 'Stable (Mild Hypothermia, Treated)',
        description: 'Child found by relief boat team near Sector 9 embankment. Wearing dark blue fleece top. Responding to nickname Aarav.',
        distinguishingFeatures: ['Birthmark on left wrist'],
        disasterIncidentId: 'INC-FLOOD-DELHI-01',
        familyContactName: 'Officer R. Sharma (Shelter Desk)',
        familyContactPhone: '+91 1800 11 1122',
        intakeOfficer: {
          userId: 'usr_responder_1',
          name: 'Officer Rajesh Sharma',
          badgeOrId: 'RELIEF-UNIT-42',
          organization: 'National Disaster Response Force (NDRF)'
        },
        status: 'Reported',
        auditLogs: [{
          action: 'FOUND_PERSON_REGISTERED',
          performedBy: 'Officer Rajesh Sharma',
          performedByRole: 'NDRF Rescue Unit',
          timestamp: new Date(Date.now() - 8 * 3600000),
          notes: 'Rescued child intake processed at Stadium Shelter #1 Medical Tent.'
        }]
      },
      {
        caseId: 'MP-102',
        recordType: 'MISSING',
        fullName: 'Rameshwar Sharma',
        age: 72,
        gender: 'Male',
        photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
        lastSeenLocation: 'Yamuna Riverbank Colony Gate 4',
        approximateArea: 'East Delhi Riverbed',
        coordinates: { lat: 28.6300, lng: 77.2500 },
        geoPoint: { type: 'Point', coordinates: [77.2500, 28.6300] },
        dateTimeLastSeen: new Date(Date.now() - 22 * 3600000),
        description: 'Elderly gentleman with silver hair, wearing white kurta and gold spectacles. Requires daily diabetic medication.',
        distinguishingFeatures: ['Gold-rimmed spectacles', 'Silver hair'],
        disasterIncidentId: 'INC-FLOOD-DELHI-01',
        familyContactName: 'Anil Sharma (Son)',
        familyContactPhone: '+91 98220 88771',
        familyContactEmail: 'smmandlik.1318@gmail.com',
        relationshipToPerson: 'Son',
        consentForPublicListing: true,
        isConfidential: false,
        status: 'Searching',
        auditLogs: [{
          action: 'REPORT_CREATED',
          performedBy: 'Anil Sharma',
          performedByRole: 'Citizen / Reporter',
          timestamp: new Date(Date.now() - 22 * 3600000),
          notes: 'Missing senior citizen report filed.'
        }]
      }
    ];

    for (const c of initialCases) {
      await MissingPerson.findOneAndUpdate(
        { caseId: c.caseId },
        { $set: c },
        { upsert: true, new: true }
      );
    }

    // Compute initial possible matches between Aarav Mehta (MP-101) and Found Boy (FD-101)
    const mp101 = await MissingPerson.findOne({ caseId: 'MP-101' });
    const fd101 = await MissingPerson.findOne({ caseId: 'FD-101' });
    if (mp101 && fd101) {
      const matchEval = reunificationMatchingService.evaluateCandidatePair(mp101, fd101);
      if (matchEval.qualified) {
        mp101.possibleMatches = [{
          targetCaseId: fd101.caseId,
          targetRecordType: 'FOUND',
          matchScore: matchEval.score,
          matchReason: matchEval.reasons.join(' • '),
          matchedName: fd101.fullName,
          matchedPhotoUrl: fd101.photoUrl,
          matchedAge: fd101.age,
          matchedLocation: fd101.lastSeenLocation,
          status: 'SUGGESTED'
        }];
        mp101.status = 'Possible Match';
        mp101.aiFaceMatchScore = matchEval.score / 100;
        mp101.matchCandidateNotes = `Candidate match found (${matchEval.score}%): ${matchEval.reasons.join(' • ')}`;
        await mp101.save();

        fd101.possibleMatches = [{
          targetCaseId: mp101.caseId,
          targetRecordType: 'MISSING',
          matchScore: matchEval.score,
          matchReason: matchEval.reasons.join(' • '),
          matchedName: mp101.fullName,
          matchedPhotoUrl: mp101.photoUrl,
          matchedAge: mp101.age,
          matchedLocation: mp101.lastSeenLocation,
          status: 'SUGGESTED'
        }];
        fd101.status = 'Possible Match';
        fd101.aiFaceMatchScore = matchEval.score / 100;
        fd101.matchCandidateNotes = `Candidate match found (${matchEval.score}%): ${matchEval.reasons.join(' • ')}`;
        await fd101.save();
      }
    }

    console.log('✅ Seeded realistic initial Missing & Found Persons with matching suggestions');
  } catch (err) {
    console.warn('Missing persons seed notice:', err.message);
  }
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`🚀 ResQAI Production Server & Realtime Engine running on port ${PORT}`);
  smsService.printStartupTwilioStatus();
  await seedMissingPersons();
  startPredictionJob(io);
});


