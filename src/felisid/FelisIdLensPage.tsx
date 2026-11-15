import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  CatIdentificationAnalysis,
  CatPixelMetrics,
  SinglePhotoPixelMetrics,
} from './catFeatures';
import { ImageCropperModal } from './ImageCropperModal';
import { extractFramesFromVideo, ExtractedVideoFrame } from './videoExtractor';
import {
  autoCropCatSubject,
  measureImageStats,
  estimateGeminiImageTokens,
  AutoCropResult,
} from './autoCatCropper';
import {
  COAT_TYPE_OPTIONS,
  TABBY_SUBTYPE_OPTIONS,
  DOMINANT_COLOR_OPTIONS,
  WHITE_PERCENT_OPTIONS,
  STERILISATION_OPTIONS,
  GENDER_OPTIONS,
  HEALTH_STATUS_OPTIONS,
  CoatTypeSymbol,
  DominantColorSymbol,
  WhitePieSymbol,
  EarSterilisationSymbol,
  GenderSymbol,
  normalizeIdMarks,
  normalizeTabbySubtypeValue,
  formatCoatTypeWithSubtype,
  normalizeVitals,
  formatIdMarksSummary,
  NormalizedIdMarks,
  NormalizedVitals,
} from '../components/IdMarksAndVitals';
import {
  Image as ImageIcon,
  AlertCircle,
  ShieldCheck,
  X,
  Plus,
  Copy,
  Check,
  Heart,
  Camera,
  Info,
  RotateCcw,
  Eye,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MapPin,
  Sparkles,
} from 'lucide-react';

const SAMPLE_CAT_PHOTO_URL = '/assets/sample_tabby_cat.jpg';
const DEFAULT_HYDRA_COORDS = { latitude: 37.3498, longitude: 23.4660 };

type DragHandleType = 'move' | 'nw' | 'ne' | 'sw' | 'se' | null;

type FeaturePopupKey =
  | 'coatType'
  | 'tabbySubtype'
  | 'dominantColor'
  | 'whitePercent'
  | 'uniqueFingerprints'
  | 'sterilisation'
  | 'sex'
  | 'lifeStage'
  | 'bodyCondition'
  | 'health'
  | 'reproductiveStatus'
  | 'vetCare'
  | null;

export interface FelisIdLensPageProps {
  activeCats?: any[];
  colonies?: any[];
  allLocations?: any[];
  allPhotos?: any[];
  careEpisodes?: any[];
  onOpenCatProfile?: (catId: string, initialEditMode?: boolean) => void;
  onNavigateToCatInGrid?: (catId: string) => void;
  onRefreshData?: () => void;
  onOpenCaptureWithDraft?: (draft: any) => void;
  extractExifGps?: (file: File | ArrayBuffer) => Promise<{
    hasGps: boolean;
    coordinates?: { latitude: number; longitude: number };
    capturedAt?: string;
    hasExifTimestamp?: boolean;
  }>;
  commitObservation?: (payload: any) => Promise<{ catId: string; observationId?: string }>;
  recordSeenNow?: (catId: string, actorUid: string, actorDisplayName: string) => Promise<void>;
  computeDistanceMetres?: (lat1: number, lon1: number, lat2: number, lon2: number) => number;
  formatCatTitle?: (cat: any) => string;
}

export interface LensMatchingCandidate {
  cat: any;
  photoUrl: string | null;
  idMarks: NormalizedIdMarks;
  vitals: NormalizedVitals;
  similarityPct: number;
  matchScore: number;
  distanceMetres: number | null;
  distanceLabel: string;
  tier1Summary: string;
  tier2Score: number;
  tier3Bonus: number;
  matchedFingerprints: string[];
  matchedTraits: string[];
}

/**
 * Haversine distance in metres between two GPS coordinates.
 */
function haversineMetres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function parseWhitePercentValue(val?: string | null): number | null {
  if (!val) return null;
  const trimmed = String(val).trim().toLowerCase();
  if (!trimmed || trimmed === 'unknown') return null;
  const m = trimmed.match(/(\d+)/);
  if (!m) return null;
  const num = parseInt(m[1], 10);
  return isNaN(num) ? null : Math.max(0, Math.min(100, num));
}

function resolveCandidatePhotoUrl(cat: any, allPhotos: any[]): string | null {
  const catPhotos = allPhotos.filter((p) => p && p.catId === cat.id && !p.deletedAt);
  catPhotos.sort((a, b) => (a.id === cat.profilePhotoId ? -1 : b.id === cat.profilePhotoId ? 1 : 0));
  const primary = catPhotos[0];
  if (primary) {
    if (primary.originalBlobDataUrl) return primary.originalBlobDataUrl;
    if (primary.blobDataUrl) return primary.blobDataUrl;
    if (primary.thumbnailDataUrl) return primary.thumbnailDataUrl;
    if (primary.photoUrl) return primary.photoUrl;
    const sp = primary.cloudObjectPath || primary.storagePath || `photos/${primary.id}.jpg`;
    return `https://firebasestorage.googleapis.com/v0/b/project-59fb853c-3c30-4ac8-925.firebasestorage.app/o/${encodeURIComponent(
      sp
    )}?alt=media`;
  }
  if (cat.photoUrl) return cat.photoUrl;
  return null;
}

/**
 * Custom SVG icon representing AI Visual Search & Identification of Cats:
 * A feline paw print paired with a 4-point AI star/sparkle at the top-right.
 */
export const PawAiStarIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Feline Toe Beans */}
    <circle cx="5.2" cy="11.2" r="1.45" fill="currentColor" stroke="none" />
    <circle cx="8.4" cy="8.4" r="1.55" fill="currentColor" stroke="none" />
    <circle cx="12.2" cy="8.9" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="14.6" cy="12.1" r="1.4" fill="currentColor" stroke="none" />
    {/* Feline Main Metacarpal Pad */}
    <path
      d="M9.6 12.6c-2.2 0-4.1 1.75-4.1 3.9 0 1.45 1.05 2.5 2.4 2.5.65 0 1.15-.3 1.7-.3s1.05.3 1.7.3c1.35 0 2.4-1.05 2.4-2.5 0-2.15-1.9-3.9-4.1-3.9Z"
      fill="currentColor"
      stroke="none"
    />
    {/* 4-Point AI Sparkle Star at Top-Right */}
    <path
      d="M18.5 1.8 L19.55 4.95 L22.7 6 L19.55 7.05 L18.5 10.2 L17.45 7.05 L14.3 6 L17.45 4.95 Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="0.6"
    />
  </svg>
);

/**
 * Circle arrow symbol with an AI* (AI✦) symbol in the centre for the prominent Start AI Analysis button.
 */
export const CircleArrowAiIcon: React.FC<{ className?: string; spinning?: boolean }> = ({
  className = 'w-6 h-6',
  spinning = false,
}) => (
  <svg
    viewBox="0 0 28 28"
    fill="none"
    stroke="currentColor"
    className={className}
    aria-hidden="true"
  >
    <g
      className={spinning ? 'origin-center animate-spin' : ''}
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.2 14a9.8 9.8 0 0 1 16.5-7.1L23.8 10" />
      <path d="M23.8 4.5v5.5h-5.5" />
      <path d="M23.8 14a9.8 9.8 0 0 1-16.5 7.1L4.2 18" />
      <path d="M4.2 23.5V18h5.5" />
    </g>
    {/* AI* in the centre */}
    <text
      x="11.6"
      y="16.4"
      textAnchor="middle"
      fill="currentColor"
      stroke="none"
      fontSize="7.2"
      fontWeight="900"
      fontFamily="system-ui, -apple-system, sans-serif"
      letterSpacing="-0.3"
    >
      AI
    </text>
    {/* Star (*) next to AI in the centre */}
    <path
      d="M18.1 10.2 L18.65 11.9 L20.35 12.45 L18.65 13 L18.1 14.7 L17.55 13 L15.85 12.45 L17.55 11.9 Z"
      fill="currentColor"
      stroke="none"
    />
  </svg>
);

// Exact PawLens Vitals option lists matching 1.1.1.2.2 specification
const PAWLENS_AGE_OPTIONS = [
  { value: 'Newborn', label: 'newborn: <8 weeks' },
  { value: 'Kitten', label: 'kitten: <6 months' },
  { value: 'Junior', label: 'junior >6 months <2 years' },
  { value: 'Adult', label: 'adult (3-10 years)' },
  { value: 'Senior', label: 'senior (>11-14 years)' },
  { value: 'Unknown', label: 'unknown' },
];

const PAWLENS_BODY_CONDITION_OPTIONS = [
  { value: 'Underweight', label: 'underweight' },
  { value: 'Ideal', label: 'ideal' },
  { value: 'Overweight', label: 'overweight' },
  { value: 'Obese', label: 'obese' },
  { value: 'Unknown', label: 'unknown' },
];

const PAWLENS_REPRODUCTIVE_OPTIONS = [
  { value: 'In heat', label: 'in heat' },
  { value: 'Pregnant', label: 'pregnant' },
  { value: 'Nursing', label: 'nursing' },
  { value: 'Unknown', label: 'unknown' },
];

const PAWLENS_VET_CARE_OPTIONS = [
  { value: 'Currently under care', label: 'currently under care' },
  { value: 'Returned from vet', label: 'returned from vet' },
  { value: 'Unknown', label: 'unknown' },
];

const PAWLENS_WHITE_PCT_PILLS = [
  { value: '0%', label: '0%' },
  { value: '10%', label: '10%' },
  { value: '25%', label: '25%' },
  { value: '50%', label: '50%' },
  { value: '75%', label: '75%' },
  { value: '90%', label: '90%' },
  { value: '100%', label: '100%' },
  { value: 'unknown', label: 'unknown' },
];

export interface PawLensStructuredState {
  // IDMarks (1.1.1.2.1)
  coatType: string;
  tabbySubtype: string;
  dominantColor: string;
  whitePercent: string;
  uniqueFingerprints: string[];
  // Vitals (1.1.1.2.2)
  sterilisation: string;
  sex: string;
  lifeStage: string;
  bodyCondition: string;
  health: string;
  reproductiveStatus: string;
  vetCare: string;
}

const DEFAULT_PAWLENS_STATE: PawLensStructuredState = {
  coatType: 'unknown',
  tabbySubtype: 'unknown',
  dominantColor: 'unknown',
  whitePercent: 'unknown',
  uniqueFingerprints: [],
  sterilisation: 'Unknown',
  sex: 'Unknown',
  lifeStage: 'Unknown',
  bodyCondition: 'Unknown',
  health: 'Unknown',
  reproductiveStatus: 'Unknown',
  vetCare: 'Unknown',
};

/**
 * Structured 3-Tier Matching & Elimination Engine adapted to the merged IDMarks & Vitals taxonomy:
 * 1. Tier 1 (Hard Eliminators): Filter out database cats whose TNR Ear-Tip/sterilisation Status
 *    and Coat Type strictly conflict (Pass/Fail binary filter).
 * 2. Tier 2 (Pattern Weights): Score the remaining candidate pool based on dominant coat colour
 *    and percent white distribution.
 * 3. Tier 3 (Fingerprints): Give heavy bonus points for any unique ID features like asymmetrical
 *    markings, scars, tail shape, or specific ear damages.
 *
 * Selects the top 10 highest-scored matching candidates and lists those sighted closest to the
 * photo GPS location first.
 */
