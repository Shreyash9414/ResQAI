import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { ChatMessage } from '../../types';
import { MessageSquare, Send, Paperclip, Shield, User, X, Radio } from 'lucide-react';

interface EmergencyChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencyChatModal: React.FC<EmergencyChatModalProps> = ({ isOpen, onClose }) => {
  const { user, role } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_1',
      senderId: 'usr_2',
      senderName: 'Commander Alex Vance',
      senderRole: 'Emergency Operator',
      recipientRole: 'All',
      channelId: 'general-command',
      text: 'ALL UNITS: Sector 9 Evacuation Boat Unit deployed. Police Squad clear road corridor on Outer Ring Road.',
      createdAt: new Date(Date.now() - 10 * 60000).toISOString()
    },
    {
      id: 'msg_2',
      senderId: 'usr_3',
      senderName: 'Metropolitan General Hospital',
      senderRole: 'Hospital',
      recipientRole: 'All',
      channelId: 'general-command',
      text: 'Trauma Bay 3 prepped for burn patients. 8 ICU beds available immediately.',
      createdAt: new Date(Date.now() - 4 * 60000).toISOString()
    }
  ]);

  const [input, setInput] = useState('');

  useEffect(() => {
    if (!socket) return;
    socket.on('new_message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });
    return () => {
      socket.off('new_message');
    };
  }, [socket]);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      senderId: user?.id || 'usr_local',
      senderName: user?.name || 'Commander Alex',
      senderRole: role,
      recipientRole: 'All',
      channelId: 'general-command',
      text: input,
      createdAt: new Date().toISOString()
    };

    if (socket) {
      socket.emit('send_message', newMsg);
    } else {
      setMessages((prev) => [...prev, newMsg]);
    }
    setInput('');
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-[#0c1222] border border-blue-500/40 rounded-2xl p-5 shadow-2xl flex flex-col h-[550px]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-700">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Cross-Agency Radio & Live Chat</h3>
              <p className="text-[11px] text-slate-400 font-mono">CHANNEL: GENERAL-COMMAND-DISPATCH</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 my-2">
          {messages.map((m) => {
            const isMe = m.senderName === user?.name;
            return (
              <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center space-x-1.5 mb-1 text-[10px] text-slate-400">
                  <span className="font-bold text-slate-300">{m.senderName}</span>
                  <span className="px-1.5 py-0.2 rounded bg-surface-card border border-slate-700 text-blue-400 font-mono">
                    {m.senderRole}
                  </span>
                  <span>• {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div
                  className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-xs ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-tr-none shadow-md'
                      : 'bg-surface-card text-slate-100 border border-slate-700 rounded-tl-none'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            );
          })}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="pt-3 border-t border-slate-700 flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Broadcast as ${role}...`}
            className="flex-1 px-4 py-2.5 rounded-xl bg-surface-card border border-slate-700 text-slate-100 text-xs focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/30"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
