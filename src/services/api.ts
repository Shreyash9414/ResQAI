import { 
  Incident, ResourceUnit, Hospital, ReliefCamp, MissingPerson, ChatMessage, NotificationItem, UserRole, User, PatientTransport,
  EvacuationDestination, EvacuationRouteResponse, RoadObstructionReport, EvacuationAdvisory, EvacuationHazardsFeed,
  DisasterPredictionItem, PredictionStats, PredictionConfig, ReunificationStats, ChatbotMessage, ChatbotQuickData
} from '../types';


const RAW_API_URL = (import.meta.env.VITE_API_URL || '').trim();
const API_BASE = RAW_API_URL ? `${RAW_API_URL.replace(/\/$/, '')}/api` : '/api';

const getAuthHeader = (): Record<string, string> => {
  const token = localStorage.getItem('crisisconnect_jwt') || localStorage.getItem('resqai_auth_token') || localStorage.getItem('token');
  const role = localStorage.getItem('user_role') || '';
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (role) headers['x-user-role'] = role;
  return headers;
};

// Initial Mock Datasets for instant rendering
export const MOCK_INCIDENTS: Incident[] = [
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
    reporterName: 'Security Control Desk',
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

export const MOCK_RESOURCES: ResourceUnit[] = [
  { id: 'res_nashik_1', name: 'Ambulance Lifeline Nashik 01', type: 'Ambulance', status: 'Available', location: { lat: 20.0050, lng: 73.7800, address: 'Panchavati Emergency Hub, Nashik' }, etaMinutes: 3, capacity: 2, contactNumber: '+91 98220 11223' },
  { id: 'res_nashik_2', name: 'Nashik Fire Brigade Engine 01', type: 'Fire Truck', status: 'Available', location: { lat: 19.9970, lng: 73.7920, address: 'Main Fire HQ, Nashik' }, etaMinutes: 5, capacity: 6, contactNumber: '+91 98220 44556' },
  { id: 'res_mumbai_1', name: 'Ambulance Express Mumbai 01', type: 'Ambulance', status: 'Available', location: { lat: 19.0760, lng: 72.8777, address: 'Mumbai Central Emergency Hub' }, etaMinutes: 4, capacity: 2, contactNumber: '+91 98200 33445' },
  { id: 'res_pune_1', name: 'Rapid Rescue Unit Pune 01', type: 'Ambulance', status: 'Available', location: { lat: 18.5204, lng: 73.8567, address: 'Pune Emergency Fleet HQ' }, etaMinutes: 4, capacity: 2, contactNumber: '+91 98230 77889' },
  { id: 'res_1', name: 'Ambulance Express Delhi 01', type: 'Ambulance', status: 'Available', location: { lat: 28.6150, lng: 77.2100, address: 'Central Delhi Hospital Hub' }, etaMinutes: 4, capacity: 2, contactNumber: '+1 555-0101' },
  { id: 'res_2', name: 'Rescue Boat Unit #2', type: 'Rescue Boat', status: 'Dispatched', location: { lat: 28.6270, lng: 77.2060, address: 'Yamuna River Dock 3' }, etaMinutes: 7, capacity: 10, contactNumber: '+1 555-0102' },
  { id: 'res_3', name: 'Fire Engine Alpha 09', type: 'Fire Truck', status: 'Available', location: { lat: 28.6210, lng: 77.2250, address: 'Station 4 Fire HQ' }, etaMinutes: 6, capacity: 6, contactNumber: '+1 555-0103' },
  { id: 'res_4', name: 'Police Cruiser Squad 12', type: 'Police Cruiser', status: 'En Route', location: { lat: 28.6050, lng: 77.2000, address: 'South Precinct Patrol' }, etaMinutes: 3, capacity: 4, contactNumber: '+1 555-0104' },
  { id: 'res_5', name: 'AI Recon Drone Delta', type: 'Drone Unit', status: 'Available', location: { lat: 20.0000, lng: 73.7850, address: 'Regional Recon Pad' }, etaMinutes: 2, capacity: 1, contactNumber: '+1 555-0105' }
];


export const MOCK_HOSPITALS: Hospital[] = [
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

export const MOCK_CAMPS: ReliefCamp[] = [
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

export const MOCK_MISSING: MissingPerson[] = [
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

export const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: 'msg_1',
    senderId: 'usr_2',
    senderName: 'Commander Alex Vance',
    senderRole: 'Emergency Operator',
    recipientRole: 'All',
    channelId: 'general-command',
    text: 'ALERT: Sector 9 Flood evacuees being routed to Stadium Shelter #1. All units maintain radio contact.',
    createdAt: new Date(Date.now() - 15 * 60000).toISOString()
  }
];

export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif_1',
    title: 'CRITICAL DISASTER BROADCAST',
    message: 'Flash flood alert issued for Yamuna basin. Evacuate low-lying areas.',
    type: 'CRITICAL',
    createdAt: new Date().toISOString()
  }
];

