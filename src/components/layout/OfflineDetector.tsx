import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, NavigationOff, AlertTriangle, X } from 'lucide-react';

interface OfflineDetectorProps {
  gpsStatus?: 'LIVE' | 'UPDATING' | 'ACCURACY_LOW' | 'PERMISSION_DENIED' | 'UNAVAILABLE';
  onRetryGps?: () => void;
}

export const OfflineDetector: React.FC<OfflineDetectorProps> = ({ gpsStatus, onRetryGps }) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showRestoredBanner, setShowRestoredBanner] = useState<boolean>(false);
  const [dismissGpsBanner, setDismissGpsBanner] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRestoredBanner(true);
      const timer = setTimeout(() => setShowRestoredBanner(false), 5000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestoredBanner(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="w-full space-y-2 mb-4">
      {/* Network Offline Banner */}
      {!isOnline && (
        <div className="bg-red-900/90 border border-red-500 text-red-100 p-4 rounded-xl shadow-xl flex items-start space-x-3 backdrop-blur-md animate-pulse">
          <WifiOff className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <div className="font-bold text-base flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
              🔴 You are offline
            </div>
            <p className="mt-1 text-red-200">
              Live disaster updates, rescue tracking and SOS communication may be unavailable.
            </p>
            <p className="mt-2 font-semibold text-white bg-red-950/80 px-3 py-1.5 rounded-lg border border-red-700/60 inline-block">
              Please contact official emergency services directly if this is a life-threatening emergency: <strong>112</strong> / <strong>108</strong> / <strong>101</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Network Connection Restored Banner */}
      {isOnline && showRestoredBanner && (
        <div className="bg-emerald-900/90 border border-emerald-500 text-emerald-100 p-3 rounded-xl shadow-lg flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <Wifi className="w-5 h-5 text-emerald-400" />
            <div>
              <span className="font-bold">🟢 Connection restored</span>
              <span className="text-xs text-emerald-200 ml-2">Live services are available again.</span>
            </div>
          </div>
          <button
            onClick={() => setShowRestoredBanner(false)}
            className="text-emerald-300 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* GPS Unavailable / Permission Denied Banner */}
      {(gpsStatus === 'PERMISSION_DENIED' || gpsStatus === 'UNAVAILABLE') && !dismissGpsBanner && (
        <div className="bg-amber-900/90 border border-amber-500 text-amber-100 p-3.5 rounded-xl shadow-lg flex items-start space-x-3 backdrop-blur-md">
          <NavigationOff className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <div className="font-bold text-amber-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              ⚠ GPS unavailable
            </div>
            <p className="text-xs text-amber-200/90 mt-0.5">
              Your current location cannot be determined. Location access is required to send your accurate emergency location to the response team.
            </p>
            {onRetryGps && (
              <button
                onClick={onRetryGps}
                className="mt-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm"
              >
                Retry Location Access
              </button>
            )}
          </div>
          <button
            onClick={() => setDismissGpsBanner(true)}
            className="text-amber-300 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
