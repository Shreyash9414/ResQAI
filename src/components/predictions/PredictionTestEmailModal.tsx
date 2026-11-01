import React, { useState } from 'react';
import { Mail, Send, X, CheckCircle, AlertTriangle, ShieldCheck, Server, Key, AlertCircle, Loader2 } from 'lucide-react';
import { apiService } from '../../services/api';

interface PredictionTestEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

export const PredictionTestEmailModal: React.FC<PredictionTestEmailModalProps> = ({
  isOpen,
  onClose,
  defaultEmail = 'smmandlik.1318@gmail.com'
}) => {
  const [recipientEmail, setRecipientEmail] = useState<string>(defaultEmail);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    details?: any;
    error?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !recipientEmail.includes('@')) return;

    setIsSubmitting(true);
    setResult(null);

    try {
      const res = await apiService.sendTestPredictionEmail(recipientEmail);
      if (res && res.success) {
        setResult({
          success: true,
          message: res.message || 'Diagnostic prediction warning email dispatched successfully.',
          details: res.result || res
        });
      } else {
        setResult({
          success: false,
          error: res?.message || 'Failed to dispatch test prediction email.',
          details: res?.result || res
        });
      }
    } catch (err: any) {
      setResult({
        success: false,
        error: err.response?.data?.message || err.message || 'Failed to dispatch test prediction email.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-sans">
      <div className="max-w-xl w-full bg-[#0b1329] border border-blue-500/40 rounded-3xl p-6 sm:p-7 space-y-5 shadow-[0_0_60px_rgba(59,130,246,0.25)] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-blue-950/80 border border-blue-500/50 text-blue-400">
              <Mail className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest">
                SMTP Gateway Diagnostic
              </span>
              <h3 className="text-lg font-bold text-white">Send Test Disaster Alert Email</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational Banner */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 space-y-2">
          <div className="flex items-center space-x-2 text-amber-400 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Pre-Broadcast Verification Mode</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            This dispatches a branded ResQAI High-Risk Disaster Alert email exclusively to the specified administrative address. It validates SMTP authentication, HTML rendering, and plain-text fallback without contacting registered citizens.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSendTestEmail} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Recipient Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="operator@resqai.org"
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Ensure this inbox is monitored to inspect delivery headers and layout formatting.
            </p>
          </div>

          {/* Results display */}
          {result && (
            <div
              className={`p-4 rounded-2xl text-xs space-y-2 border ${
                result.success
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                  : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
              }`}
            >
              <div className="flex items-center space-x-2 font-bold">
                {result.success ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                )}
                <span>{result.success ? 'Email Dispatched Successfully' : 'Delivery Test Failed'}</span>
              </div>
              <p className="text-[11px] text-slate-300">{result.message || result.error}</p>
              {(result.details?.messageId || result.details?.result?.messageId) && (
                <div className="pt-1 font-mono text-[10px] text-slate-400">
                  Provider Message-ID: <span className="text-white font-bold">{result.details?.messageId || result.details?.result?.messageId}</span>
                </div>
              )}
              {(result.details?.response || result.details?.result?.response) && (
                <div className="font-mono text-[10px] text-slate-400">
                  SMTP Status: <span className="text-emerald-300">{result.details?.response || result.details?.result?.response}</span>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !recipientEmail}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting & Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Diagnostic Alert</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