export const apiService = {
  async getIncidents(): Promise<Incident[]> {
    try {
      const res = await fetch(`${API_BASE}/incidents`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Using local incidents store fallback');
    }
    return MOCK_INCIDENTS;
  },

  async getIncidentById(id: string): Promise<Incident | null> {
    try {
      const res = await fetch(`${API_BASE}/incidents/${id}`);
      if (res.ok) return await res.json();
    } catch (e) {}
    const found = MOCK_INCIDENTS.find(i => i.id === id);
    return found || null;
  },

  async createIncident(incidentData: Partial<Incident> & { latitude?: number; longitude?: number; accuracy?: number; reportedBy?: string }): Promise<Incident> {
    try {

      const res = await fetch(`${API_BASE}/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incidentData)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Creating incident in mock fallback');
    }

    const created: Incident = {
      id: `inc_${Date.now()}`,
      title: incidentData.title || 'Emergency Report',
      disasterType: incidentData.disasterType || 'Flood',
      severity: incidentData.severity || 'High',
      priority: 1,
      status: 'Pending',
      reporterName: incidentData.reporterName || 'Citizen User',
      reporterPhone: incidentData.reporterPhone || '+1 (555) SOS',
      location: incidentData.location || { lat: 28.6139, lng: 77.2090, address: 'District Hub' },
      description: incidentData.description || 'Emergency reported.',
      media: incidentData.media || ['https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80'],
      aiPrediction: {
        disasterType: incidentData.disasterType || 'Flood',
        severity: incidentData.severity || 'High',
        confidenceScore: 0.96,
        estimatedVictims: 8,
        recommendedResources: ['Ambulance Squad', 'Rescue Boat'],
        summary: 'AI Real-time Severity Index: High Priority Hazard Detected.'
      },
      fakeDetection: {
        isFakeOrSpam: false,
        spamConfidence: 0.02,
        flagReason: 'Geotag matches emergency telemetry'
      },
      assignedResponders: [],
      createdAt: new Date().toISOString()
    };
    MOCK_INCIDENTS.unshift(created);
    return created;
  },



  async getResources(lat?: number, lng?: number): Promise<ResourceUnit[]> {
    try {
      const query = (lat !== undefined && lng !== undefined) ? `?lat=${lat}&lng=${lng}` : '';
      const res = await fetch(`${API_BASE}/resources${query}`);
      if (res.ok) {
        const data = await res.json();
        const rawList: any[] = Array.isArray(data) ? data : (data.resources || []);
        return rawList.map((r: any) => ({
          id: r.id || r.resourceId || r._id,
          name: r.name,
          type: r.type || r.category || 'Rescue Asset',
          status: r.status || 'Available',
          location: {
            lat: typeof r.location?.lat === 'number' ? r.location.lat : (Array.isArray(r.location?.coordinates) ? r.location.coordinates[1] : 28.6139),
            lng: typeof r.location?.lng === 'number' ? r.location.lng : (Array.isArray(r.location?.coordinates) ? r.location.coordinates[0] : 77.2090),
            address: r.location?.address || 'Central Depot'
          },
          etaMinutes: r.etaMinutes ?? 4,
          capacity: r.capacity ?? r.totalQuantity ?? 2,
          contactNumber: r.contactNumber || '+1 (555) 999-0011',
          assignedIncidentId: r.assignedIncidentId || null
        }));
      }
    } catch (e) {}
    return MOCK_RESOURCES;
  },


  async getHospitals(lat?: number, lng?: number, filters?: any): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (lat !== undefined && !isNaN(lat)) params.append('lat', lat.toString());
      if (lng !== undefined && !isNaN(lng)) params.append('lng', lng.toString());
      if (filters?.search) params.append('search', filters.search);
      if (filters?.icuOnly) params.append('icuOnly', 'true');
      if (filters?.erStatus) params.append('erStatus', filters.erStatus);
      if (filters?.freshness) params.append('freshness', filters.freshness);

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${API_BASE}/hospitals${queryString}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          return { summary: { totalHospitals: data.length, currentCount: data.length, icuAvailableCount: data.filter((h: any) => (h.icuBeds?.available > 0 || h.availableICUBeds > 0)).length, erAvailableCount: data.filter((h: any) => h.emergencyDepartmentStatus === 'AVAILABLE').length, staleOrUnknownCount: 0 }, hospitals: data };
        }
        return data;
      }
    } catch (e) {
      console.warn('getHospitals API error:', e);
    }
    return {
      summary: { totalHospitals: MOCK_HOSPITALS.length, currentCount: MOCK_HOSPITALS.length, icuAvailableCount: MOCK_HOSPITALS.filter((h: any) => h.icuBeds > 0).length, erAvailableCount: MOCK_HOSPITALS.length, staleOrUnknownCount: 0 },
      hospitals: MOCK_HOSPITALS
    };
  },

  async updateHospitalAvailability(id: string, availabilityData: any): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/hospitals/${id}/availability`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(availabilityData)
      });
      return await res.json();
    } catch (e: any) {
      console.error('updateHospitalAvailability error:', e);
      return { success: false, message: e.message || 'Failed to update hospital availability' };
    }
  },

  async registerHospital(hospitalData: any): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/hospitals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(hospitalData)
      });
      return await res.json();
    } catch (e: any) {
      console.error('registerHospital error:', e);
      return { success: false, message: e.message || 'Failed to register hospital' };
    }
  },

  async getCamps(): Promise<ReliefCamp[]> {
    try {
      const res = await fetch(`${API_BASE}/camps`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return MOCK_CAMPS;
  },

  async getMissingPersons(filters?: {
    type?: string;
    status?: string;
    incidentId?: string;
    search?: string;
    minAge?: number;
    maxAge?: number;
    gender?: string;
  }): Promise<MissingPerson[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.type) params.append('type', filters.type);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.incidentId) params.append('incidentId', filters.incidentId);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.minAge !== undefined) params.append('minAge', String(filters.minAge));
      if (filters?.maxAge !== undefined) params.append('maxAge', String(filters.maxAge));
      if (filters?.gender) params.append('gender', filters.gender);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${API_BASE}/missing${qs}`, {
        headers: getAuthHeader()
      });
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data) ? data : data.records || [];
      }
    } catch (e) {
      console.error('Error fetching missing persons:', e);
    }
    return MOCK_MISSING;
  },

  async getMessages(): Promise<ChatMessage[]> {
    try {
      const res = await fetch(`${API_BASE}/messages`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return MOCK_MESSAGES;
  },

  async updateIncidentStatus(id: string, status: string, responder?: any): Promise<Incident | null> {
    try {
      const res = await fetch(`${API_BASE}/incidents/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, responder })
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async updateHospital(id: string, updateData: Partial<Hospital>): Promise<Hospital | null> {
    try {
      const res = await fetch(`${API_BASE}/hospitals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async updateCamp(id: string, updateData: Partial<ReliefCamp>): Promise<ReliefCamp | null> {
    try {
      const res = await fetch(`${API_BASE}/camps/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async updateResource(id: string, updateData: Partial<ResourceUnit>): Promise<ResourceUnit | null> {
    try {
      const res = await fetch(`${API_BASE}/resources/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async createMissingPerson(personData: Partial<MissingPerson>): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/missing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(personData)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to submit missing person report' };
    }
  },

  async registerFoundPerson(foundData: Partial<MissingPerson>): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/missing/found`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(foundData)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to register found person intake' };
    }
  },

  async getMissingPersonStats(): Promise<ReunificationStats | null> {
    try {
      const res = await fetch(`${API_BASE}/missing/stats`, {
        headers: getAuthHeader()
      });
      if (res.ok) {
        const data = await res.json();
        return data.stats || null;
      }
    } catch (e) {
      console.error('Error fetching reunification stats:', e);
    }
    return null;
  },

  async getMissingPersonById(id: string): Promise<MissingPerson | null> {
    try {
      const res = await fetch(`${API_BASE}/missing/${id}`, {
        headers: getAuthHeader()
      });
      if (res.ok) {
        const data = await res.json();
        return data.case || null;
      }
    } catch (e) {
      console.error('Error fetching case by ID:', e);
    }
    return null;
  },

  async getCaseMatches(caseId: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/missing/${caseId}/matches`, {
        headers: getAuthHeader()
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error('Error fetching case matches:', e);
    }
    return { success: false, matches: [] };
  },

  async verifyMatch(caseId: string, candidateCaseId: string, verificationNotes: string, confirmHumanVerified: boolean): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/missing/${caseId}/verify-match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ candidateCaseId, verificationNotes, confirmHumanVerified })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to verify match' };
    }
  },

  async rejectMatch(caseId: string, candidateCaseId: string, rejectionReason: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/missing/${caseId}/reject-match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ candidateCaseId, rejectionReason })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to reject match' };
    }
  },

  async reuniteCase(caseId: string, reunificationData: { reunitedWithName: string; reunitedWithContact: string; relationship?: string; notes?: string }): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/missing/${caseId}/reunite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(reunificationData)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to finalize reunification' };
    }
  },

  async updateCaseStatus(caseId: string, status: string, notes?: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/missing/${caseId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ status, notes })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to update case status' };
    }
  },

  async updateCaseDetails(caseId: string, updateData: Partial<MissingPerson>): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/missing/${caseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(updateData)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to update case details' };
    }
  },

  async deleteCase(caseId: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/missing/${caseId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to delete case' };
    }
  },

  async sendMessage(msgData: Partial<ChatMessage>): Promise<ChatMessage | null> {
    try {
      const res = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msgData)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async verifyIncident(id: string, verifiedBy?: string): Promise<Incident | null> {

    try {
      const res = await fetch(`${API_BASE}/incidents/${id}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verifiedBy })
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async rejectIncident(id: string): Promise<Incident | null> {
    try {
      const res = await fetch(`${API_BASE}/incidents/${id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async assignRescueTeam(id: string, rescueTeam: any): Promise<Incident | null> {
    try {
      const res = await fetch(`${API_BASE}/incidents/${id}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rescueTeam })
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async acceptMission(id: string, acceptedBy?: string): Promise<Incident | null> {
    try {
      const res = await fetch(`${API_BASE}/incidents/${id}/accept-mission`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptedBy })
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async startRescue(id: string): Promise<Incident | null> {
    try {
      const res = await fetch(`${API_BASE}/incidents/${id}/start-rescue`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async sendTestSms(phoneNumber: string): Promise<{ success: boolean; providerMessageId?: string; status?: string; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/notifications/test-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error calling SMS endpoint' };
    }
  },

  async getTwilioConfig(): Promise<{ accountSid: string; authToken: string; phoneNumber: string; isReady: boolean; maskedSid?: string }> {
    try {
      const res = await fetch(`${API_BASE}/notifications/twilio-config`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return { accountSid: 'MISSING', authToken: 'MISSING', phoneNumber: 'MISSING', isReady: false };
  },

  async getSmsAudit(incidentId?: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/notifications/audit/${incidentId || ''}`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return { nearbyUsers: 0, smsAttempted: 0, smsAccepted: 0, delivered: 0, failed: 0, records: [] };
  },





  async resolveIncident(id: string, resolvedBy?: string): Promise<Incident | null> {
    try {
      const res = await fetch(`${API_BASE}/incidents/${id}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolvedBy })
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async operatorLogin(credentials: { email: string; password?: string }): Promise<{ token: string; user: User } | null> {
    try {
      const res = await fetch(`${API_BASE}/auth/operator/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      if (res.ok) return await res.json();
      const err = await res.json();
      throw new Error(err.message || 'Operator login failed');
    } catch (e: any) {
      throw e;
    }
  },

  async citizenLogin(credentials: { email: string; password?: string }): Promise<{ token: string; user: User } | null> {
    try {
      const res = await fetch(`${API_BASE}/auth/citizen/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      if (res.ok) return await res.json();
      const err = await res.json();
      throw new Error(err.message || 'Citizen login failed');
    } catch (e: any) {
      throw e;
    }
  },

  async citizenRegister(userData: any): Promise<{ token: string; user: User } | null> {
    try {
      const res = await fetch(`${API_BASE}/auth/citizen/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (res.ok) return await res.json();
      const err = await res.json();
      throw new Error(err.message || 'Citizen registration failed');
    } catch (e: any) {
      throw e;
    }
  },

  async login(credentials: { email: string; password?: string }): Promise<{ token: string; user: User } | null> {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      if (res.ok) return await res.json();
      const err = await res.json();
      throw new Error(err.message || 'Login failed');
    } catch (e: any) {
      throw e;
    }
  },

  async register(userData: any): Promise<{ token: string; user: User } | null> {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (res.ok) return await res.json();
      const err = await res.json();
      throw new Error(err.message || 'Registration failed');
    } catch (e: any) {
      throw e;
    }
  },


  async triggerSOS(
    latitudeOrParams: number | {
      latitude: number;
      longitude: number;
      accuracy?: number;
      locationType?: 'GPS_VERIFIED' | 'MANUAL_ENTRY';
      manualAddress?: string;
      selectedServices?: string[];
      description?: string;
      clientRequestId?: string;
    },
    longitude?: number,
    accuracy?: number,
    description?: string,
    selectedServices?: string[],
    locationType?: 'GPS_VERIFIED' | 'MANUAL_ENTRY',
    manualAddress?: string
  ): Promise<any> {
    try {
      const token = localStorage.getItem('crisisconnect_jwt');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let payload: any = {};
      if (typeof latitudeOrParams === 'object' && latitudeOrParams !== null) {
        payload = latitudeOrParams;
      } else {
        payload = {
          latitude: latitudeOrParams,
          longitude,
          accuracy: accuracy || 5,
          description: description || '',
          selectedServices: selectedServices || ['Ambulance / Medical Emergency'],
          locationType: locationType || 'GPS_VERIFIED',
          manualAddress: manualAddress || '',
          clientRequestId: `req_${Date.now()}`
        };
      }

      const res = await fetch(`${API_BASE}/sos`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        return data.incident || data;
      }
    } catch (e) {
      console.error('[apiService] triggerSOS error:', e);
    }
    return null;
  },

  async getSOSList(): Promise<any[]> {
    try {
      const token = localStorage.getItem('crisisconnect_jwt');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/sos`, { headers });
      if (res.ok) {
        const data = await res.json();
        return data.incidents || [];
      }
    } catch (e) {}
    return [];
  },

  async getSOSById(id: string): Promise<any | null> {
    try {
      const res = await fetch(`${API_BASE}/sos/${id}`);
      if (res.ok) {
        const data = await res.json();
        return data.incident;
      }
    } catch (e) {}
    return null;
  },

  async updateSOSStatus(id: string, status: string, notes?: string): Promise<any> {
    try {
      const token = localStorage.getItem('crisisconnect_jwt');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/sos/${id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status, notes })
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async cancelSOS(sosId?: string, reason?: string): Promise<{ success: boolean; message: string; incident?: Incident }> {
    try {
      const token = localStorage.getItem('crisisconnect_jwt');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/sos/cancel`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ sosId, id: sosId, reason })
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, message: data.message || 'SOS Cancelled', incident: data.incident };
      }
      const err = await res.json();
      return { success: false, message: err.message || 'Failed to cancel SOS' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Network error while cancelling SOS' };
    }
  },

  async getRescueRecommendations(params: { incidentId?: string; lat?: number; lng?: number; disasterType?: string; services?: string[] }): Promise<any> {
    try {
      const q = new URLSearchParams();
      if (params.incidentId) q.append('incidentId', params.incidentId);
      if (params.lat !== undefined) q.append('lat', String(params.lat));
      if (params.lng !== undefined) q.append('lng', String(params.lng));
      if (params.disasterType) q.append('disasterType', params.disasterType);
      if (params.services) q.append('services', params.services.join(','));

      const res = await fetch(`${API_BASE}/rescue/recommendations?${q.toString()}`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return { success: false, candidates: [] };
  },

  async assignResponder(incidentId: string, unitId: string, notes?: string): Promise<any> {
    try {
      const token = localStorage.getItem('crisisconnect_jwt');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/rescue/assign`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ incidentId, unitId, notes })
      });
      const data = await res.json();
      return { ok: res.ok, status: res.status, ...data };
    } catch (e: any) {
      return { ok: false, message: e.message };
    }
  },

  async reassignResponder(incidentId: string, oldUnitId: string, newUnitId: string, reason?: string): Promise<any> {
    try {
      const token = localStorage.getItem('crisisconnect_jwt');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/rescue/reassign`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ incidentId, oldUnitId, newUnitId, reason })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },

  async cancelRescueAssignment(incidentId: string, unitId: string, reason?: string): Promise<any> {
    try {
      const token = localStorage.getItem('crisisconnect_jwt');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/rescue/cancel-assignment`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ incidentId, unitId, reason })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },

  async getRescueEvaluation(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/rescue/evaluation`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async getRiskAssessments(lat?: number, lng?: number, area?: string): Promise<any> {
    try {
      const q = new URLSearchParams();
      if (lat !== undefined) q.append('lat', String(lat));
      if (lng !== undefined) q.append('lng', String(lng));
      if (area) q.append('area', area);

      const res = await fetch(`${API_BASE}/disasters/risk-assessments?${q.toString()}`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async evaluateRiskLocation(lat: number, lng: number, regionName?: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/disasters/risk-assessments/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, regionName })
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async broadcastRiskAlert(assessment: any, targetRadiusKm?: number, customMessage?: string): Promise<any> {
    try {
      const token = localStorage.getItem('crisisconnect_jwt');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/disasters/risk-assessments/broadcast`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ assessment, targetRadiusKm, customMessage })
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async planSmartEvacuationRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    travelMode: 'walking' | 'driving' = 'driving'
  ): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/evacuation/route-smart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, destination, travelMode })
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async getNearbyDestinationsV2(lat: number = 20.0050, lng: number = 73.7880, radius: number = 50): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/evacuation/nearby-destinations-v2?lat=${lat}&lng=${lng}&radius=${radius}`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async getAuditLogs(): Promise<any[]> {
    try {
      const token = localStorage.getItem('crisisconnect_jwt');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/audit-logs`, { headers });
      if (res.ok) return await res.json();
    } catch (e) {}
    return [];
  },

  async changeSeverity(incidentId: string, severity: string): Promise<Incident | null> {
    try {
      const token = localStorage.getItem('crisisconnect_jwt');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/incidents/${incidentId}/severity`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ severity })
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async trackSOS(incidentId: string): Promise<Incident | null> {
    try {
      const res = await fetch(`${API_BASE}/sos/${incidentId}/track`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async getNearbyHospitals(latitude?: number, longitude?: number, radiusKm: number = 15): Promise<Hospital[]> {
    try {
      const lat = latitude || 28.6285;
      const lng = longitude || 77.2052;
      const res = await fetch(`${API_BASE}/hospitals/nearby?latitude=${lat}&longitude=${lng}&radius=${radiusKm}`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return MOCK_HOSPITALS;
  },


  async selectHospitalForIncident(incidentId: string, hospitalId: string): Promise<Incident | null> {
    try {
      const res = await fetch(`${API_BASE}/incidents/${incidentId}/select-hospital`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospitalId })
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async updatePatientStatus(incidentId: string, statusEndpoint: 'patient-picked-up' | 'start-transport' | 'arrived-hospital' | 'patient-admitted'): Promise<Incident | null> {
    try {
      const res = await fetch(`${API_BASE}/incidents/${incidentId}/${statusEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async updateUnitLocation(unitId: string, latitude: number, longitude: number, speed?: number, heading?: number): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/rescue-units/${unitId}/location`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude, speed: speed || 40, heading: heading || 90 })
      });
      return res.ok;
    } catch (e) {}
    return false;
  },

  async demoStepUnit(unitId: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/rescue-units/${unitId}/demo-step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async getCurrentUser(token: string): Promise<User | null> {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        return data.user;
      }
    } catch (e) {}
    return null;
  },






  // ==================================================
  // PATIENT TRANSPORT & HOSPITAL MODULE API METHODS
  // ==================================================

  async getTransports(): Promise<PatientTransport[]> {
    try {
      const res = await fetch(`${API_BASE}/transports`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return [];
  },

  async getTransportById(id: string): Promise<PatientTransport | null> {
    try {
      const res = await fetch(`${API_BASE}/transports/${id}`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async pickupPatient(transportId: string): Promise<any> {

    try {
      const res = await fetch(`${API_BASE}/transports/${transportId}/pickup`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async selectHospital(transportId: string, hospitalId: string): Promise<PatientTransport | null> {
    try {
      const res = await fetch(`${API_BASE}/transports/${transportId}/select-hospital`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospitalId })
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async acceptHospitalPatient(transportId: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/transports/${transportId}/accept-hospital`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async startHospitalTransport(transportId: string): Promise<PatientTransport | null> {
    try {
      const res = await fetch(`${API_BASE}/transports/${transportId}/start-transport`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async arriveHospital(transportId: string): Promise<PatientTransport | null> {
    try {
      const res = await fetch(`${API_BASE}/transports/${transportId}/arrive-hospital`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async admitPatient(transportId: string): Promise<PatientTransport | null> {
    try {
      const res = await fetch(`${API_BASE}/transports/${transportId}/admit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },



  async getCurrentWeather(lat: number = 19.0760, lng: number = 72.8777): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/weather/current?lat=${lat}&lng=${lng}`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return {
      status: 'UNAVAILABLE',
      locationName: 'Mumbai, Maharashtra',
      temperature: 29,
      feelsLike: 32,
      humidity: 76,
      windSpeed: 14,
      rainChance: 60,
      weatherCondition: 'Rain Showers',
      weatherIcon: '🌦️',
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      trustIndicator: 'UNAVAILABLE'
    };
  },

  async get30DayWeatherForecast(lat: number = 19.0760, lng: number = 72.8777): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/weather/forecast?lat=${lat}&lng=${lng}`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return { status: 'UNAVAILABLE', days: [] };
  },

  async searchLocations(query: string): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/weather/search?query=${encodeURIComponent(query)}`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return [];
  },

  async getDisasterAlerts(lat: number = 19.0760, lng: number = 72.8777): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/disasters/alerts?lat=${lat}&lng=${lng}`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return [];
  },

  async updateHospitalBeds(id: string, bedData: Partial<Hospital>): Promise<Hospital | null> {
    try {
      const res = await fetch(`${API_BASE}/hospitals/${id}/beds`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bedData)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async updateUserLocation(latitude: number, longitude: number, accuracy?: number, userId?: string, speed?: number, heading?: number, altitude?: number): Promise<any> {
    try {
      const token = localStorage.getItem('crisisconnect_jwt');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/users/location`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ latitude, longitude, accuracy: accuracy || 8, userId: userId || 'usr_1', speed, heading, altitude })
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },


  async sendSmsNotification(userId: string, phoneNumber: string, message: string, incidentId?: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/notifications/send-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, phoneNumber, message, incidentId })
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async updateAlertSettings(locationSharingEnabled: boolean, emergencyAlertsEnabled: boolean, userId?: string, smsAlertsEnabled?: boolean, browserAlertsEnabled?: boolean): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/users/alert-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationSharingEnabled, emergencyAlertsEnabled, smsAlertsEnabled: smsAlertsEnabled !== undefined ? smsAlertsEnabled : true, browserAlertsEnabled: browserAlertsEnabled !== undefined ? browserAlertsEnabled : true, userId: userId || 'usr_1' })
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async requestBrowserNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    }
    return false;
  },


  async subscribePushNotification(subscription: any, userId?: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/notifications/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription, userId: userId || 'usr_1' })
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async activateIncidentWarning(incidentId: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/incidents/${incidentId}/activate-nearby-warning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async activateNearbyWarning(incidentId: string): Promise<any> {
    return this.activateIncidentWarning(incidentId);
  },

  async acknowledgeEmergencyAlert(incidentId: string, userId?: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/incidents/${incidentId}/acknowledge-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId || 'usr_1' })
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async acknowledgeAlertById(alertId: string, incidentId?: string, userId?: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/emergency-alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId || 'usr_1' })
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return this.acknowledgeEmergencyAlert(incidentId || 'inc_102', userId);
  },

  async getGeofenceStats(incidentId: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/incidents/${incidentId}/nearby-warning`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return {
      incidentId,
      radius: 100,
      dangerRadius: 100,
      radiusMeters: 100,
      geofenceActive: true,
      warningStatus: '🟢 ACTIVE',
      nearbyUsers: 2,
      nearbyUsersCount: 2,
      alertsSent: 2,
      alertsSentCount: 2,
      acknowledged: 1,
      acknowledgedCount: 1,
      activeWarnings: 1,
      activeWarningsCount: 1
    };
  },

  async getNearbyWarningStats(incidentId: string): Promise<any> {
    return this.getGeofenceStats(incidentId);
  },

  async demoMoveCitizenC(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/users/demo-move-c`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async getAdminGeofenceAlerts(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/admin/geofence-alerts`, {
        headers: getAuthHeader()
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return { success: false, alerts: [] };
  },

  async getCitizensAtRisk(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/operator/citizens-at-risk`, {
        headers: getAuthHeader()
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Error fetching citizens at risk:', e);
    }
    return { summary: { totalAtRisk: 0, criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0, uncertainCount: 0 }, citizens: [] };
  },

  async getSafetyPrecautions(disasterType?: string): Promise<any> {
    try {
      const url = disasterType ? `${API_BASE}/precautions/${encodeURIComponent(disasterType)}` : `${API_BASE}/precautions`;
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Error fetching safety precautions:', e);
    }
    return null;
  },

  async sendSafetyEmail(citizenId: string, disasterId?: string, disasterType?: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/operator/send-safety-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ citizenId, disasterId, disasterType })
      });
      return await res.json();
    } catch (e: any) {
      console.error('Error sending safety email:', e);
      return { success: false, message: e.message || 'Failed to send safety email' };
    }
  },

  async getSafetyAlertLogs(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/operator/safety-alert-logs`, {
        headers: getAuthHeader()
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Error fetching safety alert logs:', e);
    }
    return [];
  },

  /* RESCUE RESOURCE MANAGEMENT MODULE APIs */
  async getResourcesList(filters?: { category?: string; status?: string; search?: string; disaster?: string; availability?: string }): Promise<{ summary: any; resources: any[] }> {
    try {
      const params = new URLSearchParams();
      if (filters?.category && filters.category !== 'All') params.append('category', filters.category);
      if (filters?.status && filters.status !== 'All') params.append('status', filters.status);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.availability) params.append('availability', filters.availability);

      const res = await fetch(`${API_BASE}/resources?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        return { summary: data.summary || {}, resources: data.resources || [] };
      }
    } catch (e) {
      console.warn('Error fetching resources list:', e);
    }
    return { summary: { totalRegistered: 0, totalAvailable: 0, totalDeployed: 0, totalMaintenance: 0, lowStockCount: 0, pendingRequestsCount: 0 }, resources: [] };
  },

  async getResourceSummary(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/resources/summary`);
      if (res.ok) {
        const data = await res.json();
        return data.summary;
      }
    } catch (e) {}
    return { totalRegistered: 0, totalAvailable: 0, totalDeployed: 0, totalMaintenance: 0, lowStockCount: 0, pendingRequestsCount: 0 };
  },

  async getLowStockResources(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/resources/low-stock`);
      if (res.ok) {
        const data = await res.json();
        return data.items || [];
      }
    } catch (e) {}
    return [];
  },

  async getNearbyResources(lat: number, lng: number, category?: string, status?: string): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      params.append('lat', lat.toString());
      params.append('lng', lng.toString());
      if (category && category !== 'All') params.append('category', category);
      if (status && status !== 'All') params.append('status', status);

      const res = await fetch(`${API_BASE}/resources/nearby?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        return data.resources || [];
      }
    } catch (e) {}
    return [];
  },

  async createResource(resourceData: any): Promise<{ success: boolean; message: string; resource?: any }> {
    try {
      const res = await fetch(`${API_BASE}/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(resourceData)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to create resource' };
    }
  },

  async updateResourceItem(id: string, updateData: any): Promise<{ success: boolean; message: string; resource?: any }> {
    try {
      const res = await fetch(`${API_BASE}/resources/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(updateData)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to update resource' };
    }
  },

  async setResourceMaintenance(id: string, isMaintenance: boolean, notes?: string): Promise<{ success: boolean; message: string; resource?: any }> {
    try {
      const res = await fetch(`${API_BASE}/resources/${id}/maintenance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ isMaintenance, notes })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to update maintenance status' };
    }
  },

  async allocateResourceToIncident(allocationData: any): Promise<{ success: boolean; message: string; allocation?: any; resource?: any }> {
    try {
      const res = await fetch(`${API_BASE}/resources/allocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(allocationData)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to allocate resource' };
    }
  },

  async returnResourceFromDeployment(returnObj: { resourceId: string; allocationId?: string; quantityReturned?: number; notes?: string }): Promise<{ success: boolean; message: string; resource?: any }> {
    try {
      const res = await fetch(`${API_BASE}/resources/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(returnObj)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to return resource' };
    }
  },

  async getResourceRequests(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/resource-requests`);
      if (res.ok) {
        const data = await res.json();
        return data.requests || [];
      }
    } catch (e) {}
    return [];
  },

  async createResourceRequest(requestData: any): Promise<{ success: boolean; message: string; request?: any }> {
    try {
      const res = await fetch(`${API_BASE}/resource-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(requestData)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to submit resource request' };
    }
  },

  async updateResourceRequestStatus(requestId: string, updateData: { status: string; quantityAllocated?: number; operatorName?: string; rejectionReason?: string; partialReason?: string; notes?: string }): Promise<{ success: boolean; message: string; request?: any; allocation?: any }> {
    try {
      const res = await fetch(`${API_BASE}/resource-requests/${requestId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(updateData)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to update request status' };
    }
  },

  async getResourceHistory(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/resources/history`);
      if (res.ok) {
        const data = await res.json();
        return data.history || [];
      }
    } catch (e) {}
    return [];
  },

  // -------------------------------------------------------------
  // SMART EVACUATION & SAFE-ZONE NAVIGATION API
  // -------------------------------------------------------------
  async getNearbyDestinations(lat: number, lng: number, radiusKm: number = 60): Promise<{ destinations: EvacuationDestination[]; count: number }> {
    try {
      const res = await fetch(`${API_BASE}/evacuation/nearby-destinations?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`);
      if (res.ok) {
        const data = await res.json();
        return { destinations: data.destinations || [], count: data.count || 0 };
      }
    } catch (e) {
      console.error('Error fetching nearby evacuation destinations:', e);
    }
    return { destinations: [], count: 0 };
  },

  async calculateEvacuationRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number; name?: string; id?: string },
    travelMode: 'driving' | 'walking' = 'driving'
  ): Promise<{ success: boolean; route?: EvacuationRouteResponse; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/evacuation/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, destination, travelMode })
      });
      return await res.json();
    } catch (e: any) {
      console.error('Error calculating evacuation route:', e);
      return { success: false, message: e.message || 'Network error while calculating evacuation route.' };
    }
  },

  async getEvacuationHazards(): Promise<EvacuationHazardsFeed> {
    try {
      const res = await fetch(`${API_BASE}/evacuation/hazards`);
      if (res.ok) {
        const data = await res.json();
        return {
          disasterZones: data.disasterZones || [],
          roadClosures: data.roadClosures || [],
          advisories: data.advisories || [],
          lastUpdated: data.lastUpdated || new Date().toISOString()
        };
      }
    } catch (e) {
      console.error('Error fetching evacuation hazards:', e);
    }
    return {
      disasterZones: [],
      roadClosures: [],
      advisories: [],
      lastUpdated: new Date().toISOString()
    };
  },

  async submitRoadReport(reportData: {
    title: string;
    description: string;
    hazardType: string;
    severity?: string;
    location: { lat: number; lng: number; address?: string };
    radiusMeters?: number;
    reportedBy?: { citizenId?: string; citizenName?: string; phone?: string };
  }): Promise<{ success: boolean; report?: RoadObstructionReport; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/evacuation/road-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(reportData)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to submit road hazard report' };
    }
  },

  async getRoadReports(status?: string): Promise<RoadObstructionReport[]> {
    try {
      const url = status ? `${API_BASE}/evacuation/road-reports?status=${status}` : `${API_BASE}/evacuation/road-reports`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return data.reports || [];
      }
    } catch (e) {
      console.error('Error fetching road reports:', e);
    }
    return [];
  },

  async verifyRoadReport(id: string, updateData: {
    status: 'VERIFIED' | 'REJECTED' | 'CLEARED';
    notes?: string;
    operatorName?: string;
  }): Promise<{ success: boolean; message: string; report?: RoadObstructionReport }> {
    try {
      const res = await fetch(`${API_BASE}/evacuation/road-reports/${id}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(updateData)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to verify road hazard report' };
    }
  },

  async getEvacuationAdvisories(status?: string): Promise<EvacuationAdvisory[]> {
    try {
      const url = status ? `${API_BASE}/evacuation/advisories?status=${status}` : `${API_BASE}/evacuation/advisories`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return data.advisories || [];
      }
    } catch (e) {
      console.error('Error fetching evacuation advisories:', e);
    }
    return [];
  },

  async publishEvacuationAdvisory(advisoryData: {
    title: string;
    disasterType: string;
    severity?: string;
    affectedArea: { name: string; center: { lat: number; lng: number }; radiusMeters: number };
    instructions?: string[];
    contactHotline?: string;
    operatorName?: string;
    notes?: string;
  }): Promise<{ success: boolean; message: string; advisory?: EvacuationAdvisory }> {
    try {
      const res = await fetch(`${API_BASE}/evacuation/advisories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(advisoryData)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to publish evacuation advisory' };
    }
  },

  async liftEvacuationAdvisory(id: string, notes?: string): Promise<{ success: boolean; message: string; advisory?: EvacuationAdvisory }> {
    try {
      const res = await fetch(`${API_BASE}/evacuation/advisories/${id}/lift`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ notes })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to lift evacuation advisory' };
    }
  },

  // -------------------------------------------------------------
  // AI DISASTER PREDICTION & AUTOMATED EMAIL ALERTS API
  // -------------------------------------------------------------
  async getDisasterPredictions(filters?: { riskLevel?: string; status?: string; disasterType?: string }): Promise<DisasterPredictionItem[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.riskLevel && filters.riskLevel !== 'ALL') params.append('riskLevel', filters.riskLevel);
      if (filters?.status && filters.status !== 'ALL') params.append('status', filters.status);
      if (filters?.disasterType && filters.disasterType !== 'ALL') params.append('disasterType', filters.disasterType);

      const url = params.toString() ? `${API_BASE}/predictions?${params.toString()}` : `${API_BASE}/predictions`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return data.predictions || [];
      }
    } catch (e) {
      console.error('Error fetching disaster predictions:', e);
    }
    return [];
  },

  async getDisasterPredictionStats(): Promise<PredictionStats | null> {
    try {
      const res = await fetch(`${API_BASE}/predictions/stats`);
      if (res.ok) {
        const data = await res.json();
        return data.stats || null;
      }
    } catch (e) {
      console.error('Error fetching prediction stats:', e);
    }
    return null;
  },

  async getPredictionStats(): Promise<PredictionStats | null> {
    return this.getDisasterPredictionStats();
  },

  async getPredictionConfig(): Promise<PredictionConfig | null> {
    try {
      const res = await fetch(`${API_BASE}/predictions/config`);
      if (res.ok) {
        const data = await res.json();
        return data.config || null;
      }
    } catch (e) {
      console.error('Error fetching prediction config:', e);
    }
    return null;
  },

  async updatePredictionConfig(config: Partial<PredictionConfig>): Promise<{ success: boolean; config?: PredictionConfig; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/predictions/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(config)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to update prediction config' };
    }
  },

  async evaluatePredictions(options?: { forceNotify?: boolean; regionLat?: number; regionLng?: number; regionName?: string }): Promise<{ success: boolean; evaluatedCount?: number; predictions?: DisasterPredictionItem[]; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/predictions/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(options || {})
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to trigger prediction evaluation' };
    }
  },

  async sendPredictionAlertEmail(predictionId: string): Promise<{ success: boolean; message: string; result?: any }> {
    try {
      const res = await fetch(`${API_BASE}/predictions/${predictionId}/send-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to dispatch warning email campaign' };
    }
  },

  async sendPredictionAlert(predictionId: string): Promise<{ success: boolean; message: string; result?: any }> {
    return this.sendPredictionAlertEmail(predictionId);
  },

  async retryFailedPredictionEmails(predictionId: string): Promise<{ success: boolean; message: string; result?: any }> {
    try {
      const res = await fetch(`${API_BASE}/predictions/${predictionId}/retry-failed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to retry failed recipients' };
    }
  },

  async reviewPrediction(predictionId: string, reviewData: { operatorName?: string; status: string; notes?: string; operatorNotes?: string; triggerNotification?: boolean }): Promise<{ success: boolean; prediction?: DisasterPredictionItem; message?: string }> {
    try {
      const payload = {
        operatorName: reviewData.operatorName || 'Duty Emergency Operator',
        status: reviewData.status,
        notes: reviewData.notes || reviewData.operatorNotes || '',
        triggerNotification: reviewData.triggerNotification
      };
      const res = await fetch(`${API_BASE}/predictions/${predictionId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to submit operator review' };
    }
  },

  async sendTestPredictionEmail(email: string): Promise<{ success: boolean; message: string; result?: any }> {
    try {
      const res = await fetch(`${API_BASE}/predictions/test-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ email })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to send test email alert' };
    }
  },

  async getPredictionDiagnostics(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/predictions/diagnostics`);
      if (res.ok) {
        const data = await res.json();
        return data.diagnostics || null;
      }
    } catch (e) {
      console.error('Error fetching prediction diagnostics:', e);
    }
    return null;
  },

  // AI Emergency Chatbot Endpoints
  async sendChatMessage(payload: {
    message: string;
    sessionId: string;
    language?: string;
    userLocation?: { lat: number; lng: number };
  }): Promise<{
    success: boolean;
    reply: string;
    language?: string;
    detectedLanguage?: string;
    direction?: 'ltr' | 'rtl';
    source?: string;
    sourceLabel?: string;
    liveData?: any;
    actionButtons?: any[];
    suggestedQuestions?: string[];
    timestamp?: string;
    message?: string;
  }> {
    try {
      const res = await fetch(`${API_BASE}/chatbot/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (e: any) {
      return {
        success: false,
        reply: 'Emergency assistance network error. For immediate life threats, dial 112.',
        source: 'ai_guidance',
        message: e.message || 'Network connection failed'
      };
    }
  },

  async getChatHistory(sessionId: string): Promise<{ success: boolean; messages: ChatbotMessage[] }> {
    try {
      const res = await fetch(`${API_BASE}/chatbot/history?sessionId=${encodeURIComponent(sessionId)}`, {
        headers: getAuthHeader()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.error('Error fetching chat history:', e);
    }
    return { success: false, messages: [] };
  },

  async clearChatHistory(sessionId: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/chatbot/history?sessionId=${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to clear chat history' };
    }
  },

  async getChatbotQuickData(): Promise<ChatbotQuickData | null> {
    try {
      const res = await fetch(`${API_BASE}/chatbot/quick-data`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.error('Error fetching chatbot quick data:', e);
    }
    return null;
  },

  async getChatbotLanguages(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/chatbot/languages`);
      if (res.ok) {
        const data = await res.json();
        return data.languages || [];
      }
    } catch (e) {
      console.error('Error fetching chatbot languages:', e);
    }
    return [];
  },

  async detectLanguage(text: string, previousLanguage?: string): Promise<{
    success: boolean;
    language: string;
    confidence: string;
    isAmbiguous: boolean;
    name: string;
    nativeName: string;
    script: string;
  }> {
    try {
      const res = await fetch(`${API_BASE}/chatbot/detect-language`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, previousLanguage })
      });
      return await res.json();
    } catch (e: any) {
      return {
        success: false,
        language: 'en',
        confidence: 'low',
        isAmbiguous: true,
        name: 'English',
        nativeName: 'English',
        script: 'Latin'
      };
    }
  }
};

export const api = apiService;








