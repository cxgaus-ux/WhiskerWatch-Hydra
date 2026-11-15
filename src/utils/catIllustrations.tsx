import React from 'react';
import { HydraZone } from '../types';

interface CatPortraitProps {
  coatPattern: string;
  colonyZone: HydraZone;
  earTipped?: boolean;
  photoUrl?: string;
  photoTransform?: {
    zoom: number;
    panX: number;
    panY: number;
    rotation: number;
  };
  name: string;
  className?: string;
}

export const CatVisualAvatar: React.FC<CatPortraitProps> = ({
  coatPattern,
  colonyZone,
  earTipped = false,
  photoUrl,
  photoTransform,
  name,
  className = 'w-full h-44',
}) => {
  const [imgError, setImgError] = React.useState(false);

  const hasValidExternalOrDataPhoto =
    photoUrl &&
    photoUrl.startsWith('http') &&
    !imgError;

  const patternLower = coatPattern.toLowerCase();
  let primaryCoat = '#D97706'; // Aegean ginger
  let secondaryCoat = '#FEF3C7';
  let accentPatch = '#92400E';

  if (patternLower.includes('calico') || patternLower.includes('tortie')) {
    primaryCoat = '#EA580C';
    secondaryCoat = '#FFFBEB';
    accentPatch = '#1E293B';
  } else if (
    patternLower.includes('tuxedo') ||
    patternLower.includes('black')
  ) {
    primaryCoat = '#1E293B';
    secondaryCoat = '#F8FAFC';
    accentPatch = '#0F172A';
  } else if (
    patternLower.includes('grey') ||
    patternLower.includes('gray') ||
    patternLower.includes('silver') ||
    patternLower.includes('blue')
  ) {
    primaryCoat = '#475569';
    secondaryCoat = '#E2E8F0';
    accentPatch = '#334155';
  } else if (patternLower.includes('white')) {
    primaryCoat = '#F1F5F9';
    secondaryCoat = '#FFFFFF';
    accentPatch = '#CBD5E1';
  }

  // Subtle zone background tint inspired by Hydra limestone & Aegean harbor
  const zoneBgMap: Record<HydraZone, string> = {
    'Hydra Port': 'from-sky-900/90 via-slate-900 to-slate-950',
    'Kamini Harbor': 'from-amber-900/80 via-slate-900 to-slate-950',
    'Vlychos': 'from-teal-900/80 via-slate-900 to-slate-950',
    'Kaminia': 'from-stone-800 via-slate-900 to-slate-950',
    'Kiafa': 'from-indigo-950 via-slate-900 to-slate-950',
    'Mandraki': 'from-cyan-900/80 via-slate-900 to-slate-950',
  };

  if (hasValidExternalOrDataPhoto) {
    return (
      <div className={`relative overflow-hidden bg-slate-900 ${className}`}>
        <img
          src={photoUrl}
          alt={`${name} — ${coatPattern} cat in ${colonyZone}`}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          style={
            photoTransform
              ? {
                  transform: `translate(${(photoTransform.panX || 0) * 0.4}px, ${(photoTransform.panY || 0) * 0.4}px) rotate(${photoTransform.rotation || 0}deg) scale(${photoTransform.zoom || 1})`,
                  transformOrigin: 'center center',
                }
              : undefined
          }
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${
        zoneBgMap[colonyZone] || zoneBgMap['Hydra Port']
      } flex items-center justify-center ${className}`}
      role="img"
      aria-label={`${name} — ${coatPattern} in ${colonyZone}`}
    >
      {/* Subtle architectural Hydra stone arch backdrop */}
      <svg
        viewBox="0 0 320 200"
        className="w-full h-full object-cover"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Aegean Horizon & Limestone Steps */}
        <path
          d="M0 155 L320 155 L320 200 L0 200 Z"
          fill="rgba(255,255,255,0.04)"
        />
        <path
          d="M0 172 L320 172"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
        />
        <circle cx="265" cy="44" r="22" fill="rgba(251,191,36,0.12)" />

        {/* Cat Silhouette & Markings */}
        <g transform="translate(95, 32)">
          {/* Tail */}
          <path
            d="M96 118 C122 118, 128 85, 114 70"
            stroke={primaryCoat}
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Body */}
          <ellipse cx="65" cy="106" rx="34" ry="26" fill={primaryCoat} />
          {/* Chest bib */}
          <ellipse cx="65" cy="104" rx="18" ry="18" fill={secondaryCoat} />
          {/* Secondary patch */}
          <circle cx="82" cy="98" r="11" fill={accentPatch} opacity="0.85" />

          {/* Left Ear (Ear-tipped if TNR sterilized) */}
          {earTipped ? (
            <polygon points="36,48 42,26 54,32 54,48" fill={primaryCoat} />
          ) : (
            <polygon points="36,48 43,18 56,44" fill={primaryCoat} />
          )}

          {/* Right Ear */}
          <polygon points="74,44 87,18 94,48" fill={accentPatch} />

          {/* Head */}
          <circle cx="65" cy="58" r="26" fill={primaryCoat} />
          {/* Facial blaze */}
          <path d="M65 44 L55 72 L75 72 Z" fill={secondaryCoat} opacity="0.9" />

          {/* Eyes */}
          <circle cx="54" cy="55" r="3.5" fill="#10B981" />
          <circle cx="76" cy="55" r="3.5" fill="#10B981" />
          <circle cx="54" cy="55" r="1.5" fill="#0F172A" />
          <circle cx="76" cy="55" r="1.5" fill="#0F172A" />

          {/* Nose & Whiskers */}
          <polygon points="62,64 68,64 65,68" fill="#F43F5E" />
          <line
            x1="30"
            y1="64"
            x2="50"
            y2="66"
            stroke="rgba(255,255,255,0.65)"
            strokeWidth="1.2"
          />
          <line
            x1="30"
            y1="70"
            x2="50"
            y2="69"
            stroke="rgba(255,255,255,0.65)"
            strokeWidth="1.2"
          />
          <line
            x1="80"
            y1="66"
            x2="100"
            y2="64"
            stroke="rgba(255,255,255,0.65)"
            strokeWidth="1.2"
          />
          <line
            x1="80"
            y1="69"
            x2="100"
            y2="70"
            stroke="rgba(255,255,255,0.65)"
            strokeWidth="1.2"
          />
        </g>
      </svg>

      {/* Bottom Scrim with Coat & Ear-Tip Indicator */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 py-2 flex items-center justify-between text-[11px] text-slate-200">
        <span className="truncate">{coatPattern}</span>
        <span>{earTipped ? 'Left Ear Tipped' : 'Intact Ear'}</span>
      </div>
    </div>
  );
};
