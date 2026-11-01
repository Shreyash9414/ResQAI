import React, { useState, useEffect } from 'react';
import { Smartphone, Send, X, CheckCircle, AlertTriangle, ShieldCheck, Server, Key, AlertCircle } from 'lucide-react';
import { apiService } from '../../services/api';

interface TestSMSModalProps {
  onClose: () => void;
}

export const TestSMSModal: React.FC<TestSMSModalProps> = ({ onClose }) => {
  const [phoneNumber, setPhoneNumber] = useState<string>('+919876543210');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [twilioConfig, setTwilioConfig] = useState<{
    accountSid: string;
    authToken: string;
    phoneNumber: string;
    isReady: boolean;
    maskedSid?: string;
  } | null>(null);

  const [result, setResult] = useState<{
    success?: boolean;
    messageId?: string;
    providerMessageId?: string;
    status?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    apiService.getTwilioConfig().then(cfg => setTwilioConfig(cfg));
  }, []);

  const handleSendTestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;

    setIsSubmitting(true);
    setResult(null);

    try {
      const res = await apiService.sendTestSms(phoneNumber);
      setResult(res);
    } catch (err: any) {
      setResult({
        success: false,
        error: err.message || 'Failed to dispatch test SMS request.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-mono">
      <div className="max-w-lg w-full bg-[#0c1222] border-2 border-emerald-500/80 rounded-3xl p-6 space-y-5 shadow-[0_0_50px_rgba(16,185,129,0.3)] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3 text-emerald-400 font-extrabold">
            <div className="p-2 rounded-xl bg-emerald-950 border border-emerald-800">
              <Smartphone className="w-6 h-6 animate-pulse text-emerald-400" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">TWILIO SMS GATEWAY DIAGNOSTIC</span>
              <h3 className="text-lg font-extrabold text-white">📱 SEND REAL TWILIO TEST SMS</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Twilio Configuration Status Banner */}
        {twilioConfig && (
          <div className={`p-3 rounded-2xl border space-y-2 text-xs font-mono ${
            twilioConfig.isReady
              ? 'bg-emerald-950/40 border-emerald-700/80 text-emerald-300'
              : 'bg-amber-950/40 border-amber-600/80 text-amber-300'
          }`}>
            <div className="flex items-center justify-between font-extrabold">
              <span className="flex items-center space-x-1.5">
                <Key className="w-4 h-4" />
                <span>TWILIO CONFIGURATION STATUS</span>
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                twilioConfig.isReady ? 'bg-emerald-900 text-emerald-200' : 'bg-amber-900 text-amber-200'
              }`}>
                {twilioConfig.isReady ? '🟢 READY FOR DISPATCH' : '⚠️ INCOMPLETE CONFIG'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[10px] pt-1">
              <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                <span className="text-slate-500 block">ACCOUNT SID</span>
                <span className={`font-bold ${twilioConfig.accountSid === 'CONFIGURED' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {twilioConfig.accountSid}
                </span>
              </div>
              <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                <span className="text-slate-500 block">AUTH TOKEN</span>
                <span className={`font-bold ${twilioConfig.authToken === 'CONFIGURED' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {twilioConfig.authToken}
                </span>
              </div>
              <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                <span className="text-slate-500 block">SENDER PHONE</span>
                <span className={`font-bold ${twilioConfig.phoneNumber === 'CONFIGURED' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {twilioConfig.phoneNumber}
                </span>
              </div>
            </div>

            {!twilioConfig.isReady && (
              <p className="text-[10px] text-amber-200/90 pt-1 leading-relaxed">
                Set <code className="text-amber-400">TWILIO_ACCOUNT_SID</code>, <code className="text-amber-400">TWILIO_AUTH_TOKEN</code>, and <code className="text-amber-400">TWILIO_PHONE_NUMBER</code> in <code className="text-amber-400">server/.env</code> file to enable real mobile delivery.
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSendTestSms} className="space-y-4 text-xs">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-300 uppercase flex items-center space-x-1">
              <span>RECIPIENT MOBILE NUMBER (+91 FORMAT):</span>
            </label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+919876543210"
              className="w-full p-3 rounded-2xl bg-slate-900 border border-slate-800 text-emerald-400 font-extrabold text-sm focus:outline-none focus:border-emerald-500 transition-all font-mono"
              required
            />
            <span className="text-[10px] text-slate-500 block">
              Indian 10-digit format: <code className="text-emerald-400">+919876543210</code> or <code className="text-emerald-400">9876543210</code>
            </span>
          </div>

          {/* Response Result Display */}
          {result && (
            <div className={`p-4 rounded-2xl border space-y-2 font-mono text-xs ${
              result.success
                ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                : 'bg-red-950/80 border-red-600 text-red-300'
            }`}>
              <div className="flex items-center space-x-2 font-extrabold text-sm">
                {result.success ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>🟢 SMS PROVIDER ACCEPTED</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                    <span>🔴 SMS DISPATCH FAILED</span>
                  </>
                )}
              </div>

              {result.success ? (
                <div className="space-y-1 text-xs pt-1">
                  <p>Message ID: <strong className="text-white font-bold">{result.messageId || result.providerMessageId || 'SMxxxxxxxx'}</strong></p>
                  <p>Status: <strong className="text-emerald-400 font-bold uppercase">{result.status || 'queued'}</strong></p>
                  <p className="text-[11px] text-emerald-200">The Twilio SMS provider accepted the message for mobile delivery.</p>
                </div>
              ) : (
                <div className="space-y-1 text-xs pt-1">
                  <p className="font-bold text-red-200">Reason / Error:</p>
                  <p className="p-2.5 rounded-xl bg-slate-950 border border-red-800 text-red-400 text-xs font-mono break-all leading-relaxed">
                    {result.error}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all"
            >
              [ CLOSE ]
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !phoneNumber}
              className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs shadow-xl shadow-emerald-600/40 border border-emerald-400 transition-all flex items-center justify-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'SENDING TO TWILIO...' : '[ 📱 SEND TEST SMS ]'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
