const mongoose = require('mongoose');

const patientTransportSchema = new mongoose.Schema({
  transportId: { type: String, required: true, unique: true },
  incidentId: { type: String, required: true },
  patientId: { type: String, default: 'pat_1' },
  patientName: { type: String, default: 'John Doe (Victim #102)' },
  ambulanceId: { type: String, default: 'AMB-04' },
  ambulanceName: { type: String, default: 'Ambulance Express 04' },

  pickupLatitude: { type: Number, required: true },
  pickupLongitude: { type: Number, required: true },
  pickupAddress: { type: String, default: 'Incident Pickup Location' },

  destinationHospitalId: { type: String, default: null },
  destinationHospitalName: { type: String, default: null },
  destinationHospitalLocation: {
    lat: { type: Number },
    lng: { type: Number }
  },

  status: {
    type: String,
    enum: [
      'WAITING_FOR_AMBULANCE',
      'AMBULANCE_ASSIGNED',
      'AMBULANCE_AT_SCENE',
      'PATIENT_PICKED_UP',
      'SEARCHING_HOSPITAL',
      'HOSPITAL_SELECTED',
      'HOSPITAL_ACCEPTED',
      'EN_ROUTE_TO_HOSPITAL',
      'ARRIVED_AT_HOSPITAL',
      'PATIENT_ADMITTED',
      'COMPLETED'
    ],
    default: 'AMBULANCE_ASSIGNED'
  },

  patientStatus: {
    type: String,
    enum: ['PATIENT_WAITING', 'PATIENT_PICKED_UP', 'PATIENT_IN_TRANSIT', 'PATIENT_AT_HOSPITAL', 'PATIENT_ADMITTED'],
    default: 'PATIENT_WAITING'
  },

  hospitalStatus: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
    default: 'PENDING'
  },

  startedAt: Date,
  pickedUpAt: Date,
  hospitalSelectedAt: Date,
  hospitalAcceptedAt: Date,
  arrivedAt: Date,
  admittedAt: Date,

  eta: { type: String, default: '12 mins' },
  distanceRemaining: { type: String, default: '4.2 km' },
  speed: { type: Number, default: 45 },
  heading: { type: Number, default: 90 },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PatientTransport', patientTransportSchema);
