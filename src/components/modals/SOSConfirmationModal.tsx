import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  MapPin,
  X,
  Loader2,
  PhoneCall,
  Shield,
  Ambulance,
  Flame,
  LifeBuoy,
  Waves,
  HelpCircle,
  CheckCircle2,
  Navigation
} from 'lucide-react';

export interface SOSSubmitPayload {
  description: string;
  selectedServices: string[];
  locationType: 'GPS_VERIFIED' | 'MANUAL_ENTRY';
  latitude: number;
  longitude: number;
  accuracy: number;
  manualAddress?: string;
  locationAcquisitionTime: string;
}

interface SOSConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: SOSSubmitPayload) => Promise<void>;
  currentGps: { lat: number; lng: number } | null;
  gpsAccuracy: number | null;
  gpsStatus?: 'IDLE' | 'LIVE' | 'PERMISSION_DENIED' | 'UNAVAILABLE' | 'UPDATING' | 'ACCURACY_LOW';
  isSubmitting?: boolean;
}

const AVAILABLE_SERVICES = [
  { id: 'Ambulance / Medical Emergency', label: 'Ambulance / Medical', icon: Ambulance, color: 'text-rose-400 bg-rose-950/60 border-rose-800/80' },
  { id: 'Police', label: 'Police', icon: Shield, color: 'text-blue-400 bg-blue-950/60 border-blue-800/80' },
  { id: 'Fire Brigade', label: 'Fire Brigade', icon: Flame, color: 'text-amber-400 bg-amber-950/60 border-amber-800/80' },
  { id: 'Disaster Rescue', label: 'Disaster Rescue', icon: LifeBuoy, color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/80' },
  { id: 'Flood / Water Rescue', label: 'Flood / Water Rescue', icon: Waves, color: 'text-cyan-400 bg-cyan-950/60 border-cyan-800/80' },
  { id: 'Other Emergency', label: 'Other Emergency', icon: HelpCircle, color: 'text-purple-400 bg-purple-950/60 border-purple-800/80' }
];

export const SOSConfirmationModal: React.FC<SOSConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentGps,
  gpsAccuracy,
  gpsStatus = 'LIVE',
  isSubmitting = false
}) => {
  const [description, setDescription] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>(['Ambulance / Medical Emergency']);
  const [useManualLocation, setUseManualLocation] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [manualLat, setManualLat] = useState('20.0050');
  const [manualLng, setManualLng] = useState('73.7880');
  const [localSubmitting, setLocalSubmitting] = useState(false);
  const [acquisitionTime, setAcquisitionTime] = useState<string>(new Date().toLocaleTimeString());

  useEffect(() => {
    if (currentGps) {
      setAcquisitionTime(new Date().toLocaleTimeString());
      setUseManualLocation(false);
    } else if (gpsStatus === 'PERMISSION_DENIED' || gpsStatus === 'UNAVAILABLE') {
      setUseManualLocation(true);
    }
  }, [currentGps, gpsStatus]);

  if (!isOpen) return null;

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev => {
      if (prev.includes(serviceId)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter(s => s !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };

  const handleConfirmSubmit = async () => {
    if (localSubmitting || isSubmitting) return;

    let lat = currentGps?.lat;
    let lng = currentGps?.lng;
    let accuracy = gpsAccuracy || 5;
    const isManual = useManualLocation || !currentGps;

    if (isManual) {
      lat = parseFloat(manualLat) || 20.0050;
      lng = parseFloat(manualLng) || 73.7880;
      accuracy = 50; // Labeled manual accuracy
    }

    if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
      alert('Please provide valid device GPS coordinates or enter your manual location landmark.');
      return;
    }

    try {
      setLocalSubmitting(true);
      await onConfirm({
        description,
        selectedServices,
        locationType: isManual ? 'MANUAL_ENTRY' : 'GPS_VERIFIED',
        latitude: lat,
        longitude: lng,
        accuracy,
        manualAddress: isManual ? (manualAddress || 'Manual Emergency Landmark') : undefined,
        locationAcquisitionTime: new Date().toISOString()
      });
    } finally {
      setLocalSubmitting(false);
    }
  };

  const loadingState = localSubmitting || isSubmitting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative text-white space-y-4 max-h-[92vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loadingState}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 text-red-500">
          <div className="p-2.5 bg-red-950/80 rounded-xl border border-red-800 animate-pulse">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-wide uppercase">Emergency SOS Confirmation</h2>
            <p className="text-xs text-red-400 font-semibold">Priority-1 Direct Command Room Dispatch</p>
          </div>
        </div>

        {/* Call 112 India National Helpline Banner */}
        <div className="bg-gradient-to-r from-red-950/80 via-slate-900 to-red-950/80 border border-red-700/70 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-white shadow-lg animate-bounce">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider">India Emergency Helpline</p>
              <p className="text-[11px] text-red-200">National All-in-One Emergency Services</p>
            </div>
          </div>
          <a
            href="tel:112"
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-lg shadow-md transition flex items-center space-x-1.5 border border-red-400"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Call 112</span>
          </a>
        </div>

        {/* Emergency Services Selector (Multi-select) */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Select Required Emergency Services:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {AVAILABLE_SERVICES.map(svc => {
              const Icon = svc.icon;
              const isSelected = selectedServices.includes(svc.id);
              return (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => toggleService(svc.id)}
                  disabled={loadingState}
                  className={`p-2.5 rounded-xl border text-left text-xs font-medium transition flex flex-col justify-between space-y-1.5 ${
                    isSelected
                      ? `${svc.color} ring-2 ring-red-500 shadow-md`
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className="w-4 h-4" />
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <span className="leading-tight text-[11px] font-semibold">{svc.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Location Status: GPS Verified vs Manual Entry */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-bold text-slate-200">
              <MapPin className={`w-4 h-4 ${useManualLocation ? 'text-amber-400' : 'text-emerald-400'}`} />
              <span>Location Transmission:</span>
            </span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
              useManualLocation
                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
            }`}>
              {useManualLocation ? 'Manual Entry (Unverified GPS)' : 'Live GPS (Verified)'}
            </span>
          </div>

          {!useManualLocation && currentGps ? (
            <div className="space-y-1 text-xs font-mono">
              <div className="text-emerald-400 flex items-center justify-between font-bold">
                <span>{currentGps.lat.toFixed(6)}, {currentGps.lng.toFixed(6)}</span>
                <span className="text-[11px] text-slate-400 font-sans font-normal">
                  Accuracy: ±{gpsAccuracy ? Math.round(gpsAccuracy) : 5}m
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-sans">
                Acquired at {acquisitionTime} via device hardware Geolocation API.
              </p>
            </div>
          ) : (
            <div className="space-y-2 pt-1 text-xs">
              <div className="text-amber-300 text-[11px]">
                {gpsStatus === 'PERMISSION_DENIED'
                  ? 'GPS permission denied. Enter your location landmark below:'
                  : 'GPS unavailable or manual entry selected:'}
              </div>
              <input
                type="text"
                value={manualAddress}
                onChange={e => setManualAddress(e.target.value)}
                placeholder="e.g. Near Panchavati Riverbank, Old Godavari Bridge"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualLat}
                  onChange={e => setManualLat(e.target.value)}
                  placeholder="Latitude"
                  className="w-1/2 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                />
                <input
                  type="text"
                  value={manualLng}
                  onChange={e => setManualLng(e.target.value)}
                  placeholder="Longitude"
                  className="w-1/2 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => setUseManualLocation(!useManualLocation)}
              className="text-[11px] text-slate-400 hover:text-white underline decoration-slate-600 transition"
            >
              {useManualLocation ? 'Switch to Device GPS' : 'Enter Location Manually'}
            </button>
          </div>
        </div>

        {/* Situation Details */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
            Optional Situation Description:
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Trapped on 2nd floor, water rising rapidly, 3 elderly family members..."
            rows={2}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
          />
        </div>

        {/* Actions: Send SOS / Cancel */}
        <div className="flex items-center space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loadingState}
            className="w-1/3 py-3 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition border border-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmSubmit}
            disabled={loadingState}
            className="w-2/3 py-3 px-4 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 border border-red-500 ring-2 ring-red-500/30"
          >
            {loadingState ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Broadcasting SOS...</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4" />
                <span>SOS — GET EMERGENCY HELP</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
