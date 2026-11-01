require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const connectDB = require('./config/db');

const seedUsers = async () => {
  try {
    await connectDB();

    const passwordHash = bcrypt.hashSync('Citizen@123', 8);
    const operatorPasswordHash = bcrypt.hashSync('Operator@123', 8);
    const adminPasswordHash = bcrypt.hashSync('Admin@123', 8);

    const demoUsers = [
      {
        id: 'usr_admin',
        name: 'System Admin',
        email: 'admin@crisisconnect.com',
        passwordHash: adminPasswordHash,
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
      },
      {
        id: 'usr_operator',
        name: 'Commander Alex Vance',
        email: 'operator@crisisconnect.com',
        passwordHash: operatorPasswordHash,
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
        id: 'usr_cit_a',
        name: 'Priya Sharma (Citizen A - 50m)',
        email: 'citizenA@crisisconnect.com',
        passwordHash: passwordHash,
        phone: '+1 (555) 111-2222',
        role: 'Citizen',
        approved: true,
        skills: [],
        rewardPoints: 140,
        status: 'Active',
        locationSharingEnabled: true,
        emergencyAlertsEnabled: true,
        location: { lat: 28.6284, lng: 77.2051, address: '50m Inside Danger Zone' }, // ~50m from inc_102 (28.6280, 77.2050)
        geoPoint: { type: 'Point', coordinates: [77.2051, 28.6284] },
        locationAccuracy: 5,
        locationUpdatedAt: new Date().toISOString()
      },
      {
        id: 'usr_cit_b',
        name: 'Rahul Verma (Citizen B - 80m)',
        email: 'citizenB@crisisconnect.com',
        passwordHash: passwordHash,
        phone: '+1 (555) 333-4444',
        role: 'Citizen',
        approved: true,
        skills: [],
        rewardPoints: 180,
        status: 'Active',
        locationSharingEnabled: true,
        emergencyAlertsEnabled: true,
        location: { lat: 28.6287, lng: 77.2054, address: '80m Inside Danger Zone' }, // ~80m from inc_102
        geoPoint: { type: 'Point', coordinates: [77.2054, 28.6287] },
        locationAccuracy: 6,
        locationUpdatedAt: new Date().toISOString()
      },
      {
        id: 'usr_cit_c',
        name: 'Amit Patel (Citizen C - 150m)',
        email: 'citizenC@crisisconnect.com',
        passwordHash: passwordHash,
        phone: '+1 (555) 555-6666',
        role: 'Citizen',
        approved: true,
        skills: [],
        rewardPoints: 210,
        status: 'Active',
        locationSharingEnabled: true,
        emergencyAlertsEnabled: true,
        location: { lat: 28.6293, lng: 77.2062, address: '150m Outside Danger Zone' }, // ~150m from inc_102
        geoPoint: { type: 'Point', coordinates: [77.2062, 28.6293] },
        locationAccuracy: 10,
        locationUpdatedAt: new Date().toISOString()
      }
    ];

    for (const u of demoUsers) {
      await User.findOneAndUpdate(
        { email: u.email },
        { $set: u },
        { upsert: true, new: true }
      );
    }

    console.log('✅ CrisisConnect Seed Completed Successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
};

seedUsers();