export function computeLensThreeTierMatches(params: {
  queryState: PawLensStructuredState;
  confirmedFields?: Record<string, boolean>;
  confirmedFingerprints?: Record<string, boolean>;
  photoCoords: { latitude: number; longitude: number } | null;
  activeCats: any[];
  allLocations: any[];
  allPhotos: any[];
  colonies: any[];
  careEpisodes: any[];
  distanceFn?: (lat1: number, lon1: number, lat2: number, lon2: number) => number;
}): LensMatchingCandidate[] {
  const {
    queryState,
    confirmedFields = {},
    confirmedFingerprints = {},
    photoCoords,
    activeCats,
    allLocations,
    allPhotos,
    colonies,
    careEpisodes,
    distanceFn = haversineMetres,
  } = params;

  const rawQCoat = (queryState.coatType || 'unknown').toLowerCase().trim();
  const qCoat = rawQCoat.includes('tabby') ? 'tabby' : rawQCoat;
  const qSub =
    qCoat === 'tabby'
      ? normalizeTabbySubtypeValue(queryState.tabbySubtype, rawQCoat).toLowerCase()
      : 'unknown';
  const qColor = (queryState.dominantColor || 'unknown').toLowerCase().trim();
  const qWhiteNum = parseWhitePercentValue(queryState.whitePercent);
  const qSter = (queryState.sterilisation || 'Unknown').trim();
  const qFps = (queryState.uniqueFingerprints || [])
    .map((f) => f.trim().toLowerCase())
    .filter((f) => f.length >= 2 && f !== 'none' && f !== 'unknown');

  const qSterKnown = qSter === 'Sterilised' || qSter === 'Unsterilised';
  const qCoatKnown = qCoat !== '' && qCoat !== 'unknown';
  const qSubKnown = qCoat === 'tabby' && qSub !== '' && qSub !== 'unknown';
  const qColorKnown = qColor !== '' && qColor !== 'unknown';
  const hasConfirmedFps = Object.values(confirmedFingerprints).some(Boolean) && qFps.length > 0;

  const refCoords = photoCoords || DEFAULT_HYDRA_COORDS;
  const candidates: LensMatchingCandidate[] = [];

  for (const cat of activeCats) {
    if (!cat || cat.activeState !== 'active' || cat.deletedAt) continue;

    const candIdMarks = normalizeIdMarks(cat);
    const candVitals = normalizeVitals(cat, careEpisodes);

    const cCoat = (candIdMarks.coatType || 'unknown').toLowerCase().trim();
    const cSub =
      cCoat === 'tabby'
        ? normalizeTabbySubtypeValue(candIdMarks.tabbySubtype, candIdMarks.coatType).toLowerCase()
        : 'unknown';
    const cColor = (candIdMarks.dominantColor || 'unknown').toLowerCase().trim();
    const cWhiteNum = parseWhitePercentValue(candIdMarks.whitePercent);
    const cSter = (candVitals.sterilisation || 'Unknown').trim();

    const cSterKnown = cSter === 'Sterilised' || cSter === 'Unsterilised';
    const cCoatKnown = cCoat !== '' && cCoat !== 'unknown';
    const cSubKnown = cCoat === 'tabby' && cSub !== '' && cSub !== 'unknown';
    const cColorKnown = cColor !== '' && cColor !== 'unknown';

    // =========================================================================
    // TIER 1: HARD ELIMINATORS (Pass/Fail Binary Filter)
    // Filter out database cats whose TNR Ear-Tip/Sterilisation Status or Coat Type strictly conflict.
    // When the user explicitly selects a Coat Type or Sterilisation pill, strictly filter by that value.
    // =========================================================================
    if (qSterKnown) {
      if (confirmedFields.sterilisation) {
        if (cSter !== qSter) continue;
      } else if (cSterKnown && qSter !== cSter) {
        continue;
      }
    }

    if (qCoatKnown) {
      if (confirmedFields.coatType) {
        if (cCoat !== qCoat) continue;
      } else if (cCoatKnown && qCoat !== cCoat) {
        continue;
      }
    }

    if (qCoat === 'tabby' && cCoat === 'tabby' && qSubKnown && confirmedFields.tabbySubtype) {
      if (cSubKnown && cSub !== qSub) continue;
    }

    // =========================================================================
    // TIER 2: PATTERN WEIGHTS (Dominant Coat Colour & Percent White Distribution)
    // =========================================================================
    let tier2Score = 44;
    const matchedTraits: string[] = [];

    if (qCoatKnown && cCoatKnown && qCoat === cCoat) {
      tier2Score += 16;
      if (qCoat === 'tabby' && qSubKnown && cSubKnown && qSub === cSub) {
        tier2Score += 5;
        matchedTraits.push(`Coat: ${formatCoatTypeWithSubtype(candIdMarks.coatType, candIdMarks.tabbySubtype)}`);
      } else {
        matchedTraits.push(`Coat: ${formatCoatTypeWithSubtype(candIdMarks.coatType, candIdMarks.tabbySubtype)}`);
      }
    } else if (!qCoatKnown && cCoatKnown) {
      matchedTraits.push(`Coat: ${formatCoatTypeWithSubtype(candIdMarks.coatType, candIdMarks.tabbySubtype)}`);
    } else if (qCoatKnown && !cCoatKnown) {
      tier2Score -= 8;
    }

    if (qSterKnown && cSterKnown && qSter === cSter) {
      tier2Score += 6;
      matchedTraits.push(cSter === 'Sterilised' ? 'TNR Tipped' : 'Intact Ear');
    }

    // Dominant Coat Colour weight
    let colorMatches = false;
    if (qColorKnown && cColorKnown) {
      if (qColor === cColor) {
        tier2Score += 18;
        colorMatches = true;
        matchedTraits.push(`Colour: ${candIdMarks.dominantColor}`);
      } else if (
        (qColor === 'ginger' && cColor === 'dilute ginger/cream') ||
        (qColor === 'dilute ginger/cream' && cColor === 'ginger')
      ) {
        tier2Score += 11;
        colorMatches = true;
        matchedTraits.push(`Related colour (${candIdMarks.dominantColor})`);
      } else if (qColor === 'mixed' || cColor === 'mixed') {
        tier2Score += 8;
        colorMatches = true;
        matchedTraits.push(`Compatible mixed colour`);
      } else {
        tier2Score -= 16;
      }
    } else if (!qColorKnown) {
      tier2Score += 6;
      colorMatches = true;
    } else {
      tier2Score += 2;
    }

    // If user explicitly changed Dominant Coat Colour, filter out strictly conflicting colours
    if (confirmedFields.dominantColor && qColorKnown && cColorKnown && !colorMatches) {
      continue;
    }

    // Percent White Distribution weight
    let whiteMatches = false;
    if (qWhiteNum !== null && cWhiteNum !== null) {
      const whiteDiff = Math.abs(qWhiteNum - cWhiteNum);
      if (whiteDiff === 0) {
        tier2Score += 16;
        whiteMatches = true;
        matchedTraits.push(`White: ${candIdMarks.whitePercent}`);
      } else if (whiteDiff <= 15) {
        tier2Score += 12;
        whiteMatches = true;
        matchedTraits.push(`White: ~${candIdMarks.whitePercent}`);
      } else if (whiteDiff <= 25) {
        tier2Score += 7;
        whiteMatches = true;
      } else if (whiteDiff <= 40) {
        tier2Score += 1;
      } else {
        tier2Score -= 14;
      }
    } else if (qWhiteNum === null) {
      tier2Score += 5;
      whiteMatches = true;
    } else {
      tier2Score += 2;
    }

    // If user explicitly changed Percent White Distribution, filter out incompatible white percentages (>25% diff)
    if (confirmedFields.whitePercent && qWhiteNum !== null && cWhiteNum !== null && !whiteMatches) {
      continue;
    }

    // =========================================================================
    // TIER 3: FINGERPRINTS (Heavy Bonus Points for Unique ID Features)
    // Asymmetrical markings, scars, tail shape, or specific ear damages
    // =========================================================================
    let tier3Bonus = 0;
    const matchedFingerprints: string[] = [];
    const candFpCorpus = `${candIdMarks.uniqueFingerprints || ''} ${cat.markings || ''} ${
      cat.description || ''
    } ${cat.notes || ''} ${cat.taxonomy?.tier3Notes || ''} ${cat.taxonomy?.earStatus || ''}`
      .toLowerCase()
      .trim();

    const candFpParts = (candIdMarks.uniqueFingerprints || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    if (qFps.length > 0 && candFpCorpus.length > 0) {
      for (const qfp of qFps) {
        let matched = false;
        if (candFpCorpus.includes(qfp) || candFpParts.some((cfp) => cfp.includes(qfp) || qfp.includes(cfp))) {
          matched = true;
        } else {
          const keywords = [
            'tipped tail',
            'bob tail',
            'bobbed',
            'kinked',
            'kink',
            'damaged ear',
            'notched',
            'notch',
            'folded',
            'scar',
            'whisker',
            'blaze',
            'mustache',
            'moustache',
            'blotch',
            'jowl',
            'patch',
            'asymmetrical',
            'eye',
            'limp',
            'collar',
          ];
          for (const kw of keywords) {
            if (qfp.includes(kw) && candFpCorpus.includes(kw)) {
              matched = true;
              break;
            }
          }
        }
        if (matched) {
          matchedFingerprints.push(qfp);
          tier3Bonus += matchedFingerprints.length === 1 ? 18 : 10;
        }
      }
    }
    tier3Bonus = Math.min(34, tier3Bonus);

    // Resolve candidate GPS location (most recent sighting location or colony centre)
    const catLocs = allLocations
      .filter(
        (loc) =>
          loc &&
          loc.catId === cat.id &&
          !loc.deletedAt &&
          typeof loc.latitude === 'number' &&
          typeof loc.longitude === 'number'
      )
      .sort((a, b) => String(b.observedAt || b.enteredAt || '').localeCompare(String(a.observedAt || a.enteredAt || '')));

    let candCoords: { latitude: number; longitude: number } | null = null;
    if (catLocs.length > 0) {
      candCoords = { latitude: catLocs[0].latitude, longitude: catLocs[0].longitude };
    } else if (cat.currentColonyId) {
      const col = colonies.find((c) => c && c.id === cat.currentColonyId);
      if (col && col.centre && typeof col.centre.latitude === 'number') {
        candCoords = { latitude: col.centre.latitude, longitude: col.centre.longitude };
      }
    }

    let distanceMetres: number | null = null;
    let distanceLabel = '0 m away';
    if (candCoords && refCoords) {
      distanceMetres = Math.max(1, Math.round(distanceFn(refCoords.latitude, refCoords.longitude, candCoords.latitude, candCoords.longitude)));
      distanceLabel = `${distanceMetres} m away`;
    }

    const rawTotal = tier2Score + tier3Bonus;
    const similarityPct = Math.max(18, Math.min(99, Math.round(rawTotal)));
    const matchScore = Number((similarityPct / 10).toFixed(1));
    const photoUrl = resolveCandidatePhotoUrl(cat, allPhotos);

    candidates.push({
      cat,
      photoUrl,
      idMarks: candIdMarks,
      vitals: candVitals,
      similarityPct,
      matchScore,
      distanceMetres,
      distanceLabel,
      tier1Summary: `${candIdMarks.coatType} · ${candVitals.sterilisation}`,
      tier2Score,
      tier3Bonus,
      matchedFingerprints,
      matchedTraits,
    });
  }

  // If user explicitly selected/confirmed Unique Fingerprints and at least one candidate matches, filter to fingerprint matches
  let filteredPool = candidates;
  if (hasConfirmedFps) {
    const withFpMatches = candidates.filter((c) => c.matchedFingerprints.length > 0);
    if (withFpMatches.length > 0) {
      filteredPool = withFpMatches;
    }
  }

  // 1. Select the top 10 highest-scored matching candidates
  filteredPool.sort((a, b) => {
    if (b.similarityPct !== a.similarityPct) {
      return b.similarityPct - a.similarityPct;
    }
    if (a.distanceMetres !== null && b.distanceMetres !== null) {
      return a.distanceMetres - b.distanceMetres;
    }
    return String(a.cat.id).localeCompare(String(b.cat.id));
  });

  const top10 = filteredPool.slice(0, 10);

  // 2. Order the top 10 so those sighted closest to the photo GPS location (from EXIF data) are listed first
  top10.sort((a, b) => {
    if (a.distanceMetres !== null && b.distanceMetres !== null) {
      if (a.distanceMetres !== b.distanceMetres) {
        return a.distanceMetres - b.distanceMetres;
      }
      return b.similarityPct - a.similarityPct;
    }
    if (a.distanceMetres !== null) return -1;
    if (b.distanceMetres !== null) return 1;
    return b.similarityPct - a.similarityPct;
  });

  return top10;
}

/**
 * Maps AI report + optional /api/ai/analyse-photo proposals + colorimetric pixelMetrics
 * into the exact canonical option values for PawLens pill selectors.
 */
function deriveStructuredPawLensState(
  report: CatIdentificationAnalysis | null,
  aiProposals: any | null,
  pixelMetrics: CatPixelMetrics | null
): PawLensStructuredState {
  const tax = aiProposals?.taxonomy || {};
  const repId = report?.idMarks || {};
  const repVit = report?.vitals || {};

  // 1. Coat Type & Separate Tabby Subtype
  const rawInputCoat = String(repId.coatType || tax.coatType || '').toLowerCase().trim();
  const rawInputSub = String(repId.tabbySubtype || tax.tabbySubtype || '').trim();
  let coatType = rawInputCoat.includes('tabby') ? 'tabby' : rawInputCoat;
  let tabbySubtype = 'unknown';

  const validCoatSet = new Set(COAT_TYPE_OPTIONS.map((o) => o.value));
  const rawPattern = `${report?.coatPatternType || ''} ${aiProposals?.coatPatternAndColor || ''} ${report?.overallForensicSummary || ''}`.toLowerCase();
  const rawColor = `${report?.dominantBaseColor || ''} ${aiProposals?.coatPatternAndColor || ''}`.toLowerCase();

  if (!validCoatSet.has(coatType) || coatType === 'unknown') {
    if (rawPattern.includes('calico')) {
      coatType = 'calico';
    } else if (rawPattern.includes('tortoiseshell') || rawPattern.includes('tortie')) {
      coatType = 'tortoiseshell/blended';
    } else if (rawPattern.includes('colorpoint') || rawPattern.includes('colourpoint') || rawPattern.includes('pointed') || rawPattern.includes('siamese')) {
      coatType = 'colourpoint';
    } else if (rawPattern.includes('bicolor') || rawPattern.includes('bicolour') || rawPattern.includes('tuxedo') || rawPattern.includes('two-tone')) {
      coatType = 'bicolour/tuxedo';
    } else if (rawPattern.includes('tabby')) {
      coatType = 'tabby';
    } else if (rawPattern.includes('solid')) {
      if (rawColor.includes('white') || (pixelMetrics && pixelMetrics.whitePct >= 80)) {
        coatType = 'solid white';
      } else if (rawColor.includes('grey') || rawColor.includes('gray') || rawColor.includes('blue')) {
        coatType = 'solid blue';
      } else {
        coatType = 'solid black';
      }
    } else if (pixelMetrics) {
      if (pixelMetrics.whitePct >= 82) coatType = 'solid white';
      else if (pixelMetrics.blackPct >= 65 && pixelMetrics.whitePct < 12) coatType = 'solid black';
      else if (pixelMetrics.greyPct >= 55 && pixelMetrics.whitePct < 12 && pixelMetrics.edgeDensity < 19) coatType = 'solid blue';
      else if (pixelMetrics.gingerPct >= 22 && pixelMetrics.edgeDensity >= 18) coatType = 'tabby';
      else if (pixelMetrics.whitePct >= 25 && pixelMetrics.whitePct <= 78 && pixelMetrics.edgeDensity < 20) coatType = 'bicolour/tuxedo';
      else coatType = 'tabby';
    } else {
      coatType = 'unknown';
    }
  }

  if (coatType === 'tabby') {
    tabbySubtype = normalizeTabbySubtypeValue(rawInputSub, rawInputCoat);
    if (tabbySubtype === 'unknown') {
      if (rawColor.includes('ginger') || rawColor.includes('orange') || rawPattern.includes('ginger') || rawPattern.includes('orange') || (pixelMetrics && pixelMetrics.gingerPct >= 22 && pixelMetrics.edgeDensity >= 18)) {
        tabbySubtype = 'ginger/orange tabby';
      } else if (rawPattern.includes('classic') || rawPattern.includes('swirl') || rawPattern.includes('marble')) {
        tabbySubtype = 'classic';
      } else if (rawPattern.includes('spotted')) {
        tabbySubtype = 'spotted';
      } else if (rawPattern.includes('ticked')) {
        tabbySubtype = 'ticked';
      } else if (rawPattern.includes('mackerel') || rawPattern.includes('stripe')) {
        tabbySubtype = 'mackerel';
      }
    }
  }

  // 2. Dominant Coat Colour
  let dominantColor = String(repId.dominantColor || tax.dominantColor || '').toLowerCase().trim();
  const validColorSet = new Set(DOMINANT_COLOR_OPTIONS.map((o) => o.value));
  if (!validColorSet.has(dominantColor) || dominantColor === 'unknown') {
    if (coatType === 'calico' || coatType === 'tortoiseshell/blended') {
      dominantColor = 'mixed';
    } else if (rawColor.includes('grey') || rawColor.includes('gray') || rawColor.includes('silver') || rawColor.includes('blue') || coatType === 'solid blue') {
      dominantColor = 'grey';
    } else if (rawColor.includes('cream') || rawColor.includes('dilute') || rawColor.includes('tan')) {
      dominantColor = 'dilute ginger/cream';
    } else if (rawColor.includes('ginger') || rawColor.includes('orange') || rawInputCoat === 'ginger/orange tabby' || tabbySubtype === 'ginger/orange tabby') {
      dominantColor = 'ginger';
    } else if (rawColor.includes('black') || coatType === 'solid black') {
      dominantColor = 'black';
    } else if (rawColor.includes('white') && coatType === 'solid white') {
      dominantColor = 'white';
    } else if (rawColor.includes('mixed') || rawColor.includes('brown') || rawColor.includes('&')) {
      dominantColor = 'mixed';
    } else if (rawColor.includes('white')) {
      dominantColor = 'white';
    } else if (pixelMetrics) {
      if (pixelMetrics.greyPct >= 18 && pixelMetrics.gingerPct < 24) {
        dominantColor = 'grey';
      } else {
        const ranks = [
          { k: 'grey', v: pixelMetrics.greyPct },
          { k: 'black', v: pixelMetrics.blackPct },
          { k: 'white', v: pixelMetrics.whitePct },
          { k: 'ginger', v: pixelMetrics.gingerPct },
          { k: 'mixed', v: pixelMetrics.brownPct },
        ].sort((a, b) => b.v - a.v);
        dominantColor = ranks[0].k;
      }
    } else {
      dominantColor = 'unknown';
    }
  }

  // 3. Percent White Distribution
  let whitePercent = String(repId.whitePercent || tax.whitePercent || '').trim();
  const validWhiteSet = new Set(WHITE_PERCENT_OPTIONS.map((o) => o.value));
  if (!validWhiteSet.has(whitePercent) || whitePercent.toLowerCase() === 'unknown') {
    const rawWhite = `${report?.whiteDistribution || ''}`.toLowerCase();
    const numMatch = rawWhite.match(/(\d+)\s*%/);
    const numVal = numMatch
      ? parseInt(numMatch[1], 10)
      : pixelMetrics
      ? Math.round(pixelMetrics.whitePct)
      : null;

    if (coatType === 'solid white') {
      whitePercent = '100%';
    } else if (coatType === 'solid black' || coatType === 'solid blue') {
      whitePercent = '0%';
    } else if (numVal !== null && !isNaN(numVal)) {
      const buckets = [0, 10, 25, 50, 75, 90, 100];
      let closest = 0;
      let minDiff = 999;
      for (const b of buckets) {
        const diff = Math.abs(numVal - b);
        if (diff < minDiff) {
          minDiff = diff;
          closest = b;
        }
      }
      whitePercent = `${closest}%`;
    } else {
      whitePercent = 'unknown';
    }
  }

  // 4. Unique ID Features / Unique Fingerprints (ONLY genuinely AI-detected features, never negated/intact traits)
  const fpSet = new Set<string>();
  const earNotesLower = String(report?.earDamageAndFeatures || '').toLowerCase();
  const earsAreIntactOrNormal =
    !earNotesLower ||
    earNotesLower.includes('unclear') ||
    earNotesLower.includes('unknown') ||
    earNotesLower.includes('none') ||
    earNotesLower.includes('no visible') ||
    earNotesLower.includes('no notch') ||
    earNotesLower.includes('no tear') ||
    earNotesLower.includes('no damage') ||
    earNotesLower.includes('intact');

  const addIfGenuineFeature = (rawFeat: unknown) => {
    if (!rawFeat || typeof rawFeat !== 'string') return;
    const cleaned = rawFeat.trim().toLowerCase();
    if (!cleaned || cleaned.length < 2) return;
    if (
      cleaned === 'none' ||
      cleaned === 'n/a' ||
      cleaned === 'normal' ||
      cleaned === 'intact' ||
      cleaned.includes('unknown') ||
      cleaned.includes('unclear') ||
      cleaned.includes('none ') ||
      cleaned.includes('no ') ||
      cleaned.includes('without ') ||
      cleaned.includes('not ') ||
      cleaned.includes('intact ear')
    ) {
      return;
    }
    if (
      (cleaned.includes('damaged ear') || cleaned.includes('ear damage') || cleaned.includes('notched ear')) &&
      earsAreIntactOrNormal
    ) {
      return;
    }
    fpSet.add(cleaned);
  };

  if (Array.isArray(repId.uniqueFingerprints)) {
    repId.uniqueFingerprints.forEach(addIfGenuineFeature);
  }
  if (typeof tax.uniqueFingerprints === 'string' && tax.uniqueFingerprints.trim()) {
    tax.uniqueFingerprints
      .split(',')
      .forEach(addIfGenuineFeature);
  }

  // 5. Vitals: TNR Ear Clip Status (left ear / sterilisation)
  let sterilisation = repVit.sterilisation || aiProposals?.sterilisation || 'Unknown';
  const leftEarText = `${report?.tnrEarTipStatus?.leftEar || ''} ${report?.tnrEarTipStatus?.assessment || ''} ${aiProposals?.earTip || ''}`.toLowerCase();
  if (
    sterilisation === 'Sterilised' ||
    leftEarText.includes('flat-top') ||
    leftEarText.includes('tnr confirmed') ||
    leftEarText.includes('tipped') ||
    leftEarText.includes('clipped')
  ) {
    sterilisation = 'Sterilised';
  } else if (
    sterilisation === 'Unsterilised' ||
    leftEarText.includes('intact') ||
    leftEarText.includes('no flat cut')
  ) {
    sterilisation = 'Unsterilised';
  } else {
    sterilisation = 'Unknown';
  }

  // 6. Vitals: Gender
  let sex = repVit.sex || aiProposals?.sex || 'Unknown';
  const genderText = `${report?.gender || ''} ${sex}`.toLowerCase();
  if (genderText.includes('female') || coatType === 'calico' || coatType === 'tortoiseshell/blended') {
    sex = 'Female';
  } else if (genderText.includes('male')) {
    sex = 'Male';
  } else {
    sex = 'Unknown';
  }

  // 7. Vitals: Estimated Age
  let lifeStage = repVit.lifeStage || aiProposals?.lifeStage || 'Unknown';
  const ageText = `${report?.approximateAge || ''} ${lifeStage}`.toLowerCase();
  if (ageText.includes('newborn') || ageText.includes('<8 week')) {
    lifeStage = 'Newborn';
  } else if (ageText.includes('kitten') || ageText.includes('<6 month')) {
    lifeStage = 'Kitten';
  } else if (ageText.includes('junior') || ageText.includes('adolescent') || ageText.includes('juvenile') || ageText.includes('6-12 month')) {
    lifeStage = 'Junior';
  } else if (ageText.includes('senior') || ageText.includes('7+') || ageText.includes('11')) {
    lifeStage = 'Senior';
  } else if (ageText.includes('adult') || ageText.includes('1-6') || ageText.includes('3-10')) {
    lifeStage = 'Adult';
  } else {
    lifeStage = 'Unknown';
  }

  // 8. Vitals: Body Condition Index
  let bodyCondition = repVit.bodyCondition || aiProposals?.bodyCondition || 'Unknown';
  const bcsText = `${report?.bodyCondition || ''} ${bodyCondition}`.toLowerCase();
  if (bcsText.includes('underweight') || bcsText.includes('lean') || bcsText.includes('thin') || bcsText.includes('emaciated')) {
    bodyCondition = 'Underweight';
  } else if (bcsText.includes('obese')) {
    bodyCondition = 'Obese';
  } else if (bcsText.includes('overweight') || bcsText.includes('stocky') || bcsText.includes('heavy')) {
    bodyCondition = 'Overweight';
  } else if (bcsText.includes('ideal') || bcsText.includes('optimal') || bcsText.includes('good') || bcsText.includes('well-proportioned')) {
    bodyCondition = 'Ideal';
  } else {
    bodyCondition = 'Unknown';
  }

  // 9. Vitals: Health Status
  let health = repVit.health || aiProposals?.health || 'Unknown';
  const healthText = `${report?.healthStatus || ''} ${health}`.toLowerCase();
  if (healthText.includes('dead') || healthText.includes('deceased')) {
    health = 'Dead';
  } else if (healthText.includes('moribund') || healthText.includes('unresponsive') || healthText.includes('collaps')) {
    health = 'Moribund';
  } else if (healthText.includes('threat to life') || healthText.includes('critical') || healthText.includes('severe trauma') || healthText.includes('fracture')) {
    health = 'Threat to life';
  } else if (healthText.includes('compromised') || healthText.includes('limp') || healthText.includes('open wound') || healthText.includes('infected') || healthText.includes('heavy discharge')) {
    health = 'Compromised';
  } else if (healthText.includes('minor') || healthText.includes('scratch') || healthText.includes('mild') || healthText.includes('slight')) {
    health = 'Minor issues';
  } else if (
    healthText.includes('healthy') ||
    healthText.includes('bright') ||
    healthText.includes('alert') ||
    healthText.includes('clean coat') ||
    healthText.includes('clear eyes') ||
    healthText.includes('no visible injur')
  ) {
    health = 'Healthy';
  } else {
    health = 'Unknown';
  }

  // 10. Vitals: Reproductive Status
  let reproductiveStatus = repVit.reproductiveStatus || 'Unknown';
  const reproText = `${reproductiveStatus} ${report?.healthStatus || ''} ${report?.gender || ''}`.toLowerCase();
  if (reproText.includes('pregnant') || reproText.includes('gravid')) {
    reproductiveStatus = 'Pregnant';
  } else if (reproText.includes('nursing') || reproText.includes('lactating') || reproText.includes('mammary')) {
    reproductiveStatus = 'Nursing';
  } else if (reproText.includes('in heat') || reproText.includes('estrus')) {
    reproductiveStatus = 'In heat';
  } else {
    reproductiveStatus = 'Unknown';
  }

  // 11. Vitals: Vet Care
  let vetCare = repVit.vetCare || 'Unknown';
  if (!['Currently under care', 'Returned from vet'].includes(vetCare)) {
    vetCare = 'Unknown';
  }

  return {
    coatType,
    tabbySubtype,
    dominantColor,
    whitePercent,
    uniqueFingerprints: Array.from(fpSet),
    sterilisation,
    sex,
    lifeStage,
    bodyCondition,
    health,
    reproductiveStatus,
    vetCare,
  };
}

/**
 * Badge shown inside each selected Pill Selector:
 * - If selected by AI (not yet overridden/confirmed by user): displays the AI symbol (✦ AI)
 * - If selected/confirmed by the user: displays the Confirmed symbol (✓ Confirmed)
 */
const PillOriginBadge: React.FC<{
  isSelected: boolean;
  isUserConfirmed: boolean;
  isAiOriginal?: boolean;
  hasRunAiAnalysis?: boolean;
}> = ({ isSelected, isUserConfirmed, isAiOriginal, hasRunAiAnalysis = false }) => {
  if (isSelected) {
    if (isUserConfirmed) {
      return (
        <span
          title="Confirmed by user"
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/80 text-emerald-200 text-[10px] font-extrabold tracking-tight shrink-0 shadow-xs"
        >
          <Check className="w-3 h-3 text-emerald-300 stroke-[3]" />
          <span>Confirmed</span>
        </span>
      );
    }
    if (hasRunAiAnalysis) {
      return (
        <span
          title="AI visual analysis result — tap to confirm or select another option"
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/80 text-indigo-200 text-[10px] font-extrabold tracking-tight shrink-0 shadow-xs"
        >
          <PawAiStarIcon className="w-3 h-3 text-indigo-300 shrink-0" />
          <span>✦ AI</span>
        </span>
      );
    }
    return null;
  }

  // If user selected a different pill after AI ran, keep a subtle AI marker on the original AI-detected pill for reference
  if (isAiOriginal && hasRunAiAnalysis) {
    return (
      <span
        title="Original AI visual suggestion"
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-slate-800 border border-indigo-500/40 text-indigo-300/80 text-[9px] font-semibold shrink-0"
      >
        <span>✦ AI</span>
      </span>
    );
  }

  return null;
};

// Camera stream acquired ONCE at the start up of the app and kept alive across tab switches
let appStartupCameraStream: MediaStream | null = null;
let appStartupCameraInitialized = false;
const startupCameraListeners = new Set<() => void>();

function initStartupCameraOnce() {
  if (appStartupCameraInitialized) return;
  appStartupCameraInitialized = true;
  if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return;
  }
  navigator.mediaDevices
    .getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
      },
      audio: false,
    })
    .then((stream) => {
      appStartupCameraStream = stream;
      startupCameraListeners.forEach((cb) => cb());
    })
    .catch(() => {
      // Camera unavailable or declined; never prompt a second time
    });
}

