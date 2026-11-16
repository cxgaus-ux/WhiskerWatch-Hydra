import React, { useState, useEffect } from 'react';

// ============================================================================
// 1. DEFINITIONS & OPTIONS FOR IDMARKS AND VITALS
// ============================================================================

export interface CoatTypeDef {
  value: string;
  label: string;
  legacyPrimary: string;
  legacySubtype?: string;
}

export const COAT_TYPE_OPTIONS: CoatTypeDef[] = [
  { value: 'solid black', label: 'Solid black', legacyPrimary: 'Solid' },
  { value: 'solid white', label: 'Solid white', legacyPrimary: 'Solid' },
  { value: 'solid blue', label: 'Solid blue', legacyPrimary: 'Solid' },
  { value: 'tabby', label: 'Tabby', legacyPrimary: 'Tabby' },
  { value: 'calico', label: 'Calico', legacyPrimary: 'Calico' },
  { value: 'tortoiseshell/blended', label: 'Tortoiseshell/blended', legacyPrimary: 'Tortoiseshell' },
  { value: 'bicolour/tuxedo', label: 'Bicolour/tuxedo', legacyPrimary: 'Two-Tone (Bi-Color)' },
  { value: 'colourpoint', label: 'Colourpoint', legacyPrimary: 'Siamese-Style (Pointed)' },
  { value: 'unknown', label: 'Unknown', legacyPrimary: '' },
];

export interface TabbySubtypeDef {
  value: string;
  label: string;
  legacySubtype: string;
}

export const TABBY_SUBTYPE_OPTIONS: TabbySubtypeDef[] = [
  { value: 'mackerel', label: 'Mackerel (Stripes)', legacySubtype: 'Tiger Stripes (Mackerel)' },
  { value: 'classic', label: 'Classic (Swirls / Marble)', legacySubtype: 'Swirls / Marble (Classic)' },
  { value: 'spotted', label: 'Spotted', legacySubtype: 'Spotted' },
  { value: 'ticked', label: 'Ticked (Flecked)', legacySubtype: 'Sandy / Flecked (Ticked)' },
  { value: 'ginger/orange tabby', label: 'Ginger / Orange Tabby', legacySubtype: 'Tiger Stripes (Mackerel)' },
  { value: 'unknown', label: 'Unknown / Unspecified', legacySubtype: '' },
];

export interface DominantColorDef {
  value: string;
  label: string;
  legacyColor: string;
}

export const DOMINANT_COLOR_OPTIONS: DominantColorDef[] = [
  { value: 'white', label: 'White', legacyColor: 'White' },
  { value: 'black', label: 'Black', legacyColor: 'Black' },
  { value: 'ginger', label: 'Ginger', legacyColor: 'Orange / Ginger' },
  { value: 'grey', label: 'Grey', legacyColor: 'Grey' },
  { value: 'dilute ginger/cream', label: 'Dilute ginger/cream', legacyColor: 'Cream / Tan' },
  { value: 'mixed', label: 'Mixed', legacyColor: 'Brown' },
  { value: 'unknown', label: 'Unknown', legacyColor: '' },
];

export interface WhitePercentDef {
  value: string;
  label: string;
  numericPct: number | null;
}

export const WHITE_PERCENT_OPTIONS: WhitePercentDef[] = [
  { value: '0%', label: '0% (No white)', numericPct: 0 },
  { value: '10%', label: '10% (Minimal / locket)', numericPct: 10 },
  { value: '25%', label: '25% (Bib & socks)', numericPct: 25 },
  { value: '50%', label: '50% (Half white)', numericPct: 50 },
  { value: '75%', label: '75% (Mostly white)', numericPct: 75 },
  { value: '90%', label: '90% (Van pattern)', numericPct: 90 },
  { value: '100%', label: '100% (All white)', numericPct: 100 },
  { value: 'unknown', label: 'Unknown', numericPct: null },
];

export const UNIQUE_FINGERPRINT_EXAMPLES: string[] = [
  'white tipped tail',
  'damaged ears',
  'bob tail',
  'scars',
  'black whisker base',
  'kinked tail',
  'notched ear',
  'folded ear',
  'nose blotch',
  'broad tomcat jowls',
];

export interface SterilisationDef {
  value: string;
  label: string;
  shortLabel: string;
}

export const STERILISATION_OPTIONS: SterilisationDef[] = [
  { value: 'Unsterilised', label: 'Intact ear = not sterilised', shortLabel: 'Intact ear (Not sterilised)' },
  { value: 'Sterilised', label: 'TNR mark = sterilised', shortLabel: 'TNR mark (Sterilised)' },
  { value: 'Unknown', label: 'Unknown', shortLabel: 'Unknown' },
];

export interface GenderDef {
  value: string;
  label: string;
}

export const GENDER_OPTIONS: GenderDef[] = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Unknown', label: 'Unknown' },
];

export interface AgeDef {
  value: string;
  label: string;
}

export const ESTIMATED_AGE_OPTIONS: AgeDef[] = [
  { value: 'Newborn', label: 'Newborn (<8 weeks)' },
  { value: 'Kitten', label: 'Kitten (<6 months)' },
  { value: 'Junior', label: 'Junior (>6 months – <2 years)' },
  { value: 'Adult', label: 'Adult (3–10 years)' },
  { value: 'Senior', label: 'Senior (>11–14 years)' },
  { value: 'Unknown', label: 'Unknown' },
];

export interface BodyConditionDef {
  value: string;
  label: string;
  tone: 'amber' | 'emerald' | 'red' | 'slate';
}

export const BODY_CONDITION_OPTIONS: BodyConditionDef[] = [
  { value: 'Underweight', label: 'Underweight', tone: 'amber' },
  { value: 'Ideal', label: 'Ideal', tone: 'emerald' },
  { value: 'Overweight', label: 'Overweight', tone: 'amber' },
  { value: 'Obese', label: 'Obese', tone: 'red' },
  { value: 'Unknown', label: 'Unknown', tone: 'slate' },
];

export interface HealthStatusDef {
  value: string;
  code: string;
  label: string;
  tone: 'emerald' | 'amber' | 'orange' | 'red' | 'rose' | 'slate';
  description?: string;
  visualCues?: string;
}

export const HEALTH_STATUS_OPTIONS: HealthStatusDef[] = [
  {
    value: 'Healthy',
    code: '5.1',
    label: 'Healthy',
    tone: 'emerald',
    description: 'Cat appears bright, active, and free of visible injuries or discharge.',
    visualCues: 'Alert, responsive, clean coat, normal gait, clear eyes and nose, and an ideal or slightly lean body shape.',
  },
  {
    value: 'Minor issues',
    code: '5.2',
    label: 'Minor issues',
    tone: 'amber',
    description: 'Cat has minor, non-urgent physical issues or mild upper respiratory symptoms. Still alert and mobile.',
    visualCues: 'Minor scratches, small healed wounds, slight ear tipping/mites, mild sneezing, slight eye discharge, or slightly underweight/matted fur, while still moving and eating normally.',
  },
  {
    value: 'Compromised',
    code: '5.3',
    label: 'Compromised',
    tone: 'orange',
    description: 'Cat shows clear signs of illness, pain, or injury that affect daily function. Requires trapping and medical evaluation.',
    visualCues: 'Noticeable limping, open or infected wounds, heavy nasal/eye discharge, severe flea/parasite burden, significant hair loss, visibly underweight, or lethargic behavior.',
  },
  {
    value: 'Threat to life',
    code: '5.4',
    label: 'Threat to life',
    tone: 'red',
    description: 'Cat has a severe, life-threatening injury or acute medical crisis. Requires urgent veterinary intervention.',
    visualCues: 'Severe trauma (e.g., hit by car), active heavy bleeding, open fractures, extreme emaciation, labored or open-mouth breathing, or inability to stand/walk.',
  },
  {
    value: 'Moribund',
    code: '5.5',
    label: 'Moribund',
    tone: 'rose',
    description: 'Cat is unresponsive or actively dying. Requires immediate emergency dispatch for humane veterinary assessment and relief of suffering.',
    visualCues: 'Unresponsive, collapsed, gasping for air, cold to the touch, severe neurological signs (seizures), or catastrophic trauma with no signs of recovery.',
  },
  {
    value: 'Dead',
    code: '5.6',
    label: 'Dead',
    tone: 'slate',
    description: 'Cat is confirmed deceased.',
    visualCues: 'No vital signs; records the cat as Confirmed Dead.',
  },
  {
    value: 'Unknown',
    code: '5.7',
    label: 'Unknown',
    tone: 'slate',
    description: 'Health status has not yet been assessed or is unclear from the photo/sighting.',
    visualCues: 'Insufficient visual detail to confirm health status.',
  },
];

export interface ReproductiveDef {
  value: string;
  label: string;
}

export const REPRODUCTIVE_OPTIONS: ReproductiveDef[] = [
  { value: 'Unknown', label: 'Unknown' },
  { value: 'In heat', label: 'In heat' },
  { value: 'Pregnant', label: 'Pregnant' },
  { value: 'Nursing', label: 'Nursing' },
];

export interface VetCareDef {
  value: string;
  label: string;
}

export const VET_CARE_OPTIONS: VetCareDef[] = [
  { value: 'Currently under care', label: 'Currently under care' },
  { value: 'Returned from vet', label: 'Returned from vet' },
  { value: 'Unknown', label: 'Not under care / Unknown' },
];

// ============================================================================
// 2. VISUAL SYMBOL COMPONENTS
// ============================================================================

