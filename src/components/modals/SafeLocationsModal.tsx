import React from 'react';
import { Building2 as HospitalIcon, MapPin, Navigation, ShieldCheck, X, Phone, Compass } from 'lucide-react';
import { Hospital, ReliefCamp } from '../../types';

interface SafeLocationsModalProps {
  userLocation?: { lat: number; lng: number };
  hospitals?: Hospital[];
  camps?: ReliefCamp[];
  onClose: () => void;
}

export const SafeLocationsModal: React.FC<SafeLocationsModalProps> = ({
  userLocation = { lat: 28.6285, lng: 77.2052 },
  hospitals = [],
  camps = [],
  onClose
}) => {
  const calculateDist = (lat: number, lng: number) => {
    const R = 6371; // km
    const dLat = (lat - userLocation.lat) * (Math.PI / 180);
    const dLon = (lng - userLocation.lng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(userLocation.lat * (Math.PI / 180)) * Math.cos(lat * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  };

  const hospitalList = Array.isArray(hospitals) ? hospitals : (hospitals as any)?.hospitals || [];
  const safeSpots = [
    ...hospitalList.map((h: any) => ({
      id: h.id,
      name: h.name,
      type: 'HOSPITAL',
      address: h.address,
      phone: h.contactPhone || '+91 11 2658 8500',
      availableCapacity: `${h.availableBeds} WARD BEDS / ${h.availableICUBeds || 8} ICU BEDS`,
      distKm: calculateDist(h.location.lat, h.location.lng)
    })),
    ...camps.map(c => ({
      id: c.id,
      name: c.name,
      type: 'SHELTER',
      address: c.location.address,
      phone: c.contactPhone || '+91 98111 22233',
      availableCapacity: `${c.capacity - c.currentOccupants} SLOTS AVAILABLE`,
      distKm: calculateDist(c.location.lat, c.location.lng)
    })),
    {
      id: 'safe_zone_1',
      name: 'Connaught Central Open Safe Zone',
      type: 'SAFE_ZONE',
      address: 'Central Park Green Canopy Assembly Area',
      phone: '112 / Emergency Helplines',
      availableCapacity: 'UNLIMITED OUTDOOR SAFE ZONE',
      distKm: 0.45
    }
  ].sort((a, b) => a.distKm - b.distKm);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl rounded-3xl bg-[#0c1222] border border-slate-700 shadow-2xl p-6 space-y-4 font-mono">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-emerald-600/30 text-emerald-400 border border-emerald-500/50">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase">EMERGENCY EVACUATION MAP</span>
              <h3 className="text-lg font-extrabold text-white">Nearest Verified Safe Locations</h3>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Safe Spots List */}
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {safeSpots.map(spot => (
            <div
              key={spot.id}
              className="p-4 rounded-2xl bg-surface-card border border-slate-800 hover:border-emerald-500 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${
                    spot.type === 'HOSPITAL' ? 'bg-blue-950 text-blue-400 border border-blue-800' :
                    spot.type === 'SHELTER' ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' :
                    'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  }`}>
                    {spot.type === 'HOSPITAL' ? '🏥 EMERGENCY HOSPITAL' : spot.type === 'SHELTER' ? '⛺ RELIEF SHELTER' : '📍 SAFE ZONE'}
                  </span>
                  <span className="text-emerald-400 font-extrabold">
                    {spot.distKm} km away
                  </span>
                </div>

                <h4 className="font-extrabold text-sm text-white">{spot.name}</h4>
                <p className="text-slate-400 text-[11px]">{spot.address}</p>
                <p className="text-slate-300 text-[10px] font-bold">CAPACITY: {spot.availableCapacity}</p>
              </div>

              <div className="flex sm:flex-col items-center gap-2 w-full sm:w-auto">
                <a
                  href={`tel:${spot.phone}`}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs flex items-center justify-center space-x-1.5 transition-all w-full sm:w-auto border border-slate-700"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>CALL</span>
                </a>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs transition-all border border-slate-700"
        >
          [ CLOSE SAFE LOCATIONS ]
        </button>

      </div>
    </div>
  );
};
