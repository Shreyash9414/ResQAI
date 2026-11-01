export type UserRole =
  | 'Citizen'
  | 'CITIZEN'
  | 'citizen'
  | 'Emergency Operator'
  | 'EMERGENCY_OPERATOR'
  | 'operator'
  | 'OPERATOR'
  | 'Admin'
  | 'ADMIN'
  | 'admin'
  | 'Hospital'
  | 'HOSPITAL'
  | 'hospital'
  | 'hospital_staff'
  | 'Police'
  | 'Fire Brigade'
  | 'Ambulance Team'
  | 'Volunteer'
  | 'NGO'
  | 'District Collector'
  | 'State Admin'
  | 'Super Admin';



export type DisasterType =
  | 'Fire'
  | 'Flood'
  | 'Earthquake'
  | 'Cyclone'
  | 'Landslide'
  | 'Accident'
  | 'Medical Emergency'
  | 'Building Collapse';

export type SeverityLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export type IncidentStatus =
  | 'Pending'
  | 'Verified'
  | 'Assigned'
  | 'Accepted'
  | 'In Progress'
  | 'Resolved'
  | 'Rejected'
  | 'PENDING'
  | 'VERIFIED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'MISSION_ACCEPTED'
  | 'SEARCHING_FOR_RESCUE'
  | 'PATIENT_PICKED_UP'
  | 'HOSPITAL_SELECTED'
  | 'HOSPITAL_ACCEPTED'
  | 'EN_ROUTE_TO_HOSPITAL'
  | 'ARRIVED_AT_HOSPITAL'
  | 'PATIENT_ADMITTED'
  | 'RESOLVED'
  | 'Cancelled'
  | 'CANCELLED'
  | 'SOS Submitted'
  | 'Awaiting Review'
  | 'Awaiting Assignment'
  | 'Responder Assigned'
  | 'Responder En Route'
  | 'Assistance Arrived'
  | 'INCIDENT_RESOLVED';


export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  approved: boolean;
  skills: string[];
  rewardPoints: number;
  status: 'Active' | 'Busy' | 'Offline' | 'On Mission';
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  locationAccuracy?: number;
  locationUpdatedAt?: string;
  locationSharingEnabled?: boolean;
  emergencyAlertsEnabled?: boolean;
  smsAlertsEnabled?: boolean;
  browserAlertsEnabled?: boolean;
}

export interface AuditLog {
  id: string;
  incidentId?: string;
  userId?: string;
  userName: string;
  userRole: UserRole | string;
  action: string;
  target?: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export interface EmergencyNotification {
  id: string;
  userId: string;
  userName?: string;
  incidentId: string;
  phoneNumber?: string;
  channel: 'SMS' | 'PUSH' | 'IN_APP' | string;
  type?: string;
  message: string;
  status: 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | string;
  sentAt: string;
  deliveredAt?: string;
  providerMessageId?: string;
}


export interface EmergencyAlertPayload {
  alertId: string;
  incidentId: string;
  incidentType: DisasterType | string;
  title: string;
  severity: SeverityLevel | string;
  distanceMeters: number;
  radiusMeters: number;
  locationAddress?: string;
  timestamp: string;
}

export interface GeofenceStats {
  incidentId: string;
  radius?: number;
  dangerRadius?: number;
  radiusMeters?: number;
  geofenceActive?: boolean;
  warningStatus?: string;
  nearbyUsers?: number;
  nearbyUsersCount?: number;
  alertsSent?: number;
  alertsSentCount?: number;
  acknowledged?: number;
  acknowledgedCount?: number;
  activeWarnings?: number;
  activeWarningsCount?: number;
  timestamp?: string;
}



export interface Incident {
  id: string;
  incidentId?: string;
  citizenId?: string;
  title: string;
  disasterType: DisasterType;
  type?: string;
  severity: SeverityLevel;
  priority: number;
  status: IncidentStatus;
  reporterName: string;
  reporterPhone: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  description: string;
  media: string[];
  audioUrl?: string;
  aiPrediction?: {
    disasterType: string;
    severity: string;
    confidenceScore: number;
    estimatedVictims: number;
    recommendedResources: string[];
    summary: string;
  };
  fakeDetection?: {
    isFakeOrSpam: boolean;
    spamConfidence: number;
    duplicateMatchId?: string | null;
    flagReason: string;
  };
  assignedResponders: {
    id: string;
    name: string;
    type: string;
    assignedAt: string;
  }[];
  assignedTeam?: {
    id?: string;
    name?: string;
    type?: string;
    phone?: string;
    currentLocation?: { lat: number; lng: number };
  };
  assignedUnits?: {
    unitId: string;
    unitName: string;
    type: 'AMBULANCE' | 'FIRE_BRIGADE' | 'POLICE' | string;
    vehicleNumber?: string;
    driverName?: string;
    status: string;
    assignedAt: string;
    distanceKm: number;
    etaMinutes: number;
    location: { lat: number; lng: number };
  }[];
  selectedHospital?: {
    id: string;
    name: string;
    address?: string;
    distanceKm?: number;
    availableBeds?: number;
    icuAvailable?: number;
    location?: { lat: number; lng: number };
  };
  timeline?: {
    step: string;
    label: string;
    timestamp: string;
  }[];
  verifiedAt?: string;

