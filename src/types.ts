import { Timestamp } from 'firebase/firestore';

export type HydraZone =
  | 'Hydra Port'
  | 'Kamini Harbor'
  | 'Vlychos'
  | 'Kaminia'
  | 'Kiafa'
  | 'Mandraki';

export const HYDRA_ZONES: HydraZone[] = [
  'Hydra Port',
  'Kamini Harbor',
  'Vlychos',
  'Kaminia',
  'Kiafa',
  'Mandraki',
];

export type CatSex = 'Female' | 'Male' | 'Unknown';

export type TnrStatus =
  | 'Sterilized (Ear-Tipped)'
  | 'Intact - Priority TNR'
  | 'Kitten - Underage'
  | 'Scheduled';

export const TNR_STATUSES: TnrStatus[] = [
  'Sterilized (Ear-Tipped)',
  'Intact - Priority TNR',
  'Kitten - Underage',
  'Scheduled',
];

export type HealthStatus =
  | 'Healthy'
  | 'Monitor'
  | 'Needs Vet Care'
  | 'In Treatment';

export const HEALTH_STATUSES: HealthStatus[] = [
  'Healthy',
  'Monitor',
  'Needs Vet Care',
  'In Treatment',
];

export type FedStatus =
  | 'Fed & Watered'
  | 'Observed Only'
  | 'Medication Given'
  | 'Trapped for TNR';

export const FED_STATUSES: FedStatus[] = [
  'Fed & Watered',
  'Observed Only',
  'Medication Given',
  'Trapped for TNR',
];

export type SupplyLevel =
  | 'Full'
  | 'Adequate'
  | 'Low - Refill Soon'
  | 'Empty - Urgent';

export const SUPPLY_LEVELS: SupplyLevel[] = [
  'Full',
  'Adequate',
  'Low - Refill Soon',
  'Empty - Urgent',
];

export type WaterStatus =
  | 'Fresh & Full'
  | 'Needs Cleaning'
  | 'Refill Required';

export const WATER_STATUSES: WaterStatus[] = [
  'Fresh & Full',
  'Needs Cleaning',
  'Refill Required',
];

export interface CatProfile {
  id: string;
  name: string;
  colonyZone: HydraZone;
  coatPattern: string;
  sex: CatSex;
  tnrStatus: TnrStatus;
  healthStatus: HealthStatus;
  estimatedAge: string;
  microchipId: string;
  markingsDescription: string;
  medicalNotes: string;
  photoUrl: string;
  storagePath: string;
  lastSeenZone: string;
  lastSeenText: string;
  ownerId: string;
  reporterName: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SightingLog {
  id: string;
  catId: string;
  catName: string;
  colonyZone: HydraZone;
  coordinatesLabel: string;
  behaviorNotes: string;
  healthObservation: HealthStatus;
  fedStatus: FedStatus;
  aiAnalysisSummary: string;
  photoUrl: string;
  ownerId: string;
  reporterName: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface FeedingStation {
  id: string;
  stationName: string;
  colonyZone: HydraZone;
  supplyLevel: SupplyLevel;
  waterStatus: WaterStatus;
  dailyCatCount: number;
  assignedCaretaker: string;
  notes: string;
  ownerId: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface AiCatAnalysisResult {
  coatPattern: string;
  estimatedAge: string;
  sexGuess: CatSex;
  earTipDetected: boolean;
  recommendedTnrStatus: TnrStatus;
  recommendedHealthStatus: HealthStatus;
  markingsSummary: string;
  triageAssessment: string;
  matchedCatName: string;
  matchConfidence: number;
}

export interface ColonyBriefingResult {
  headline: string;
  tnrPriorities: string[];
  medicalWatchlist: string[];
  supplyActions: string[];
}