export const ConfirmedOrAiBadge: React.FC<{
  confirmed?: boolean;
  isUnknown?: boolean;
  onConfirmClick?: (e: React.MouseEvent) => void;
}> = ({ confirmed, isUnknown, onConfirmClick }) => {
  if (confirmed) {
    return (
      <span
        title="Confirmed by user"
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-950/90 border border-emerald-500/70 text-emerald-300 text-[10px] font-bold shrink-0 shadow-sm"
      >
        <svg className="w-3 h-3 text-emerald-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
            clipRule="evenodd"
          />
        </svg>
        <span>Confirmed</span>
      </span>
    );
  }
  if (isUnknown) {
    return null;
  }
  return (
    <span
      onClick={onConfirmClick}
      title="AI entry — tap to confirm or select an option to override"
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-950/80 border border-indigo-700/70 text-indigo-300 text-[10px] font-semibold shrink-0 ${
        onConfirmClick ? 'hover:bg-emerald-950 hover:border-emerald-600 hover:text-emerald-300 cursor-pointer' : ''
      }`}
    >
      <span>✦ AI</span>
    </span>
  );
};

export const CoatTypeSymbol: React.FC<{ coatType: string; tabbySubtype?: string; size?: number }> = ({
  coatType,
  tabbySubtype,
  size = 22,
}) => {
  const rawNorm = (coatType || 'unknown').toLowerCase().trim();
  const subNorm = (tabbySubtype || '').toLowerCase().trim();
  const norm =
    rawNorm === 'tabby' && subNorm && subNorm !== 'unknown'
      ? subNorm
      : rawNorm;

  switch (norm) {
    case 'solid black':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
          <circle cx="12" cy="12" r="10" fill="#18181b" stroke="#52525b" strokeWidth="1.8" />
          <path d="M7 8 A6 6 0 0 1 15 6.5" stroke="#71717a" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        </svg>
      );
    case 'solid white':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
          <circle cx="12" cy="12" r="10" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.8" />
          <path d="M7 8 A6 6 0 0 1 15 6.5" stroke="#cbd5e1" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        </svg>
      );
    case 'solid blue':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
          <circle cx="12" cy="12" r="10" fill="#64748b" stroke="#94a3b8" strokeWidth="1.8" />
          <path d="M7 8 A6 6 0 0 1 15 6.5" stroke="#cbd5e1" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        </svg>
      );
    case 'classic':
    case 'tabby-classic':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
          <circle cx="12" cy="12" r="10" fill="#92400e" stroke="#d97706" strokeWidth="1.6" />
          <path
            d="M12 7 C15.5 7 17.5 9.5 17 12.5 C16.5 15.5 13.5 17.5 10.5 16.5 C8 15.5 7 12.5 8.5 10.5 C9.8 8.8 12.5 9.2 13.5 11 C14.2 12.2 13 13.8 11.5 13.2"
            stroke="#1c1917"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      );
    case 'tabby':
    case 'mackerel':
    case 'tabby-mackerel':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
          <circle cx="12" cy="12" r="10" fill="#a16207" stroke="#eab308" strokeWidth="1.6" />
          <path d="M7.5 5.5 C6.5 10 6.5 14 7.5 18.5" stroke="#1c1917" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M12 4.5 L12 19.5" stroke="#1c1917" strokeWidth="2.1" strokeLinecap="round" fill="none" />
          <path d="M16.5 5.5 C17.5 10 17.5 14 16.5 18.5" stroke="#1c1917" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
      );
    case 'spotted':
    case 'tabby-spotted':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
          <circle cx="12" cy="12" r="10" fill="#b45309" stroke="#f59e0b" strokeWidth="1.6" />
          <circle cx="8.5" cy="9" r="1.6" fill="#1c1917" />
          <circle cx="14.5" cy="8.5" r="1.6" fill="#1c1917" />
          <circle cx="12" cy="12.5" r="1.7" fill="#1c1917" />
          <circle cx="8.5" cy="15.5" r="1.5" fill="#1c1917" />
          <circle cx="15.2" cy="15" r="1.6" fill="#1c1917" />
        </svg>
      );
    case 'ticked':
    case 'tabby-ticked':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
          <circle cx="12" cy="12" r="10" fill="#a8a29e" stroke="#d6d3d1" strokeWidth="1.6" />
          <path
            d="M8 8 L9.5 6.5 M12 7.5 L13.5 6 M15.5 9 L17 7.5 M7 12.5 L8.5 11 M11 12.5 L12.5 11 M15 13 L16.5 11.5 M8.5 16.5 L10 15 M13 17 L14.5 15.5"
            stroke="#292524"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'ginger/orange':
    case 'ginger/orange tabby':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
          <circle cx="12" cy="12" r="10" fill="#fb923c" stroke="#ea580c" strokeWidth="1.8" />
          <path d="M7.5 6 C6.5 10 6.5 14 7.5 18" stroke="#9a3412" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M12 4.5 L12 19.5" stroke="#9a3412" strokeWidth="2.1" strokeLinecap="round" fill="none" />
          <path d="M16.5 6 C17.5 10 17.5 14 16.5 18" stroke="#9a3412" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
      );
    case 'calico':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
          <circle cx="12" cy="12" r="10" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.6" />
          <path d="M12 2 A10 10 0 0 1 21.5 15 L12 12 Z" fill="#ea580c" />
          <path d="M2.5 15 A10 10 0 0 1 12 2 L12 12 Z" fill="#18181b" />
          <circle cx="12" cy="12" r="10" fill="none" stroke="#cbd5e1" strokeWidth="1.6" />
        </svg>
      );
    case 'tortoiseshell/blended':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
          <circle cx="12" cy="12" r="10" fill="#18181b" stroke="#d97706" strokeWidth="1.6" />
          <path d="M6 7 Q10 5 12 9 T18 8" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M5 13 Q9 16 14 13 T19 15" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <circle cx="10" cy="17" r="2" fill="#fbbf24" />
          <circle cx="15" cy="10" r="1.8" fill="#ea580c" />
        </svg>
      );
    case 'bicolour/tuxedo':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
          <circle cx="12" cy="12" r="10" fill="#18181b" stroke="#94a3b8" strokeWidth="1.6" />
          <path d="M7 19.5 L12 10 L17 19.5 A10 10 0 0 1 7 19.5 Z" fill="#f8fafc" />
          <circle cx="12" cy="12" r="10" fill="none" stroke="#94a3b8" strokeWidth="1.6" />
        </svg>
      );
    case 'colourpoint':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
          <circle cx="12" cy="12" r="10" fill="#451a03" stroke="#d6d3d1" strokeWidth="1.6" />
          <circle cx="12" cy="12" r="6.2" fill="#fef3c7" />
        </svg>
      );
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
          <circle
            cx="12"
            cy="12"
            r="9.5"
            fill="#1e293b"
            stroke="#64748b"
            strokeWidth="1.6"
            strokeDasharray="3 2.5"
          />
          <text
            x="12"
            y="15.5"
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="11"
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            ?
          </text>
        </svg>
      );
  }
};

export const DominantColorSymbol: React.FC<{ color: string; size?: number }> = ({
  color,
  size = 20,
}) => {
  const norm = (color || 'unknown').toLowerCase().trim();

  switch (norm) {
    case 'white':
      return (
        <span
          style={{ width: size, height: size, backgroundColor: '#f8fafc', borderColor: '#94a3b8' }}
          className="rounded-full border-2 inline-block shrink-0 shadow-inner"
        />
      );
    case 'black':
      return (
        <span
          style={{ width: size, height: size, backgroundColor: '#18181b', borderColor: '#71717a' }}
          className="rounded-full border-2 inline-block shrink-0 shadow-inner"
        />
      );
    case 'ginger':
      return (
        <span
          style={{ width: size, height: size, backgroundColor: '#ea580c', borderColor: '#fb923c' }}
          className="rounded-full border-2 inline-block shrink-0 shadow-inner"
        />
      );
    case 'grey':
      return (
        <span
          style={{ width: size, height: size, backgroundColor: '#64748b', borderColor: '#cbd5e1' }}
          className="rounded-full border-2 inline-block shrink-0 shadow-inner"
        />
      );
    case 'dilute ginger/cream':
      return (
        <span
          style={{ width: size, height: size, backgroundColor: '#fed7aa', borderColor: '#fb923c' }}
          className="rounded-full border-2 inline-block shrink-0 shadow-inner"
        />
      );
    case 'mixed':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
          <path d="M12 2 A10 10 0 0 1 22 12 L12 12 Z" fill="#ea580c" />
          <path d="M22 12 A10 10 0 0 1 12 22 L12 12 Z" fill="#f8fafc" />
          <path d="M12 22 A10 10 0 0 1 2 12 L12 12 Z" fill="#64748b" />
          <path d="M2 12 A10 10 0 0 1 12 2 L12 12 Z" fill="#18181b" />
          <circle cx="12" cy="12" r="10" fill="none" stroke="#94a3b8" strokeWidth="1.8" />
        </svg>
      );
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
          <circle
            cx="12"
            cy="12"
            r="9.5"
            fill="#1e293b"
            stroke="#64748b"
            strokeWidth="1.6"
            strokeDasharray="3 2.5"
          />
          <text
            x="12"
            y="15.5"
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="11"
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            ?
          </text>
        </svg>
      );
  }
};

export const WhitePieSymbol: React.FC<{ whitePercent: string | number | null | undefined; size?: number }> = ({
  whitePercent,
  size = 22,
}) => {
  const str = String(whitePercent ?? 'unknown').trim().toLowerCase();
  if (!str || str === 'unknown' || str === 'not specified') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
        <circle
          cx="12"
          cy="12"
          r="9.5"
          fill="#1e293b"
          stroke="#64748b"
          strokeWidth="1.6"
          strokeDasharray="3 2.5"
        />
        <path d="M12 2.5 L12 12 L19.5 12" stroke="#64748b" strokeWidth="1.5" fill="none" />
      </svg>
    );
  }

  const numMatch = str.match(/(\d+)/);
  const pct = numMatch ? Math.max(0, Math.min(100, parseInt(numMatch[1], 10))) : 0;

  if (pct <= 0) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
        <circle cx="12" cy="12" r="9.5" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.8" />
        <line x1="12" y1="2.5" x2="12" y2="12" stroke="#64748b" strokeWidth="1.5" />
      </svg>
    );
  }

  if (pct >= 100) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
        <circle cx="12" cy="12" r="9.5" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.8" />
      </svg>
    );
  }

  const r = 9.5;
  const cx = 12;
  const cy = 12;
  const angleRad = ((pct / 100) * 360 - 90) * (Math.PI / 180);
  const x = cx + r * Math.cos(angleRad);
  const y = cy + r * Math.sin(angleRad);
  const largeArc = pct > 50 ? 1 : 0;
  const d = `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${largeArc} 1 ${x.toFixed(2)} ${y.toFixed(2)} Z`;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
      <circle cx="12" cy="12" r="9.5" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.6" />
      <path d={d} fill="#f8fafc" />
      <circle cx="12" cy="12" r="9.5" fill="none" stroke="#94a3b8" strokeWidth="1.6" />
    </svg>
  );
};

export const EarSterilisationSymbol: React.FC<{ status: string; size?: number }> = ({
  status,
  size = 20,
}) => {
  const s = (status || 'Unknown').toLowerCase();
  if (s === 'sterilised' || s.includes('tnr') || s.includes('tipped')) {
    // Cut-off triangle (TNR mark = sterilised)
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
        <path
          d="M4 20 L8.5 9 L15.5 9 L20 20 Z"
          fill="rgba(16, 185, 129, 0.2)"
          stroke="#34d399"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line x1="6.5" y1="9" x2="17.5" y2="9" stroke="#fde047" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (s === 'unsterilised' || s.includes('intact') || s.includes('not sterilised')) {
    // Full triangle (intact ear = not sterilised)
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
        <path
          d="M4 20 L12 4 L20 20 Z"
          fill="rgba(245, 158, 11, 0.18)"
          stroke="#fbbf24"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  // Unknown
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path
        d="M4 20 L12 4 L20 20 Z"
        stroke="#64748b"
        strokeWidth="1.8"
        strokeDasharray="3 2.5"
        strokeLinejoin="round"
      />
      <text x="12" y="17.5" textAnchor="middle" fill="#94a3b8" fontSize="9.5" fontWeight="bold">
        ?
      </text>
    </svg>
  );
};

export const GenderSymbol: React.FC<{ sex: string; size?: number }> = ({ sex, size = 18 }) => {
  const s = (sex || 'Unknown').toLowerCase();
  if (s === 'male') {
    return (
      <span className="inline-flex items-center justify-center font-black text-sky-400 text-base leading-none shrink-0" style={{ width: size, height: size }}>
        ♂
      </span>
    );
  }
  if (s === 'female') {
    return (
      <span className="inline-flex items-center justify-center font-black text-pink-400 text-base leading-none shrink-0" style={{ width: size, height: size }}>
        ♀
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center font-bold text-slate-400 text-xs leading-none shrink-0" style={{ width: size, height: size }}>
      ?
    </span>
  );
};

// ============================================================================
// 3. NORMALIZATION & COMPATIBILITY HELPERS
// ============================================================================

export function parseWhitePercentValue(val: string | number | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim().toLowerCase();
  if (!s || s === 'unknown' || s === 'none' || s === 'not specified') return null;
  const m = s.match(/(\d+)/);
  if (!m) return null;
  return Math.max(0, Math.min(100, parseInt(m[1], 10)));
}

export function normalizeTabbySubtypeValue(rawSub?: string, rawCoat?: string): string {
  const s = String(rawSub || '').trim();
  const sLower = s.toLowerCase();
  const cLower = String(rawCoat || '').trim().toLowerCase();

  if (sLower === 'unknown' || sLower === 'unspecified' || sLower === 'none') {
    return 'unknown';
  }
  if (sLower.includes('classic') || sLower.includes('swirl') || sLower.includes('marble') || sLower.includes('blotch')) {
    return 'classic';
  }
  if (sLower.includes('mackerel') || sLower.includes('stripe') || sLower.includes('tiger')) {
    return 'mackerel';
  }
  if (sLower.includes('spotted') || sLower === 'spots') {
    return 'spotted';
  }
  if (sLower.includes('ticked') || sLower.includes('sandy') || sLower.includes('flecked') || sLower.includes('agouti')) {
    return 'ticked';
  }
  if (sLower.includes('ginger') || sLower.includes('orange')) {
    return 'ginger/orange tabby';
  }
  if (s.length > 0) {
    return s;
  }

  // Fallback to legacy combined coatType if subtype was encoded there
  if (cLower === 'tabby-classic') return 'classic';
  if (cLower === 'tabby-mackerel') return 'mackerel';
  if (cLower === 'tabby-spotted') return 'spotted';
  if (cLower === 'tabby-ticked') return 'ticked';
  if (cLower === 'ginger/orange tabby') return 'ginger/orange tabby';

  return 'unknown';
}

export function formatCoatTypeWithSubtype(coatType: string, tabbySubtype?: string): string {
  const c = (coatType || 'unknown').toLowerCase().trim();
  if (c === 'tabby' || c.includes('tabby')) {
    const sub = normalizeTabbySubtypeValue(tabbySubtype, coatType);
    if (sub && sub !== 'unknown') {
      const opt = TABBY_SUBTYPE_OPTIONS.find((o) => o.value === sub.toLowerCase());
      return `Tabby (${opt ? opt.label : sub})`;
    }
    return 'Tabby';
  }
  const opt = COAT_TYPE_OPTIONS.find((o) => o.value === c);
  return opt ? opt.label : coatType || 'Unknown';
}

export interface NormalizedIdMarks {
  coatType: string;
  tabbySubtype: string;
  dominantColor: string;
  whitePercent: string;
  uniqueFingerprints: string;
  confirmedFields: Record<string, boolean>;
  // Backward-compatible fields kept in sync for 3-Tier matching engine
  primaryCoatType: string;
  colors: string[];
  earStatus: string;
  whiteSpotting: string[];
  structuralFeatures: string[];
  tailFeatures: string[];
  tier3Notes: string;
}

export function normalizeIdMarks(catOrTaxonomy: any): NormalizedIdMarks {
  const isCat =
    catOrTaxonomy &&
    typeof catOrTaxonomy === 'object' &&
    ('currentMetrics' in catOrTaxonomy || 'identifyingNumber' in catOrTaxonomy || 'taxonomy' in catOrTaxonomy);

  const rawTax = isCat ? catOrTaxonomy.taxonomy || {} : catOrTaxonomy || {};
  const textBlob = isCat
    ? `${catOrTaxonomy.markings || ''} ${catOrTaxonomy.description || ''} ${catOrTaxonomy.notes || ''}`.toLowerCase()
    : `${rawTax.tier3Notes || ''} ${rawTax.uniqueFingerprints || ''}`.toLowerCase();

  // 1. Resolve Primary Coat Type & Separate Tabby Subtype
  const rawCoatStr = String(rawTax.coatType || '').toLowerCase().trim();
  let coatType = rawCoatStr;
  const validCoatValues = new Set(COAT_TYPE_OPTIONS.map((o) => o.value));

  if (
    rawCoatStr === 'tabby' ||
    rawCoatStr === 'tabby-classic' ||
    rawCoatStr === 'tabby-mackerel' ||
    rawCoatStr === 'tabby-spotted' ||
    rawCoatStr === 'tabby-ticked' ||
    rawCoatStr === 'ginger/orange tabby' ||
    rawCoatStr.includes('tabby')
  ) {
    coatType = 'tabby';
  } else if (!validCoatValues.has(coatType)) {
    const pCoat = (rawTax.primaryCoatType || '').toLowerCase();
    const cols: string[] = Array.isArray(rawTax.colors) ? rawTax.colors.map((c: string) => c.toLowerCase()) : [];

    if (pCoat.includes('calico') || textBlob.includes('calico')) {
      coatType = 'calico';
    } else if (pCoat.includes('tortoiseshell') || pCoat.includes('tortie') || textBlob.includes('tortoiseshell') || textBlob.includes('tortie')) {
      coatType = 'tortoiseshell/blended';
    } else if (pCoat.includes('pointed') || pCoat.includes('siamese') || pCoat.includes('colourpoint') || pCoat.includes('colorpoint') || textBlob.includes('colourpoint') || textBlob.includes('colorpoint') || textBlob.includes('siamese')) {
      coatType = 'colourpoint';
    } else if (pCoat.includes('bi-color') || pCoat.includes('bicolor') || pCoat.includes('bicolour') || pCoat.includes('two-tone') || textBlob.includes('tuxedo') || textBlob.includes('bicolour') || textBlob.includes('bicolor')) {
      coatType = 'bicolour/tuxedo';
    } else if (pCoat.includes('tabby') || textBlob.includes('tabby')) {
      coatType = 'tabby';
    } else if (pCoat.includes('solid') || textBlob.includes('solid')) {
      if (cols.some((c) => c.includes('white')) || textBlob.includes('solid white') || textBlob.includes('pure white')) {
        coatType = 'solid white';
      } else if (cols.some((c) => c.includes('grey') || c.includes('blue')) || textBlob.includes('solid blue') || textBlob.includes('solid grey')) {
        coatType = 'solid blue';
      } else {
        coatType = 'solid black';
      }
    } else {
      coatType = 'unknown';
    }
  }

  let tabbySubtype = 'unknown';
  if (coatType === 'tabby') {
    tabbySubtype = normalizeTabbySubtypeValue(rawTax.tabbySubtype, rawCoatStr);
    if (tabbySubtype === 'unknown' && !rawTax.tabbySubtype && !rawCoatStr.startsWith('tabby-')) {
      if (textBlob.includes('classic') || textBlob.includes('swirl') || textBlob.includes('marble')) {
        tabbySubtype = 'classic';
      } else if (textBlob.includes('spotted')) {
        tabbySubtype = 'spotted';
      } else if (textBlob.includes('ticked') || textBlob.includes('flecked')) {
        tabbySubtype = 'ticked';
      } else if (textBlob.includes('mackerel') || textBlob.includes('tiger stripe')) {
        tabbySubtype = 'mackerel';
      }
    }
  } else {
    tabbySubtype = '';
  }

  // 2. Resolve Dominant Coat Colour
  let dominantColor = (rawTax.dominantColor || '').toLowerCase().trim();
  const validColorValues = new Set(DOMINANT_COLOR_OPTIONS.map((o) => o.value));

  if (!validColorValues.has(dominantColor)) {
    const cols: string[] = Array.isArray(rawTax.colors) ? rawTax.colors.map((c: string) => c.toLowerCase()) : [];
    if (cols.length > 1 || coatType === 'calico' || coatType === 'tortoiseshell/blended') {
      dominantColor = 'mixed';
    } else if (cols[0]?.includes('white') || coatType === 'solid white') {
      dominantColor = 'white';
    } else if (cols[0]?.includes('black') || coatType === 'solid black') {
      dominantColor = 'black';
    } else if (cols[0]?.includes('orange') || cols[0]?.includes('ginger') || rawCoatStr === 'ginger/orange tabby' || tabbySubtype === 'ginger/orange tabby') {
      dominantColor = 'ginger';
    } else if (cols[0]?.includes('grey') || cols[0]?.includes('gray') || coatType === 'solid blue') {
      dominantColor = 'grey';
    } else if (cols[0]?.includes('cream') || cols[0]?.includes('tan') || cols[0]?.includes('dilute')) {
      dominantColor = 'dilute ginger/cream';
    } else if (cols[0]?.includes('brown')) {
      dominantColor = 'mixed';
    } else {
      dominantColor = 'unknown';
    }
  }

  // 3. Resolve Percent White Distribution
  let whitePercent = String(rawTax.whitePercent ?? '').trim();
  if (!whitePercent) {
    if (coatType === 'solid white') {
      whitePercent = '100%';
    } else if (coatType === 'solid black' || coatType === 'solid blue') {
      whitePercent = '0%';
    } else if (Array.isArray(rawTax.whiteSpotting) && rawTax.whiteSpotting.length > 0) {
      const count = rawTax.whiteSpotting.length;
      whitePercent = count === 1 ? '10%' : count <= 3 ? '25%' : count <= 5 ? '50%' : '75%';
    } else {
      whitePercent = 'unknown';
    }
  }

  // 4. Resolve Unique Fingerprints (folding in any legacy structuralFeatures & tailFeatures so nothing is lost)
  const legacyStruct: string[] = Array.isArray(rawTax.structuralFeatures) ? rawTax.structuralFeatures : [];
  const legacyTail: string[] = Array.isArray(rawTax.tailFeatures) ? rawTax.tailFeatures : [];
  const rawNotes =
    rawTax.uniqueFingerprints !== undefined
      ? rawTax.uniqueFingerprints
      : rawTax.tier3Notes || (isCat ? catOrTaxonomy.markings || '' : '');

  const cleanRawNotes =
    typeof rawNotes === 'string' &&
    rawNotes.toLowerCase() !== 'unknown' &&
    rawNotes.toLowerCase() !== 'awaiting manual verification' &&
    rawNotes.toLowerCase() !== 'pending visual inspection'
      ? rawNotes.trim()
      : '';

  const mergedParts = [...legacyStruct, ...legacyTail, cleanRawNotes]
    .map((s) => String(s || '').trim())
    .filter(Boolean);
  const uniqueParts: string[] = [];
  for (const p of mergedParts) {
    if (!uniqueParts.some((u) => u.toLowerCase().includes(p.toLowerCase()))) {
      uniqueParts.push(p);
    }
  }
  const uniqueFingerprints = uniqueParts.join(', ');

  // 5. Confirmed Fields map
  const confirmedFields: Record<string, boolean> = {
    ...(isCat && catOrTaxonomy.confirmedFields ? catOrTaxonomy.confirmedFields : {}),
    ...(rawTax.confirmedFields || {}),
  };

  // Map back to legacy fields so 3-Tier matching engine (Pw) works seamlessly
  const coatOpt = COAT_TYPE_OPTIONS.find((o) => o.value === coatType);
  const colorOpt = DOMINANT_COLOR_OPTIONS.find((o) => o.value === dominantColor);
  const primaryCoatType = coatOpt?.legacyPrimary || rawTax.primaryCoatType || '';
  const colors =
    dominantColor !== 'unknown' && colorOpt?.legacyColor
      ? [colorOpt.legacyColor]
      : Array.isArray(rawTax.colors)
      ? rawTax.colors
      : [];

  return {
    coatType,
    tabbySubtype,
    dominantColor,
    whitePercent,
    uniqueFingerprints,
    confirmedFields,
    primaryCoatType,
    colors,
    earStatus: rawTax.earStatus || '',
    whiteSpotting: Array.isArray(rawTax.whiteSpotting) ? rawTax.whiteSpotting : [],
    structuralFeatures: [],
    tailFeatures: [],
    tier3Notes: uniqueFingerprints,
  };
}

export function formatIdMarksSummary(taxOrCat: any): string {
  if (!taxOrCat) return '';
  const norm = normalizeIdMarks(taxOrCat);
  const parts: string[] = [];

  if (norm.coatType && norm.coatType !== 'unknown') {
    parts.push(formatCoatTypeWithSubtype(norm.coatType, norm.tabbySubtype));
  }
  if (norm.dominantColor && norm.dominantColor !== 'unknown') {
    const opt = DOMINANT_COLOR_OPTIONS.find((o) => o.value === norm.dominantColor);
    parts.push(`Colour: ${opt ? opt.label : norm.dominantColor}`);
  }
  if (norm.whitePercent && norm.whitePercent.toLowerCase() !== 'unknown') {
    parts.push(`White: ${norm.whitePercent}`);
  }
  if (norm.uniqueFingerprints && norm.uniqueFingerprints.trim()) {
    parts.push(`Fingerprints: ${norm.uniqueFingerprints.trim()}`);
  }
  return parts.join(' · ');
}

export interface NormalizedVitals {
  sterilisation: string; // 'Sterilised' | 'Unsterilised' | 'Unknown'
  sex: string; // 'Male' | 'Female' | 'Unknown'
  lifeStage: string; // 'Newborn' | 'Kitten' | 'Junior' | 'Adult' | 'Senior' | 'Unknown'
  bodyCondition: string; // 'Underweight' | 'Ideal' | 'Overweight' | 'Obese' | 'Unknown'
  health: string; // 'Healthy' | 'Minor issues' | 'Compromised' | 'Threat to life' | 'Moribund' | 'Dead' | 'Unknown'
  reproductiveStatus: string; // 'Unknown' | 'In heat' | 'Pregnant' | 'Nursing'
  vetCare: string; // 'Currently under care' | 'Returned from vet' | 'Unknown'
  confirmedFields: Record<string, boolean>;
}

export function normalizeVitals(cat: any, careEpisodes: any[] = []): NormalizedVitals {
  const m = cat?.currentMetrics || {};
  const tax = cat?.taxonomy || {};

  // 1. TNR ear clip / sterilisation status (combined)
  let sterilisation = m.sterilisation || 'Unknown';
  if (sterilisation === 'Sterilised' || tax.earStatus === 'TNR Tipped') {
    sterilisation = 'Sterilised';
  } else if (sterilisation === 'Unsterilised' || tax.earStatus === 'Normal / Intact') {
    sterilisation = 'Unsterilised';
  } else {
    sterilisation = 'Unknown';
  }

  // 2. Gender
  let sex = m.sex || 'Unknown';
  if (sex !== 'Male' && sex !== 'Female') sex = 'Unknown';

  // 3. Estimated Age
  let lifeStage = m.lifeStage || 'Unknown';
  if (lifeStage === 'Juvenile' || lifeStage === 'Adolescent') lifeStage = 'Junior';
  if (!['Newborn', 'Kitten', 'Junior', 'Adult', 'Senior', 'Unknown'].includes(lifeStage)) {
    lifeStage = 'Unknown';
  }

  // 4. Body Condition
  let bodyCondition = m.bodyCondition || 'Unknown';
  if (bodyCondition === 'Good') bodyCondition = 'Ideal';
  if (bodyCondition === 'Thin' || bodyCondition === 'Emaciated') bodyCondition = 'Underweight';
  if (!['Underweight', 'Ideal', 'Overweight', 'Obese', 'Unknown'].includes(bodyCondition)) {
    bodyCondition = 'Unknown';
  }

  // 5. Health Status
  let health = m.health || 'Unknown';
  if (cat?.activeState === 'deceased') {
    health = 'Dead';
  } else if (health === 'Unwell') {
    health = 'Minor issues';
  } else if (health === 'Critically ill/injured') {
    health = 'Threat to life';
  }
  if (!['Healthy', 'Minor issues', 'Compromised', 'Threat to life', 'Moribund', 'Dead', 'Unknown'].includes(health)) {
    health = 'Unknown';
  }

  // 6. Reproductive Status
  let reproductiveStatus = m.reproductiveStatus || '';
  if (!reproductiveStatus) {
    const inds: string[] = m.reproductive?.indicators || [];
    if (inds.includes('In heat')) reproductiveStatus = 'In heat';
    else if (inds.includes('Pregnant')) reproductiveStatus = 'Pregnant';
    else if (inds.includes('Nursing') || inds.includes('Caring for kittens')) reproductiveStatus = 'Nursing';
    else reproductiveStatus = 'Unknown';
  }
  if (!['Unknown', 'In heat', 'Pregnant', 'Nursing'].includes(reproductiveStatus)) {
    reproductiveStatus = 'Unknown';
  }

  // 7. Vet Care
  const catEpisodes = Array.isArray(careEpisodes)
    ? careEpisodes.filter((ep) => ep && ep.catId === cat?.id && !ep.deletedAt)
    : [];
  const activeEp = catEpisodes.find((ep) => ep.returnDate === null);
  const returnedEp = catEpisodes.find((ep) => ep.returnDate !== null);

  let vetCare = m.vetCare || '';
  if (activeEp) {
    vetCare = 'Currently under care';
  } else if (!vetCare && returnedEp) {
    vetCare = 'Returned from vet';
  } else if (!['Currently under care', 'Returned from vet'].includes(vetCare)) {
    vetCare = 'Unknown';
  }

  const confirmedFields: Record<string, boolean> = {
    ...(cat?.confirmedFields || {}),
    ...(m.confirmedFields || {}),
    ...(tax.confirmedFields || {}),
  };

  return {
    sterilisation,
    sex,
    lifeStage,
    bodyCondition,
    health,
    reproductiveStatus,
    vetCare,
    confirmedFields,
  };
}

export function evaluateCatVitalsAlert(cat: any, alerts: any[] = []): { color: string; reason: string } {
  if (alerts && Array.isArray(alerts) && alerts.some((a) => a.catId === cat?.id && a.status !== 'Resolved')) {
    return { color: 'red', reason: 'Open urgent welfare alert' };
  }
  const v = normalizeVitals(cat);
  if (
    v.health === 'Threat to life' ||
    v.health === 'Moribund' ||
    v.health === 'Dead' ||
    cat?.currentMetrics?.health === 'Critically ill/injured' ||
    cat?.currentMetrics?.bodyCondition === 'Emaciated'
  ) {
    return { color: 'red', reason: `Health: ${v.health}` };
  }
  const warnings: string[] = [];
  if (v.health === 'Compromised' || v.health === 'Minor issues') {
    warnings.push(`Health: ${v.health}`);
  }
  if (v.bodyCondition === 'Underweight' || v.bodyCondition === 'Obese' || v.bodyCondition === 'Overweight') {
    warnings.push(`Body condition: ${v.bodyCondition}`);
  }
  if (v.sterilisation === 'Unsterilised') {
    warnings.push('Intact ear (Not sterilised)');
  }
  if (warnings.length > 0) {
    return { color: 'yellow', reason: warnings.join(', ') };
  }
  if (v.health === 'Healthy' && v.bodyCondition === 'Ideal' && v.sterilisation === 'Sterilised') {
    return { color: 'green', reason: 'Confirmed healthy, ideal condition, and sterilised' };
  }
  return { color: 'grey', reason: 'Incomplete or unknown vitals' };
}

// ============================================================================
// 4. INTERACTIVE IDMARKS EDITOR / VIEWER COMPONENT
// ============================================================================

export type IdMarksFieldKey = 'coatType' | 'tabbySubtype' | 'dominantColor' | 'whitePercent' | 'uniqueFingerprints';

export interface IdMarksInteractiveSectionProps {
  taxonomy: any;
  onSelectField: (fieldKey: IdMarksFieldKey, value: string) => void;
  defaultExpandAll?: boolean;
  compact?: boolean;
}

export const IdMarksInteractiveSection: React.FC<IdMarksInteractiveSectionProps> = ({
  taxonomy,
  onSelectField,
  defaultExpandAll = false,
  compact = false,
}) => {
  const norm = normalizeIdMarks(taxonomy);
  const [expandedField, setExpandedField] = useState<string | null>(defaultExpandAll ? 'ALL' : null);
  const [fingerprintDraft, setFingerprintDraft] = useState(norm.uniqueFingerprints || '');
  const [customSubtypeDraft, setCustomSubtypeDraft] = useState(() => {
    const isPreset = TABBY_SUBTYPE_OPTIONS.some((o) => o.value === (norm.tabbySubtype || '').toLowerCase());
    return !isPreset && norm.tabbySubtype && norm.tabbySubtype !== 'unknown' ? norm.tabbySubtype : '';
  });

  useEffect(() => {
    setFingerprintDraft(norm.uniqueFingerprints || '');
  }, [norm.uniqueFingerprints]);

  useEffect(() => {
    const isPreset = TABBY_SUBTYPE_OPTIONS.some((o) => o.value === (norm.tabbySubtype || '').toLowerCase());
    setCustomSubtypeDraft(!isPreset && norm.tabbySubtype && norm.tabbySubtype !== 'unknown' ? norm.tabbySubtype : '');
  }, [norm.tabbySubtype]);

  useEffect(() => {
    setExpandedField(defaultExpandAll ? 'ALL' : null);
  }, [defaultExpandAll]);

  const isExpanded = (field: string) => expandedField === 'ALL' || expandedField === field;
  const toggleExpand = (field: string) => {
    if (expandedField === 'ALL') {
      setExpandedField(null);
    } else {
      setExpandedField((prev) => (prev === field ? null : field));
    }
  };

  const handleSelectAndCollapse = (fieldKey: IdMarksFieldKey, value: string) => {
    onSelectField(fieldKey, value);
    setExpandedField(null);
  };

  const currentCoatObj =
    COAT_TYPE_OPTIONS.find((o) => o.value === norm.coatType) ||
    COAT_TYPE_OPTIONS[COAT_TYPE_OPTIONS.length - 1];
  const currentSubtypeObj = TABBY_SUBTYPE_OPTIONS.find(
    (o) => o.value === (norm.tabbySubtype || 'unknown').toLowerCase()
  );
  const currentSubtypeLabel = currentSubtypeObj
    ? currentSubtypeObj.label
    : norm.tabbySubtype && norm.tabbySubtype !== 'unknown'
    ? norm.tabbySubtype
    : 'Unknown / Unspecified';
  const currentColorObj =
    DOMINANT_COLOR_OPTIONS.find((o) => o.value === norm.dominantColor) ||
    DOMINANT_COLOR_OPTIONS[DOMINANT_COLOR_OPTIONS.length - 1];

  const handleToggleFingerprintChip = (chip: string) => {
    const currentList = fingerprintDraft
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const exists = currentList.some((c) => c.toLowerCase() === chip.toLowerCase());
    const nextList = exists
      ? currentList.filter((c) => c.toLowerCase() !== chip.toLowerCase())
      : [...currentList, chip];
    const nextStr = nextList.join(', ');
    setFingerprintDraft(nextStr);
    onSelectField('uniqueFingerprints', nextStr);
    setExpandedField(null);
  };

  return (
    <div className="space-y-2.5 text-xs">
      {/* 1. Coat Type */}
      <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/90 space-y-2.5 transition-all">
        <div
          onClick={() => toggleExpand('coatType')}
          className="flex items-center justify-between gap-2 cursor-pointer select-none"
        >
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              1. Coat Type
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <CoatTypeSymbol coatType={norm.coatType} tabbySubtype={norm.tabbySubtype} size={22} />
              <span
                className={`font-bold text-xs sm:text-sm ${
                  norm.coatType === 'unknown' ? 'text-slate-400' : 'text-slate-100'
                }`}
              >
                {currentCoatObj.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <ConfirmedOrAiBadge
              confirmed={!!norm.confirmedFields.coatType}
              isUnknown={norm.coatType === 'unknown'}
              onConfirmClick={(e) => {
                e.stopPropagation();
                handleSelectAndCollapse('coatType', norm.coatType);
              }}
            />
            <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-bold text-teal-300 hover:bg-slate-800">
              {isExpanded('coatType') ? 'Hide ▲' : 'Select ▼'}
            </span>
          </div>
        </div>

        {isExpanded('coatType') && (
          <div className="pt-2 border-t border-slate-800/80 space-y-3 animate-in fade-in duration-150">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {COAT_TYPE_OPTIONS.map((opt) => {
                const selected = norm.coatType === opt.value;
                const isUnk = opt.value === 'unknown';
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelectAndCollapse('coatType', opt.value)}
                    className={`px-2.5 py-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      selected
                        ? 'bg-teal-950/90 border-teal-400 ring-1 ring-teal-400/50 shadow-sm'
                        : 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <CoatTypeSymbol coatType={opt.value} size={18} />
                    <span
                      className={`text-[11px] font-bold truncate flex-1 ${
                        isUnk ? 'text-slate-400' : selected ? 'text-white' : 'text-slate-200'
                      }`}
                    >
                      {opt.label}
                    </span>
                    {selected && (
                      <span className="text-emerald-400 font-black text-xs shrink-0" title="Confirmed">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Tabby Subtype (collapsed the same way as Coat Type, with AI/Confirmation symbol and Select button) */}
      {norm.coatType === 'tabby' && (
        <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/90 space-y-2.5 transition-all">
          <div
            onClick={() => toggleExpand('tabbySubtype')}
            className="flex items-center justify-between gap-2 cursor-pointer select-none"
          >
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Tabby Subtype
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <CoatTypeSymbol coatType="tabby" tabbySubtype={norm.tabbySubtype} size={22} />
                <span
                  className={`font-bold text-xs sm:text-sm ${
                    !norm.tabbySubtype || norm.tabbySubtype === 'unknown'
                      ? 'text-slate-400'
                      : 'text-slate-100'
                  }`}
                >
                  {currentSubtypeLabel}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <ConfirmedOrAiBadge
                confirmed={!!norm.confirmedFields.tabbySubtype}
                isUnknown={false}
                onConfirmClick={(e) => {
                  e.stopPropagation();
                  handleSelectAndCollapse('tabbySubtype', norm.tabbySubtype || 'unknown');
                }}
              />
              <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-bold text-teal-300 hover:bg-slate-800">
                {isExpanded('tabbySubtype') ? 'Hide ▲' : 'Select ▼'}
              </span>
            </div>
          </div>

          {isExpanded('tabbySubtype') && (
            <div className="pt-2 border-t border-slate-800/80 space-y-2.5 animate-in fade-in duration-150">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {TABBY_SUBTYPE_OPTIONS.map((subOpt) => {
                  const selected = (norm.tabbySubtype || 'unknown').toLowerCase() === subOpt.value;
                  const isUnk = subOpt.value === 'unknown';
                  return (
                    <button
                      key={subOpt.value}
                      type="button"
                      onClick={() => handleSelectAndCollapse('tabbySubtype', subOpt.value)}
                      className={`px-2.5 py-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                        selected
                          ? 'bg-teal-950/90 border-teal-400 ring-1 ring-teal-400/50 shadow-sm'
                          : 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <CoatTypeSymbol coatType="tabby" tabbySubtype={subOpt.value} size={18} />
                      <span
                        className={`text-[11px] font-bold truncate flex-1 ${
                          isUnk ? 'text-slate-400' : selected ? 'text-white' : 'text-slate-200'
                        }`}
                      >
                        {subOpt.label}
                      </span>
                      {selected && (
                        <span className="text-emerald-400 font-black text-xs shrink-0" title="Confirmed">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={customSubtypeDraft}
                  onChange={(e) => setCustomSubtypeDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSelectAndCollapse('tabbySubtype', customSubtypeDraft.trim() || 'unknown');
                    }
                  }}
                  placeholder="Or enter a custom tabby subtype (e.g. broken mackerel, patched)..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500 placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => handleSelectAndCollapse('tabbySubtype', customSubtypeDraft.trim() || 'unknown')}
                  className="px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs cursor-pointer shrink-0 shadow-sm"
                >
                  ✓ Confirm
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Dominant Coat Colour */}
      <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/90 space-y-2.5 transition-all">
        <div
          onClick={() => toggleExpand('dominantColor')}
          className="flex items-center justify-between gap-2 cursor-pointer select-none"
        >
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              2. Dominant Coat Colour
            </span>
            <div className="flex items-center gap-2">
              <DominantColorSymbol color={norm.dominantColor} size={20} />
              <span
                className={`font-bold text-xs sm:text-sm ${
                  norm.dominantColor === 'unknown' ? 'text-slate-400' : 'text-slate-100'
                }`}
              >
                {currentColorObj.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <ConfirmedOrAiBadge
              confirmed={!!norm.confirmedFields.dominantColor}
              isUnknown={norm.dominantColor === 'unknown'}
              onConfirmClick={(e) => {
                e.stopPropagation();
                handleSelectAndCollapse('dominantColor', norm.dominantColor);
              }}
            />
            <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-bold text-teal-300 hover:bg-slate-800">
              {isExpanded('dominantColor') ? 'Hide ▲' : 'Select ▼'}
            </span>
          </div>
        </div>

        {isExpanded('dominantColor') && (
          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-1.5 animate-in fade-in duration-150">
            {DOMINANT_COLOR_OPTIONS.map((opt) => {
              const selected = norm.dominantColor === opt.value;
              const isUnk = opt.value === 'unknown';
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectAndCollapse('dominantColor', opt.value)}
                  className={`px-2.5 py-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                    selected
                      ? 'bg-teal-950/90 border-teal-400 ring-1 ring-teal-400/50 shadow-sm'
                      : 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <DominantColorSymbol color={opt.value} size={18} />
                  <span
                    className={`text-[11px] font-bold truncate flex-1 ${
                      isUnk ? 'text-slate-400' : selected ? 'text-white' : 'text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </span>
                  {selected && (
                    <span className="text-emerald-400 font-black text-xs shrink-0" title="Confirmed">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Percent White Distribution */}
      <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/90 space-y-2.5 transition-all">
        <div
          onClick={() => toggleExpand('whitePercent')}
          className="flex items-center justify-between gap-2 cursor-pointer select-none"
        >
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              3. Percent White Distribution
            </span>
            <div className="flex items-center gap-2">
              <WhitePieSymbol whitePercent={norm.whitePercent} size={22} />
              <span
                className={`font-bold text-xs sm:text-sm ${
                  !norm.whitePercent || norm.whitePercent.toLowerCase() === 'unknown'
                    ? 'text-slate-400'
                    : 'text-slate-100'
                }`}
              >
                {!norm.whitePercent || norm.whitePercent.toLowerCase() === 'unknown'
                  ? 'Unknown'
                  : `${norm.whitePercent} white fur`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <ConfirmedOrAiBadge
              confirmed={!!norm.confirmedFields.whitePercent}
              isUnknown={!norm.whitePercent || norm.whitePercent.toLowerCase() === 'unknown'}
              onConfirmClick={(e) => {
                e.stopPropagation();
                handleSelectAndCollapse('whitePercent', norm.whitePercent);
              }}
            />
            <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-bold text-teal-300 hover:bg-slate-800">
              {isExpanded('whitePercent') ? 'Hide ▲' : 'Select ▼'}
            </span>
          </div>
        </div>

        {isExpanded('whitePercent') && (
          <div className="pt-2 border-t border-slate-800/80 space-y-2 animate-in fade-in duration-150">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {WHITE_PERCENT_OPTIONS.map((opt) => {
                const selected = norm.whitePercent.toLowerCase() === opt.value.toLowerCase();
                const isUnk = opt.value === 'unknown';
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelectAndCollapse('whitePercent', opt.value)}
                    className={`px-2.5 py-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      selected
                        ? 'bg-teal-950/90 border-teal-400 ring-1 ring-teal-400/50 shadow-sm'
                        : 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <WhitePieSymbol whitePercent={opt.value} size={18} />
                    <span
                      className={`text-[11px] font-bold truncate flex-1 ${
                        isUnk ? 'text-slate-400' : selected ? 'text-white' : 'text-slate-200'
                      }`}
                    >
                      {opt.label}
                    </span>
                    {selected && (
                      <span className="text-emerald-400 font-black text-xs shrink-0" title="Confirmed">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {!compact && (
              <div className="flex items-center gap-2.5 pt-1 px-1">
                <span className="text-[11px] text-slate-400 shrink-0">Fine estimate:</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={
                    norm.whitePercent && norm.whitePercent !== 'unknown'
                      ? parseInt(norm.whitePercent, 10) || 0
                      : 0
                  }
                  onChange={(e) => onSelectField('whitePercent', `${e.target.value}%`)}
                  onMouseUp={() => setExpandedField(null)}
                  onTouchEnd={() => setExpandedField(null)}
                  className="flex-1 accent-teal-500 cursor-pointer"
                />
                <span className="text-[11px] font-mono font-bold text-teal-300 min-w-[38px] text-right">
                  {norm.whitePercent && norm.whitePercent !== 'unknown' ? norm.whitePercent : '—'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Unique Fingerprints */}
      <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/90 space-y-2.5 transition-all">
        <div
          onClick={() => toggleExpand('uniqueFingerprints')}
          className="flex items-center justify-between gap-2 cursor-pointer select-none"
        >
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              4. Unique Fingerprints
            </span>
            <p
              className={`font-semibold text-xs leading-relaxed ${
                norm.uniqueFingerprints ? 'text-indigo-200' : 'text-slate-400'
              }`}
            >
              {norm.uniqueFingerprints || 'Unknown / None recorded (e.g. white tipped tail, damaged ears, bob tail, scars, black whisker base)'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <ConfirmedOrAiBadge
              confirmed={!!norm.confirmedFields.uniqueFingerprints}
              isUnknown={!norm.uniqueFingerprints}
              onConfirmClick={(e) => {
                e.stopPropagation();
                handleSelectAndCollapse('uniqueFingerprints', norm.uniqueFingerprints);
              }}
            />
            <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-bold text-teal-300 hover:bg-slate-800">
              {isExpanded('uniqueFingerprints') ? 'Hide ▲' : 'Select ▼'}
            </span>
          </div>
        </div>

        {isExpanded('uniqueFingerprints') && (
          <div className="pt-2 border-t border-slate-800/80 space-y-2.5 animate-in fade-in duration-150">
            <div className="flex flex-wrap gap-1.5">
              {UNIQUE_FINGERPRINT_EXAMPLES.map((chip) => {
                const active = fingerprintDraft.toLowerCase().includes(chip.toLowerCase());
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleToggleFingerprintChip(chip)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                      active
                        ? 'bg-teal-950 border-teal-400 text-teal-200 shadow-sm'
                        : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                    }`}
                  >
                    {active ? `✓ ${chip}` : `+ ${chip}`}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={fingerprintDraft}
                onChange={(e) => setFingerprintDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSelectAndCollapse('uniqueFingerprints', fingerprintDraft.trim());
                  }
                }}
                placeholder="e.g. white tipped tail, damaged ears, bob tail, scars, black whisker base..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500 placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => handleSelectAndCollapse('uniqueFingerprints', fingerprintDraft.trim())}
                className="px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs cursor-pointer shrink-0 shadow-sm"
              >
                ✓ Confirm
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 5. INTERACTIVE VITALS EDITOR / VIEWER COMPONENT
// ============================================================================

export interface VitalsInteractiveSectionProps {
  vitals: NormalizedVitals;
  onSelectVital: (
    fieldKey: 'sterilisation' | 'sex' | 'lifeStage' | 'bodyCondition' | 'health' | 'reproductive' | 'vetCare',
    value: string
  ) => void;
  defaultExpandAll?: boolean;
}

export const VitalsInteractiveSection: React.FC<VitalsInteractiveSectionProps> = ({
  vitals,
  onSelectVital,
  defaultExpandAll = false,
}) => {
  const [expandedField, setExpandedField] = useState<string | null>(defaultExpandAll ? 'ALL' : null);
  const [activeHealthInfo, setActiveHealthInfo] = useState<HealthStatusDef | null>(null);

  useEffect(() => {
    setExpandedField(defaultExpandAll ? 'ALL' : null);
  }, [defaultExpandAll]);

  const isExpanded = (field: string) => expandedField === 'ALL' || expandedField === field;
  const toggleExpand = (field: string) => {
    if (expandedField === 'ALL') {
      setExpandedField(null);
    } else {
      setExpandedField((prev) => (prev === field ? null : field));
    }
  };

  const handleSelectVitalAndCollapse = (
    fieldKey: 'sterilisation' | 'sex' | 'lifeStage' | 'bodyCondition' | 'health' | 'reproductive' | 'vetCare',
    value: string
  ) => {
    onSelectVital(fieldKey, value);
    setExpandedField(null);
  };

  const sterObj =
    STERILISATION_OPTIONS.find((o) => o.value === vitals.sterilisation) ||
    STERILISATION_OPTIONS[2];
  const ageObj =
    ESTIMATED_AGE_OPTIONS.find((o) => o.value === vitals.lifeStage) ||
    ESTIMATED_AGE_OPTIONS[ESTIMATED_AGE_OPTIONS.length - 1];
  const bcsObj =
    BODY_CONDITION_OPTIONS.find((o) => o.value === vitals.bodyCondition) ||
    BODY_CONDITION_OPTIONS[BODY_CONDITION_OPTIONS.length - 1];
  const healthObj =
    HEALTH_STATUS_OPTIONS.find((o) => o.value === vitals.health) ||
    HEALTH_STATUS_OPTIONS[HEALTH_STATUS_OPTIONS.length - 1];
  const reproObj =
    REPRODUCTIVE_OPTIONS.find((o) => o.value === vitals.reproductiveStatus) ||
    REPRODUCTIVE_OPTIONS[0];
  const vetObj =
    VET_CARE_OPTIONS.find((o) => o.value === vitals.vetCare) ||
    VET_CARE_OPTIONS[2];

  const getHealthBadgeClasses = (tone: HealthStatusDef['tone'], selected = false) => {
    switch (tone) {
      case 'emerald':
        return selected
          ? 'bg-emerald-950 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400/50'
          : 'text-emerald-300';
      case 'amber':
        return selected
          ? 'bg-amber-950 border-amber-400 text-amber-200 ring-1 ring-amber-400/50'
          : 'text-amber-300';
      case 'orange':
        return selected
          ? 'bg-orange-950 border-orange-400 text-orange-200 ring-1 ring-orange-400/50'
          : 'text-orange-300';
      case 'red':
        return selected
          ? 'bg-red-950 border-red-400 text-red-200 ring-1 ring-red-400/50'
          : 'text-red-300';
      case 'rose':
        return selected
          ? 'bg-rose-950 border-rose-400 text-rose-200 ring-1 ring-rose-400/50'
          : 'text-rose-300';
      default:
        return selected
          ? 'bg-slate-800 border-slate-400 text-slate-200 ring-1 ring-slate-400/50'
          : 'text-slate-400';
    }
  };

  return (
    <div className="space-y-2.5 text-xs">
      {/* 1. TNR ear clip / sterilisation status (combined) */}
      <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/90 space-y-2.5">
        <div
          onClick={() => toggleExpand('sterilisation')}
          className="flex items-center justify-between gap-2 cursor-pointer select-none"
        >
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              1. TNR Ear Clip / Sterilisation Status
            </span>
            <div className="flex items-center gap-2">
              <EarSterilisationSymbol status={vitals.sterilisation} size={20} />
              <span
                className={`font-bold text-xs sm:text-sm ${
                  vitals.sterilisation === 'Unknown'
                    ? 'text-slate-400'
                    : vitals.sterilisation === 'Sterilised'
                    ? 'text-emerald-300'
                    : 'text-amber-300'
                }`}
              >
                {sterObj.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <ConfirmedOrAiBadge
              confirmed={!!vitals.confirmedFields.sterilisation}
              isUnknown={vitals.sterilisation === 'Unknown'}
              onConfirmClick={(e) => {
                e.stopPropagation();
                handleSelectVitalAndCollapse('sterilisation', vitals.sterilisation);
              }}
            />
            <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-bold text-teal-300 hover:bg-slate-800">
              {isExpanded('sterilisation') ? 'Hide ▲' : 'Select ▼'}
            </span>
          </div>
        </div>

        {isExpanded('sterilisation') && (
          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-1.5 animate-in fade-in duration-150">
            {STERILISATION_OPTIONS.map((opt) => {
              const selected = vitals.sterilisation === opt.value;
              const isUnk = opt.value === 'Unknown';
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectVitalAndCollapse('sterilisation', opt.value)}
                  className={`px-3 py-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                    selected
                      ? opt.value === 'Sterilised'
                        ? 'bg-emerald-950/90 border-emerald-400 text-white shadow-sm'
                        : opt.value === 'Unsterilised'
                        ? 'bg-amber-950/90 border-amber-400 text-white shadow-sm'
                        : 'bg-slate-800 border-slate-400 text-slate-200'
                      : 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <EarSterilisationSymbol status={opt.value} size={18} />
                  <span
                    className={`text-[11px] font-bold flex-1 ${
                      isUnk ? 'text-slate-400' : selected ? 'text-white' : 'text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </span>
                  {selected && <span className="text-emerald-400 font-black text-xs shrink-0">✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Gender */}
      <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/90 space-y-2.5">
        <div
          onClick={() => toggleExpand('sex')}
          className="flex items-center justify-between gap-2 cursor-pointer select-none"
        >
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              2. Gender
            </span>
            <div className="flex items-center gap-2">
              <GenderSymbol sex={vitals.sex} size={18} />
              <span
                className={`font-bold text-xs sm:text-sm ${
                  vitals.sex === 'Unknown' ? 'text-slate-400' : 'text-slate-100'
                }`}
              >
                {vitals.sex}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <ConfirmedOrAiBadge
              confirmed={!!vitals.confirmedFields.sex}
              isUnknown={vitals.sex === 'Unknown'}
              onConfirmClick={(e) => {
                e.stopPropagation();
                handleSelectVitalAndCollapse('sex', vitals.sex);
              }}
            />
            <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-bold text-teal-300 hover:bg-slate-800">
              {isExpanded('sex') ? 'Hide ▲' : 'Select ▼'}
            </span>
          </div>
        </div>

        {isExpanded('sex') && (
          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-1.5 animate-in fade-in duration-150">
            {GENDER_OPTIONS.map((opt) => {
              const selected = vitals.sex === opt.value;
              const isUnk = opt.value === 'Unknown';
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectVitalAndCollapse('sex', opt.value)}
                  className={`px-3 py-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                    selected
                      ? 'bg-teal-950/90 border-teal-400 text-white shadow-sm'
                      : 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <GenderSymbol sex={opt.value} size={16} />
                  <span
                    className={`text-[11px] font-bold flex-1 ${
                      isUnk ? 'text-slate-400' : selected ? 'text-white' : 'text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </span>
                  {selected && <span className="text-emerald-400 font-black text-xs shrink-0">✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Estimated Age */}
      <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/90 space-y-2.5">
        <div
          onClick={() => toggleExpand('lifeStage')}
          className="flex items-center justify-between gap-2 cursor-pointer select-none"
        >
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              3. Estimated Age
            </span>
            <span
              className={`font-bold text-xs sm:text-sm ${
                vitals.lifeStage === 'Unknown' ? 'text-slate-400' : 'text-slate-100'
              }`}
            >
              {ageObj.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <ConfirmedOrAiBadge
              confirmed={!!vitals.confirmedFields.lifeStage}
              isUnknown={vitals.lifeStage === 'Unknown'}
              onConfirmClick={(e) => {
                e.stopPropagation();
                handleSelectVitalAndCollapse('lifeStage', vitals.lifeStage);
              }}
            />
            <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-bold text-teal-300 hover:bg-slate-800">
              {isExpanded('lifeStage') ? 'Hide ▲' : 'Select ▼'}
            </span>
          </div>
        </div>

        {isExpanded('lifeStage') && (
          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 gap-1.5 animate-in fade-in duration-150">
            {ESTIMATED_AGE_OPTIONS.map((opt) => {
              const selected = vitals.lifeStage === opt.value;
              const isUnk = opt.value === 'Unknown';
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectVitalAndCollapse('lifeStage', opt.value)}
                  className={`px-2.5 py-2 rounded-xl border text-left flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
                    selected
                      ? 'bg-teal-950/90 border-teal-400 text-white shadow-sm'
                      : 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span
                    className={`text-[11px] font-bold ${
                      isUnk ? 'text-slate-400' : selected ? 'text-white' : 'text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </span>
                  {selected && <span className="text-emerald-400 font-black text-xs shrink-0">✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Body Condition */}
      <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/90 space-y-2.5">
        <div
          onClick={() => toggleExpand('bodyCondition')}
          className="flex items-center justify-between gap-2 cursor-pointer select-none"
        >
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              4. Body Condition
            </span>
            <span
              className={`font-bold text-xs sm:text-sm ${
                vitals.bodyCondition === 'Unknown'
                  ? 'text-slate-400'
                  : vitals.bodyCondition === 'Ideal'
                  ? 'text-emerald-300'
                  : vitals.bodyCondition === 'Obese'
                  ? 'text-red-300'
                  : 'text-amber-300'
              }`}
            >
              {bcsObj.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <ConfirmedOrAiBadge
              confirmed={!!vitals.confirmedFields.bodyCondition}
              isUnknown={vitals.bodyCondition === 'Unknown'}
              onConfirmClick={(e) => {
                e.stopPropagation();
                handleSelectVitalAndCollapse('bodyCondition', vitals.bodyCondition);
              }}
            />
            <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-bold text-teal-300 hover:bg-slate-800">
              {isExpanded('bodyCondition') ? 'Hide ▲' : 'Select ▼'}
            </span>
          </div>
        </div>

        {isExpanded('bodyCondition') && (
          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-5 gap-1.5 animate-in fade-in duration-150">
            {BODY_CONDITION_OPTIONS.map((opt) => {
              const selected = vitals.bodyCondition === opt.value;
              const isUnk = opt.value === 'Unknown';
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectVitalAndCollapse('bodyCondition', opt.value)}
                  className={`px-2.5 py-2 rounded-xl border text-left flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
                    selected
                      ? 'bg-teal-950/90 border-teal-400 text-white shadow-sm'
                      : 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span
                    className={`text-[11px] font-bold ${
                      isUnk ? 'text-slate-400' : selected ? 'text-white' : 'text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </span>
                  {selected && <span className="text-emerald-400 font-black text-xs shrink-0">✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Health Status (with info button for description & visual cues) */}
      <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/90 space-y-2.5">
        <div
          onClick={() => toggleExpand('health')}
          className="flex items-center justify-between gap-2 cursor-pointer select-none"
        >
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              5. Health Status (Tap ⓘ for Visual Cues)
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-bold text-xs sm:text-sm ${getHealthBadgeClasses(healthObj.tone, false)}`}>
                {healthObj.code} {healthObj.label}
              </span>
              {healthObj.description && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveHealthInfo((prev) => (prev?.value === healthObj.value ? null : healthObj));
                  }}
                  title="Show description and visual cues"
                  className="px-1.5 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-teal-300 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>ⓘ Info</span>
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <ConfirmedOrAiBadge
              confirmed={!!vitals.confirmedFields.health}
              isUnknown={vitals.health === 'Unknown'}
              onConfirmClick={(e) => {
                e.stopPropagation();
                handleSelectVitalAndCollapse('health', vitals.health);
              }}
            />
            <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-bold text-teal-300 hover:bg-slate-800">
              {isExpanded('health') ? 'Hide ▲' : 'Select ▼'}
            </span>
          </div>
        </div>

        {activeHealthInfo && (
          <div className="p-3 rounded-xl bg-teal-950/75 border border-teal-500/70 space-y-1.5 text-xs shadow-lg animate-in fade-in duration-150">
            <div className="flex items-center justify-between gap-2">
              <span className="font-extrabold text-white">
                {activeHealthInfo.code} {activeHealthInfo.label}
              </span>
              <button
                type="button"
                onClick={() => setActiveHealthInfo(null)}
                className="text-slate-300 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded bg-slate-900/80 cursor-pointer"
              >
                ✕
              </button>
            </div>
            {activeHealthInfo.description && (
              <p className="text-slate-100 leading-relaxed">{activeHealthInfo.description}</p>
            )}
            {activeHealthInfo.visualCues && (
              <p className="text-teal-200/95 leading-relaxed">
                <strong className="text-teal-300 font-bold">Visual Cues: </strong>
                {activeHealthInfo.visualCues}
              </p>
            )}
          </div>
        )}

        {isExpanded('health') && (
          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-1.5 animate-in fade-in duration-150">
            {HEALTH_STATUS_OPTIONS.map((opt) => {
              const selected = vitals.health === opt.value;
              const isUnk = opt.value === 'Unknown';
              const infoOpen = activeHealthInfo?.value === opt.value;
              return (
                <div
                  key={opt.value}
                  className={`flex items-stretch rounded-xl border overflow-hidden transition-all ${
                    selected
                      ? getHealthBadgeClasses(opt.tone, true)
                      : 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectVitalAndCollapse('health', opt.value)}
                    className="flex-1 px-2.5 py-2 text-left flex items-center justify-between gap-1.5 cursor-pointer min-w-0"
                  >
                    <span
                      className={`text-[11px] font-bold truncate ${
                        isUnk ? 'text-slate-400' : selected ? 'text-white' : 'text-slate-200'
                      }`}
                    >
                      {opt.code} {opt.label}
                    </span>
                    {selected && <span className="text-emerald-400 font-black text-xs shrink-0">✓</span>}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveHealthInfo(infoOpen ? null : opt);
                    }}
                    title={`${opt.label}: ${opt.description || ''} Visual Cues: ${opt.visualCues || ''}`}
                    className={`px-2.5 border-l flex items-center justify-center text-[11px] font-bold transition-colors cursor-pointer ${
                      infoOpen
                        ? 'bg-teal-600 text-white border-teal-400'
                        : 'bg-slate-950/70 hover:bg-slate-800 text-teal-300 border-slate-800'
                    }`}
                  >
                    ⓘ
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Reproductive Status */}
      <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/90 space-y-2.5">
        <div
          onClick={() => toggleExpand('reproductive')}
          className="flex items-center justify-between gap-2 cursor-pointer select-none"
        >
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              6. Reproductive Status
            </span>
            <span
              className={`font-bold text-xs sm:text-sm ${
                vitals.reproductiveStatus === 'Unknown' ? 'text-slate-400' : 'text-amber-300'
              }`}
            >
              {reproObj.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <ConfirmedOrAiBadge
              confirmed={!!vitals.confirmedFields.reproductive}
              isUnknown={vitals.reproductiveStatus === 'Unknown'}
              onConfirmClick={(e) => {
                e.stopPropagation();
                handleSelectVitalAndCollapse('reproductive', vitals.reproductiveStatus);
              }}
            />
            <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-bold text-teal-300 hover:bg-slate-800">
              {isExpanded('reproductive') ? 'Hide ▲' : 'Select ▼'}
            </span>
          </div>
        </div>

        {isExpanded('reproductive') && (
          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-1.5 animate-in fade-in duration-150">
            {REPRODUCTIVE_OPTIONS.map((opt) => {
              const selected = vitals.reproductiveStatus === opt.value;
              const isUnk = opt.value === 'Unknown';
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectVitalAndCollapse('reproductive', opt.value)}
                  className={`px-2.5 py-2 rounded-xl border text-left flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
                    selected
                      ? 'bg-teal-950/90 border-teal-400 text-white shadow-sm'
                      : 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span
                    className={`text-[11px] font-bold ${
                      isUnk ? 'text-slate-400' : selected ? 'text-white' : 'text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </span>
                  {selected && <span className="text-emerald-400 font-black text-xs shrink-0">✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 7. Vet Care */}
      <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/90 space-y-2.5">
        <div
          onClick={() => toggleExpand('vetCare')}
          className="flex items-center justify-between gap-2 cursor-pointer select-none"
        >
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              7. Vet Care
            </span>
            <span
              className={`font-bold text-xs sm:text-sm ${
                vitals.vetCare === 'Unknown'
                  ? 'text-slate-400'
                  : vitals.vetCare === 'Currently under care'
                  ? 'text-sky-300'
                  : 'text-emerald-300'
              }`}
            >
              {vetObj.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <ConfirmedOrAiBadge
              confirmed={!!vitals.confirmedFields.vetCare}
              isUnknown={vitals.vetCare === 'Unknown'}
              onConfirmClick={(e) => {
                e.stopPropagation();
                handleSelectVitalAndCollapse('vetCare', vitals.vetCare);
              }}
            />
            <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-bold text-teal-300 hover:bg-slate-800">
              {isExpanded('vetCare') ? 'Hide ▲' : 'Select ▼'}
            </span>
          </div>
        </div>

        {isExpanded('vetCare') && (
          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-1.5 animate-in fade-in duration-150">
            {VET_CARE_OPTIONS.map((opt) => {
              const selected = vitals.vetCare === opt.value;
              const isUnk = opt.value === 'Unknown';
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectVitalAndCollapse('vetCare', opt.value)}
                  className={`px-2.5 py-2 rounded-xl border text-left flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
                    selected
                      ? opt.value === 'Currently under care'
                        ? 'bg-sky-950/90 border-sky-400 text-white shadow-sm'
                        : opt.value === 'Returned from vet'
                        ? 'bg-emerald-950/90 border-emerald-400 text-white shadow-sm'
                        : 'bg-slate-800 border-slate-500 text-slate-200'
                      : 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span
                    className={`text-[11px] font-bold ${
                      isUnk ? 'text-slate-400' : selected ? 'text-white' : 'text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </span>
                  {selected && <span className="text-emerald-400 font-black text-xs shrink-0">✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 6. PERSISTENCE & MODAL / CARD WRAPPERS FOR CAT GRID AND CAT PROFILE
// ============================================================================

export interface HydraRuntimeBridge {
  db: any; // M
  uuid: () => string; // wS
  syncService: any; // SS
  formatCatTitle: (cat: any) => string; // z
  recordDeceasedOrRestore?: (catId: string, isDeceased: boolean, notes: string, uid: string, displayName: string) => Promise<void>; // HS
  startCareEpisode?: (catId: string, clinic: string, helper: string, contact: string, notes: string, startDate: string, actorName: string) => Promise<void>; // US
  returnFromCareEpisode?: (episodeId: string, returnDate: string, notes: string, actorName: string) => Promise<void>; // WS
}

export async function saveCatIdMarksField(
  bridge: HydraRuntimeBridge,
  cat: any,
  fieldKey: IdMarksFieldKey,
  value: string
): Promise<{ nextTaxonomy: NormalizedIdMarks; nextMarkings: string }> {
  const norm = normalizeIdMarks(cat);
  const updatedRaw = {
    ...norm,
    ...(fieldKey === 'tabbySubtype' ? { coatType: 'tabby', tabbySubtype: value } : { [fieldKey]: value }),
    confirmedFields: {
      ...norm.confirmedFields,
      [fieldKey]: true,
    },
  };
  const nextTaxonomy = normalizeIdMarks(updatedRaw);
  const nextMarkings = formatIdMarksSummary(nextTaxonomy) || cat.markings || '';
  const now = new Date().toISOString();

  if (bridge?.db && cat?.id) {
    const latestCat = (await bridge.db.cats.get(cat.id)) || cat;
    const mergedConfirmed = {
      ...(latestCat.confirmedFields || {}),
      ...(nextTaxonomy.confirmedFields || {}),
      [fieldKey]: true,
    };
    nextTaxonomy.confirmedFields = mergedConfirmed;

    await bridge.db.cats.update(cat.id, {
      taxonomy: nextTaxonomy,
      markings: nextMarkings,
      confirmedFields: mergedConfirmed,
      updatedAt: now,
      revision: (latestCat.revision || 1) + 1,
    });

    const obsId = bridge.uuid();
    let displayName = 'Field Contributor';
    try {
      const ps = await bridge.db.personal_settings.get('personal_settings_default');
      if (ps?.displayName) displayName = ps.displayName;
    } catch {
      // ignore
    }

    await bridge.db.observations.put({
      id: obsId,
      datasetId: latestCat.datasetId || 'hydra-community-cats-2026',
      schemaVersion: 1,
      catId: cat.id,
      kind: 'metric_update',
      observedAt: now,
      enteredAt: now,
      timeSource: 'device_now',
      actorSnapshot: { uid: 'current-user', displayName },
      reviewedMetrics: latestCat.currentMetrics || {},
      photoIds: [],
      locationEvidenceIds: [],
      notes: `IDMarks confirmed (${fieldKey}: ${value || 'none'})`,
      createdAt: now,
      updatedAt: now,
      revision: 1,
      deletedAt: null,
    });

    await bridge.db.outbox.put({
      id: bridge.uuid(),
      entityType: 'cat',
      entityId: cat.id,
      action: 'updateCatProfile',
      payload: { catId: cat.id, observationId: obsId },
      queuedAt: now,
      status: 'pending',
      retryCount: 0,
    });

    bridge.syncService?.refreshOutboxCount?.().catch(() => {});
  }

  return { nextTaxonomy, nextMarkings };
}

export async function saveCatVitalField(
  bridge: HydraRuntimeBridge,
  cat: any,
  careEpisodes: any[],
  fieldKey: 'sterilisation' | 'sex' | 'lifeStage' | 'bodyCondition' | 'health' | 'reproductive' | 'vetCare',
  value: string
): Promise<NormalizedVitals> {
  const currentVitals = normalizeVitals(cat, careEpisodes);
  const nextConfirmed = {
    ...currentVitals.confirmedFields,
    [fieldKey]: true,
  };

  const nextVitals: NormalizedVitals = {
    ...currentVitals,
    ...(fieldKey === 'reproductive' ? { reproductiveStatus: value } : { [fieldKey]: value }),
    confirmedFields: nextConfirmed,
  };

  const now = new Date().toISOString();
  const todayStr = now.slice(0, 10);

  if (bridge?.db && cat?.id) {
    const latestCat = (await bridge.db.cats.get(cat.id)) || cat;
    let displayName = 'Field Contributor';
    try {
      const ps = await bridge.db.personal_settings.get('personal_settings_default');
      if (ps?.displayName) displayName = ps.displayName;
    } catch {
      // ignore
    }

    const updatedMetrics = {
      ...(latestCat.currentMetrics || {}),
      sterilisation: nextVitals.sterilisation,
      sex: nextVitals.sex,
      lifeStage: nextVitals.lifeStage,
      bodyCondition: nextVitals.bodyCondition,
      health: nextVitals.health,
      reproductiveStatus: nextVitals.reproductiveStatus,
      reproductive: {
        state: nextVitals.reproductiveStatus === 'Unknown' ? 'Unknown' : 'Known',
        indicators: nextVitals.reproductiveStatus === 'Unknown' ? [] : [nextVitals.reproductiveStatus],
      },
      vetCare: nextVitals.vetCare,
      confirmedFields: nextConfirmed,
    };

    const updatedTaxonomy = {
      ...(latestCat.taxonomy || {}),
      earStatus:
        nextVitals.sterilisation === 'Sterilised'
          ? 'TNR Tipped'
          : nextVitals.sterilisation === 'Unsterilised'
          ? 'Normal / Intact'
          : latestCat.taxonomy?.earStatus || '',
      confirmedFields: nextConfirmed,
    };

    const nextActiveState =
      fieldKey === 'health' && value === 'Dead'
        ? 'deceased'
        : fieldKey === 'health' && value !== 'Dead' && latestCat.activeState === 'deceased'
        ? 'active'
        : latestCat.activeState || 'active';

    await bridge.db.cats.update(cat.id, {
      currentMetrics: updatedMetrics,
      taxonomy: updatedTaxonomy,
      confirmedFields: nextConfirmed,
      activeState: nextActiveState,
      deceasedAt: nextActiveState === 'deceased' ? latestCat.deceasedAt || now : null,
      metricSourceDates: {
        ...(latestCat.metricSourceDates || {}),
        [fieldKey]: now,
      },
      updatedAt: now,
      revision: (latestCat.revision || 1) + 1,
    });

    // Sync Vet Care episodes if vetCare was changed
    if (fieldKey === 'vetCare') {
      const catEpisodes = Array.isArray(careEpisodes)
        ? careEpisodes.filter((ep) => ep && ep.catId === cat.id && !ep.deletedAt)
        : [];
      const activeEp = catEpisodes.find((ep) => ep.returnDate === null);

      if (value === 'Currently under care' && !activeEp && bridge.startCareEpisode) {
        await bridge.startCareEpisode(
          cat.id,
          'Veterinary Clinic',
          displayName,
          '',
          'Selected Currently under care in Vitals',
          todayStr,
          displayName
        );
      } else if ((value === 'Returned from vet' || value === 'Unknown') && activeEp && bridge.returnFromCareEpisode) {
        await bridge.returnFromCareEpisode(
          activeEp.id,
          todayStr,
          value === 'Returned from vet' ? 'Returned from vet care' : 'Cleared vet care status',
          displayName
        );
      }
    }

    const obsId = bridge.uuid();
    await bridge.db.observations.put({
      id: obsId,
      datasetId: latestCat.datasetId || 'hydra-community-cats-2026',
      schemaVersion: 1,
      catId: cat.id,
      kind: 'metric_update',
      observedAt: now,
      enteredAt: now,
      timeSource: 'device_now',
      actorSnapshot: { uid: 'current-user', displayName },
      reviewedMetrics: updatedMetrics,
      photoIds: [],
      locationEvidenceIds: [],
      notes: `Vitals confirmed (${fieldKey}: ${value})`,
      createdAt: now,
      updatedAt: now,
      revision: 1,
      deletedAt: null,
    });

    await bridge.db.outbox.put({
      id: bridge.uuid(),
      entityType: 'cat',
      entityId: cat.id,
      action: 'updateCatProfile',
      payload: { catId: cat.id, observationId: obsId },
      queuedAt: now,
      status: 'pending',
      retryCount: 0,
    });

    bridge.syncService?.refreshOutboxCount?.().catch(() => {});
  }

  return nextVitals;
}

// ----------------------------------------------------------------------------
// Cat Grid: IDMarks Pop-up Modal
// ----------------------------------------------------------------------------
export const CatGridIdMarksModal: React.FC<{
  cat: any;
  allCats?: any[];
  bridge: HydraRuntimeBridge;
  onClose: () => void;
  onOpenCatProfile: (catId: string) => void;
  onDataChanged?: () => void;
}> = ({ cat, allCats = [], bridge, onClose, onOpenCatProfile, onDataChanged }) => {
  const liveCat = allCats.find((c) => c.id === cat?.id) || cat;
  const [localTax, setLocalTax] = useState<NormalizedIdMarks>(() => normalizeIdMarks(liveCat));

  useEffect(() => {
    setLocalTax(normalizeIdMarks(liveCat));
  }, [liveCat]);

  const handleSelectField = async (
    fieldKey: IdMarksFieldKey,
    value: string
  ) => {
    // Immediate optimistic update with confirmed symbol
    setLocalTax((prev) =>
      normalizeIdMarks({
        ...prev,
        ...(fieldKey === 'tabbySubtype' ? { coatType: 'tabby', tabbySubtype: value } : { [fieldKey]: value }),
        confirmedFields: {
          ...prev.confirmedFields,
          [fieldKey]: true,
        },
      })
    );
    await saveCatIdMarksField(bridge, liveCat, fieldKey, value);
    onDataChanged?.();
  };

  const summaryStr = formatIdMarksSummary(localTax) || liveCat?.markings || 'No specific IDMarks recorded yet';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[2600] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-indigo-500/60 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center text-base shrink-0">
              🐾
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-white">
                IDMarks · {bridge.formatCatTitle(liveCat)}
              </h4>
              <p className="text-[11px] text-indigo-300/90 font-medium">
                Tap any item below to change & confirm (✓ Confirmed vs ✦ AI)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-3 bg-slate-950 rounded-2xl border border-indigo-800/50 space-y-1">
          <span className="text-[10px] uppercase font-bold text-indigo-400 block">
            IDMarks Summary
          </span>
          <p className="text-slate-100 text-xs font-semibold leading-relaxed">{summaryStr}</p>
        </div>

        <IdMarksInteractiveSection taxonomy={localTax} onSelectField={handleSelectField} />

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              const id = liveCat.id;
              onClose();
              onOpenCatProfile(id);
            }}
            className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Open Cat Profile
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// Cat Grid: Vitals Pop-up Modal
// ----------------------------------------------------------------------------
export const CatGridVitalsModal: React.FC<{
  cat: any;
  allCats?: any[];
  colonies?: any[];
  alerts?: any[];
  observations?: any[];
  careEpisodes?: any[];
  daysSinceLastSeen?: number;
  bridge: HydraRuntimeBridge;
  onClose: () => void;
  onOpenCatProfile: (catId: string) => void;
  onDataChanged?: () => void;
}> = ({
  cat,
  allCats = [],
  colonies = [],
  alerts = [],
  careEpisodes = [],
  daysSinceLastSeen = 0,
  bridge,
  onClose,
  onOpenCatProfile,
  onDataChanged,
}) => {
  const liveCat = allCats.find((c) => c.id === cat?.id) || cat;
  const [localVitals, setLocalVitals] = useState<NormalizedVitals>(() =>
    normalizeVitals(liveCat, careEpisodes)
  );

  useEffect(() => {
    setLocalVitals(normalizeVitals(liveCat, careEpisodes));
  }, [liveCat, careEpisodes]);

  const handleSelectVital = async (
    fieldKey: 'sterilisation' | 'sex' | 'lifeStage' | 'bodyCondition' | 'health' | 'reproductive' | 'vetCare',
    value: string
  ) => {
    setLocalVitals((prev) => ({
      ...prev,
      ...(fieldKey === 'reproductive' ? { reproductiveStatus: value } : { [fieldKey]: value }),
      confirmedFields: {
        ...prev.confirmedFields,
        [fieldKey]: true,
      },
    }));
    await saveCatVitalField(bridge, liveCat, careEpisodes, fieldKey, value);
    onDataChanged?.();
  };

  const colony = colonies.find((c) => c.id === liveCat?.currentColonyId);
  const alertStatus = evaluateCatVitalsAlert(
    {
      ...liveCat,
      currentMetrics: {
        ...(liveCat?.currentMetrics || {}),
        ...localVitals,
      },
    },
    alerts
  );

  const borderClass =
    liveCat?.activeState === 'deceased' || localVitals.health === 'Dead'
      ? 'border-slate-600'
      : alertStatus.color === 'red'
      ? 'border-red-500/80'
      : alertStatus.color === 'yellow'
      ? 'border-yellow-500/80'
      : alertStatus.color === 'green'
      ? 'border-emerald-500/80'
      : 'border-slate-700';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[2600] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-slate-900 border-2 ${borderClass} rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-300 flex items-center justify-center text-base shrink-0">
              🩺
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-white">
                Vitals · {bridge.formatCatTitle(liveCat)}
              </h4>
              <p className="text-[11px] text-slate-400">
                {colony ? `📍 ${colony.name}` : '📍 Ungrouped'} · Last seen{' '}
                {daysSinceLastSeen === 0 ? 'today' : `${daysSinceLastSeen}d ago`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <VitalsInteractiveSection vitals={localVitals} onSelectVital={handleSelectVital} />

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              const id = liveCat.id;
              onClose();
              onOpenCatProfile(id);
            }}
            className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Open Cat Profile
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// Cat Profile: Interactive IDMarks & Vitals Cards
// ----------------------------------------------------------------------------
export const CatProfileIdMarksAndVitalsCards: React.FC<{
  cat: any;
  careEpisodes?: any[];
  daysSinceLastSeen?: number;
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
  bridge: HydraRuntimeBridge;
  onDataChanged?: () => void;
}> = ({
  cat,
  careEpisodes = [],
  daysSinceLastSeen = 0,
  isEditMode = false,
  onToggleEditMode,
  bridge,
  onDataChanged,
}) => {
  const [localTax, setLocalTax] = useState<NormalizedIdMarks>(() => normalizeIdMarks(cat));
  const [localVitals, setLocalVitals] = useState<NormalizedVitals>(() =>
    normalizeVitals(cat, careEpisodes)
  );

  useEffect(() => {
    setLocalTax(normalizeIdMarks(cat));
    setLocalVitals(normalizeVitals(cat, careEpisodes));
  }, [cat, careEpisodes]);

  const handleSelectIdMark = async (
    fieldKey: IdMarksFieldKey,
    value: string
  ) => {
    setLocalTax((prev) =>
      normalizeIdMarks({
        ...prev,
        ...(fieldKey === 'tabbySubtype' ? { coatType: 'tabby', tabbySubtype: value } : { [fieldKey]: value }),
        confirmedFields: {
          ...prev.confirmedFields,
          [fieldKey]: true,
        },
      })
    );
    await saveCatIdMarksField(bridge, cat, fieldKey, value);
    onDataChanged?.();
  };

  const handleSelectVital = async (
    fieldKey: 'sterilisation' | 'sex' | 'lifeStage' | 'bodyCondition' | 'health' | 'reproductive' | 'vetCare',
    value: string
  ) => {
    setLocalVitals((prev) => ({
      ...prev,
      ...(fieldKey === 'reproductive' ? { reproductiveStatus: value } : { [fieldKey]: value }),
      confirmedFields: {
        ...prev.confirmedFields,
        [fieldKey]: true,
      },
    }));
    await saveCatVitalField(bridge, cat, careEpisodes, fieldKey, value);
    onDataChanged?.();
  };

  return (
    <div className="space-y-4">
      {/* IDMarks Card */}
      <div className="p-4 sm:p-5 bg-slate-900 rounded-3xl border border-slate-800 space-y-3 shadow-lg">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-base">🐾</span>
            <div>
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                IDMarks
              </h3>
              <p className="text-[11px] text-slate-400">
                Tap any IDMark to select or change — confirmed entries show ✓ Confirmed
              </p>
            </div>
          </div>
          {onToggleEditMode && (
            <button
              type="button"
              onClick={onToggleEditMode}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-xl text-[11px] font-bold border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>{isEditMode ? 'Collapse Options' : 'Edit IDMarks & Vitals'}</span>
            </button>
          )}
        </div>

        <IdMarksInteractiveSection
          taxonomy={localTax}
          onSelectField={handleSelectIdMark}
          defaultExpandAll={isEditMode}
        />
      </div>

      {/* Vitals Card */}
      <div className="p-4 sm:p-5 bg-slate-900 rounded-3xl border border-slate-800 space-y-3 shadow-lg">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-base">🩺</span>
            <div>
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Vitals
              </h3>
              <p className="text-[11px] text-slate-400">
                Tap any Vital to select or change — tap ⓘ on Health Status for visual cues
              </p>
            </div>
          </div>
          <span className="text-[11px] text-slate-400">
            Last seen:{' '}
            <strong className="text-slate-200">
              {daysSinceLastSeen === 0 ? 'Today' : `${daysSinceLastSeen}d ago`}
            </strong>
          </span>
        </div>

        <VitalsInteractiveSection
          vitals={localVitals}
          onSelectVital={handleSelectVital}
          defaultExpandAll={isEditMode}
        />
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// Standalone Form Editor (Replaces uB for New Sighting Registration & Profile Edit)
// ----------------------------------------------------------------------------
export const IdMarksFormEditor: React.FC<{
  taxonomy: any;
  onChange: (updater: (prev: any) => any) => void;
  onEarStatusSideEffect?: (status: string) => void;
  onEarStatusLinkedMetric?: (status: string) => void;
  onPregnantSideEffect?: () => void;
  onPregnantLinkedMetric?: () => void;
  isAnalysing?: boolean;
  onReanalyse?: () => void;
  aiDescription?: string;
  aiSummaryDescription?: string;
  defaultExpandOptional?: boolean;
}> = ({
  taxonomy,
  onChange,
  isAnalysing = false,
  onReanalyse,
  aiDescription,
  aiSummaryDescription,
  defaultExpandOptional = false,
}) => {
  const aiSummary = aiSummaryDescription ?? aiDescription;
  const norm = normalizeIdMarks(taxonomy);
  const [showIdMarksInfo, setShowIdMarksInfo] = useState(false);

  const handleSelectField = (
    fieldKey: IdMarksFieldKey,
    value: string
  ) => {
    onChange((prev: any) => {
      const currentNorm = normalizeIdMarks(prev);
      const nextRaw = {
        ...currentNorm,
        ...(fieldKey === 'tabbySubtype' ? { coatType: 'tabby', tabbySubtype: value } : { [fieldKey]: value }),
        confirmedFields: {
          ...currentNorm.confirmedFields,
          [fieldKey]: true,
        },
      };
      return normalizeIdMarks(nextRaw);
    });
  };

  return (
    <div className="space-y-3">
      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 text-sm">
              🐾
            </div>
            <h3 className="text-sm font-extrabold text-white tracking-tight">
              IDMarks
            </h3>
            <button
              type="button"
              onClick={() => setShowIdMarksInfo(true)}
              title="IDMarks instructions"
              className="w-5 h-5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-teal-300 font-serif italic font-bold text-[11px] flex items-center justify-center cursor-pointer"
            >
              i
            </button>
          </div>
          {onReanalyse && (
            <button
              type="button"
              disabled={isAnalysing}
              onClick={onReanalyse}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-teal-700/70 text-xs font-bold text-teal-300 flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer disabled:opacity-50"
            >
              <span>{isAnalysing ? 'Analyzing...' : '✦ Auto-Fill with AI'}</span>
            </button>
          )}
        </div>

        {isAnalysing ? (
          <div className="p-2.5 rounded-xl bg-teal-950/30 border border-teal-500/40 flex items-center gap-2 text-xs text-teal-200">
            <span>Extracting IDMarks from photo...</span>
          </div>
        ) : (
          aiSummary &&
          aiSummary.toLowerCase() !== 'unknown' && (
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-teal-800/50 space-y-1">
              <div className="text-[11px] font-bold text-teal-300">AI IDMarks Summary</div>
              <p className="text-xs text-slate-300 leading-relaxed">{aiSummary}</p>
            </div>
          )
        )}
      </div>

      {showIdMarksInfo && (
        <div
          onClick={() => setShowIdMarksInfo(false)}
          style={{ zIndex: 3500 }}
          className="fixed inset-0 z-[3000] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm p-5 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-300 font-serif italic font-bold text-xs flex items-center justify-center">
                  i
                </span>
                <h4 className="text-sm font-extrabold text-white">IDMarks Guide</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowIdMarksInfo(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded-lg bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Select or review the cat&apos;s coat type, dominant coat colour, percent white distribution, and unique fingerprints. Confirmed entries are marked with ✓.
            </p>
            <button
              type="button"
              onClick={() => setShowIdMarksInfo(false)}
              className="w-full py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <IdMarksInteractiveSection
        taxonomy={norm}
        onSelectField={handleSelectField}
        defaultExpandAll={defaultExpandOptional}
      />
    </div>
  );
};