  verifiedBy?: string;
  assignedAt?: string;
  missionAcceptedAt?: string;
  acceptedBy?: string;
  assignedVehicleType?: string;
  lastSearchTime?: string | number;
  startedAt?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  rejectedAt?: string;
  createdAt: string;
}


export interface ResourceUnit {
  id: string;
  name: string;
  type: 'Ambulance' | 'Fire Truck' | 'Police Cruiser' | 'Rescue Boat' | 'Drone Unit' | 'Medical Kit' | 'Generator' | 'Water Tanker';
  status: 'Available' | 'Dispatched' | 'Maintenance' | 'En Route';
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  etaMinutes: number;
  capacity: number;
  contactNumber: string;
}

export interface PatientTransport {
  id: string;
  transportId: string;
  incidentId: string;
  patientId: string;
  patientName: string;
  ambulanceId: string;
  ambulanceName: string;
  pickupLatitude: number;
  pickupLongitude: number;
  pickupAddress?: string;
  destinationHospitalId?: string | null;
  destinationHospitalName?: string | null;
  destinationHospitalLocation?: { lat: number; lng: number } | null;
  status:
    | 'WAITING_FOR_AMBULANCE'
    | 'AMBULANCE_ASSIGNED'
    | 'AMBULANCE_AT_SCENE'
    | 'PATIENT_PICKED_UP'
    | 'SEARCHING_HOSPITAL'
    | 'HOSPITAL_SELECTED'
    | 'HOSPITAL_ACCEPTED'
    | 'EN_ROUTE_TO_HOSPITAL'
    | 'ARRIVED_AT_HOSPITAL'
    | 'PATIENT_ADMITTED'
    | 'COMPLETED';
  patientStatus?: 'PATIENT_WAITING' | 'PATIENT_PICKED_UP' | 'PATIENT_IN_TRANSIT' | 'PATIENT_AT_HOSPITAL' | 'PATIENT_ADMITTED';
  hospitalStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  startedAt?: string;
  pickedUpAt?: string;
  hospitalSelectedAt?: string;
  hospitalAcceptedAt?: string;
  arrivedAt?: string;
  admittedAt?: string;
  eta?: string;
  distanceRemaining?: string;
  speed?: number;
  heading?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Hospital {
  id: string;
  hospitalId?: string;
  name: string;
  address: string;
  city?: string;
  imageUrl?: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  contactPhone?: string;
  phone?: string;
  emergencyContact?: string;
  availableBeds: number;
  totalBeds: number;
  icuBeds: any;
  availableICUBeds?: number;
  totalICUBeds?: number;
  icuBedsTotal?: number;
  generalBeds?: any;
  icuBedsObj?: {
    total: number;
    available: number;
  };
  availableEmergencyBeds?: number;
  emergencyBeds?: number;
  availableOxygenBeds?: number;
  oxygenBeds?: number;
  emergencyDepartmentStatus?: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';
  ambulanceReceivingStatus?: 'ACCEPTING' | 'NOT_ACCEPTING' | 'UNKNOWN';
  emergencyServices?: string[];
  availabilitySource?: 'OFFICIAL_API' | 'MANUAL_REPORTED';
  lastAvailabilityUpdate?: string;
  availabilityStatus?: 'CURRENT' | 'STALE' | 'UNKNOWN';
  assignedStaffIds?: string[];
  updatedBy?: string;
  distanceKm?: string | number;
  distMeters?: number;
  etaMinutes?: number;
  etaMins?: number;
  locationValid?: boolean;
  emergencyDepartmentAvailable?: 'AVAILABLE' | 'LIMITED' | 'FULL';
  bedStatus?: 'AVAILABLE' | 'LIMITED' | 'FULL' | 'UNKNOWN';
  updatedAt?: string;
  lastUpdated?: string;
  ventilators?: number;
  doctorsOnDuty?: number;
  bloodBank?: Record<string, number>;
  incomingPatients?: {
    patientName: string;
    condition: string;
    etaMinutes: number;
    ambulanceId: string;
    transportId?: string;
  }[];
}


export interface ReliefCamp {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  capacity: number;
  currentOccupants: number;
  demographics: {
    children: number;
    women: number;
    seniorCitizens: number;
    men: number;
  };
  supplies: {
    foodPacks: number;
    waterLiters: number;
    medicineKits: number;
    blankets: number;
  };
  managerName: string;
  contactPhone: string;
}

export type MissingPersonStatus = 
  | 'Reported' 
  | 'Searching' 
  | 'Possible Match' 
  | 'Under Verification' 
  | 'Verified' 
  | 'Reunited'
  | 'Closed'
  | 'Missing'
  | 'Found'
  | 'Hospitalized';

export interface PossibleMatchCandidate {
  targetCaseId: string;
  targetRecordType: 'MISSING' | 'FOUND';
  matchScore: number;
  matchReason: string;
  matchedName?: string;
  matchedPhotoUrl?: string;
  matchedAge?: number;
  matchedLocation?: string;
  status: 'SUGGESTED' | 'UNDER_INVESTIGATION' | 'CONFIRMED_MATCH' | 'REJECTED';
  investigatedBy?: string;
  investigatedAt?: string;
  verificationNotes?: string;
  candidateDetails?: Partial<MissingPerson>;
}

export interface CaseAuditLog {
  action: string;
  performedBy: string;
  performedByRole: string;
  timestamp: string;
  notes?: string;
  previousStatus?: string;
  newStatus?: string;
}

export interface MissingPerson {
  id: string;
  caseId?: string;
  recordType?: 'MISSING' | 'FOUND';
  fullName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other' | 'Unknown';
  photoUrl: string;
  lastSeenLocation: string;
  approximateArea?: string;
  dateTimeLastSeen?: string;
  description: string;
  distinguishingFeatures?: string[];
  medicalCondition?: string;
  disasterIncidentId?: string;
  shelterOrHospitalId?: string;
  shelterOrHospitalName?: string;
  