export function FelisIdLensPage(props: FelisIdLensPageProps = {}) {
  const {
    activeCats: propCats,
    colonies: propColonies,
    allLocations: propLocations,
    allPhotos: propPhotos,
    careEpisodes: propCareEpisodes,
    onRefreshData,
    onOpenCaptureWithDraft,
    extractExifGps,
    commitObservation,
    recordSeenNow,
    computeDistanceMetres,
  } = props;

  // Database state synced with props or loaded from IndexedDB (__HydraBridge.db)
  const [localCats, setLocalCats] = useState<any[]>(propCats || []);
  const [localColonies, setLocalColonies] = useState<any[]>(propColonies || []);
  const [localLocations, setLocalLocations] = useState<any[]>(propLocations || []);
  const [localPhotos, setLocalPhotos] = useState<any[]>(propPhotos || []);
  const [localCareEpisodes, setLocalCareEpisodes] = useState<any[]>(propCareEpisodes || []);

  useEffect(() => {
    if (propCats && propCats.length > 0) setLocalCats(propCats);
  }, [propCats]);
  useEffect(() => {
    if (propColonies && propColonies.length > 0) setLocalColonies(propColonies);
  }, [propColonies]);
  useEffect(() => {
    if (propLocations && propLocations.length > 0) setLocalLocations(propLocations);
  }, [propLocations]);
  useEffect(() => {
    if (propPhotos && propPhotos.length > 0) setLocalPhotos(propPhotos);
  }, [propPhotos]);
  useEffect(() => {
    if (propCareEpisodes && propCareEpisodes.length > 0) setLocalCareEpisodes(propCareEpisodes);
  }, [propCareEpisodes]);

  const reloadLocalDbSnapshot = async () => {
    try {
      const bridge = (window as any).__HydraBridge;
      const db = bridge?.db;
      if (!db) return;
      const [c, col, loc, ph, ep] = await Promise.all([
        db.cats?.toArray?.() || [],
        db.colonies?.toArray?.() || [],
        db.locations?.toArray?.() || [],
        db.photos?.toArray?.() || [],
        db.care_episodes?.toArray?.() || [],
      ]);
      setLocalCats(c);
      setLocalColonies(col);
      setLocalLocations(loc);
      setLocalPhotos(ph);
      setLocalCareEpisodes(ep);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    reloadLocalDbSnapshot();
  }, []);

  // Photo GPS & EXIF timestamp state
  const [photoGps, setPhotoGps] = useState<{
    latitude: number;
    longitude: number;
    source: 'Photo metadata' | 'Confirmed on-site Device GPS';
  } | null>(null);
  const [deviceGpsFallback, setDeviceGpsFallback] = useState<{
    latitude: number;
    longitude: number;
  }>(DEFAULT_HYDRA_COORDS);
  const [photoCapturedAt, setPhotoCapturedAt] = useState<string | null>(null);
  const [hasExifGpsTag, setHasExifGpsTag] = useState<boolean>(false);

  // Selected candidate for Side-by-Side Comparison View (1.c.i)
  const [selectedComparisonCandidateId, setSelectedComparisonCandidateId] = useState<string | null>(null);
  const [seenNowRecordedMap, setSeenNowRecordedMap] = useState<Record<string, boolean>>({});
  const [isRegisteringOrResighting, setIsRegisteringOrResighting] = useState<boolean>(false);

  // Whether a photo has been captured or uploaded in this session (false = 1.1 full-screen Google Lens startup screen)
  const [hasActivePhoto, setHasActivePhoto] = useState<boolean>(false);

  // Primary photo (cropped subject) & original full-frame photo
  const [primaryImage, setPrimaryImage] = useState<string | null>(null);
  const [originalPrimaryImage, setOriginalPrimaryImage] = useState<string | null>(null);
  const [rawOriginalDims, setRawOriginalDims] = useState<{ width: number; height: number } | null>(null);

  // Additional photos
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [additionalOriginalImages, setAdditionalOriginalImages] = useState<string[]>([]);
  const [additionalCropStats, setAdditionalCropStats] = useState<AutoCropResult[]>([]);
  const [isSampleCatActive, setIsSampleCatActive] = useState<boolean>(false);

  // Video frames
  const [, setUploadedVideos] = useState<{
    name: string;
    size: string;
    frames: ExtractedVideoFrame[];
  }[]>([]);
  const [, setIsVideoExtracting] = useState<boolean>(false);

  // AI Analysis Report & loading states
  const [report, setReport] = useState<CatIdentificationAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, setDragActive] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Structured PawLens IDMarks & Vitals Pill Selector states (1.1.1.2)
  const [aiDetectedState, setAiDetectedState] = useState<PawLensStructuredState>(DEFAULT_PAWLENS_STATE);
  const [selectedState, setSelectedState] = useState<PawLensStructuredState>(DEFAULT_PAWLENS_STATE);
  const [hasRunAiAnalysis, setHasRunAiAnalysis] = useState<boolean>(false);
  const [confirmedFields, setConfirmedFields] = useState<Record<string, boolean>>({});
  const [confirmedFingerprints, setConfirmedFingerprints] = useState<Record<string, boolean>>({});
  const [customFingerprintInput, setCustomFingerprintInput] = useState<string>('');
  const [customTabbySubtypeInput, setCustomTabbySubtypeInput] = useState<string>('');
  const [activeFeaturePopup, setActiveFeaturePopup] = useState<FeaturePopupKey>(null);
  const [registeredNewCatId, setRegisteredNewCatId] = useState<string | null>(null);
  const [activeHealthInfoCode, setActiveHealthInfoCode] = useState<string | null>(null);
  const [showAllHealthGuides, setShowAllHealthGuides] = useState<boolean>(false);

  // Manual Cropper modal state
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [croppingTargetIndex] = useState<number>(-1);

  // Automatic Cat Subject Cropper state
  const [autoCropEnabled, setAutoCropEnabled] = useState<boolean>(true);
  const [cropPaddingRatio] = useState<number>(0.14);
  const [autoCropStats, setAutoCropStats] = useState<AutoCropResult | null>(null);
  const [isAutoCropping, setIsAutoCropping] = useState<boolean>(false);
  const [actualApiTokensUsed, setActualApiTokensUsed] = useState<number | null>(null);

  // Live API credit status
  const [creditStatus, setCreditStatus] = useState<{
    configured: boolean;
    status: string;
    httpCode: number;
    stateLabel: string;
    modelTested?: string;
    latencyMs?: number;
    summary: string;
    checkedAt: string;
    fallbackActive: boolean;
  } | null>(null);
  const [isCheckingCredit, setIsCheckingCredit] = useState<boolean>(false);
  const [showCreditPanel, setShowCreditPanel] = useState<boolean>(false);

  // Google Lens Viewfinder & Camera States
  const [, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [, setCameraError] = useState<string | null>(null);
  const [sheetState, setSheetState] = useState<'closed' | 'quarter' | 'half' | 'full'>('closed');
  const [sheetDragPct, setSheetDragPct] = useState<number | null>(null);
  const sheetDragStartRef = useRef<{
    startY: number;
    startPct: number;
    currentPct: number;
    moved: boolean;
  } | null>(null);
  const lensContainerRef = useRef<HTMLDivElement>(null);
  const topViewfinderContainerRef = useRef<HTMLDivElement>(null);
  const [lensContainerSize, setLensContainerSize] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 400,
    height: typeof window !== 'undefined' ? Math.max(540, window.innerHeight - 68) : 650,
  });
  const [activeSheetTab, setActiveSheetTab] = useState<'idmarks' | 'vitals' | 'report'>('idmarks');

  // Interactive Google Lens Frame Box (percentage 0..100 of displayed photo)
  const [lensBox, setLensBox] = useState<{
    xPct: number;
    yPct: number;
    widthPct: number;
    heightPct: number;
  }>({ xPct: 15, yPct: 15, widthPct: 70, heightPct: 66 });

  const [activeDragHandle, setActiveDragHandle] = useState<DragHandleType>(null);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    startBox: { xPct: number; yPct: number; widthPct: number; heightPct: number };
  } | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraCaptureInputRef = useRef<HTMLInputElement>(null);
  const extraPhotoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const viewfinderImageWrapperRef = useRef<HTMLDivElement>(null);

  // Live 3-Tier Matching Candidates (top 10 highest-scored, ordered closest to photo GPS first)
  // Re-computes automatically whenever AI results or user-selected IDMarks/Vitals change!
  const activeReferenceCoords = photoGps
    ? { latitude: photoGps.latitude, longitude: photoGps.longitude }
    : deviceGpsFallback;

  const [candidatesLayoutMode, setCandidatesLayoutMode] = useState<'carousel' | 'grid'>('carousel');

  const matchingCandidates = useMemo(() => {
    const distFn =
      computeDistanceMetres ||
      (typeof window !== 'undefined' ? (window as any).__HydraBridge?.computeDistanceMetres : undefined) ||
      haversineMetres;
    return computeLensThreeTierMatches({
      queryState: selectedState,
      confirmedFields,
      confirmedFingerprints,
      photoCoords: activeReferenceCoords,
      activeCats: localCats,
      allLocations: localLocations,
      allPhotos: localPhotos,
      colonies: localColonies,
      careEpisodes: localCareEpisodes,
      distanceFn: distFn,
    });
  }, [
    selectedState,
    confirmedFields,
    confirmedFingerprints,
    activeReferenceCoords,
    localCats,
    localLocations,
    localPhotos,
    localColonies,
    localCareEpisodes,
    computeDistanceMetres,
  ]);

  const selectedComparisonCandidate = useMemo(() => {
    if (!selectedComparisonCandidateId) return null;
    return (
      matchingCandidates.find((c) => c.cat.id === selectedComparisonCandidateId) || null
    );
  }, [selectedComparisonCandidateId, matchingCandidates]);

  // If the user changes a filter that eliminates the currently compared candidate, gracefully return to carousel
  useEffect(() => {
    if (
      selectedComparisonCandidateId &&
      !matchingCandidates.some((c) => c.cat.id === selectedComparisonCandidateId)
    ) {
      setSelectedComparisonCandidateId(null);
    }
  }, [matchingCandidates, selectedComparisonCandidateId]);

  const checkCreditStatus = async (openPanel = false) => {
    if (openPanel) setShowCreditPanel(true);
    setIsCheckingCredit(true);
    try {
      const res = await fetch('/api/credit-status');
      const data = await res.json();
      setCreditStatus(data);
    } catch {
      // ignore network error
    } finally {
      setIsCheckingCredit(false);
    }
  };

  // Track outer lensContainerRef dimensions so top viewfinder and photo/crop frame resize synchronously on every frame of handlebar drag
  useEffect(() => {
    const el = lensContainerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setLensContainerSize((prev) =>
          Math.abs(prev.width - rect.width) < 0.5 && Math.abs(prev.height - rect.height) < 0.5
            ? prev
            : { width: rect.width, height: rect.height }
        );
      }
    };
    updateSize();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => updateSize());
      observer.observe(el);
      return () => observer.disconnect();
    } else {
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }
  }, []);

  // On mount: passively read device GPS if available and attach the camera stream once (no background LLM calls)
  useEffect(() => {
    initStartupCameraOnce();
    attachStartupCameraStream();
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (pos?.coords) {
              setDeviceGpsFallback({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              });
            }
          },
          () => {},
          { enableHighAccuracy: false, timeout: 4000, maximumAge: 60000 }
        );
      } catch {
        // ignore
      }
    }
    const onStreamReady = () => attachStartupCameraStream();
    startupCameraListeners.add(onStreamReady);
    return () => {
      startupCameraListeners.delete(onStreamReady);
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = null;
      }
    };
  }, []);

  // Re-attach video stream whenever returning to the camera view
  useEffect(() => {
    if (!hasActivePhoto) {
      attachStartupCameraStream();
    }
  }, [hasActivePhoto]);

  // Sync lensBox whenever autoCropStats updates with a detected cat bounding box
  useEffect(() => {
    if (autoCropStats && autoCropStats.cropBox) {
      const b = autoCropStats.cropBox;
      if (b.widthPct >= 10 && b.heightPct >= 10) {
        setLensBox({
          xPct: Math.max(2, Math.min(88, b.xPct)),
          yPct: Math.max(2, Math.min(88, b.yPct)),
          widthPct: Math.max(14, Math.min(96, b.widthPct)),
          heightPct: Math.max(14, Math.min(96, b.heightPct)),
        });
      }
    }
  }, [autoCropStats]);

  const attachStartupCameraStream = () => {
    if (appStartupCameraStream && appStartupCameraStream.getTracks().some((t) => t.readyState === 'live')) {
      videoStreamRef.current = appStartupCameraStream;
      setIsCameraActive(true);
      setTimeout(() => {
        if (liveVideoRef.current && appStartupCameraStream) {
          if (liveVideoRef.current.srcObject !== appStartupCameraStream) {
            liveVideoRef.current.srcObject = appStartupCameraStream;
          }
          liveVideoRef.current.play().catch(() => {});
        }
      }, 20);
    } else {
      setIsCameraActive(false);
    }
  };

  const startLiveCameraSilent = (_facing: 'environment' | 'user' = 'environment') => {
    attachStartupCameraStream();
  };

  const stopLiveCamera = () => {
    // Keep appStartupCameraStream alive so returning to camera never re-prompts
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null;
    }
  };

  const cropDataUrlByPctBox = (
    sourceDataUrl: string,
    box: { xPct: number; yPct: number; widthPct: number; heightPct: number }
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        const sx = Math.max(0, Math.round((box.xPct / 100) * w));
        const sy = Math.max(0, Math.round((box.yPct / 100) * h));
        const sw = Math.max(1, Math.min(w - sx, Math.round((box.widthPct / 100) * w)));
        const sh = Math.max(1, Math.min(h - sy, Math.round((box.heightPct / 100) * h)));

        // Cap maximum bounding box dimensions at 1024px on the longest side while strictly preserving aspect ratio
        const maxDim = 1024;
        const longestSide = Math.max(sw, sh);
        const scale = longestSide > maxDim ? maxDim / longestSide : 1;
        const outW = Math.max(1, Math.round(sw * scale));
        const outH = Math.max(1, Math.round(sh * scale));

        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('Failed to crop image'));
      img.src = sourceDataUrl;
    });
  };

  const triggerUploadPhotoClick = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
      photoInputRef.current.click();
    }
  };

  const handleTakePhotoPress = async () => {
    setErrorMessage(null);
    setCameraError(null);

    if (liveVideoRef.current && liveVideoRef.current.videoWidth > 0) {
      const video = liveVideoRef.current;
      const vw = video.videoWidth || 1280;
      const vh = video.videoHeight || 720;
      const maxDim = 1024;
      const longest = Math.max(vw, vh);
      const scale = longest > maxDim ? maxDim / longest : 1;
      const outW = Math.max(1, Math.round(vw * scale));
      const outH = Math.max(1, Math.round(vh * scale));
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(video, 0, 0, outW, outH);
        const capturedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPhotoGps({
          latitude: deviceGpsFallback.latitude,
          longitude: deviceGpsFallback.longitude,
          source: 'Confirmed on-site Device GPS',
        });
        setHasExifGpsTag(false);
        setPhotoCapturedAt(new Date().toISOString());
        await applyPrimaryPhotoAndAnalyze(capturedDataUrl, vw, vh);
        return;
      }
    }

    // If live video stream is not active, open native camera/photo input without re-requesting getUserMedia
    if (cameraCaptureInputRef.current) {
      cameraCaptureInputRef.current.value = '';
      cameraCaptureInputRef.current.click();
    }
  };

  const processImageFile = async (
    file: File
  ): Promise<{ dataUrl: string; rawWidth: number; rawHeight: number }> => {
    const isImage =
      !file.type ||
      file.type.startsWith('image/') ||
      /\.(jpe?g|jfif|png|webp|gif|bmp|heic|heif|avif|tiff?|svg)$/i.test(file.name);

    if (!isImage) {
      throw new Error('Please select a valid image file (JPG, PNG, WEBP, HEIC).');
    }

    const drawSourceToJpegDataUrl = (
      source: CanvasImageSource,
      srcWidth: number,
      srcHeight: number
    ): { dataUrl: string; rawWidth: number; rawHeight: number } => {
      // Cap max bounding box dimension at 1024px on the longest side with strict aspect ratio preservation and 0.85 JPEG quality
      const maxDim = 1024;
      const longestSide = Math.max(srcWidth, srcHeight);
      const scale = longestSide > maxDim ? maxDim / longestSide : 1;
      const width = Math.max(1, Math.round(srcWidth * scale));
      const height = Math.max(1, Math.round(srcHeight * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Browser canvas context unavailable.');
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      return {
        dataUrl: canvas.toDataURL('image/jpeg', 0.85),
        rawWidth: srcWidth,
        rawHeight: srcHeight,
      };
    };

    if (typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(file);
        const res = drawSourceToJpegDataUrl(bitmap, bitmap.width, bitmap.height);
        if (typeof bitmap.close === 'function') bitmap.close();
        return res;
      } catch {
        // fall through to FileReader / HTMLImageElement loader
      }
    }

    const readAsDataUrl = (): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to read image file.'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read image file.'));
        reader.readAsDataURL(file);
      });

    const rawDataUrl = await readAsDataUrl();

    return new Promise<{ dataUrl: string; rawWidth: number; rawHeight: number }>(
      (resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          try {
            const w = img.naturalWidth || img.width;
            const h = img.naturalHeight || img.height;
            if (!w || !h) {
              reject(new Error('Decoded image has 0 dimensions.'));
              return;
            }
            const out = drawSourceToJpegDataUrl(img, w, h);
            resolve(out);
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => {
          reject(new Error('Browser could not decode image directly.'));
        };
        img.src = rawDataUrl;
      }
    );
  };

  /**
   * When a photo is taken or uploaded:
   * - Show photo in the top half of the screen
   * - Automatically crop the photo to the cat subject (1024px max on longest side) and set the interactive crop frame
   * - Pop up the standard bottom sheet (`sheetState = 'half'`)
   * - Do NOT automatically start visual AI analysis (runs only when user clicks "Start AI Analysis")
   */
  const applyPrimaryPhotoAndAnalyze = async (
    fullBase64: string,
    rawWidth?: number,
    rawHeight?: number,
    keepSampleFlag = false
  ) => {
    stopLiveCamera();
    setOriginalPrimaryImage(fullBase64);
    setHasActivePhoto(true);
    setSheetState('half');
    setActiveSheetTab('idmarks');
    setSelectedComparisonCandidateId(null);
    setActiveFeaturePopup(null);
    setRegisteredNewCatId(null);
    if (!keepSampleFlag) setIsSampleCatActive(false);
    if (rawWidth && rawHeight) {
      setRawOriginalDims({ width: rawWidth, height: rawHeight });
    }

    // Reset previous AI results and user confirmations for the new photo
    setReport(null);
    setActualApiTokensUsed(null);
    setHasRunAiAnalysis(false);
    setAiDetectedState(DEFAULT_PAWLENS_STATE);
    setSelectedState(DEFAULT_PAWLENS_STATE);
    setConfirmedFields({});
    setConfirmedFingerprints({});

    setIsAutoCropping(true);
    try {
      if (autoCropEnabled) {
        const cropRes = await autoCropCatSubject(fullBase64, {
          targetMaxDim: 1024,
          paddingRatio: cropPaddingRatio,
          rawOriginalWidth: rawWidth,
          rawOriginalHeight: rawHeight,
        });
        setPrimaryImage(cropRes.croppedDataUrl);
        setAutoCropStats(cropRes);
        if (cropRes.cropBox && cropRes.cropBox.widthPct >= 10 && cropRes.cropBox.heightPct >= 10) {
          setLensBox({
            xPct: Math.max(2, Math.min(88, cropRes.cropBox.xPct)),
            yPct: Math.max(2, Math.min(88, cropRes.cropBox.yPct)),
            widthPct: Math.max(14, Math.min(96, cropRes.cropBox.widthPct)),
            heightPct: Math.max(14, Math.min(96, cropRes.cropBox.heightPct)),
          });
        }
      } else {
        const downscaledFull = await downscaleImageForApi(fullBase64, 1024, 0.85);
        setPrimaryImage(downscaledFull);
        const fullStats = await measureImageStats(
          downscaledFull,
          fullBase64,
          'full',
          { xPct: 0, yPct: 0, widthPct: 100, heightPct: 100 },
          rawWidth && rawHeight ? { width: rawWidth, height: rawHeight } : undefined
        );
        setAutoCropStats(fullStats);
      }
    } finally {
      setIsAutoCropping(false);
    }
  };

  const buildExtraPhotoEntry = async (
    fullBase64: string,
    rawWidth?: number,
    rawHeight?: number
  ): Promise<{ orig: string; cropped: string; stats: AutoCropResult }> => {
    if (autoCropEnabled) {
      const cropRes = await autoCropCatSubject(fullBase64, {
        targetMaxDim: 1024,
        paddingRatio: cropPaddingRatio,
        rawOriginalWidth: rawWidth,
        rawOriginalHeight: rawHeight,
      });
      return {
        orig: fullBase64,
        cropped: cropRes.croppedDataUrl,
        stats: cropRes,
      };
    } else {
      const downscaledExtra = await downscaleImageForApi(fullBase64, 1024, 0.85);
      const fullStats = await measureImageStats(
        downscaledExtra,
        fullBase64,
        'full',
        { xPct: 0, yPct: 0, widthPct: 100, heightPct: 100 },
        rawWidth && rawHeight ? { width: rawWidth, height: rawHeight } : undefined
      );
      return {
        orig: fullBase64,
        cropped: downscaledExtra,
        stats: fullStats,
      };
    }
  };

  const handleFiles = async (files: FileList | File[], replacePrimary = true) => {
    stopLiveCamera();
    setErrorMessage(null);
    const fileArray = Array.from(files);

    const imageFiles = fileArray.filter(
      (f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif|tiff?)$/i.test(f.name)
    );
    const videoFiles = fileArray.filter(
      (f) => f.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|avi)$/i.test(f.name)
    );

    if (imageFiles.length > 0) {
      const shouldReplaceFirst = replacePrimary || !primaryImage || !hasActivePhoto || isSampleCatActive;

      const newExtrasCropped: string[] = [];
      const newExtrasOrig: string[] = [];
      const newExtrasStats: AutoCropResult[] = [];

      for (let i = 0; i < imageFiles.length; i++) {
        try {
          const fileObj = imageFiles[i];
          if (i === 0 && shouldReplaceFirst) {
            const exifFn =
              extractExifGps ||
              (typeof window !== 'undefined' ? (window as any).__HydraBridge?.extractExifGps : undefined);
            // Extract EXIF GPS coordinates and timestamp from the uploaded photo file
            if (exifFn) {
              try {
                const exifInfo = await exifFn(fileObj);
                const capAt =
                  exifInfo?.capturedAt ||
                  (fileObj.lastModified ? new Date(fileObj.lastModified).toISOString() : new Date().toISOString());
                setPhotoCapturedAt(capAt);
                if (exifInfo?.hasGps && exifInfo.coordinates) {
                  setPhotoGps({
                    latitude: exifInfo.coordinates.latitude,
                    longitude: exifInfo.coordinates.longitude,
                    source: 'Photo metadata',
                  });
                  setHasExifGpsTag(true);
                } else {
                  setPhotoGps(null);
                  setHasExifGpsTag(false);
                }
              } catch {
                setPhotoGps(null);
                setHasExifGpsTag(false);
                setPhotoCapturedAt(new Date().toISOString());
              }
            } else {
              setPhotoCapturedAt(new Date().toISOString());
            }
          }

          const { dataUrl, rawWidth, rawHeight } = await processImageFile(fileObj);
          if (i === 0 && shouldReplaceFirst) {
            setOriginalPrimaryImage(dataUrl);
            setHasActivePhoto(true);
            setSheetState('half');
            setActiveSheetTab('idmarks');
            setSelectedComparisonCandidateId(null);
            setActiveFeaturePopup(null);
            setRegisteredNewCatId(null);
            setIsSampleCatActive(false);
            setRawOriginalDims({ width: rawWidth, height: rawHeight });
            setReport(null);
            setActualApiTokensUsed(null);
            setHasRunAiAnalysis(false);
            setAiDetectedState(DEFAULT_PAWLENS_STATE);
            setSelectedState(DEFAULT_PAWLENS_STATE);
            setConfirmedFields({});
            setConfirmedFingerprints({});

            setIsAutoCropping(true);
            try {
              const cropRes = await autoCropCatSubject(dataUrl, {
                targetMaxDim: 1024,
                paddingRatio: cropPaddingRatio,
                rawOriginalWidth: rawWidth,
                rawOriginalHeight: rawHeight,
              });
              setPrimaryImage(cropRes.croppedDataUrl);
              setAutoCropStats(cropRes);
              if (cropRes.cropBox && cropRes.cropBox.widthPct >= 10 && cropRes.cropBox.heightPct >= 10) {
                setLensBox({
                  xPct: Math.max(2, Math.min(88, cropRes.cropBox.xPct)),
                  yPct: Math.max(2, Math.min(88, cropRes.cropBox.yPct)),
                  widthPct: Math.max(14, Math.min(96, cropRes.cropBox.widthPct)),
                  heightPct: Math.max(14, Math.min(96, cropRes.cropBox.heightPct)),
                });
              }
            } finally {
              setIsAutoCropping(false);
            }
          } else {
            const extraEntry = await buildExtraPhotoEntry(dataUrl, rawWidth, rawHeight);
            newExtrasCropped.push(extraEntry.cropped);
            newExtrasOrig.push(extraEntry.orig);
            newExtrasStats.push(extraEntry.stats);
          }
        } catch (err: any) {
          setErrorMessage(err.message || 'Error reading photo file.');
        }
      }

      const finalExtrasCropped = replacePrimary
        ? newExtrasCropped.slice(0, 2)
        : [...additionalImages, ...newExtrasCropped].slice(0, 2);
      const finalExtrasOrig = replacePrimary
        ? newExtrasOrig.slice(0, 2)
        : [...additionalOriginalImages, ...newExtrasOrig].slice(0, 2);
      const finalExtrasStats = replacePrimary
        ? newExtrasStats.slice(0, 2)
        : [...additionalCropStats, ...newExtrasStats].slice(0, 2);

      setAdditionalImages(finalExtrasCropped);
      setAdditionalOriginalImages(finalExtrasOrig);
      setAdditionalCropStats(finalExtrasStats);
    }

    if (videoFiles.length > 0) {
      setIsVideoExtracting(true);
      for (const vFile of videoFiles) {
        try {
          const frames = await extractFramesFromVideo(vFile, 3);
          const sizeMB = (vFile.size / (1024 * 1024)).toFixed(1) + ' MB';
          setUploadedVideos((prev) => [...prev, { name: vFile.name, size: sizeMB, frames }]);
          if (frames.length > 0) {
            await applyPrimaryPhotoAndAnalyze(frames[0].dataUrl);
          }
        } catch (vErr) {
          console.warn('Video extraction warning:', vErr);
        }
      }
      setIsVideoExtracting(false);
    }
  };

  const handlePhotoInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const selectedFiles = inputEl.files ? Array.from(inputEl.files) : [];
    if (selectedFiles.length > 0) {
      await handleFiles(selectedFiles, true);
    }
    inputEl.value = '';
  };

  const handleExtraPhotoInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const selectedFiles = inputEl.files ? Array.from(inputEl.files) : [];
    if (selectedFiles.length > 0) {
      await handleFiles(selectedFiles, false);
    }
    inputEl.value = '';
  };

  const handleVideoInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const selectedFiles = inputEl.files ? Array.from(inputEl.files) : [];
    if (selectedFiles.length > 0) {
      await handleFiles(selectedFiles, false);
    }
    inputEl.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files, true);
    }
  };

  // 1.1.1.1 Interactive Google Lens Crop Frame Move & Resize (ONLY active on captured/uploaded photos)
  const handleLensPointerDown = (
    e: React.PointerEvent,
    handleType: DragHandleType
  ) => {
    if (!hasActivePhoto) return;
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setActiveDragHandle(handleType);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startBox: { ...lensBox },
    };
  };

  const handleLensPointerMove = (e: React.PointerEvent) => {
    if (!hasActivePhoto || !activeDragHandle || !dragStartRef.current || !viewfinderImageWrapperRef.current) {
      return;
    }
    const rect = viewfinderImageWrapperRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dxPct = ((e.clientX - dragStartRef.current.clientX) / rect.width) * 100;
    const dyPct = ((e.clientY - dragStartRef.current.clientY) / rect.height) * 100;
    const s = dragStartRef.current.startBox;

    const next = { ...s };
    const minSize = 16;

    if (activeDragHandle === 'move') {
      next.xPct = Math.max(0, Math.min(100 - s.widthPct, s.xPct + dxPct));
      next.yPct = Math.max(0, Math.min(100 - s.heightPct, s.yPct + dyPct));
    } else if (activeDragHandle === 'nw') {
      const maxLeft = s.xPct + s.widthPct - minSize;
      const maxTop = s.yPct + s.heightPct - minSize;
      const newX = Math.max(0, Math.min(maxLeft, s.xPct + dxPct));
      const newY = Math.max(0, Math.min(maxTop, s.yPct + dyPct));
      next.widthPct = s.widthPct + (s.xPct - newX);
      next.heightPct = s.heightPct + (s.yPct - newY);
      next.xPct = newX;
      next.yPct = newY;
    } else if (activeDragHandle === 'ne') {
      const maxTop = s.yPct + s.heightPct - minSize;
      const newY = Math.max(0, Math.min(maxTop, s.yPct + dyPct));
      next.widthPct = Math.max(minSize, Math.min(100 - s.xPct, s.widthPct + dxPct));
      next.heightPct = s.heightPct + (s.yPct - newY);
      next.yPct = newY;
    } else if (activeDragHandle === 'sw') {
      const maxLeft = s.xPct + s.widthPct - minSize;
      const newX = Math.max(0, Math.min(maxLeft, s.xPct + dxPct));
      next.widthPct = s.widthPct + (s.xPct - newX);
      next.heightPct = Math.max(minSize, Math.min(100 - s.yPct, s.heightPct + dyPct));
      next.xPct = newX;
    } else if (activeDragHandle === 'se') {
      next.widthPct = Math.max(minSize, Math.min(100 - s.xPct, s.widthPct + dxPct));
      next.heightPct = Math.max(minSize, Math.min(100 - s.yPct, s.heightPct + dyPct));
    }

    setActualApiTokensUsed(null);
    setLensBox({
      xPct: Number(next.xPct.toFixed(1)),
      yPct: Number(next.yPct.toFixed(1)),
      widthPct: Number(next.widthPct.toFixed(1)),
      heightPct: Number(next.heightPct.toFixed(1)),
    });
  };

  const handleLensPointerUp = async () => {
    if (!activeDragHandle) return;
    setActiveDragHandle(null);
    dragStartRef.current = null;

    const sourceOrig = originalPrimaryImage || primaryImage;
    if (hasActivePhoto && sourceOrig) {
      try {
        const croppedUrl = await cropDataUrlByPctBox(sourceOrig, lensBox);
        setPrimaryImage(croppedUrl);
        const stats = await measureImageStats(
          croppedUrl,
          sourceOrig,
          'manual',
          lensBox,
          rawOriginalDims || undefined
        );
        setAutoCropStats(stats);
      } catch {
        // ignore
      }
    }
  };

  // Bottom sheet drag handle pointer & touch handlers:
  // Allows dragging the sheet up to the top quarter of the screen (75% height)
  // or minimising it to the lower quarter of the screen (25% height, making the photo 75% height)
  const getSheetTargetPct = (state: 'closed' | 'quarter' | 'half' | 'full') => {
    if (state === 'quarter') return 25;
    if (state === 'full') return 75;
    return 52;
  };

  const updateSheetDragByClientY = (clientY: number) => {
    const dragInfo = sheetDragStartRef.current;
    if (!dragInfo) return;
    const containerH =
      lensContainerRef.current?.getBoundingClientRect().height || window.innerHeight || 700;
    const deltaY = dragInfo.startY - clientY; // positive when dragging UP
    if (Math.abs(deltaY) > 4) {
      dragInfo.moved = true;
    }
    const deltaPct = (deltaY / containerH) * 100;
    const nextPct = Number(
      Math.max(22, Math.min(78, dragInfo.startPct + deltaPct)).toFixed(1)
    );
    dragInfo.currentPct = nextPct;
    setSheetDragPct(nextPct);
  };

  const finishSheetDragByClientY = (clientY?: number) => {
    const dragInfo = sheetDragStartRef.current;
    if (!dragInfo) return;
    sheetDragStartRef.current = null;

    const { startY, startPct, currentPct, moved } = dragInfo;
    const deltaY = typeof clientY === 'number' ? startY - clientY : ((currentPct - startPct) / 100) * 700;

    if (!moved && Math.abs(deltaY) <= 5) {
      // Tap on handle cycles: half -> full (top quarter) -> quarter (lower quarter) -> half
      setSheetDragPct(null);
      setSheetState((prev) =>
        prev === 'half' ? 'full' : prev === 'full' ? 'quarter' : 'half'
      );
      return;
    }

    const finalPct = currentPct ?? startPct;
    setSheetDragPct(null);

    if (deltaY > 25 && startPct < 40) {
      setSheetState('half');
    } else if (deltaY > 25 && startPct >= 40) {
      setSheetState('full');
    } else if (deltaY < -25 && startPct > 60) {
      setSheetState('half');
    } else if (deltaY < -25 && startPct <= 60) {
      setSheetState('quarter');
    } else {
      // Snap to nearest of 25% (lower quarter), 52% (half), 75% (top quarter)
      const dQuarter = Math.abs(finalPct - 25);
      const dHalf = Math.abs(finalPct - 52);
      const dFull = Math.abs(finalPct - 75);
      if (dQuarter <= dHalf && dQuarter <= dFull) {
        setSheetState('quarter');
      } else if (dFull <= dHalf && dFull <= dQuarter) {
        setSheetState('full');
      } else {
        setSheetState('half');
      }
    }
  };

  useEffect(() => {
    const onWindowPointerMove = (ev: PointerEvent) => {
      if (!sheetDragStartRef.current) return;
      updateSheetDragByClientY(ev.clientY);
    };
    const onWindowPointerUp = (ev: PointerEvent) => {
      if (!sheetDragStartRef.current) return;
      finishSheetDragByClientY(ev.clientY);
    };
    const onWindowTouchMove = (ev: TouchEvent) => {
      if (!sheetDragStartRef.current) return;
      if (ev.touches && ev.touches.length > 0) {
        if (ev.cancelable) ev.preventDefault();
        updateSheetDragByClientY(ev.touches[0].clientY);
      }
    };
    const onWindowTouchEnd = (ev: TouchEvent) => {
      if (!sheetDragStartRef.current) return;
      const touch = ev.changedTouches && ev.changedTouches.length > 0 ? ev.changedTouches[0] : null;
      finishSheetDragByClientY(touch ? touch.clientY : undefined);
    };

    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('touchmove', onWindowTouchMove, { passive: false });
    window.addEventListener('touchend', onWindowTouchEnd);
    return () => {
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', onWindowPointerUp);
      window.removeEventListener('touchmove', onWindowTouchMove);
      window.removeEventListener('touchend', onWindowTouchEnd);
    };
  }, []);

  const handleSheetHandlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    const startPct = sheetDragPct ?? getSheetTargetPct(sheetState);
    sheetDragStartRef.current = {
      startY: e.clientY,
      startPct,
      currentPct: startPct,
      moved: false,
    };
    setSheetDragPct(startPct);
  };

  const handleSheetHandleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (!e.touches || e.touches.length === 0) return;
    const startPct = sheetDragPct ?? getSheetTargetPct(sheetState);
    sheetDragStartRef.current = {
      startY: e.touches[0].clientY,
      startPct,
      currentPct: startPct,
      moved: false,
    };
    setSheetDragPct(startPct);
  };

  const computeSingleImagePixelMetrics = (
    dataUrl: string,
    photoIndex: number
  ): Promise<SinglePhotoPixelMetrics> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const rawW = img.naturalWidth || img.width || 160;
        const rawH = img.naturalHeight || img.height || 160;
        const maxSample = 160;
        const sampleScale = Math.min(1, maxSample / Math.max(rawW, rawH));
        const cw = Math.max(32, Math.round(rawW * sampleScale));
        const ch = Math.max(32, Math.round(rawH * sampleScale));
        const canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            photoIndex,
            whitePct: 20,
            blackPct: 25,
            greyPct: 25,
            gingerPct: 8,
            brownPct: 22,
            edgeDensity: 18,
            lowerWhitePct: 20,
            upperWhitePct: 20,
          });
          return;
        }
        ctx.drawImage(img, 0, 0, cw, ch);
        const { data } = ctx.getImageData(0, 0, cw, ch);

        let white = 0;
        let black = 0;
        let grey = 0;
        let ginger = 0;
        let brown = 0;
        let total = 0;
        let lowerWhite = 0;
        let lowerTotal = 0;
        let upperWhite = 0;
        let upperTotal = 0;
        let edgeSum = 0;
        let edgeCount = 0;

        const marginX = Math.floor(cw * 0.12);
        const marginY = Math.floor(ch * 0.12);
        for (let y = marginY; y < ch - marginY; y++) {
          for (let x = marginX; x < cw - marginX; x++) {
            const idx = (y * cw + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            const sat = max === 0 ? 0 : (max - min) / max;

            let isWhitePixel = false;
            if (lum >= 188 && sat <= 0.28) {
              white++;
              isWhitePixel = true;
            } else if (lum <= 55) {
              black++;
            } else if (sat <= 0.28) {
              grey++;
            } else if (r > g * 1.28 && g > b * 1.22 && r - b > 45 && lum >= 100 && sat >= 0.38) {
              ginger++;
            } else {
              brown++;
            }

            total++;
            if (y >= ch / 2) {
              lowerTotal++;
              if (isWhitePixel) lowerWhite++;
            } else {
              upperTotal++;
              if (isWhitePixel) upperWhite++;
            }

            if (x < cw - marginX - 1) {
              const nextIdx = (y * cw + (x + 1)) * 4;
              const nextLum =
                0.299 * data[nextIdx] +
                0.587 * data[nextIdx + 1] +
                0.114 * data[nextIdx + 2];
              edgeSum += Math.abs(lum - nextLum);
              edgeCount++;
            }
          }
        }

        const safeTotal = Math.max(total, 1);
        resolve({
          photoIndex,
          whitePct: (white / safeTotal) * 100,
          blackPct: (black / safeTotal) * 100,
          greyPct: (grey / safeTotal) * 100,
          gingerPct: (ginger / safeTotal) * 100,
          brownPct: (brown / safeTotal) * 100,
          edgeDensity: edgeCount > 0 ? edgeSum / edgeCount : 18,
          lowerWhitePct: lowerTotal > 0 ? (lowerWhite / lowerTotal) * 100 : 20,
          upperWhitePct: upperTotal > 0 ? (upperWhite / upperTotal) * 100 : 20,
        });
      };
      img.onerror = () =>
        resolve({
          photoIndex,
          whitePct: 20,
          blackPct: 25,
          greyPct: 25,
          gingerPct: 8,
          brownPct: 22,
          edgeDensity: 18,
          lowerWhitePct: 20,
          upperWhitePct: 20,
        });
      img.src = dataUrl;
    });
  };

  const computeAllPhotosPixelMetrics = async (
    allDataUrls: string[]
  ): Promise<CatPixelMetrics> => {
    const perPhotoMetrics = await Promise.all(
      allDataUrls.map((url, idx) => computeSingleImagePixelMetrics(url, idx + 1))
    );
    const count = Math.max(1, perPhotoMetrics.length);
    const sum = perPhotoMetrics.reduce(
      (acc, m) => ({
        whitePct: acc.whitePct + m.whitePct,
        blackPct: acc.blackPct + m.blackPct,
        greyPct: acc.greyPct + m.greyPct,
        gingerPct: acc.gingerPct + m.gingerPct,
        brownPct: acc.brownPct + m.brownPct,
        edgeDensity: acc.edgeDensity + m.edgeDensity,
        lowerWhitePct: acc.lowerWhitePct + m.lowerWhitePct,
        upperWhitePct: acc.upperWhitePct + m.upperWhitePct,
      }),
      {
        whitePct: 0,
        blackPct: 0,
        greyPct: 0,
        gingerPct: 0,
        brownPct: 0,
        edgeDensity: 0,
        lowerWhitePct: 0,
        upperWhitePct: 0,
      }
    );

    return {
      whitePct: sum.whitePct / count,
      blackPct: sum.blackPct / count,
      greyPct: sum.greyPct / count,
      gingerPct: sum.gingerPct / count,
      brownPct: sum.brownPct / count,
      edgeDensity: sum.edgeDensity / count,
      lowerWhitePct: sum.lowerWhitePct / count,
      upperWhitePct: sum.upperWhitePct / count,
      photoCount: count,
      perPhotoMetrics,
    };
  };

  /**
   * Client-side pre-flight image resizer: caps longest side at 1024px
   * while strictly preserving aspect ratio and encoding at 0.85 JPEG quality for lean, token-efficient scans.
   */
  const downscaleImageForApi = (
    dataUrl: string,
    maxDim = 1024,
    quality = 0.85
  ): Promise<string> => {
    return new Promise((resolve) => {
      if (!dataUrl || typeof dataUrl !== 'string') {
        resolve(dataUrl);
        return;
      }
      const targetMax = maxDim || 1024;
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || img.width || 1024;
        const h = img.naturalHeight || img.height || 768;
        const longestSide = Math.max(w, h);
        const scale = longestSide > targetMax ? targetMax / longestSide : 1;
        const outW = Math.max(1, Math.round(w * scale));
        const outH = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const isExtractingRef = useRef<boolean>(false);

  const triggerExtractionWithImages = async (
    activeCroppedImg: string,
    _activeOrigImg?: string,
    overrideAdditionalImages?: string[]
  ) => {
    if (isExtractingRef.current) return;
    isExtractingRef.current = true;
    setIsLoading(true);
    setErrorMessage(null);
    setHasActivePhoto(true);
    if (sheetState === 'closed') {
      setSheetState('half');
    }

    try {
      const extrasRaw = (overrideAdditionalImages !== undefined ? overrideAdditionalImages : additionalImages).slice(0, 2);

      // Resize longest side to <= 1024px at 0.85 JPEG quality while preserving aspect ratio
      const [downscaledPrimary, ...downscaledExtras] = await Promise.all([
        downscaleImageForApi(activeCroppedImg, 1024, 0.85),
        ...extrasRaw.map((img) => downscaleImageForApi(img, 1024, 0.85)),
      ]);

      const allExaminedImages = [downscaledPrimary, ...downscaledExtras];
      const pixelMetrics = await computeAllPhotosPixelMetrics(allExaminedImages);

      // Immediately pre-populate colorimetric AI estimate while cloud request completes
      const initialDerived = deriveStructuredPawLensState(null, null, pixelMetrics);
      setHasRunAiAnalysis(true);
      setAiDetectedState(initialDerived);
      setSelectedState((prev) => ({
        coatType: confirmedFields.coatType ? prev.coatType : initialDerived.coatType,
        tabbySubtype: confirmedFields.tabbySubtype ? prev.tabbySubtype : initialDerived.tabbySubtype,
        dominantColor: confirmedFields.dominantColor ? prev.dominantColor : initialDerived.dominantColor,
        whitePercent: confirmedFields.whitePercent ? prev.whitePercent : initialDerived.whitePercent,
        uniqueFingerprints:
          Object.keys(confirmedFingerprints).length > 0
            ? prev.uniqueFingerprints
            : initialDerived.uniqueFingerprints,
        sterilisation: confirmedFields.sterilisation ? prev.sterilisation : initialDerived.sterilisation,
        sex: confirmedFields.sex ? prev.sex : initialDerived.sex,
        lifeStage: confirmedFields.lifeStage ? prev.lifeStage : initialDerived.lifeStage,
        bodyCondition: confirmedFields.bodyCondition ? prev.bodyCondition : initialDerived.bodyCondition,
        health: confirmedFields.health ? prev.health : initialDerived.health,
        reproductiveStatus: confirmedFields.reproductiveStatus ? prev.reproductiveStatus : initialDerived.reproductiveStatus,
        vetCare: confirmedFields.vetCare ? prev.vetCare : initialDerived.vetCare,
      }));

      const cropAreaRatio = Number(
        (((lensBox.widthPct || 70) / 100) * ((lensBox.heightPct || 66) / 100)).toFixed(3)
      );

      // Single API call to /api/extract-cat-features (never call duplicate endpoints or send originalImages)
      const extractResponse = await fetch('/api/extract-cat-features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: downscaledPrimary,
          additionalImages: downscaledExtras,
          cropAreaRatio,
          pixelMetrics: {
            whitePct: Math.round(pixelMetrics.whitePct),
            blackPct: Math.round(pixelMetrics.blackPct),
            greyPct: Math.round(pixelMetrics.greyPct),
            gingerPct: Math.round(pixelMetrics.gingerPct),
            brownPct: Math.round(pixelMetrics.brownPct),
            edgeDensity: Number(pixelMetrics.edgeDensity.toFixed(1)),
            lowerWhitePct: Math.round(pixelMetrics.lowerWhitePct),
            upperWhitePct: Math.round(pixelMetrics.upperWhitePct),
          },
        }),
      });

      let reportData: CatIdentificationAnalysis | null = null;
      let usedTokensCount = 0;

      if (extractResponse.ok) {
        const extractJson = await extractResponse.json();
        reportData = extractJson;
        setReport(extractJson);
        if (typeof extractJson?.tokensUsed === 'number' && extractJson.tokensUsed > 0) {
          usedTokensCount = extractJson.tokensUsed;
        }
      }

      if (usedTokensCount > 0) {
        setActualApiTokensUsed(usedTokensCount);
      } else {
        const normCropW = Math.max(64, Math.round(((lensBox.widthPct || 70) / 100) * 750));
        const normCropH = Math.max(64, Math.round(((lensBox.heightPct || 66) / 100) * 750));
        setActualApiTokensUsed(
          estimateGeminiImageTokens(normCropW, normCropH, downscaledPrimary)
        );
      }

      const finalDerived = deriveStructuredPawLensState(reportData, null, pixelMetrics);
      setAiDetectedState(finalDerived);
      setSelectedState((prev) => ({
        coatType: confirmedFields.coatType ? prev.coatType : finalDerived.coatType,
        tabbySubtype: confirmedFields.tabbySubtype ? prev.tabbySubtype : finalDerived.tabbySubtype,
        dominantColor: confirmedFields.dominantColor ? prev.dominantColor : finalDerived.dominantColor,
        whitePercent: confirmedFields.whitePercent ? prev.whitePercent : finalDerived.whitePercent,
        uniqueFingerprints:
          Object.keys(confirmedFingerprints).length > 0
            ? prev.uniqueFingerprints
            : finalDerived.uniqueFingerprints,
        sterilisation: confirmedFields.sterilisation ? prev.sterilisation : finalDerived.sterilisation,
        sex: confirmedFields.sex ? prev.sex : finalDerived.sex,
        lifeStage: confirmedFields.lifeStage ? prev.lifeStage : finalDerived.lifeStage,
        bodyCondition: confirmedFields.bodyCondition ? prev.bodyCondition : finalDerived.bodyCondition,
        health: confirmedFields.health ? prev.health : finalDerived.health,
        reproductiveStatus: confirmedFields.reproductiveStatus ? prev.reproductiveStatus : finalDerived.reproductiveStatus,
        vetCare: confirmedFields.vetCare ? prev.vetCare : finalDerived.vetCare,
      }));
    } catch (err: any) {
      console.error('Extraction error:', err);
      setErrorMessage(err.message || 'Feature extraction failed. Please try again.');
    } finally {
      isExtractingRef.current = false;
      setIsLoading(false);
    }
  };

  const handleExtractFeatures = async () => {
    const sourceOrig = originalPrimaryImage || primaryImage;
    if (!sourceOrig) return;
    let croppedToSend = primaryImage || sourceOrig;
    try {
      croppedToSend = await cropDataUrlByPctBox(sourceOrig, lensBox);
      setPrimaryImage(croppedToSend);
    } catch {
      // fallback to current primaryImage
    }
    await triggerExtractionWithImages(croppedToSend, sourceOrig);
  };

  // 1.1.1.2.3 User selects a pill in IDMarks or Vitals -> updates entry, marks as Confirmed (✓), and collapses popup list
  const handleSelectSinglePill = (
    field: Exclude<keyof PawLensStructuredState, 'uniqueFingerprints'>,
    value: string
  ) => {
    setSelectedState((prev) => ({
      ...prev,
      [field]: value,
    }));
    setConfirmedFields((prev) => ({
      ...prev,
      [field]: true,
    }));
    setActiveFeaturePopup(null);
  };

  const handleToggleFingerprintPill = (feature: string) => {
    const norm = feature.trim().toLowerCase();
    if (!norm) return;
    setSelectedState((prev) => {
      const exists = prev.uniqueFingerprints.some((f) => f.toLowerCase() === norm);
      const nextList = exists
        ? prev.uniqueFingerprints.filter((f) => f.toLowerCase() !== norm)
        : [...prev.uniqueFingerprints, feature.trim()];
      return {
        ...prev,
        uniqueFingerprints: nextList,
      };
    });
    setConfirmedFingerprints((prev) => ({
      ...prev,
      [norm]: true,
    }));
    setActiveFeaturePopup(null);
  };

  const handleAddCustomFingerprint = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customFingerprintInput.trim();
    if (!trimmed) return;
    const norm = trimmed.toLowerCase();
    setSelectedState((prev) => {
      const exists = prev.uniqueFingerprints.some((f) => f.toLowerCase() === norm);
      return {
        ...prev,
        uniqueFingerprints: exists ? prev.uniqueFingerprints : [...prev.uniqueFingerprints, trimmed],
      };
    });
    setConfirmedFingerprints((prev) => ({
      ...prev,
      [norm]: true,
    }));
    setCustomFingerprintInput('');
    setActiveFeaturePopup(null);
  };

  /**
   * Builds normalized taxonomy (IDMarks) and reviewedMetrics (Vitals) from the current
   * AI vision results + user-confirmed overrides in `selectedState`.
   */
  const buildCurrentCatPayload = async () => {
    const bridge = (window as any).__HydraBridge;
    const db = bridge?.db;
    const liveCats = (await db?.cats?.toArray?.()) || localCats;

    const allConfirmedMap: Record<string, boolean> = {
      ...confirmedFields,
      ...(Object.keys(confirmedFingerprints).length > 0 ? { uniqueFingerprints: true } : {}),
    };

    const normalizedTaxonomy = normalizeIdMarks({
      coatType: selectedState.coatType,
      tabbySubtype: selectedState.coatType === 'tabby' ? selectedState.tabbySubtype : '',
      dominantColor: selectedState.dominantColor,
      whitePercent: selectedState.whitePercent,
      uniqueFingerprints: selectedState.uniqueFingerprints.join(', '),
      earStatus:
        selectedState.sterilisation === 'Sterilised'
          ? 'TNR Tipped'
          : selectedState.sterilisation === 'Unsterilised'
          ? 'Normal / Intact'
          : '',
      confirmedFields: allConfirmedMap,
    });

    const reviewedMetrics = {
      sterilisation: selectedState.sterilisation || 'Unknown',
      sex: selectedState.sex || 'Unknown',
      lifeStage: selectedState.lifeStage || 'Unknown',
      bodyCondition: selectedState.bodyCondition || 'Unknown',
      health: selectedState.health || 'Unknown',
      reproductiveStatus: selectedState.reproductiveStatus || 'Unknown',
      vetCare: selectedState.vetCare || 'Unknown',
      reproductive: {
        state: selectedState.reproductiveStatus !== 'Unknown' ? 'Known' : 'Unknown',
        indicators:
          selectedState.reproductiveStatus !== 'Unknown' ? [selectedState.reproductiveStatus] : [],
      },
      confirmedFields: allConfirmedMap,
    };

    const markingsSummary =
      formatIdMarksSummary(normalizedTaxonomy) ||
      report?.overallForensicSummary ||
      'Observed community cat in Hydra';
    const notesSummary = report?.overallForensicSummary || '';

    // Next identifying number KW-xxx
    let maxNum = 100;
    for (const c of liveCats) {
      const m = String(c?.identifyingNumber || '').match(/(\d+)/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    const identifyingNumber = `KW-${maxNum + 1}`;

    return {
      normalizedTaxonomy,
      reviewedMetrics,
      markingsSummary,
      notesSummary,
      identifyingNumber,
      allConfirmedMap,
    };
  };

  /**
   * (2) & (1.c.ii): Register a stray (new cat) with the AI vision results (or overridden user changes)
   * populated under the cat's IDMarks and Vitals, using the same registration workflow as the rest of the app.
   */
  const handleRegisterStray = async () => {
    if (isRegisteringOrResighting) return;
    setIsRegisteringOrResighting(true);
    setErrorMessage(null);
    try {
      const bridge = (window as any).__HydraBridge;
      const db = bridge?.db;
      const commitFn = commitObservation || bridge?.commitObservation;
      const refreshDataFn = onRefreshData || bridge?.onRefreshData;

      const personalSettings = await db?.personal_settings?.get?.('personal_settings_default');
      const actorDisplayName = personalSettings?.displayName || 'Field Contributor';

      const {
        normalizedTaxonomy,
        reviewedMetrics,
        markingsSummary,
        notesSummary,
        identifyingNumber,
      } = await buildCurrentCatPayload();

      // Always generate and use the cropped photo from the active 4-corner lensBox when registering as a new cat
      let croppedPhotoToSave = primaryImage || originalPrimaryImage || SAMPLE_CAT_PHOTO_URL;
      const sourceForCrop = originalPrimaryImage || primaryImage;
      if (hasActivePhoto && sourceForCrop) {
        try {
          croppedPhotoToSave = await cropDataUrlByPctBox(sourceForCrop, lensBox);
          setPrimaryImage(croppedPhotoToSave);
        } catch {
          // fallback to current primaryImage
        }
      }

      const observedAtIso = photoCapturedAt || new Date().toISOString();
      const coordsToSave = photoGps
        ? { latitude: photoGps.latitude, longitude: photoGps.longitude }
        : deviceGpsFallback;
      const coordsSource = photoGps ? photoGps.source : 'Confirmed on-site Device GPS';

      const urgentTriggers: string[] = [];
      if (
        selectedState.health === 'Threat to life' ||
        selectedState.health === 'Moribund' ||
        selectedState.health === 'Critically ill/injured'
      ) {
        urgentTriggers.push(selectedState.health);
      }

      if (commitFn) {
        const allCroppedUrls = [croppedPhotoToSave, ...additionalImages];
        const res = await commitFn({
          operationId: `op-lens-${Date.now()}`,
          isNewCat: true,
          identifyingNumber,
          catName: identifyingNumber,
          catMarkings: markingsSummary,
          catNotes: notesSummary,
          catTaxonomy: normalizedTaxonomy,
          photoBlobDataUrl: croppedPhotoToSave,
          photoBlobDataUrls: allCroppedUrls,
          originalPhotoBlobDataUrls: allCroppedUrls,
          primaryPhotoIndex: 0,
          photoMetadata: {
            hasExifGps: hasExifGpsTag,
            extractedGps: coordsToSave,
            capturedAt: observedAtIso,
          },
          photoMetadataList: allCroppedUrls.map((_, idx) => ({
            hasExifGps: idx === 0 ? hasExifGpsTag : false,
            extractedGps: coordsToSave,
            capturedAt: observedAtIso,
          })),
          observedAt: observedAtIso,
          coordinates: coordsToSave,
          coordinatesSource: coordsSource,
          accuracyMetres: 10,
          onSiteAnswer: 'Use my location',
          reviewedMetrics,
          fieldOutcomes: {},
          urgentDecision:
            urgentTriggers.length > 0
              ? {
                  triggers: urgentTriggers,
                  action: 'Open',
                  note: `New cat registered with urgent condition: ${urgentTriggers.join(', ')}.`,
                }
              : undefined,
          actorUid: 'current-user-uid',
          actorDisplayName,
        });

        if (selectedState.vetCare === 'Currently under care' && bridge?.startCareEpisode && res?.catId) {
          try {
            await bridge.startCareEpisode(
              res.catId,
              'Kranidi Animal Clinic',
              actorDisplayName,
              '+30 27540 21234',
              'Recorded under veterinary care via Lens',
              new Date().toISOString().slice(0, 10),
              actorDisplayName
            );
          } catch {
            // ignore
          }
        }

        await reloadLocalDbSnapshot();
        await refreshDataFn?.();

        if (res?.catId) {
          setRegisteredNewCatId(res.catId);
        }
      } else {
        setErrorMessage('Registration service is not initialized.');
      }
    } catch (err: any) {
      console.error('Register stray error:', err);
      setErrorMessage(err?.message || 'Failed to register stray cat.');
    } finally {
      setIsRegisteringOrResighting(false);
    }
  };

  /**
   * (1.c.ii): When "Seen now" is tapped on a matching candidate cat, registers a resight
   * using the same workflow as in the rest of the app.
   */
  const handleSeenNowCandidate = async (cand: LensMatchingCandidate, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isRegisteringOrResighting) return;
    setIsRegisteringOrResighting(true);
    setErrorMessage(null);

    try {
      const bridge = (window as any).__HydraBridge;
      const db = bridge?.db;
      const commitFn = commitObservation || bridge?.commitObservation;
      const recordSeenNowFn = recordSeenNow || bridge?.recordSeenNow;
      const openCaptureFn = onOpenCaptureWithDraft || bridge?.onOpenCaptureWithDraft;
      const refreshDataFn = onRefreshData || bridge?.onRefreshData;

      const personalSettings = await db?.personal_settings?.get?.('personal_settings_default');
      const actorDisplayName = personalSettings?.displayName || 'Field Contributor';

      const {
        normalizedTaxonomy,
        reviewedMetrics,
        markingsSummary,
        notesSummary,
      } = await buildCurrentCatPayload();

      const photoUrlToSave = primaryImage || originalPrimaryImage || cand.photoUrl || SAMPLE_CAT_PHOTO_URL;
      const origUrlToSave = originalPrimaryImage || primaryImage || photoUrlToSave;
      const observedAtIso = photoCapturedAt || new Date().toISOString();
      const coordsToSave = photoGps
        ? { latitude: photoGps.latitude, longitude: photoGps.longitude }
        : deviceGpsFallback;
      const coordsSource = photoGps ? photoGps.source : 'Confirmed on-site Device GPS';

      // Merge only known IDMarks into candidate's existing taxonomy so we never overwrite known traits with 'unknown'
      const existingTax = cand.cat.taxonomy || {};
      const mergedTaxonomy = {
        ...existingTax,
        ...(selectedState.coatType !== 'unknown' ? { coatType: selectedState.coatType, primaryCoatType: normalizedTaxonomy.primaryCoatType, tabbySubtype: normalizedTaxonomy.tabbySubtype } : {}),
        ...(selectedState.dominantColor !== 'unknown' ? { dominantColor: selectedState.dominantColor, colors: normalizedTaxonomy.colors } : {}),
        ...(selectedState.whitePercent !== 'unknown' ? { whitePercent: selectedState.whitePercent } : {}),
        ...(selectedState.uniqueFingerprints.length > 0 ? { uniqueFingerprints: selectedState.uniqueFingerprints.join(', '), tier3Notes: selectedState.uniqueFingerprints.join(', ') } : {}),
        confirmedFields: {
          ...(existingTax.confirmedFields || {}),
          ...(normalizedTaxonomy.confirmedFields || {}),
        },
      };

      // Compare known Vitals to determine fieldOutcomes & whether diff_review is needed
      const existingMetrics = cand.cat.currentMetrics || {};
      const fieldOutcomes: Record<string, 'use_new' | 'keep_old'> = {};
      let hasVitalConflict = false;

      const vitalKeys: Array<'sex' | 'lifeStage' | 'sterilisation' | 'bodyCondition' | 'health'> = [
        'sex',
        'lifeStage',
        'sterilisation',
        'bodyCondition',
        'health',
      ];
      for (const k of vitalKeys) {
        const newVal = reviewedMetrics[k];
        const oldVal = existingMetrics[k] || cand.vitals[k] || 'Unknown';
        if (newVal && newVal !== 'Unknown' && oldVal && oldVal !== 'Unknown' && newVal !== oldVal) {
          fieldOutcomes[k] = 'use_new';
          if (k === 'sex' || k === 'bodyCondition' || k === 'health' || k === 'sterilisation') {
            hasVitalConflict = true;
          }
        } else if (newVal && newVal !== 'Unknown' && (!oldVal || oldVal === 'Unknown')) {
          fieldOutcomes[k] = 'use_new';
        } else {
          fieldOutcomes[k] = 'keep_old';
        }
      }
      fieldOutcomes.reproductive =
        reviewedMetrics.reproductiveStatus !== 'Unknown' ? 'use_new' : 'keep_old';

      setSeenNowRecordedMap((prev) => ({ ...prev, [cand.cat.id]: true }));
      setTimeout(() => {
        setSeenNowRecordedMap((prev) => ({ ...prev, [cand.cat.id]: false }));
      }, 3000);

      if (hasVitalConflict && openCaptureFn && photoUrlToSave) {
        openCaptureFn({
          id: `draft-lens-resight-${Date.now()}`,
          operationId: `op-lens-resight-${Date.now()}`,
          step: 'diff_review',
          isExistingCat: true,
          selectedCandidateId: cand.cat.id,
          selectedCandidate: cand,
          photoDataUrl: photoUrlToSave,
          photoDataUrls: [photoUrlToSave, ...additionalImages],
          submittedByDisplayName: actorDisplayName,
          extractedMetadata: {
            hasGps: hasExifGpsTag,
            coordinates: coordsToSave,
            capturedAt: observedAtIso,
          },
          onSiteAnswer: 'Use my location',
          resolvedCoordinates: coordsToSave,
          coordinatesSource: coordsSource,
          proposedMetrics: reviewedMetrics,
          reviewedMetrics,
          fieldOutcomes,
          catName: cand.cat.name || cand.cat.identifyingNumber,
          identifyingNumber: cand.cat.identifyingNumber,
          taxonomy: mergedTaxonomy,
          markings: markingsSummary || cand.cat.markings,
          notes: notesSummary || 'Confirmed sighting (Seen now via Lens).',
          observedAt: observedAtIso,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        return;
      }

      if (commitFn && photoUrlToSave) {
        const allCroppedUrls = [photoUrlToSave, ...additionalImages];
        const allOrigUrls = [
          origUrlToSave || photoUrlToSave,
          ...additionalImages.map((img, idx) => additionalOriginalImages[idx] || img),
        ];
        await commitFn({
          operationId: `op-lens-resight-${Date.now()}`,
          isNewCat: false,
          catId: cand.cat.id,
          identifyingNumber: cand.cat.identifyingNumber,
          catName: cand.cat.name || cand.cat.identifyingNumber,
          catMarkings: cand.cat.markings || markingsSummary,
          catNotes: notesSummary || 'Confirmed sighting (Seen now via Lens).',
          catTaxonomy: mergedTaxonomy,
          photoBlobDataUrl: photoUrlToSave,
          photoBlobDataUrls: allCroppedUrls,
          originalPhotoBlobDataUrls: allOrigUrls,
          primaryPhotoIndex: 0,
          photoMetadata: {
            hasExifGps: hasExifGpsTag,
            extractedGps: coordsToSave,
            capturedAt: observedAtIso,
          },
          photoMetadataList: allCroppedUrls.map((_, idx) => ({
            hasExifGps: idx === 0 ? hasExifGpsTag : false,
            extractedGps: coordsToSave,
            capturedAt: observedAtIso,
          })),
          observedAt: observedAtIso,
          coordinates: coordsToSave,
          coordinatesSource: coordsSource,
          accuracyMetres: 10,
          onSiteAnswer: 'Use my location',
          reviewedMetrics,
          fieldOutcomes,
          actorUid: 'current-user-uid',
          actorDisplayName,
        });
      } else if (recordSeenNowFn) {
        await recordSeenNowFn(cand.cat.id, 'current-user-uid', actorDisplayName);
      }

      await reloadLocalDbSnapshot();
      await refreshDataFn?.();

      if (openCaptureFn && photoUrlToSave) {
        openCaptureFn({
          id: `draft-lens-resight-done-${Date.now()}`,
          operationId: `op-lens-resight-${Date.now()}`,
          step: 'success',
          alreadyCommittedCatId: cand.cat.id,
          isExistingCat: true,
          selectedCandidateId: cand.cat.id,
          selectedCandidate: cand,
          photoDataUrl: photoUrlToSave,
          photoDataUrls: [photoUrlToSave, ...additionalImages],
          submittedByDisplayName: actorDisplayName,
          extractedMetadata: {
            hasGps: hasExifGpsTag,
            coordinates: coordsToSave,
            capturedAt: observedAtIso,
          },
          resolvedCoordinates: coordsToSave,
          coordinatesSource: coordsSource,
          proposedMetrics: reviewedMetrics,
          reviewedMetrics,
          fieldOutcomes,
          catName: cand.cat.name || cand.cat.identifyingNumber,
          identifyingNumber: cand.cat.identifyingNumber,
          taxonomy: mergedTaxonomy,
          markings: cand.cat.markings || markingsSummary,
          notes: notesSummary || 'Confirmed sighting (Seen now via Lens).',
          observedAt: observedAtIso,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      console.error('Seen now error:', err);
      setErrorMessage(err?.message || 'Failed to record re-sighting.');
    } finally {
      setIsRegisteringOrResighting(false);
    }
  };

  const handleApplyCrop = async (
    croppedDataUrl: string,
    cropBoxPct?: { xPct: number; yPct: number; widthPct: number; heightPct: number }
  ) => {
    if (croppingTargetIndex === -1) {
      const origSource = originalPrimaryImage || primaryImage || croppedDataUrl;
      if (!originalPrimaryImage && primaryImage) {
        setOriginalPrimaryImage(primaryImage);
      }
      setPrimaryImage(croppedDataUrl);
      setReport((prev) => (prev ? { ...prev, primaryImage: croppedDataUrl } : null));
      const stats = await measureImageStats(
        croppedDataUrl,
        origSource,
        'manual',
        cropBoxPct,
        rawOriginalDims || undefined
      );
      setAutoCropStats(stats);
    } else {
      const origExtra =
        additionalOriginalImages[croppingTargetIndex] ||
        additionalImages[croppingTargetIndex] ||
        croppedDataUrl;
      const extraStats = await measureImageStats(
        croppedDataUrl,
        origExtra,
        'manual',
        cropBoxPct
      );
      setAdditionalImages((prev) => {
        const next = [...prev];
        next[croppingTargetIndex] = croppedDataUrl;
        return next;
      });
      setAdditionalCropStats((prev) => {
        const next = [...prev];
        next[croppingTargetIndex] = extraStats;
        return next;
      });
    }
    setImageToCrop(null);
  };

  const handleReturnToStartupCamera = () => {
    setHasActivePhoto(false);
    setSheetState('closed');
    setSelectedComparisonCandidateId(null);
    setActiveFeaturePopup(null);
    setRegisteredNewCatId(null);
    setPrimaryImage(null);
    setOriginalPrimaryImage(null);
    setAdditionalImages([]);
    setAdditionalOriginalImages([]);
    setAdditionalCropStats([]);
    setUploadedVideos([]);
    setReport(null);
    setHasRunAiAnalysis(false);
    setAiDetectedState(DEFAULT_PAWLENS_STATE);
    setSelectedState(DEFAULT_PAWLENS_STATE);
    setErrorMessage(null);
    setConfirmedFields({});
    setConfirmedFingerprints({});
    setLensBox({ xPct: 15, yPct: 15, widthPct: 70, heightPct: 66 });
    startLiveCameraSilent(cameraFacingMode);
  };

  const handleCopyReport = () => {
    const text = `=== PAWLENS VISUAL AI ANALYSIS ===
Scanned: ${new Date().toLocaleString()}

--- IDMARKS ---
• Coat Type: ${formatCoatTypeWithSubtype(selectedState.coatType, selectedState.tabbySubtype)} (${confirmedFields.coatType ? 'Confirmed ✓' : '✦ AI'})
• Dominant Coat Colour: ${selectedState.dominantColor} (${confirmedFields.dominantColor ? 'Confirmed ✓' : '✦ AI'})
• Percent White Distribution: ${selectedState.whitePercent} (${confirmedFields.whitePercent ? 'Confirmed ✓' : '✦ AI'})
• Unique ID Features: ${selectedState.uniqueFingerprints.length > 0 ? selectedState.uniqueFingerprints.join(', ') : 'None selected'}

--- VITALS ---
1. TNR Ear Clip Status (Left Ear): ${selectedState.sterilisation === 'Sterilised' ? 'TNR mark = sterilised' : selectedState.sterilisation === 'Unsterilised' ? 'Intact ear = not sterilised' : 'Unknown'} (${confirmedFields.sterilisation ? 'Confirmed ✓' : '✦ AI'})
2. Gender: ${selectedState.sex} (${confirmedFields.sex ? 'Confirmed ✓' : '✦ AI'})
3. Estimated Age: ${selectedState.lifeStage} (${confirmedFields.lifeStage ? 'Confirmed ✓' : '✦ AI'})
4. Body Condition Index: ${selectedState.bodyCondition} (${confirmedFields.bodyCondition ? 'Confirmed ✓' : '✦ AI'})
5. Health Status: ${selectedState.health} (${confirmedFields.health ? 'Confirmed ✓' : '✦ AI'})
6. Reproductive Status: ${selectedState.reproductiveStatus} (${confirmedFields.reproductiveStatus ? 'Confirmed ✓' : '✦ AI'})
7. Vet Care: ${selectedState.vetCare} (${confirmedFields.vetCare ? 'Confirmed ✓' : '✦ AI'})
${
  report?.overallForensicSummary
    ? `\nForensic Summary: ${report.overallForensicSummary}`
    : ''
}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const isUnclearOrUnknown = (val?: string) => {
    if (!val) return true;
    const lower = val.toLowerCase();
    return lower.includes('unclear') || lower.includes('unknown') || lower.includes('not clearly');
  };

  // Only list unique ID features that AI has detected plus any additional ones entered by the user
  const allFingerprintOptions = Array.from(
    new Set([
      ...aiDetectedState.uniqueFingerprints,
      ...selectedState.uniqueFingerprints,
    ])
  );

  const confirmedCount =
    Object.values(confirmedFields).filter(Boolean).length +
    Object.values(confirmedFingerprints).filter(Boolean).length;

  const displayedViewfinderImage = originalPrimaryImage || primaryImage || SAMPLE_CAT_PHOTO_URL;
  const isSheetOpen = hasActivePhoto && sheetState !== 'closed';

  // Active bottom sheet percentage height:
  // - quarter = 25% (minimised to lower quarter of screen; photo is 75%)
  // - half = 52% (middle split)
  // - full = 75% (brought up to top quarter of screen; photo is 25%)
  const activeSheetPct = !isSheetOpen
    ? 0
    : sheetDragPct !== null
    ? sheetDragPct
    : getSheetTargetPct(sheetState);

  const activeTopViewfinderPct = !isSheetOpen ? 100 : Number((100 - activeSheetPct).toFixed(1));

  // Viewfinder box coordinates: fixed centered in live camera view, interactive lensBox on captured/uploaded photos
  const displayedBox = hasActivePhoto
    ? lensBox
    : { xPct: 15, yPct: 15, widthPct: 70, heightPct: 66 };

  // Compute exact rendered photo dimensions inside the top viewfinder container synchronously from lensContainerSize
  // so the 4-corner crop frame resizes in 100% lockstep with the photo when dragging the bottom sheet handlebar up or down
  const imgAspectW = rawOriginalDims?.width || 4;
  const imgAspectH = rawOriginalDims?.height || 3;
  const availTopWidth = Math.max(120, lensContainerSize.width);
  const availTopHeight = Math.max(80, lensContainerSize.height * (activeTopViewfinderPct / 100));
  const hasMeasuredTop = hasActivePhoto && availTopWidth > 0 && availTopHeight > 0;
  const fitScale = hasMeasuredTop
    ? Math.min(availTopWidth / imgAspectW, availTopHeight / imgAspectH)
    : 1;
  const fittedPhotoWidth = hasMeasuredTop ? Math.max(48, Math.floor(imgAspectW * fitScale)) : 0;
  const fittedPhotoHeight = hasMeasuredTop ? Math.max(48, Math.floor(imgAspectH * fitScale)) : 0;

  // Compute tokens for the current crop region (updates live as the 4-corner frame is resized,
  // and displays actual API tokens used when an AI analysis finishes)
  const liveCropNormW = Math.max(64, Math.round(((displayedBox.widthPct || 70) / 100) * 750));
  const liveCropNormH = Math.max(64, Math.round(((displayedBox.heightPct || 66) / 100) * 750));
  const liveCropTokens = estimateGeminiImageTokens(
    liveCropNormW,
    liveCropNormH,
    primaryImage || originalPrimaryImage || undefined
  );
  const displayedTokensCount = actualApiTokensUsed ?? liveCropTokens;

  // Helper to compare a feature between the current cat (selectedState) and a tapped candidate cat
  const buildComparisonRows = (cand: LensMatchingCandidate) => {
    const curFpStr =
      selectedState.uniqueFingerprints.length > 0
        ? selectedState.uniqueFingerprints.join(', ')
        : 'None';
    const candFpStr =
      cand.idMarks.uniqueFingerprints && cand.idMarks.uniqueFingerprints.trim()
        ? cand.idMarks.uniqueFingerprints.trim()
        : 'None';

    const checkSame = (a: string, b: string) => {
      const na = (a || 'unknown').toLowerCase().trim();
      const nb = (b || 'unknown').toLowerCase().trim();
      if (na === 'unknown' || nb === 'unknown') return na === nb;
      return na === nb;
    };

    const checkFpSame = () => {
      if (curFpStr === 'None' && candFpStr === 'None') return true;
      if (curFpStr === 'None' || candFpStr === 'None') return false;
      return cand.matchedFingerprints.length > 0 || curFpStr.toLowerCase() === candFpStr.toLowerCase();
    };

    const idMarksRows = [
      {
        key: 'coatType',
        label: '1. Coat Type',
        currentVal: formatCoatTypeWithSubtype(selectedState.coatType, selectedState.tabbySubtype),
        candidateVal: formatCoatTypeWithSubtype(cand.idMarks.coatType, cand.idMarks.tabbySubtype),
        isSame: checkSame(selectedState.coatType, cand.idMarks.coatType),
        renderSymbol: (v: string) => <CoatTypeSymbol coatType={v.toLowerCase().includes('tabby') ? 'tabby' : v} size={16} />,
      },
      {
        key: 'dominantColor',
        label: '2. Dominant Coat Colour',
        currentVal: selectedState.dominantColor || 'unknown',
        candidateVal: cand.idMarks.dominantColor || 'unknown',
        isSame: checkSame(selectedState.dominantColor, cand.idMarks.dominantColor),
        renderSymbol: (v: string) => <DominantColorSymbol color={v} size={15} />,
      },
      {
        key: 'whitePercent',
        label: '3. % White Distribution',
        currentVal: selectedState.whitePercent || 'unknown',
        candidateVal: cand.idMarks.whitePercent || 'unknown',
        isSame: checkSame(selectedState.whitePercent, cand.idMarks.whitePercent),
        renderSymbol: (v: string) => <WhitePieSymbol whitePercent={v} size={16} />,
      },
      {
        key: 'uniqueFingerprints',
        label: '4. Unique ID Features',
        currentVal: curFpStr,
        candidateVal: candFpStr,
        isSame: checkFpSame(),
      },
    ];

    const vitalsRows = [
      {
        key: 'sterilisation',
        label: '1. TNR Ear Clip (Left Ear)',
        currentVal:
          selectedState.sterilisation === 'Sterilised'
            ? 'Sterilised (TNR)'
            : selectedState.sterilisation === 'Unsterilised'
            ? 'Intact (Unsterilised)'
            : 'Unknown',
        candidateVal:
          cand.vitals.sterilisation === 'Sterilised'
            ? 'Sterilised (TNR)'
            : cand.vitals.sterilisation === 'Unsterilised'
            ? 'Intact (Unsterilised)'
            : 'Unknown',
        isSame: checkSame(selectedState.sterilisation, cand.vitals.sterilisation),
        renderSymbol: (_v: string, raw: string) => <EarSterilisationSymbol status={raw} size={16} />,
        rawCurrent: selectedState.sterilisation,
        rawCandidate: cand.vitals.sterilisation,
      },
      {
        key: 'sex',
        label: '2. Gender',
        currentVal: selectedState.sex || 'Unknown',
        candidateVal: cand.vitals.sex || 'Unknown',
        isSame: checkSame(selectedState.sex, cand.vitals.sex),
        renderSymbol: (v: string) => <GenderSymbol sex={v} size={15} />,
      },
      {
        key: 'lifeStage',
        label: '3. Estimated Age',
        currentVal: selectedState.lifeStage || 'Unknown',
        candidateVal: cand.vitals.lifeStage || 'Unknown',
        isSame: checkSame(selectedState.lifeStage, cand.vitals.lifeStage),
      },
      {
        key: 'bodyCondition',
        label: '4. Body Condition Index',
        currentVal: selectedState.bodyCondition || 'Unknown',
        candidateVal: cand.vitals.bodyCondition || 'Unknown',
        isSame: checkSame(selectedState.bodyCondition, cand.vitals.bodyCondition),
      },
      {
        key: 'health',
        label: '5. Health Status',
        currentVal: selectedState.health || 'Unknown',
        candidateVal: cand.vitals.health || 'Unknown',
        isSame: checkSame(selectedState.health, cand.vitals.health),
      },
      {
        key: 'reproductiveStatus',
        label: '6. Reproductive Status',
        currentVal: selectedState.reproductiveStatus || 'Unknown',
        candidateVal: cand.vitals.reproductiveStatus || 'Unknown',
        isSame: checkSame(selectedState.reproductiveStatus, cand.vitals.reproductiveStatus),
      },
      {
        key: 'vetCare',
        label: '7. Vet Care',
        currentVal: selectedState.vetCare || 'Unknown',
        candidateVal: cand.vitals.vetCare || 'Unknown',
        isSame: checkSame(selectedState.vetCare, cand.vitals.vetCare),
      },
    ];

    return { idMarksRows, vitalsRows };
  };

  return (
    <div
      ref={lensContainerRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ height: 'calc(100dvh - 68px)', minHeight: '540px' }}
      className="relative w-full h-[calc(100dvh-68px)] min-h-[540px] bg-black text-slate-100 overflow-hidden select-none font-sans flex flex-col"
    >
      {/* Hidden File & Camera Inputs */}
      <input
        id="felisid-photo-input"
        ref={photoInputRef}
        type="file"
        multiple
        accept="image/*,.jpeg,.jpg,.png,.webp,.heic,.heif"
        className="hidden"
        onChange={handlePhotoInputChange}
      />
      <input
        id="felisid-camera-capture-input"
        ref={cameraCaptureInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoInputChange}
      />
      <input
        id="felisid-extra-photo-input"
        ref={extraPhotoInputRef}
        type="file"
        multiple
        accept="image/*,.jpeg,.jpg,.png,.webp,.heic,.heif"
        className="hidden"
        onChange={handleExtraPhotoInputChange}
      />
      <input
        id="felisid-video-input"
        ref={videoInputRef}
        type="file"
        multiple
        accept="video/*,.mp4,.webm,.mov,.m4v,.avi"
        className="hidden"
        onChange={handleVideoInputChange}
      />

      {/* ===================================================================== */}
      {/* 1.1 GOOGLE LENS FULL-SCREEN CAMERA VIEW / 1.1.1 TOP PHOTO VIEW        */}
      {/* ===================================================================== */}
      <div
        ref={topViewfinderContainerRef}
        style={{ height: `${activeTopViewfinderPct}%`, minHeight: 0 }}
        className={`relative w-full ${
          sheetDragPct === null ? 'transition-all duration-200' : ''
        } flex items-center justify-center bg-black overflow-hidden shrink-0 print:hidden`}
      >
        {/* Top-Left Upload Photo Button & Top-Right Close Photo Button when a photo is active */}
        {hasActivePhoto && (
          <>
            <button
              type="button"
              onClick={triggerUploadPhotoClick}
              className="absolute top-3 left-3 z-30 px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/90 border border-white/30 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg transition cursor-pointer"
              title="Upload another photo"
            >
              <ImageIcon className="w-3.5 h-3.5 text-teal-300" />
              <span>Upload photo</span>
            </button>
            <button
              type="button"
              onClick={handleReturnToStartupCamera}
              className="absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-black/65 hover:bg-black/85 border border-white/25 text-white flex items-center justify-center shadow-lg transition cursor-pointer"
              title="Close photo & return to camera"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Interactive Camera / Photo Container */}
        {/* When a photo is active, width & height match the exact rendered photo size so the viewfinder resizes with the photo */}
        <div
          ref={viewfinderImageWrapperRef}
          onPointerMove={hasActivePhoto ? handleLensPointerMove : undefined}
          onPointerUp={hasActivePhoto ? handleLensPointerUp : undefined}
          onPointerCancel={hasActivePhoto ? handleLensPointerUp : undefined}
          style={
            hasMeasuredTop
              ? { width: `${fittedPhotoWidth}px`, height: `${fittedPhotoHeight}px` }
              : undefined
          }
          className={`relative ${
            hasMeasuredTop ? '' : 'w-full h-full'
          } flex items-center justify-center overflow-hidden touch-none`}
        >
          {!hasActivePhoto ? (
            <video
              ref={liveVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover bg-black"
            />
          ) : (
            <img
              src={displayedViewfinderImage}
              alt="Cat subject in Google Lens crop frame"
              onLoad={(e) => {
                const el = e.currentTarget;
                if (el.naturalWidth && el.naturalHeight && !rawOriginalDims) {
                  setRawOriginalDims({ width: el.naturalWidth, height: el.naturalHeight });
                }
              }}
              className="w-full h-full object-contain bg-black block select-none"
              draggable={false}
            />
          )}

          {/* Google Lens Four Rounded Corners Viewfinder */}
          {/* Static viewfinder in live camera view; draggable & resizable on captured/uploaded photos */}
          <div className="absolute inset-0 pointer-events-none">
            <div
              onPointerDown={
                hasActivePhoto ? (e) => handleLensPointerDown(e, 'move') : undefined
              }
              style={{
                left: `${displayedBox.xPct}%`,
                top: `${displayedBox.yPct}%`,
                width: `${displayedBox.widthPct}%`,
                height: `${displayedBox.heightPct}%`,
                boxShadow: hasActivePhoto
                  ? '0 0 0 9999px rgba(0, 0, 0, 0.52)'
                  : '0 0 0 9999px rgba(0, 0, 0, 0.28)',
              }}
              className={`absolute rounded-3xl ${
                hasActivePhoto
                  ? 'pointer-events-auto cursor-move'
                  : 'pointer-events-none'
              }`}
            >
              {/* Subtle scanning shimmer only while actively running AI scan */}
              {(isLoading || isAutoCropping) && (
                <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-white/80 to-transparent animate-bounce" />
                  <div className="absolute inset-0 bg-white/5 animate-pulse" />
                </div>
              )}

              {/* Top-Left Rounded Corner (nw) */}
              <div
                onPointerDown={
                  hasActivePhoto ? (e) => handleLensPointerDown(e, 'nw') : undefined
                }
                className={`absolute top-0 left-0 w-12 h-12 flex items-start justify-start ${
                  hasActivePhoto
                    ? 'cursor-nwse-resize pointer-events-auto'
                    : 'pointer-events-none'
                }`}
                title={hasActivePhoto ? 'Drag corner to resize crop frame' : undefined}
              >
                <div className="w-9 h-9 border-t-4 border-l-4 border-white rounded-tl-3xl drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]" />
              </div>

              {/* Top-Right Rounded Corner (ne) */}
              <div
                onPointerDown={
                  hasActivePhoto ? (e) => handleLensPointerDown(e, 'ne') : undefined
                }
                className={`absolute top-0 right-0 w-12 h-12 flex items-start justify-end ${
                  hasActivePhoto
                    ? 'cursor-nesw-resize pointer-events-auto'
                    : 'pointer-events-none'
                }`}
                title={hasActivePhoto ? 'Drag corner to resize crop frame' : undefined}
              >
                <div className="w-9 h-9 border-t-4 border-r-4 border-white rounded-tr-3xl drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]" />
              </div>

              {/* Bottom-Left Rounded Corner (sw) */}
              <div
                onPointerDown={
                  hasActivePhoto ? (e) => handleLensPointerDown(e, 'sw') : undefined
                }
                className={`absolute bottom-0 left-0 w-12 h-12 flex items-end justify-start ${
                  hasActivePhoto
                    ? 'cursor-nesw-resize pointer-events-auto'
                    : 'pointer-events-none'
                }`}
                title={hasActivePhoto ? 'Drag corner to resize crop frame' : undefined}
              >
                <div className="w-9 h-9 border-b-4 border-l-4 border-white rounded-bl-3xl drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]" />
              </div>

              {/* Bottom-Right Rounded Corner (se) */}
              <div
                onPointerDown={
                  hasActivePhoto ? (e) => handleLensPointerDown(e, 'se') : undefined
                }
                className={`absolute bottom-0 right-0 w-12 h-12 flex items-end justify-end ${
                  hasActivePhoto
                    ? 'cursor-nwse-resize pointer-events-auto'
                    : 'pointer-events-none'
                }`}
                title={hasActivePhoto ? 'Drag corner to resize crop frame' : undefined}
              >
                <div className="w-9 h-9 border-b-4 border-r-4 border-white rounded-br-3xl drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]" />
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* BOTTOM SHUTTER DOCK: TAKE PHOTO CENTERED, UPLOAD PHOTO TO THE LEFT    */}
        {/* ===================================================================== */}
        {!hasActivePhoto && (
          <div className="absolute bottom-0 inset-x-0 z-30 pb-3 pt-10 px-6 bg-gradient-to-t from-black/90 via-black/45 to-transparent flex flex-col items-center justify-center gap-3 pointer-events-none">
            <div className="pointer-events-auto relative w-full max-w-md mx-auto flex items-center justify-center min-h-[80px]">
              {/* TO THE LEFT: UPLOAD PHOTO BUTTON */}
              <button
                type="button"
                onClick={triggerUploadPhotoClick}
                className="absolute left-6 sm:left-12 group flex flex-col items-center gap-1.5 cursor-pointer select-none focus:outline-none z-20"
                title="Upload photo"
              >
                <div className="w-12 h-12 rounded-full bg-slate-900/85 group-hover:bg-slate-800 border border-white/30 group-hover:border-white flex items-center justify-center shadow-lg transition group-active:scale-95">
                  <ImageIcon className="w-5 h-5 text-white transition" />
                </div>
                <span className="text-[11px] font-semibold text-white/90 tracking-tight whitespace-nowrap">
                  Upload photo
                </span>
              </button>

              {/* CENTERED UNDER VIEWFINDER: TAKE PHOTO SYMBOL */}
              <button
                type="button"
                onClick={handleTakePhotoPress}
                disabled={isLoading}
                className="group flex flex-col items-center gap-1.5 cursor-pointer focus:outline-none"
                title="Take photo"
              >
                <div className="w-16 h-16 rounded-full p-1 border-4 border-white bg-white/10 transition transform active:scale-90 flex items-center justify-center shadow-2xl">
                  <div className="w-full h-full rounded-full bg-white text-slate-950 flex items-center justify-center transition">
                    <Camera className="w-6 h-6 stroke-[2.2]" />
                  </div>
                </div>
                <span className="text-[11px] font-bold text-white tracking-tight whitespace-nowrap">
                  Take photo
                </span>
              </button>
            </div>

            {/* Swipe-up Google Lens Bottom Sheet Peek Bar when in camera mode */}
            <button
              type="button"
              onClick={() => {
                if (!primaryImage && !originalPrimaryImage) {
                  setIsSampleCatActive(true);
                  applyPrimaryPhotoAndAnalyze(SAMPLE_CAT_PHOTO_URL, 800, 600, true);
                } else {
                  setHasActivePhoto(true);
                  setSheetState('half');
                }
              }}
              onTouchStart={(e) => {
                if (!primaryImage && !originalPrimaryImage) {
                  setIsSampleCatActive(true);
                  applyPrimaryPhotoAndAnalyze(SAMPLE_CAT_PHOTO_URL, 800, 600, true);
                } else {
                  setHasActivePhoto(true);
                  setSheetState('half');
                }
                handleSheetHandleTouchStart(e);
              }}
              className="pointer-events-auto w-full max-w-md mx-auto py-2 px-4 rounded-2xl bg-slate-950/90 hover:bg-slate-900 border border-slate-800 flex flex-col items-center justify-center gap-1 shadow-xl cursor-pointer transition"
              title="Swipe up or tap to open Visual Matches & Register Stray sheet"
            >
              <div className="w-12 h-1 bg-slate-500 rounded-full" />
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                <span>Swipe up for Visual Match Candidates ({matchingCandidates.length}) &amp; Register a Stray</span>
              </span>
            </button>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 1.1.1 & 1.1.1.2 STANDARD GOOGLE LENS BOTTOM SHEET                     */}
      {/* Drag handle brings sheet up to top quarter (75%) or minimises to      */}
      {/* lower quarter (25%) so the photo above is larger and easier to view   */}
      {/* ===================================================================== */}
      {isSheetOpen && (
        <div
          style={{ height: `${activeSheetPct}%`, minHeight: 0 }}
          className={`relative w-full z-30 bg-slate-950 border-t border-slate-800 rounded-t-3xl shadow-2xl ${
            sheetDragPct === null ? 'transition-all duration-200' : ''
          } flex flex-col overflow-hidden print:static print:h-auto print:bg-slate-950`}
        >
          {/* Bottom Sheet Drag Handle & Top Action Bar */}
          <div className="shrink-0 px-4 pt-1 pb-2.5 border-b border-slate-800 bg-slate-950 flex flex-col gap-2 print:hidden">
            {/* Interactive Drag Handlebar Area (supports both touch drag and mouse drag + tap to cycle) */}
            <div
              onPointerDown={handleSheetHandlePointerDown}
              onTouchStart={handleSheetHandleTouchStart}
              style={{ touchAction: 'none' }}
              className="w-full py-2.5 -my-1 flex flex-col items-center justify-center cursor-ns-resize select-none group"
              title="Drag up to top quarter of screen or drag down to lower quarter to enlarge photo"
            >
              <div className="w-14 h-1.5 bg-slate-500 group-hover:bg-slate-300 group-active:bg-emerald-400 rounded-full transition pointer-events-none" />
            </div>

            {/* (2) Directly at the very top of the bottom sheet (under the drag handle): "Register a stray" button as in the rest of the app */}
            <button
              type="button"
              onClick={handleRegisterStray}
              disabled={isRegisteringOrResighting}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 active:scale-[0.99] transition-all cursor-pointer border border-emerald-400/40 font-extrabold text-xs sm:text-sm"
              title="Register this cat as a new stray with current AI / confirmed IDMarks and Vitals"
            >
              <Plus className="w-4 h-4 text-emerald-100 stroke-[2.8]" />
              <span>{isRegisteringOrResighting ? 'Registering...' : 'Register a stray'}</span>
            </button>

            {/* Prominent Start AI Analysis Option (Circle Arrow + AI* in centre) + Tokens Used + Compact Copy Button */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={handleExtractFeatures}
                  disabled={isLoading || isAutoCropping}
                  className="px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-60 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition active:scale-95 cursor-pointer shrink-0"
                  title="Start visual AI analysis on the current crop frame"
                >
                  <CircleArrowAiIcon className="w-5 h-5 text-slate-950 shrink-0" spinning={isLoading} />
                  <span>{isLoading ? 'Analysing...' : 'Start AI Analysis'}</span>
                </button>

                <span
                  className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono font-bold text-emerald-300 whitespace-nowrap"
                  title="Tokens used by current cropped photo frame"
                >
                  {displayedTokensCount} tokens
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {confirmedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedState(aiDetectedState);
                      setConfirmedFields({});
                      setConfirmedFingerprints({});
                    }}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer"
                    title={`Reset ${confirmedCount} confirmed selection(s) back to AI`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={triggerUploadPhotoClick}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-300 border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  title="Upload photo"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-teal-400" />
                  <span className="text-[11px] font-bold">Upload photo</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyReport}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  title="Copy IDMarks & Vitals results"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[11px] text-emerald-300 font-bold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-300" />
                      <span className="text-[11px] text-slate-300">Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* SCROLLABLE BOTTOM SHEET CONTENT                                       */}
          {/* ===================================================================== */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 max-w-5xl w-full mx-auto space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-rose-300 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* =================================================================== */}
            {/* (1) GOOGLE LENS VISUAL MATCHES GALLERY & SIDE-BY-SIDE COMPARISON    */}
            {/* =================================================================== */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
                  <h3 className="text-xs sm:text-sm font-extrabold text-white tracking-tight flex items-center gap-2">
                    <span>Visual Match Candidates</span>
                    {matchingCandidates.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-300 text-[10px] font-bold">
                        Top matches: {matchingCandidates.length}
                      </span>
                    )}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5">
                  {selectedComparisonCandidate ? (
                    <button
                      type="button"
                      onClick={() => setSelectedComparisonCandidateId(null)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-teal-300 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition shadow-xs"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>All Matches</span>
                    </button>
                  ) : (
                    matchingCandidates.length > 0 && (
                      <div className="inline-flex items-center rounded-xl bg-slate-950 border border-slate-800 p-0.5 text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => setCandidatesLayoutMode('carousel')}
                          className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                            candidatesLayoutMode === 'carousel'
                              ? 'bg-teal-500 text-slate-950 font-extrabold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Scroll
                        </button>
                        <button
                          type="button"
                          onClick={() => setCandidatesLayoutMode('grid')}
                          className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                            candidatesLayoutMode === 'grid'
                              ? 'bg-teal-500 text-slate-950 font-extrabold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          2-Col Grid
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* ================================================================= */}
              {/* (1.c.i) SIDE-BY-SIDE CANDIDATE COMPARISON VIEW                    */}
              {/* ================================================================= */}
              {selectedComparisonCandidate ? (
                (() => {
                  const cand = selectedComparisonCandidate;
                  const candIdx = matchingCandidates.findIndex((c) => c.cat.id === cand.cat.id);
                  const { idMarksRows, vitalsRows } = buildComparisonRows(cand);
                  const allRows = [...idMarksRows, ...vitalsRows];
                  const sameCount = allRows.filter((r) => r.isSame).length;
                  const diffCount = allRows.length - sameCount;
                  const isSeenRecorded = !!seenNowRecordedMap[cand.cat.id];

                  return (
                    <div className="space-y-3 pt-1 animate-fadeIn">
                      {/* Candidate Navigation Bar */}
                      <div className="flex items-center justify-between gap-2 px-1">
                        <span className="text-xs font-bold text-slate-300">
                          Comparing with{' '}
                          <strong className="text-teal-300">
                            {cand.cat.name || cand.cat.identifyingNumber}
                          </strong>{' '}
                          ({candIdx + 1} of {matchingCandidates.length})
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={candIdx <= 0}
                            onClick={() => {
                              if (candIdx > 0) {
                                setSelectedComparisonCandidateId(matchingCandidates[candIdx - 1].cat.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 cursor-pointer"
                            title="Previous candidate"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={candIdx >= matchingCandidates.length - 1}
                            onClick={() => {
                              if (candIdx < matchingCandidates.length - 1) {
                                setSelectedComparisonCandidateId(matchingCandidates[candIdx + 1].cat.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 cursor-pointer"
                            title="Next candidate"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Side-by-Side Portrait Photos: Current Cat (Left) vs Matching Candidate (Right) */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Left Column: Cat to be Compared + "Register a stray" button */}
                        <div className="rounded-2xl overflow-hidden bg-slate-950 border-2 border-emerald-500/70 flex flex-col shadow-xl">
                          <div className="relative aspect-[3/4] w-full bg-black overflow-hidden">
                            <img
                              src={primaryImage || originalPrimaryImage || SAMPLE_CAT_PHOTO_URL}
                              alt="Cat to be compared"
                              className="w-full h-full object-cover"
                            />
                            {/* Top Overlay */}
                            <div className="absolute top-2 inset-x-2 flex items-center justify-between gap-1 pointer-events-none z-10">
                              <span className="px-2 py-0.5 rounded-lg bg-slate-950/85 backdrop-blur-md border border-emerald-500/50 text-emerald-300 text-[10px] font-extrabold shadow">
                                Cat to compare
                              </span>
                            </div>
                            {/* Bottom Overlay: "Register stray" / "Register a stray" button */}
                            <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-1 z-20">
                              <div className="px-2 py-0.5 text-[11px] font-extrabold text-white truncate text-center drop-shadow">
                                Current Cat Photo
                              </div>
                              <button
                                type="button"
                                onClick={handleRegisterStray}
                                disabled={isRegisteringOrResighting}
                                className="w-full py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg transition cursor-pointer border border-emerald-400/40"
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[2.8] shrink-0" />
                                <span>Register stray</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Right Column: Matching Candidate Photo + Top Overlays + Bottom "Seen now" button */}
                        <div className="rounded-2xl overflow-hidden bg-slate-950 border-2 border-teal-500/70 flex flex-col shadow-xl">
                          <div className="relative aspect-[3/4] w-full bg-black overflow-hidden">
                            {cand.photoUrl ? (
                              <img
                                src={cand.photoUrl}
                                alt={cand.cat.name || 'Candidate cat'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-4xl bg-slate-900">
                                🐱
                              </div>
                            )}

                            {/* Top Overlays: x % similarity and x m away */}
                            <div className="absolute top-2 inset-x-2 flex items-center justify-between gap-1 pointer-events-none z-10">
                              <span className="px-2 py-0.5 rounded-lg bg-slate-950/85 backdrop-blur-md border border-teal-400/60 text-teal-300 text-[10px] font-extrabold shadow">
                                {cand.similarityPct}% similarity
                              </span>
                              <span className="px-2 py-0.5 rounded-lg bg-slate-950/85 backdrop-blur-md border border-amber-400/60 text-amber-300 text-[10px] font-mono font-bold shadow">
                                {cand.distanceLabel}
                              </span>
                            </div>

                            {/* Candidate Name Tag & Bottom "Seen now" Button */}
                            <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-1 z-20">
                              <div className="px-2 py-0.5 text-[11px] font-extrabold text-white truncate text-center drop-shadow">
                                {cand.cat.name || cand.cat.identifyingNumber}
                              </div>
                              <button
                                type="button"
                                onClick={(ev) => handleSeenNowCandidate(cand, ev)}
                                disabled={isRegisteringOrResighting}
                                className={`w-full py-2 px-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg transition cursor-pointer border ${
                                  isSeenRecorded
                                    ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                                    : 'bg-teal-600 hover:bg-teal-500 text-white border-teal-400/40'
                                }`}
                              >
                                {isSeenRecorded ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />
                                    <span>Recorded!</span>
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-3.5 h-3.5 shrink-0" />
                                    <span>Seen now</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Side-by-Side IDMarks and Vitals Comparison Table Directly Under the Photos */}
                      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                          <span className="text-xs font-extrabold text-white">
                            IDMarks &amp; Vitals Comparison
                          </span>
                          <div className="flex items-center gap-2 text-[11px] font-bold">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300">
                              ✓ {sameCount} Same
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-300">
                              ≠ {diffCount} Differ
                            </span>
                          </div>
                        </div>

                        {/* Column Headers Aligned Under Left and Right Photos */}
                        <div className="grid grid-cols-2 gap-2 px-1 text-[11px] font-extrabold">
                          <div className="text-emerald-300 truncate">
                            Cat to Compare (Current)
                          </div>
                          <div className="text-teal-300 truncate">
                            {cand.cat.name || cand.cat.identifyingNumber} ({cand.similarityPct}% match)
                          </div>
                        </div>

                        {/* IDMarks Comparison Group */}
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-extrabold uppercase tracking-wider text-teal-300 px-1">
                            IDMarks
                          </div>
                          {idMarksRows.map((row) => (
                            <div
                              key={row.key}
                              className={`p-2.5 rounded-xl border transition-colors ${
                                row.isSame
                                  ? 'bg-emerald-950/30 border-emerald-500/50'
                                  : 'bg-rose-950/30 border-rose-500/50'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="text-[11px] font-bold text-slate-200">
                                  {row.label}
                                </span>
                                {row.isSame ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/70 text-emerald-200 text-[10px] font-extrabold">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                    <span>Same</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/25 border border-rose-400/70 text-rose-200 text-[10px] font-extrabold">
                                    <span>≠ Differs</span>
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center gap-1.5 min-w-0">
                                  {row.renderSymbol && row.renderSymbol(row.currentVal)}
                                  <span className="font-bold text-white truncate">
                                    {row.currentVal}
                                  </span>
                                </div>
                                <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center gap-1.5 min-w-0">
                                  {row.renderSymbol && row.renderSymbol(row.candidateVal)}
                                  <span className="font-bold text-white truncate">
                                    {row.candidateVal}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Vitals Comparison Group */}
                        <div className="space-y-1.5 pt-1">
                          <div className="text-[11px] font-extrabold uppercase tracking-wider text-teal-300 px-1">
                            Vitals
                          </div>
                          {vitalsRows.map((row) => (
                            <div
                              key={row.key}
                              className={`p-2.5 rounded-xl border transition-colors ${
                                row.isSame
                                  ? 'bg-emerald-950/30 border-emerald-500/50'
                                  : 'bg-rose-950/30 border-rose-500/50'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="text-[11px] font-bold text-slate-200">
                                  {row.label}
                                </span>
                                {row.isSame ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/70 text-emerald-200 text-[10px] font-extrabold">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                    <span>Same</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/25 border border-rose-400/70 text-rose-200 text-[10px] font-extrabold">
                                    <span>≠ Differs</span>
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center gap-1.5 min-w-0">
                                  {row.renderSymbol &&
                                    row.renderSymbol(row.currentVal, (row as any).rawCurrent || row.currentVal)}
                                  <span className="font-bold text-white truncate">
                                    {row.currentVal}
                                  </span>
                                </div>
                                <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center gap-1.5 min-w-0">
                                  {row.renderSymbol &&
                                    row.renderSymbol(row.candidateVal, (row as any).rawCandidate || row.candidateVal)}
                                  <span className="font-bold text-white truncate">
                                    {row.candidateVal}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : matchingCandidates.length > 0 ? (
                /* =============================================================== */
                /* (1.c) GOOGLE LENS TOP 10 VISUAL MATCH CANDIDATES GALLERY        */
                /* Clean portrait photo cards with top overlays (% similarity &    */
                /* distance m away) and bottom "Seen now" button                   */
                /* =============================================================== */
                <div
                  className={
                    candidatesLayoutMode === 'grid'
                      ? 'grid grid-cols-2 sm:grid-cols-3 gap-3 pt-0.5'
                      : 'flex items-stretch gap-3 overflow-x-auto pb-2.5 pt-0.5 snap-x snap-mandatory'
                  }
                >
                  {matchingCandidates.map((cand) => {
                    const isSeenRecorded = !!seenNowRecordedMap[cand.cat.id];
                    return (
                      <div
                        key={cand.cat.id}
                        onClick={() => setSelectedComparisonCandidateId(cand.cat.id)}
                        className={`${
                          candidatesLayoutMode === 'grid' ? 'w-full' : 'w-44 sm:w-52 shrink-0 snap-start'
                        } rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 hover:border-teal-400 transition-all cursor-pointer flex flex-col shadow-lg group relative`}
                        title={`Tap to compare ${cand.cat.name || cand.cat.identifyingNumber} side-by-side`}
                      >
                        <div className="relative aspect-[3/4] w-full bg-black overflow-hidden">
                          {cand.photoUrl ? (
                            <img
                              src={cand.photoUrl}
                              alt={cand.cat.name || 'Candidate cat'}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl bg-slate-900">
                              🐱
                            </div>
                          )}

                          {/* Top Overlays: x % similarity & x m away */}
                          <div className="absolute top-2 inset-x-2 flex items-center justify-between gap-1 pointer-events-none z-10">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-950/85 backdrop-blur-md border border-teal-400/60 text-teal-300 text-[10px] font-extrabold whitespace-nowrap shadow">
                              {cand.similarityPct}% similarity
                            </span>
                            <span className="px-2 py-0.5 rounded-lg bg-slate-950/85 backdrop-blur-md border border-amber-400/60 text-amber-300 text-[10px] font-mono font-bold whitespace-nowrap shadow">
                              {cand.distanceLabel}
                            </span>
                          </div>

                          {/* Bottom Overlay: Cat Title + "Seen now" symbol/button */}
                          <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/95 via-black/65 to-transparent flex flex-col gap-1.5 z-20">
                            <div className="flex items-center justify-between gap-1 px-0.5">
                              <span className="text-xs font-extrabold text-white truncate drop-shadow">
                                {cand.cat.name || cand.cat.identifyingNumber}
                              </span>
                              <span className="text-[10px] font-mono text-slate-300 shrink-0">
                                {cand.idMarks.coatType !== 'unknown'
                                  ? formatCoatTypeWithSubtype(cand.idMarks.coatType, cand.idMarks.tabbySubtype)
                                  : ''}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(ev) => handleSeenNowCandidate(cand, ev)}
                              disabled={isRegisteringOrResighting}
                              className={`w-full py-2 px-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer border ${
                                isSeenRecorded
                                  ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                                  : 'bg-teal-600/95 hover:bg-teal-500 text-white border-teal-400/40'
                              }`}
                              title={`Record "Seen now" re-sighting for ${cand.cat.name || cand.cat.identifyingNumber}`}
                            >
                              {isSeenRecorded ? (
                                <>
                                  <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />
                                  <span>Recorded!</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3.5 h-3.5 shrink-0" />
                                  <span>Seen now</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <p className="text-xs font-bold text-slate-300">
                    Top matches: {matchingCandidates.length}
                  </p>
                </div>
              )}
            </div>

            {/* Split Tabs for Visual AI Results: IDMarks | Vitals | Forensic Notes */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveSheetTab('idmarks')}
                className={`py-1.5 px-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                  activeSheetTab === 'idmarks'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <PawAiStarIcon className="w-3.5 h-3.5 shrink-0" />
                <span>IDMarks</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSheetTab('vitals')}
                className={`py-1.5 px-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                  activeSheetTab === 'vitals'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Heart className="w-3.5 h-3.5 shrink-0" />
                <span>Vitals</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSheetTab('report')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center transition cursor-pointer whitespace-nowrap ${
                  activeSheetTab === 'report'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Forensic Notes</span>
              </button>
            </div>

            {/* =================================================================== */}
            {/* TAB 1: THE IDMARKS (COMPACT SELECTED FEATURE ROWS + POPUP SELECTOR) */}
            {/* =================================================================== */}
            {activeSheetTab === 'idmarks' && (
              <div className="space-y-3 pb-6">
                <div className="px-3.5 py-1 rounded-2xl bg-slate-900/85 border border-slate-800 divide-y divide-slate-800">
                  {/* 1. Coat type */}
                  <div className="py-2.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-slate-200 shrink-0">
                        1. Coat type
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveFeaturePopup((prev) => (prev === 'coatType' ? null : 'coatType'))
                        }
                        className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer min-w-0 shrink ${
                          confirmedFields.coatType
                            ? 'bg-emerald-950/95 border-emerald-400 text-white ring-1 ring-emerald-400/35 shadow-sm'
                            : hasRunAiAnalysis
                            ? 'bg-indigo-950/95 border-indigo-400 text-white ring-1 ring-indigo-400/35 shadow-sm'
                            : 'bg-slate-950/90 hover:bg-slate-900 border-slate-700 text-slate-200'
                        }`}
                      >
                        <CoatTypeSymbol coatType={selectedState.coatType} size={18} />
                        <span className="truncate">{selectedState.coatType}</span>
                        <PillOriginBadge
                          isSelected={true}
                          isUserConfirmed={!!confirmedFields.coatType}
                          hasRunAiAnalysis={hasRunAiAnalysis}
                        />
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
                            activeFeaturePopup === 'coatType' ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </div>
                    {activeFeaturePopup === 'coatType' && (
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 shadow-lg flex flex-wrap gap-2">
                        {COAT_TYPE_OPTIONS.map((opt) => {
                          const isSelected = selectedState.coatType === opt.value;
                          const isUserConfirmed = !!confirmedFields.coatType;
                          const isAiOriginal = aiDetectedState.coatType === opt.value;
                          const isUnk = opt.value === 'unknown';
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleSelectSinglePill('coatType', opt.value)}
                              className={`px-3.5 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                                isSelected
                                  ? isUserConfirmed
                                    ? 'bg-emerald-950/95 border-emerald-400 text-white ring-2 ring-emerald-400/35 shadow-md'
                                    : hasRunAiAnalysis
                                    ? 'bg-indigo-950/95 border-indigo-400 text-white ring-2 ring-indigo-400/35 shadow-md'
                                    : 'bg-slate-800 border-slate-500 text-white'
                                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-slate-600'
                              }`}
                            >
                              <CoatTypeSymbol coatType={opt.value} size={18} />
                              <span className={isUnk && !isSelected ? 'text-slate-400' : 'text-slate-100'}>
                                {opt.value}
                              </span>
                              <PillOriginBadge
                                isSelected={isSelected}
                                isUserConfirmed={isUserConfirmed}
                                isAiOriginal={isAiOriginal}
                                hasRunAiAnalysis={hasRunAiAnalysis}
                              />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Tabby subtype (only shown when Tabby is selected, styled identically to other IDMarks selectors) */}
                  {selectedState.coatType === 'tabby' && (
                    <div className="py-2.5 space-y-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-slate-200 shrink-0">
                          Tabby subtype
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveFeaturePopup((prev) =>
                              prev === 'tabbySubtype' ? null : 'tabbySubtype'
                            )
                          }
                          className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer min-w-0 shrink ${
                            confirmedFields.tabbySubtype
                              ? 'bg-emerald-950/95 border-emerald-400 text-white ring-1 ring-emerald-400/35 shadow-sm'
                              : hasRunAiAnalysis
                              ? 'bg-indigo-950/95 border-indigo-400 text-white ring-1 ring-indigo-400/35 shadow-sm'
                              : 'bg-slate-950/90 hover:bg-slate-900 border-slate-700 text-slate-200'
                          }`}
                        >
                          <CoatTypeSymbol
                            coatType="tabby"
                            tabbySubtype={selectedState.tabbySubtype}
                            size={18}
                          />
                          <span className="truncate">
                            {TABBY_SUBTYPE_OPTIONS.find(
                              (o) => o.value === (selectedState.tabbySubtype || 'unknown').toLowerCase()
                            )?.label ||
                              selectedState.tabbySubtype ||
                              'unknown'}
                          </span>
                          <PillOriginBadge
                            isSelected={true}
                            isUserConfirmed={!!confirmedFields.tabbySubtype}
                            hasRunAiAnalysis={hasRunAiAnalysis}
                          />
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
                              activeFeaturePopup === 'tabbySubtype' ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                      </div>
                      {activeFeaturePopup === 'tabbySubtype' && (
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 shadow-lg space-y-2.5">
                          <div className="flex flex-wrap gap-2">
                            {TABBY_SUBTYPE_OPTIONS.map((subOpt) => {
                              const isSelected =
                                (selectedState.tabbySubtype || 'unknown').toLowerCase() ===
                                subOpt.value;
                              const isUserConfirmed = !!confirmedFields.tabbySubtype;
                              const isAiOriginal =
                                (aiDetectedState.tabbySubtype || 'unknown').toLowerCase() ===
                                subOpt.value;
                              const isUnk = subOpt.value === 'unknown';
                              return (
                                <button
                                  key={subOpt.value}
                                  type="button"
                                  onClick={() =>
                                    handleSelectSinglePill('tabbySubtype', subOpt.value)
                                  }
                                  className={`px-3.5 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                                    isSelected
                                      ? isUserConfirmed
                                        ? 'bg-emerald-950/95 border-emerald-400 text-white ring-2 ring-emerald-400/35 shadow-md'
                                        : hasRunAiAnalysis
                                        ? 'bg-indigo-950/95 border-indigo-400 text-white ring-2 ring-indigo-400/35 shadow-md'
                                        : 'bg-slate-800 border-slate-500 text-white'
                                      : 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-slate-600'
                                  }`}
                                >
                                  <CoatTypeSymbol
                                    coatType="tabby"
                                    tabbySubtype={subOpt.value}
                                    size={16}
                                  />
                                  <span
                                    className={
                                      isUnk && !isSelected ? 'text-slate-400' : 'text-slate-100'
                                    }
                                  >
                                    {subOpt.label}
                                  </span>
                                  <PillOriginBadge
                                    isSelected={isSelected}
                                    isUserConfirmed={isUserConfirmed}
                                    isAiOriginal={isAiOriginal}
                                    hasRunAiAnalysis={hasRunAiAnalysis}
                                  />
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="text"
                              value={customTabbySubtypeInput}
                              onChange={(e) => setCustomTabbySubtypeInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (customTabbySubtypeInput.trim()) {
                                    handleSelectSinglePill(
                                      'tabbySubtype',
                                      customTabbySubtypeInput.trim()
                                    );
                                    setCustomTabbySubtypeInput('');
                                  }
                                }
                              }}
                              placeholder="Custom tabby subtype (e.g. broken mackerel)..."
                              className="flex-1 min-w-0 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-full px-3.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (customTabbySubtypeInput.trim()) {
                                  handleSelectSinglePill(
                                    'tabbySubtype',
                                    customTabbySubtypeInput.trim()
                                  );
                                  setCustomTabbySubtypeInput('');
                                }
                              }}
                              className="px-3.5 py-1.5 rounded-full bg-slate-800 hover:bg-emerald-600 text-white text-xs font-bold transition cursor-pointer shrink-0"
                            >
                              Set
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. Dominant coat colour */}
                  <div className="py-2.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-slate-200 shrink-0">
                        2. Dominant coat colour
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveFeaturePopup((prev) =>
                            prev === 'dominantColor' ? null : 'dominantColor'
                          )
                        }
                        className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer min-w-0 shrink ${
                          confirmedFields.dominantColor
                            ? 'bg-emerald-950/95 border-emerald-400 text-white ring-1 ring-emerald-400/35 shadow-sm'
                            : hasRunAiAnalysis
                            ? 'bg-indigo-950/95 border-indigo-400 text-white ring-1 ring-indigo-400/35 shadow-sm'
                            : 'bg-slate-950/90 hover:bg-slate-900 border-slate-700 text-slate-200'
                        }`}
                      >
                        <DominantColorSymbol color={selectedState.dominantColor} size={16} />
                        <span className="truncate">{selectedState.dominantColor}</span>
                        <PillOriginBadge
                          isSelected={true}
                          isUserConfirmed={!!confirmedFields.dominantColor}
                          hasRunAiAnalysis={hasRunAiAnalysis}
                        />
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
                            activeFeaturePopup === 'dominantColor' ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </div>
                    {activeFeaturePopup === 'dominantColor' && (
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 shadow-lg flex flex-wrap gap-2">
                        {DOMINANT_COLOR_OPTIONS.map((opt) => {
                          const isSelected = selectedState.dominantColor === opt.value;
                          const isUserConfirmed = !!confirmedFields.dominantColor;
                          const isAiOriginal = aiDetectedState.dominantColor === opt.value;
                          const isUnk = opt.value === 'unknown';
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleSelectSinglePill('dominantColor', opt.value)}
                              className={`px-3.5 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                                isSelected
                                  ? isUserConfirmed
                                    ? 'bg-emerald-950/95 border-emerald-400 text-white ring-2 ring-emerald-400/35 shadow-md'
                                    : hasRunAiAnalysis
                                    ? 'bg-indigo-950/95 border-indigo-400 text-white ring-2 ring-indigo-400/35 shadow-md'
                                    : 'bg-slate-800 border-slate-500 text-white'
                                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-slate-600'
                              }`}
                            >
                              <DominantColorSymbol color={opt.value} size={16} />
                              <span className={isUnk && !isSelected ? 'text-slate-400' : 'text-slate-100'}>
                                {opt.value}
                              </span>
                              <PillOriginBadge
                                isSelected={isSelected}
                                isUserConfirmed={isUserConfirmed}
                                isAiOriginal={isAiOriginal}
                                hasRunAiAnalysis={hasRunAiAnalysis}
                              />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 3. Percent white distribution */}
                  <div className="py-2.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-slate-200 shrink-0">
                        3. Percent white distribution
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveFeaturePopup((prev) =>
                            prev === 'whitePercent' ? null : 'whitePercent'
                          )
                        }
                        className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer min-w-0 shrink ${
                          confirmedFields.whitePercent
                            ? 'bg-emerald-950/95 border-emerald-400 text-white ring-1 ring-emerald-400/35 shadow-sm'
                            : hasRunAiAnalysis
                            ? 'bg-indigo-950/95 border-indigo-400 text-white ring-1 ring-indigo-400/35 shadow-sm'
                            : 'bg-slate-950/90 hover:bg-slate-900 border-slate-700 text-slate-200'
                        }`}
                      >
                        <WhitePieSymbol whitePercent={selectedState.whitePercent} size={18} />
                        <span className="truncate">
                          {PAWLENS_WHITE_PCT_PILLS.find(
                            (o) => o.value.toLowerCase() === selectedState.whitePercent.toLowerCase()
                          )?.label || selectedState.whitePercent}
                        </span>
                        <PillOriginBadge
                          isSelected={true}
                          isUserConfirmed={!!confirmedFields.whitePercent}
                          hasRunAiAnalysis={hasRunAiAnalysis}
                        />
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
                            activeFeaturePopup === 'whitePercent' ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </div>
                    {activeFeaturePopup === 'whitePercent' && (
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 shadow-lg flex flex-wrap gap-2">
                        {PAWLENS_WHITE_PCT_PILLS.map((opt) => {
                          const isSelected =
                            selectedState.whitePercent.toLowerCase() === opt.value.toLowerCase();
                          const isUserConfirmed = !!confirmedFields.whitePercent;
                          const isAiOriginal =
                            aiDetectedState.whitePercent.toLowerCase() === opt.value.toLowerCase();
                          const isUnk = opt.value === 'unknown';
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleSelectSinglePill('whitePercent', opt.value)}
                              className={`px-3.5 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                                isSelected
                                  ? isUserConfirmed
                                    ? 'bg-emerald-950/95 border-emerald-400 text-white ring-2 ring-emerald-400/35 shadow-md'
                                    : hasRunAiAnalysis
                                    ? 'bg-indigo-950/95 border-indigo-400 text-white ring-2 ring-indigo-400/35 shadow-md'
                                    : 'bg-slate-800 border-slate-500 text-white'
                                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-slate-600'
                              }`}
                            >
                              <WhitePieSymbol whitePercent={opt.value} size={18} />
                              <span className={isUnk && !isSelected ? 'text-slate-400' : 'text-slate-100'}>
                                {opt.label}
                              </span>
                              <PillOriginBadge
                                isSelected={isSelected}
                                isUserConfirmed={isUserConfirmed}
                                isAiOriginal={isAiOriginal}
                                hasRunAiAnalysis={hasRunAiAnalysis}
                              />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 4. Unique ID features (fingerprints) */}
                  <div className="py-2.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-slate-200 shrink-0">
                        4. Unique ID features
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveFeaturePopup((prev) =>
                            prev === 'uniqueFingerprints' ? null : 'uniqueFingerprints'
                          )
                        }
                        className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer min-w-0 shrink ${
                          Object.values(confirmedFingerprints).some(Boolean)
                            ? 'bg-emerald-950/95 border-emerald-400 text-white ring-1 ring-emerald-400/35 shadow-sm'
                            : hasRunAiAnalysis && selectedState.uniqueFingerprints.length > 0
                            ? 'bg-indigo-950/95 border-indigo-400 text-white ring-1 ring-indigo-400/35 shadow-sm'
                            : 'bg-slate-950/90 hover:bg-slate-900 border-slate-700 text-slate-200'
                        }`}
                      >
                        <span className="truncate">
                          {selectedState.uniqueFingerprints.length > 0
                            ? selectedState.uniqueFingerprints.join(', ')
                            : 'none'}
                        </span>
                        <PillOriginBadge
                          isSelected={true}
                          isUserConfirmed={Object.values(confirmedFingerprints).some(Boolean)}
                          hasRunAiAnalysis={
                            hasRunAiAnalysis && selectedState.uniqueFingerprints.length > 0
                          }
                        />
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
                            activeFeaturePopup === 'uniqueFingerprints' ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </div>
                    {activeFeaturePopup === 'uniqueFingerprints' && (
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 shadow-lg space-y-2.5">
                        {allFingerprintOptions.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {allFingerprintOptions.map((feat) => {
                              const norm = feat.toLowerCase();
                              const isSelected = selectedState.uniqueFingerprints.some(
                                (f) => f.toLowerCase() === norm
                              );
                              const isUserConfirmed = !!confirmedFingerprints[norm];
                              const isAiOriginal = aiDetectedState.uniqueFingerprints.some(
                                (f) => f.toLowerCase() === norm
                              );
                              return (
                                <button
                                  key={feat}
                                  type="button"
                                  onClick={() => handleToggleFingerprintPill(feat)}
                                  className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                    isSelected
                                      ? isUserConfirmed
                                        ? 'bg-emerald-950/95 border-emerald-400 text-white ring-2 ring-emerald-400/35 shadow-md'
                                        : hasRunAiAnalysis
                                        ? 'bg-indigo-950/95 border-indigo-400 text-white ring-2 ring-indigo-400/35 shadow-md'
                                        : 'bg-slate-800 border-slate-500 text-white'
                                      : 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-slate-600 text-slate-300'
                                  }`}
                                >
                                  <span>{feat}</span>
                                  <PillOriginBadge
                                    isSelected={isSelected}
                                    isUserConfirmed={isUserConfirmed}
                                    isAiOriginal={isAiOriginal}
                                    hasRunAiAnalysis={hasRunAiAnalysis}
                                  />
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400">
                            Add any unique ID features (e.g. white tipped tail, notched ear, facial blotch):
                          </p>
                        )}

                        <form
                          onSubmit={handleAddCustomFingerprint}
                          className="flex items-center gap-2 pt-1"
                        >
                          <input
                            type="text"
                            value={customFingerprintInput}
                            onChange={(e) => setCustomFingerprintInput(e.target.value)}
                            placeholder="Add unique ID feature..."
                            className="flex-1 min-w-0 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-full px-3.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
                          />
                          <button
                            type="submit"
                            className="px-3.5 py-1.5 rounded-full bg-slate-800 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* TAB 2: THE VITALS (COMPACT SELECTED FEATURE ROWS + POPUP SELECTOR)  */}
            {/* =================================================================== */}
            {activeSheetTab === 'vitals' && (
              <div className="space-y-3 pb-6">
                <div className="px-3.5 py-1 rounded-2xl bg-slate-900/85 border border-slate-800 divide-y divide-slate-800">
                  {/* 1. TNR ear clip status (left ear) */}
                  <div className="py-2.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-slate-200 shrink-0">
                        1. TNR ear clip status
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveFeaturePopup((prev) =>
                            prev === 'sterilisation' ? null : 'sterilisation'
                          )
                        }
                        className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer min-w-0 shrink ${
                          confirmedFields.sterilisation
                            ? 'bg-emerald-950/95 border-emerald-400 text-white ring-1 ring-emerald-400/35 shadow-sm'
                            : hasRunAiAnalysis
                            ? 'bg-indigo-950/95 border-indigo-400 text-white ring-1 ring-indigo-400/35 shadow-sm'
                            : 'bg-slate-950/90 hover:bg-slate-900 border-slate-700 text-slate-200'
                        }`}
                      >
                        <EarSterilisationSymbol status={selectedState.sterilisation} size={18} />
                        <span className="truncate">
                          {STERILISATION_OPTIONS.find((o) => o.value === selectedState.sterilisation)
                            ?.label || selectedState.sterilisation}
                        </span>
                        <PillOriginBadge
                          isSelected={true}
                          isUserConfirmed={!!confirmedFields.sterilisation}
                          hasRunAiAnalysis={hasRunAiAnalysis}
                        />
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
                            activeFeaturePopup === 'sterilisation' ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </div>
                    {activeFeaturePopup === 'sterilisation' && (
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 shadow-lg flex flex-wrap gap-2">
                        {STERILISATION_OPTIONS.map((opt) => {
                          const isSelected = selectedState.sterilisation === opt.value;
                          const isUserConfirmed = !!confirmedFields.sterilisation;
                          const isAiOriginal = aiDetectedState.sterilisation === opt.value;
                          const isUnk = opt.value === 'Unknown';
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleSelectSinglePill('sterilisation', opt.value)}
                              className={`px-3.5 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                                isSelected
                                  ? isUserConfirmed
                                    ? 'bg-emerald-950/95 border-emerald-400 text-white ring-2 ring-emerald-400/35 shadow-md'
                                    : hasRunAiAnalysis
                                    ? 'bg-indigo-950/95 border-indigo-400 text-white ring-2 ring-indigo-400/35 shadow-md'
                                    : 'bg-slate-800 border-slate-500 text-white'
                                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-slate-600'
                              }`}
                            >
                              <EarSterilisationSymbol status={opt.value} size={18} />
                              <span className={isUnk && !isSelected ? 'text-slate-400' : 'text-slate-100'}>
                                {opt.label}
                              </span>
                              <PillOriginBadge
                                isSelected={isSelected}
                                isUserConfirmed={isUserConfirmed}
                                isAiOriginal={isAiOriginal}
                                hasRunAiAnalysis={hasRunAiAnalysis}
                              />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 2. Gender */}
                  <div className="py-2.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-slate-200 shrink-0">
                        2. Gender
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveFeaturePopup((prev) => (prev === 'sex' ? null : 'sex'))
                        }
                        className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer min-w-0 shrink ${
                          confirmedFields.sex
                            ? 'bg-emerald-950/95 border-emerald-400 text-white ring-1 ring-emerald-400/35 shadow-sm'
                            : hasRunAiAnalysis
                            ? 'bg-indigo-950/95 border-indigo-400 text-white ring-1 ring-indigo-400/35 shadow-sm'
                            : 'bg-slate-950/90 hover:bg-slate-900 border-slate-700 text-slate-200'
                        }`}
                      >
                        <GenderSymbol sex={selectedState.sex} size={16} />
                        <span className="truncate">
                          {GENDER_OPTIONS.find((o) => o.value === selectedState.sex)?.label ||
                            selectedState.sex}
                        </span>
                        <PillOriginBadge
                          isSelected={true}
                          isUserConfirmed={!!confirmedFields.sex}
                          hasRunAiAnalysis={hasRunAiAnalysis}
                        />
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
                            activeFeaturePopup === 'sex' ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </div>
                    {activeFeaturePopup === 'sex' && (
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 shadow-lg flex flex-wrap gap-2">
                        {GENDER_OPTIONS.map((opt) => {
                          const isSelected = selectedState.sex === opt.value;
                          const isUserConfirmed = !!confirmedFields.sex;
                          const isAiOriginal = aiDetectedState.sex === opt.value;
                          const isUnk = opt.value === 'Unknown';
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleSelectSinglePill('sex', opt.value)}
                              className={`px-3.5 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                                isSelected
                                  ? isUserConfirmed
                                    ? 'bg-emerald-950/95 border-emerald-400 text-white ring-2 ring-emerald-400/35 shadow-md'
                                    : hasRunAiAnalysis
                                    ? 'bg-indigo-950/95 border-indigo-400 text-white ring-2 ring-indigo-400/35 shadow-md'
                                    : 'bg-slate-800 border-slate-500 text-white'
                                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-slate-600'
                              }`}
                            >
                              <GenderSymbol sex={opt.value} size={16} />
                              <span className={isUnk && !isSelected ? 'text-slate-400' : 'text-slate-100'}>
                                {opt.label}
                              </span>
                              <PillOriginBadge
                                isSelected={isSelected}
                                isUserConfirmed={isUserConfirmed}
                                isAiOriginal={isAiOriginal}
                                hasRunAiAnalysis={hasRunAiAnalysis}
                              />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 3. Estimated age */}
                  <div className="py-2.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-slate-200 shrink-0">
                        3. Estimated age
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveFeaturePopup((prev) =>
                            prev === 'lifeStage' ? null : 'lifeStage'
                          )
                        }
                        className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer min-w-0 shrink ${
                          confirmedFields.lifeStage
                            ? 'bg-emerald-950/95 border-emerald-400 text-white ring-1 ring-emerald-400/35 shadow-sm'
                            : hasRunAiAnalysis
                            ? 'bg-indigo-950/95 border-indigo-400 text-white ring-1 ring-indigo-400/35 shadow-sm'
                            : 'bg-slate-950/90 hover:bg-slate-900 border-slate-700 text-slate-200'
                        }`}
                      >
                        <span className="truncate">
                          {PAWLENS_AGE_OPTIONS.find((o) => o.value === selectedState.lifeStage)
                            ?.label || selectedState.lifeStage}
                        </span>
                        <PillOriginBadge
                          isSelected={true}
                          isUserConfirmed={!!confirmedFields.lifeStage}
                          hasRunAiAnalysis={hasRunAiAnalysis}
                        />
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
                            activeFeaturePopup === 'lifeStage' ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </div>
                    {activeFeaturePopup === 'lifeStage' && (
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 shadow-lg flex flex-wrap gap-2">
                        {PAWLENS_AGE_OPTIONS.map((opt) => {
                          const isSelected = selectedState.lifeStage === opt.value;
                          const isUserConfirmed = !!confirmedFields.lifeStage;
                          const isAiOriginal = aiDetectedState.lifeStage === opt.value;
                          const isUnk = opt.value === 'Unknown';
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleSelectSinglePill('lifeStage', opt.value)}
                              className={`px-3.5 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                                isSelected
                                  ? isUserConfirmed
                                    ? 'bg-emerald-950/95 border-emerald-400 text-white ring-2 ring-emerald-400/35 shadow-md'
                                    : hasRunAiAnalysis
                                    ? 'bg-indigo-950/95 border-indigo-400 text-white ring-2 ring-indigo-400/35 shadow-md'
                                    : 'bg-slate-800 border-slate-500 text-white'
                                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-slate-600'
                              }`}
                            >
                              <span className={isUnk && !isSelected ? 'text-slate-400' : 'text-slate-100'}>
                                {opt.label}
                              </span>
                              <PillOriginBadge
                                isSelected={isSelected}
                                isUserConfirmed={isUserConfirmed}
                                isAiOriginal={isAiOriginal}
                                hasRunAiAnalysis={hasRunAiAnalysis}
                              />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 4. Body condition index */}
                  <div className="py-2.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-slate-200 shrink-0">
                        4. Body condition index
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveFeaturePopup((prev) =>
                            prev === 'bodyCondition' ? null : 'bodyCondition'
                          )
                        }
                        className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer min-w-0 shrink ${
                          confirmedFields.bodyCondition
                            ? 'bg-emerald-950/95 border-emerald-400 text-white ring-1 ring-emerald-400/35 shadow-sm'
                            : hasRunAiAnalysis
                            ? 'bg-indigo-950/95 border-indigo-400 text-white ring-1 ring-indigo-400/35 shadow-sm'
                            : 'bg-slate-950/90 hover:bg-slate-900 border-slate-700 text-slate-200'
                        }`}
                      >
                        <span className="truncate">
                          {PAWLENS_BODY_CONDITION_OPTIONS.find(
                            (o) => o.value === selectedState.bodyCondition
                          )?.label || selectedState.bodyCondition}
                        </span>
                        <PillOriginBadge
                          isSelected={true}
                          isUserConfirmed={!!confirmedFields.bodyCondition}
                          hasRunAiAnalysis={hasRunAiAnalysis}
                        />
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
                            activeFeaturePopup === 'bodyCondition' ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </div>
                    {activeFeaturePopup === 'bodyCondition' && (
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 shadow-lg flex flex-wrap gap-2">
                        {PAWLENS_BODY_CONDITION_OPTIONS.map((opt) => {
                          const isSelected = selectedState.bodyCondition === opt.value;
                          const isUserConfirmed = !!confirmedFields.bodyCondition;
                          const isAiOriginal = aiDetectedState.bodyCondition === opt.value;
                          const isUnk = opt.value === 'Unknown';
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleSelectSinglePill('bodyCondition', opt.value)}
                              className={`px-3.5 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                                isSelected
                                  ? isUserConfirmed
                                    ? 'bg-emerald-950/95 border-emerald-400 text-white ring-2 ring-emerald-400/35 shadow-md'
                                    : hasRunAiAnalysis
                                    ? 'bg-indigo-950/95 border-indigo-400 text-white ring-2 ring-indigo-400/35 shadow-md'
                                    : 'bg-slate-800 border-slate-500 text-white'
                                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-slate-600'
                              }`}
                            >
                              <span className={isUnk && !isSelected ? 'text-slate-400' : 'text-slate-100'}>
                                {opt.label}
                              </span>
                              <PillOriginBadge
                                isSelected={isSelected}
                                isUserConfirmed={isUserConfirmed}
                                isAiOriginal={isAiOriginal}
                                hasRunAiAnalysis={hasRunAiAnalysis}
                              />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 5. Health status */}
                  <div className="py-2.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs font-bold text-slate-200">
                          5. Health status
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveHealthInfoCode(null);
                            setShowAllHealthGuides(true);
                          }}
                          className="p-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-teal-300 cursor-pointer"
                          title="Open Health Status Visual Cues Guide"
                        >
                          <Info className="w-3 h-3" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveFeaturePopup((prev) =>
                            prev === 'health' ? null : 'health'
                          )
                        }
                        className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer min-w-0 shrink ${
                          confirmedFields.health
                            ? 'bg-emerald-950/95 border-emerald-400 text-white ring-1 ring-emerald-400/35 shadow-sm'
                            : hasRunAiAnalysis
                            ? 'bg-indigo-950/95 border-indigo-400 text-white ring-1 ring-indigo-400/35 shadow-sm'
                            : 'bg-slate-950/90 hover:bg-slate-900 border-slate-700 text-slate-200'
                        }`}
                      >
                        <span className="truncate">
                          {HEALTH_STATUS_OPTIONS.find((o) => o.value === selectedState.health)
                            ?.label || selectedState.health}
                        </span>
                        <PillOriginBadge
                          isSelected={true}
                          isUserConfirmed={!!confirmedFields.health}
                          hasRunAiAnalysis={hasRunAiAnalysis}
                        />
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
                            activeFeaturePopup === 'health' ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </div>
                    {activeFeaturePopup === 'health' && (
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 shadow-lg space-y-2.5">
                        <div className="flex flex-wrap gap-2">
                          {HEALTH_STATUS_OPTIONS.map((opt) => {
                            const isSelected = selectedState.health === opt.value;
                            const isUserConfirmed = !!confirmedFields.health;
                            const isAiOriginal = aiDetectedState.health === opt.value;
                            const isUnk = opt.value === 'Unknown';
                            return (
                              <div
                                key={opt.value}
                                className={`inline-flex items-center rounded-full border transition-all ${
                                  isSelected
                                    ? isUserConfirmed
                                      ? 'bg-emerald-950/95 border-emerald-400 text-white ring-2 ring-emerald-400/35 shadow-md'
                                      : hasRunAiAnalysis
                                      ? 'bg-indigo-950/95 border-indigo-400 text-white ring-2 ring-indigo-400/35 shadow-md'
                                      : 'bg-slate-800 border-slate-500 text-white'
                                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-slate-600'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleSelectSinglePill('health', opt.value)}
                                  className="pl-3 pr-2 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                                >
                                  <span
                                    className={
                                      isUnk && !isSelected ? 'text-slate-400' : 'text-slate-100'
                                    }
                                  >
                                    {opt.label}
                                  </span>
                                  <PillOriginBadge
                                    isSelected={isSelected}
                                    isUserConfirmed={isUserConfirmed}
                                    isAiOriginal={isAiOriginal}
                                    hasRunAiAnalysis={hasRunAiAnalysis}
                                  />
                                </button>
                                {opt.description && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowAllHealthGuides(false);
                                      setActiveHealthInfoCode(opt.code);
                                    }}
                                    title={`View description & visual cues for ${opt.label}`}
                                    className="pr-2.5 pl-1 py-1.5 text-[11px] font-bold flex items-center text-slate-400 hover:text-white cursor-pointer"
                                  >
                                    <Info className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 6. Reproductive status */}
                  <div className="py-2.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-slate-200 shrink-0">
                        6. Reproductive status
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveFeaturePopup((prev) =>
                            prev === 'reproductiveStatus' ? null : 'reproductiveStatus'
                          )
                        }
                        className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer min-w-0 shrink ${
                          confirmedFields.reproductiveStatus
                            ? 'bg-emerald-950/95 border-emerald-400 text-white ring-1 ring-emerald-400/35 shadow-sm'
                            : hasRunAiAnalysis
                            ? 'bg-indigo-950/95 border-indigo-400 text-white ring-1 ring-indigo-400/35 shadow-sm'
                            : 'bg-slate-950/90 hover:bg-slate-900 border-slate-700 text-slate-200'
                        }`}
                      >
                        <span className="truncate">
                          {PAWLENS_REPRODUCTIVE_OPTIONS.find(
                            (o) => o.value === selectedState.reproductiveStatus
                          )?.label || selectedState.reproductiveStatus}
                        </span>
                        <PillOriginBadge
                          isSelected={true}
                          isUserConfirmed={!!confirmedFields.reproductiveStatus}
                          hasRunAiAnalysis={hasRunAiAnalysis}
                        />
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
                            activeFeaturePopup === 'reproductiveStatus' ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </div>
                    {activeFeaturePopup === 'reproductiveStatus' && (
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 shadow-lg flex flex-wrap gap-2">
                        {PAWLENS_REPRODUCTIVE_OPTIONS.map((opt) => {
                          const isSelected = selectedState.reproductiveStatus === opt.value;
                          const isUserConfirmed = !!confirmedFields.reproductiveStatus;
                          const isAiOriginal = aiDetectedState.reproductiveStatus === opt.value;
                          const isUnk = opt.value === 'Unknown';
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() =>
                                handleSelectSinglePill('reproductiveStatus', opt.value)
                              }
                              className={`px-3.5 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                                isSelected
                                  ? isUserConfirmed
                                    ? 'bg-emerald-950/95 border-emerald-400 text-white ring-2 ring-emerald-400/35 shadow-md'
                                    : hasRunAiAnalysis
                                    ? 'bg-indigo-950/95 border-indigo-400 text-white ring-2 ring-indigo-400/35 shadow-md'
                                    : 'bg-slate-800 border-slate-500 text-white'
                                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-slate-600'
                              }`}
                            >
                              <span className={isUnk && !isSelected ? 'text-slate-400' : 'text-slate-100'}>
                                {opt.label}
                              </span>
                              <PillOriginBadge
                                isSelected={isSelected}
                                isUserConfirmed={isUserConfirmed}
                                isAiOriginal={isAiOriginal}
                                hasRunAiAnalysis={hasRunAiAnalysis}
                              />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 7. Vet care */}
                  <div className="py-2.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-slate-200 shrink-0">
                        7. Vet care
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveFeaturePopup((prev) =>
                            prev === 'vetCare' ? null : 'vetCare'
                          )
                        }
                        className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer min-w-0 shrink ${
                          confirmedFields.vetCare
                            ? 'bg-emerald-950/95 border-emerald-400 text-white ring-1 ring-emerald-400/35 shadow-sm'
                            : hasRunAiAnalysis
                            ? 'bg-indigo-950/95 border-indigo-400 text-white ring-1 ring-indigo-400/35 shadow-sm'
                            : 'bg-slate-950/90 hover:bg-slate-900 border-slate-700 text-slate-200'
                        }`}
                      >
                        <span className="truncate">
                          {PAWLENS_VET_CARE_OPTIONS.find((o) => o.value === selectedState.vetCare)
                            ?.label || selectedState.vetCare}
                        </span>
                        <PillOriginBadge
                          isSelected={true}
                          isUserConfirmed={!!confirmedFields.vetCare}
                          hasRunAiAnalysis={hasRunAiAnalysis}
                        />
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
                            activeFeaturePopup === 'vetCare' ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </div>
                    {activeFeaturePopup === 'vetCare' && (
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 shadow-lg flex flex-wrap gap-2">
                        {PAWLENS_VET_CARE_OPTIONS.map((opt) => {
                          const isSelected = selectedState.vetCare === opt.value;
                          const isUserConfirmed = !!confirmedFields.vetCare;
                          const isAiOriginal = aiDetectedState.vetCare === opt.value;
                          const isUnk = opt.value === 'Unknown';
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleSelectSinglePill('vetCare', opt.value)}
                              className={`px-3.5 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                                isSelected
                                  ? isUserConfirmed
                                    ? 'bg-emerald-950/95 border-emerald-400 text-white ring-2 ring-emerald-400/35 shadow-md'
                                    : hasRunAiAnalysis
                                    ? 'bg-indigo-950/95 border-indigo-400 text-white ring-2 ring-indigo-400/35 shadow-md'
                                    : 'bg-slate-800 border-slate-500 text-white'
                                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-slate-600'
                              }`}
                            >
                              <span className={isUnk && !isSelected ? 'text-slate-400' : 'text-slate-100'}>
                                {opt.label}
                              </span>
                              <PillOriginBadge
                                isSelected={isSelected}
                                isUserConfirmed={isUserConfirmed}
                                isAiOriginal={isAiOriginal}
                                hasRunAiAnalysis={hasRunAiAnalysis}
                              />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* TAB 3: DETAILED FORENSIC NOTES                                      */}
            {/* =================================================================== */}
            {activeSheetTab === 'report' && (
              <div className="space-y-5 pb-6">
                {report ? (
                  <>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-emerald-400" />
                          <h3 className="text-sm font-extrabold text-white">
                            Forensic Identification Summary
                          </h3>
                        </div>
                        {report.modelUsed && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
                            {report.modelUsed}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        {report.overallForensicSummary}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {[
                        { title: '1. Coat Pattern Type', val: report.coatPatternType },
                        { title: '2. Dominant Base Color', val: report.dominantBaseColor },
                        { title: '3. White Distribution', val: report.whiteDistribution },
                        { title: '4. Facial Markings', val: report.facialMarkings },
                        { title: '5. Eye Color & Condition', val: report.eyes },
                        { title: '6. Ear Damage & Notches', val: report.earDamageAndFeatures },
                        { title: '7. Tail Characteristics', val: report.tail },
                        { title: '8. Body Condition', val: report.bodyCondition },
                        { title: '9. Health Status', val: report.healthStatus },
                        { title: '10. Gender Indicators', val: report.gender },
                        { title: '11. Approximate Age', val: report.approximateAge },
                        {
                          title: '12. TNR Ear Tip Assessment',
                          val: `${report.tnrEarTipStatus.assessment} (Left: ${report.tnrEarTipStatus.leftEar} | Right: ${report.tnrEarTipStatus.rightEar})`,
                        },
                      ].map((item) => (
                        <div
                          key={item.title}
                          className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1"
                        >
                          <div className="text-xs font-bold text-emerald-400">{item.title}</div>
                          <p
                            className={`text-xs leading-relaxed ${
                              isUnclearOrUnknown(item.val) ? 'text-amber-300/90 italic' : 'text-slate-300'
                            }`}
                          >
                            {item.val}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
                    {isLoading
                      ? 'Generating detailed forensic notes...'
                      : 'Tap "Start AI Analysis" above to generate detailed forensic notes.'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MINIMAL "NEW STRAY REGISTERED" POPUP MODAL                            */}
      {/* ===================================================================== */}
      {registeredNewCatId !== null && (
        <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xs rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto">
              <Check className="w-7 h-7 stroke-[3]" />
            </div>
            <div className="text-base font-extrabold text-white">
              New stray registered
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setRegisteredNewCatId(null);
                  handleReturnToStartupCamera();
                }}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-extrabold text-xs sm:text-sm transition cursor-pointer"
              >
                Exit
              </button>
              <button
                type="button"
                onClick={() => {
                  const catIdToEdit = registeredNewCatId;
                  setRegisteredNewCatId(null);
                  handleReturnToStartupCamera();
                  if (catIdToEdit) {
                    const navGrid =
                      props.onNavigateToCatInGrid ||
                      (typeof window !== 'undefined'
                        ? (window as any).__HydraBridge?.onNavigateToCatInGrid
                        : undefined);
                    if (navGrid) {
                      navGrid(catIdToEdit);
                    } else if (props.onOpenCatProfile) {
                      props.onOpenCatProfile(catIdToEdit, false);
                    }
                  }
                }}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/40 text-white font-extrabold text-xs sm:text-sm transition cursor-pointer shadow-md"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* FLOATING POPUP MODAL FOR HEALTH STATUS VISUAL CUES                    */}
      {/* Dismisses on clicking the exit cross (X) or clicking anywhere outside */}
      {/* ===================================================================== */}
      {(activeHealthInfoCode !== null || showAllHealthGuides) && (
        <div
          onClick={() => {
            setActiveHealthInfoCode(null);
            setShowAllHealthGuides(false);
          }}
          className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md max-h-[80vh] overflow-y-auto rounded-3xl bg-slate-900 border border-teal-500/50 p-5 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-teal-400 shrink-0" />
                <h4 className="text-sm font-extrabold text-white">
                  {showAllHealthGuides
                    ? 'Health Status — Visual Cues Guide'
                    : (() => {
                        const found = HEALTH_STATUS_OPTIONS.find(
                          (o) => o.code === activeHealthInfoCode
                        );
                        return found ? `Health Status: ${found.label}` : 'Health Status Info';
                      })()}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveHealthInfoCode(null);
                  setShowAllHealthGuides(false);
                }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                title="Close popup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {showAllHealthGuides ? (
              <div className="space-y-2.5">
                {HEALTH_STATUS_OPTIONS.filter((o) => o.description).map((opt) => (
                  <div
                    key={opt.code}
                    className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 text-xs space-y-1"
                  >
                    <div className="font-extrabold text-teal-300">{opt.label}</div>
                    <p className="text-slate-300 leading-relaxed">{opt.description}</p>
                    {opt.visualCues && (
                      <p className="text-slate-400 leading-relaxed">
                        <strong className="text-slate-200">Visual cues:</strong> {opt.visualCues}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              (() => {
                const activeOpt = HEALTH_STATUS_OPTIONS.find(
                  (o) => o.code === activeHealthInfoCode
                );
                if (!activeOpt) return null;
                return (
                  <div className="space-y-2.5 text-xs">
                    <p className="text-slate-200 leading-relaxed">{activeOpt.description}</p>
                    {activeOpt.visualCues && (
                      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                        <div className="font-bold text-teal-300">Visual Cues:</div>
                        <p className="text-slate-300 leading-relaxed">{activeOpt.visualCues}</p>
                      </div>
                    )}
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveHealthInfoCode(null);
                          setShowAllHealthGuides(true);
                        }}
                        className="text-[11px] font-bold text-teal-400 hover:text-teal-300 cursor-pointer"
                      >
                        View all health status definitions &rarr;
                      </button>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/* Manual Crop Modal */}
      {imageToCrop && (
        <ImageCropperModal
          imageUrl={imageToCrop}
          onApplyCrop={handleApplyCrop}
          onClose={() => setImageToCrop(null)}
        />
      )}

      {/* API Status Modal */}
      {showCreditPanel && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    creditStatus?.status === 'available'
                      ? 'bg-emerald-400'
                      : creditStatus?.status === 'quota_exhausted'
                      ? 'bg-amber-400'
                      : 'bg-rose-400'
                  }`}
                />
                <h4 className="text-sm font-extrabold text-white">
                  {creditStatus?.stateLabel || 'Checking Gemini API...'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowCreditPanel(false)}
                className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {creditStatus?.summary || 'Checking Gemini Vision API status...'}
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => checkCreditStatus(false)}
                disabled={isCheckingCredit}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
              >
                {isCheckingCredit ? 'Testing...' : 'Re-test API'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreditPanel(false)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
