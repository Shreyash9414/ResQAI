import React from 'react';
import { NotificationItem } from '../../types';
import { Bell, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex justify-end p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#0c1222] border border-slate-700 rounded-2xl p-5 shadow-2xl flex flex-col h-[500px] animate-in slide-in-from-right">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-red-500 animate-bounce" />
            <h3 className="font-extrabold text-sm text-white">Emergency Broadcast Alerts</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-3 rounded-xl border text-xs ${
                n.type === 'CRITICAL'
                  ? 'bg-red-950/50 border-red-800 text-red-200'
                  : 'bg-surface-card border-slate-700 text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between font-bold mb-1">
                <span className="flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span>{n.title}</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">{n.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