  // Reporter details
  familyContactName: string;
  familyContactPhone: string;
  familyContactEmail?: string;
  relationshipToPerson?: string;
  consentForPublicListing?: boolean;
  isConfidential?: boolean;
  intakeOfficer?: {
    userId?: string;
    name?: string;
    badgeOrId?: string;
    organization?: string;
  };
  
  // Case lifecycle
  status: MissingPersonStatus;
  aiFaceMatchScore?: number;
  matchCandidateNotes?: string;
  possibleMatches?: PossibleMatchCandidate[];
  verifiedMatchedCaseId?: string;
  reunitedWith?: {
    name?: string;
    contact?: string;
    relationship?: string;
    verifiedBy?: string;
    verifiedAt?: string;
    notes?: string;
  };
  auditLogs?: CaseAuditLog[];
  
  createdAt: string;
  updatedAt?: string;
}

export interface ReunificationStats {
  totalCases: number;
  totalMissing: number;
  totalFound: number;
  searchingCount: number;
  possibleMatchCount: number;
  underVerificationCount: number;
  verifiedCount: number;
  reunitedCount: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientRole: string;
  channelId: string;
  text: string;
  attachmentUrl?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';
  createdAt: string;
}

export type ResourceCategoryType =
  | 'Emergency Vehicles'
  | 'Medical Supplies'
  | 'Essential Supplies'
  | 'Rescue Equipment'
  | 'Human Resources'
  | 'Custom'
  | string;

export interface ResourceItem {
  id?: string;
  _id?: string;
  resourceId: string;
  name: string;
  category: ResourceCategoryType;
  customCategoryName?: string;
  description?: string;
  totalQuantity: number;
  availableQuantity: number;
  unit: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
    storageDepot?: string;
  };
  status: 'Available' | 'Deployed' | 'Maintenance' | 'Low Stock' | 'Out of Stock' | 'Unavailable' | 'Deactivated' | string;
  department?: string;
  minStockThreshold?: number;
  expiryDate?: string | null;
  notes?: string;
  assignedIncidentId?: string | null;
  assignedDisasterTitle?: string | null;
  assignedTeamId?: string | null;
  assignedTeamName?: string | null;
  isVehicleOrEquipment?: boolean;
  distanceKm?: number | string | null;
  locationValid?: boolean;
  directionsUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ResourceSummaryMetrics {
  totalRegistered: number;
  totalAvailable: number;
  totalDeployed: number;
  totalMaintenance: number;
  lowStockCount: number;
  pendingRequestsCount: number;
}

export interface ResourceRequestItem {
  id?: string;
  _id?: string;
  requestId: string;
  requestingTeamId: string;
  requestingTeamName: string;
  requestingDepartment?: string;
  incidentId: string;
  incidentTitle?: string;
  resourceId: string;
  resourceName: string;
  category: string;
  quantityRequested: number;
  quantityAllocated?: number;
  priority: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  requestReason: string;
  destination: {
    lat: number;
    lng: number;
    address?: string;
  };
  status: 'Pending' | 'Reviewed' | 'Approved' | 'Partially Approved' | 'Allocated' | 'Dispatched' | 'Delivered' | 'Rejected' | 'Closed' | string;
  assignedOperatorId?: string | null;
  assignedOperatorName?: string | null;
  rejectionReason?: string;
  partialReason?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ResourceAllocationItem {
  id?: string;
  _id?: string;
  allocationId: string;
  requestId?: string | null;
  resourceId: string;
  resourceName: string;
  category?: string;
  incidentId: string;
  disasterTitle?: string;
  assignedTeamId?: string | null;
  assignedTeamName?: string | null;
  quantityAllocated: number;
  priority?: string;
  status: 'Requested' | 'Approved' | 'Allocated' | 'Dispatched' | 'Deployed' | 'Delivered' | 'Returned' | 'Consumed' | string;
  allocatedBy?: string;
  destination: {
    lat: number;
    lng: number;
    address?: string;
  };
  etaMinutes?: number;
  allocatedAt?: string;
  returnedAt?: string | null;
  notes?: string;
}

export interface ResourceHistoryItem {
  id?: string;
  _id?: string;
  historyId: string;
  resourceId: string;
  resourceName: string;
  previousQuantity: number;
  changeQuantity: number;
  newQuantity: number;
  transactionType: 'REGISTER' | 'UPDATE_STOCK' | 'ALLOCATE' | 'DISPATCH' | 'RETURN' | 'CONSUME' | 'MAINTENANCE' | 'STATUS_CHANGE' | 'EXPIRED' | 'DEACTIVATE' | string;
  relatedRequestId?: string | null;
  relatedIncidentId?: string | null;
  performedBy: string;
  performedByRole?: string;
  reason?: string;
  createdAt?: string;
}

export interface EvacuationDestination {
  id: string;
  destinationType: 'RELIEF_SHELTER' | 'HOSPITAL' | 'SAFE_ZONE' | string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  distanceKm: number;
  estimatedDriveTimeMins: number;
  estimatedWalkTimeMins: number;
  totalCapacity?: number;
  currentOccupants?: number;
  availableCapacity?: number;
  occupancyPercentage?: number;
  availableBeds?: number;
  totalBeds?: number;
  availableICUBeds?: number;
  emergencyDepartmentStatus?: string;
  ambulanceReceivingStatus?: string;
  status: string;
  managerContact?: { name: string; phone: string };
  suppliesAvailable?: {
    foodPacks?: number;
    waterLiters?: number;
    medicineKits?: number;
    blankets?: number;
  };
  emergencyServices?: string[];
  verified: boolean;
  lastUpdated: string;
}

export interface EvacuationRouteResponse {
  coordinates: [number, number][];
  distanceKm: number;
  durationMins: number;
  travelMode: 'driving' | 'walking';
  status: 'Recommended' | 'Caution' | 'Blocked' | 'Information Incomplete';
  summary: string;
  warnings: string[];
  blockedHazards: Array<{ title: string; type: string; lat: number; lng: number; distanceMeters: number }>;
  cautionHazards: Array<{ title: string; type: string; lat: number; lng: number; distanceMeters: number }>;
  turnSteps: Array<{ instruction: string; distanceMeters: number; durationSeconds: number; name?: string }>;
  externalNavigation: { googleMapsUrl: string; openStreetMapUrl: string };
  disclaimer: string;
  lastCalculated: string;
  destination: { id?: string; name?: string; lat: number; lng: number };
}

export interface RoadObstructionReport {
  _id?: string;
  reportId: string;
  title: string;
  description: string;
  hazardType: 'FLOODED_ROAD' | 'FALLEN_TREE' | 'BRIDGE_COLLAPSE' | 'LANDSLIDE' | 'ROAD_DAMAGE' | 'FIRE_HAZARD' | 'DEBRIS' | 'OTHER' | string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  location: { lat: number; lng: number; address?: string };
  radiusMeters: number;
  status: 'REPORTED' | 'VERIFIED' | 'REJECTED' | 'CLEARED' | string;
  reportedBy?: { citizenId?: string; citizenName?: string; phone?: string };
  verifiedBy?: { operatorId?: string; operatorName?: string; verifiedAt?: string };
  notes?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EvacuationAdvisory {
  _id?: string;
  advisoryId: string;
  title: string;
  disasterType: string;
  severity: 'ADVISORY' | 'WATCH' | 'WARNING' | 'MANDATORY_EVACUATION' | string;
  affectedArea: { name: string; center: { lat: number; lng: number }; radiusMeters: number };
  targetSafeDestinations: Array<{ id: string; name: string; type: string; lat: number; lng: number }>;
  instructions: string[];
  contactHotline: string;
  publishedBy: { operatorId: string; operatorName: string; publishedAt: string };
  status: 'ACTIVE' | 'LIFTED' | 'EXPIRED' | string;
  auditLog?: Array<{ action: string; operatorId: string; operatorName: string; timestamp: string; notes?: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface EvacuationHazardsFeed {
  disasterZones: Array<{ id: string; title: string; disasterType: string; severity: string; center: { lat: number; lng: number }; radiusMeters: number; description?: string; reportedAt?: string }>;
  roadClosures: RoadObstructionReport[];
  advisories: EvacuationAdvisory[];
  lastUpdated: string;
}

export interface PredictionEmailRecipient {
  email: string;
  name: string;
  status: 'QUEUED' | 'ACCEPTED' | 'FAILED' | string;
  sentAt?: string;
  error?: string;
}

export interface DisasterPredictionItem {
  _id?: string;
  predictionId: string;
  disasterType: 'Flood' | 'Heavy Rainfall' | 'Cyclone' | 'Heatwave' | 'Severe Thunderstorm' | 'Landslide' | 'Fire' | string;
  title: string;
  description: string;
  affectedArea: {
    name: string;
    center: { lat: number; lng: number };
    radiusKm: number;
  };
  predictedRiskLevel: 'Low' | 'Moderate' | 'High' | 'Critical';
  confidenceScore: number;
  predictionNature: 'RULE_BASED_AI_PREDICTION' | 'VALIDATED_ML_MODEL' | 'OFFICIAL_METEOROLOGICAL_ALERT' | string;
  forecastWindow: {
    startTime: string;
    endTime: string;
    durationHours: number;
  };
  weatherMetrics: {
    rainfallForecastMm: number;
    peakWindSpeedKmh: number;
    peakTemperatureC: number;
    atmosphericPressureHpa: number;
    floodRiskIndex: number;
  };
  supportingDataSources: string[];
  safetyPrecautions: string[];
  status: 'Evaluating' | 'Predicted' | 'Under Review' | 'Confirmed' | 'Expired' | 'Failed' | string;
  operatorReview?: {
    reviewed: boolean;
    reviewedBy?: string | null;
    reviewedAt?: string | null;
    notes?: string;
  };
  deduplicationKey: string;
  emailNotification: {
    triggered: boolean;
    triggeredAt?: string | null;
    thresholdMet: boolean;
    recipientCount: number;
    queuedCount: number;
    acceptedCount: number;
    failedCount: number;
    deliveryStatus: 'NOT_TRIGGERED' | 'QUEUED' | 'SENDING' | 'ACCEPTED' | 'PARTIAL_FAILURE' | 'FAILED' | 'SKIPPED_DUPLICATE' | 'PAUSED' | string;
    failureReason?: string;
    campaignId?: string;
    recipients?: PredictionEmailRecipient[];
  };
  auditLogs?: Array<{
    action: string;
    operatorOrSystem: string;
    timestamp: string;
    details: string;
  }>;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PredictionStats {
  totalPredictions: number;
  criticalCount: number;
  highCount: number;
  totalEmailsSent: number;
  totalAccepted: number;
  deliveryRatePercent: number;
  eligibleUsersCount?: number;
  autoEmailEnabled: boolean;
  riskThreshold: 'CRITICAL' | 'HIGH' | 'MODERATE' | string;
  requireOperatorApproval: boolean;
  byStatus?: Record<string, number>;
  byRiskLevel?: Record<string, number>;
  emailDeliveryStats?: {
    attempted: number;
    accepted: number;
    failed: number;
    successRate: number;
  };
}

export interface PredictionConfig {
  autoEmailEnabled?: boolean;
  autoEmailAlertsEnabled?: boolean;
  riskThreshold: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'Critical' | 'High' | 'Moderate' | string;
  batchSize: number;
  batchDelayMs: number;
  maxRetries?: number;
  retryLimit?: number;
  requireOperatorApproval?: boolean;
}

export interface ChatbotMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  language?: string;
  detectedLanguage?: string;
  confidence?: string;
  detectedLanguageDetails?: {
    name?: string;
    nativeName?: string;
    script?: string;
    confidence?: string;
    isAmbiguous?: boolean;
    isMixedOrRomanized?: boolean;
    rule?: string;
  };
  direction?: 'ltr' | 'rtl';
  source?: 'official_resqai_records' | 'safety_protocol' | 'ai_guidance' | 'sos_guided' | 'emergency_hotline';
  sourceLabel?: string;
  liveData?: any;
  actionButtons?: Array<{
    label: string;
    action: string;
    payload?: string;
    url?: string;
  }>;
  suggestedQuestions?: string[];
  timestamp?: string | Date;
}

export interface ChatbotQuickData {
  activeAlertsCount: number;
  availableBedsTotal: number;
  openCampsCount: number;
  nationalEmergencyNumber: string;
  ndrfHelpline: string;
  fireHelpline: string;
  ambulanceHelpline: string;
}


