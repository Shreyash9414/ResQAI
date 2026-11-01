import React, { useState } from 'react';
import { Waves, Flame, Globe, CloudRain, Zap, Factory, ShieldCheck, CheckCircle2 } from 'lucide-react';

type PrecautionCategory = 'FLOOD' | 'FIRE' | 'EARTHQUAKE' | 'CYCLONE' | 'LIGHTNING' | 'INDUSTRIAL';

interface DisasterSafetyContent {
  id: PrecautionCategory;
  title: string;
  icon: React.ReactNode;
  before: string[];
  during: string[];
  after: string[];
}

const SAFETY_DATA: DisasterSafetyContent[] = [
  {
    id: 'FLOOD',
    title: 'Flood Safety',
    icon: <Waves className="w-5 h-5 text-blue-400" />,
    before: [
      'Prepare an emergency kit with clean water, food, and flashlight.',
      'Know your area evacuation routes and nearest emergency shelters.',
      'Keep electrical appliances disconnected in low ground areas.'
    ],
    during: [
      'Move to higher ground immediately when flood warnings are issued.',
      'Do not walk or drive through moving flood water.',
      'Stay updated via radio or mobile emergency alerts.'
    ],
    after: [
      'Avoid drinking tap water until confirmed safe by authorities.',
      'Inspect your home for structural or electrical damage before entering.',
      'Stay clear of fallen power lines and flooded electrical boxes.'
    ]
  },
  {
    id: 'FIRE',
    title: 'Fire Safety',
    icon: <Flame className="w-5 h-5 text-red-400" />,
    before: [
      'Install and test smoke detectors regularly.',
      'Plan at least two clear escape routes from every room.',
      'Keep fire extinguishers accessible and learn how to use them.'
    ],
    during: [
      'Evacuate immediately. Stay low underneath smoke.',
      'Touch doors with the back of your hand before opening to check heat.',
      'Never use elevators during a fire evacuation.'
    ],
    after: [
      'Do not re-enter the building until emergency services declare it safe.',
      'Seek medical treatment for smoke inhalation or burns.',
      'Notify family members of your safety status.'
    ]
  },
  {
    id: 'EARTHQUAKE',
    title: 'Earthquake Safety',
    icon: <Globe className="w-5 h-5 text-amber-400" />,
    before: [
      'Secure heavy furniture and overhead objects to walls.',
      'Identify safe indoor shelter spots like sturdy desks or load-bearing walls.',
      'Prepare emergency contact details and first aid kit.'
    ],
    during: [
      'DROP to your hands and knees.',
      'COVER your head and neck under a sturdy table or desk.',
      'HOLD ON until shaking stops completely.'
    ],
    after: [
      'Be prepared for aftershocks.',
      'Check yourself and others for injuries.',
      'Inspect utility lines (gas, water, electric) for leaks.'
    ]
  },
  {
    id: 'CYCLONE',
    title: 'Cyclone Safety',
    icon: <CloudRain className="w-5 h-5 text-cyan-400" />,
    before: [
      'Board up windows and secure outdoor items.',
      'Stock up on emergency rations and battery-powered lights.',
      'Charge cell phones and power banks.'
    ],
    during: [
      'Stay indoors away from windows and glass doors.',
      'If the eye of the storm passes, stay inside as winds will resume from opposite direction.',
      'Turn off main power gas switches if directed.'
    ],
    after: [
      'Wait for official all-clear warnings before stepping outside.',
      'Avoid standing water near downed lines or damaged trees.',
      'Report damaged infrastructure to local authorities.'
    ]
  },
  {
    id: 'LIGHTNING',
    title: 'Lightning Safety',
    icon: <Zap className="w-5 h-5 text-yellow-400" />,
    before: [
      'Monitor local weather forecasts for thunderstorm warnings.',
      'Identify sturdy enclosed shelter nearby.'
    ],
    during: [
      'When thunder roars, go indoors immediately.',
      'Avoid open fields, hilltops, and tall isolated trees.',
      'Stay away from corded phones, electronics, and plumbing fixtures.'
    ],
    after: [
      'Wait at least 30 minutes after the last sound of thunder before going back outside.',
      'Provide immediate CPR to lightning strike victims if needed.'
    ]
  },
  {
    id: 'INDUSTRIAL',
    title: 'Industrial Hazard',
    icon: <Factory className="w-5 h-5 text-purple-400" />,
    before: [
      'Know the hazardous material risks in your area.',
      'Keep protective masks or clean cloth available.'
    ],
    during: [
      'Evacuate crosswind or shelter-in-place as directed by emergency officials.',
      'Close all doors, windows, and ventilation systems.',
      'Cover nose and mouth with a damp cloth.'
    ],
    after: [
      'Seek medical attention if exposed to toxic fumes or chemicals.',
      'Follow decontamination guidelines before entering clean areas.'
    ]
  }
];

export const SafetyPrecautionsPanel: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<PrecautionCategory>('FLOOD');
  const [activeTab, setActiveTab] = useState<'BEFORE' | 'DURING' | 'AFTER'>('DURING');

  const activeData = SAFETY_DATA.find(p => p.id === selectedCategory) || SAFETY_DATA[0];
  const activeInstructions = activeTab === 'BEFORE' ? activeData.before : activeTab === 'DURING' ? activeData.during : activeData.after;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      {/* Category Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {SAFETY_DATA.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`p-3 rounded-lg border text-xs font-semibold flex items-center space-x-2 transition-all ${
                isSelected
                  ? 'bg-slate-800 border-slate-700 text-white font-bold shadow'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat.icon}
              <span className="truncate">{cat.title}</span>
            </button>
          );
        })}
      </div>

      {/* Selected Precaution Details */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            {activeData.icon}
            <h3 className="font-bold text-base text-white">{activeData.title} Instructions</h3>
          </div>

          {/* Phase Tabs: Before, During, After */}
          <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            {(['BEFORE', 'DURING', 'AFTER'] as const).map((phase) => (
              <button
                key={phase}
                onClick={() => setActiveTab(phase)}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                  activeTab === phase
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {phase}
              </button>
            ))}
          </div>
        </div>

        {/* Concise Instructions List */}
        <ul className="space-y-2.5">
          {activeInstructions.map((item, idx) => (
            <li key={idx} className="flex items-start space-x-3 text-xs text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
