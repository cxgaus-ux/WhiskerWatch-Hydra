export interface TnrEarTipStatus {
  leftEar: string;
  rightEar: string;
  assessment: string;
}

export interface SinglePhotoPixelMetrics {
  photoIndex: number;
  whitePct: number;
  blackPct: number;
  greyPct: number;
  gingerPct: number;
  brownPct: number;
  edgeDensity: number;
  lowerWhitePct: number;
  upperWhitePct: number;
}

export interface CatPixelMetrics {
  whitePct: number;
  blackPct: number;
  greyPct: number;
  gingerPct: number;
  brownPct: number;
  edgeDensity: number;
  lowerWhitePct: number;
  upperWhitePct: number;
  photoCount?: number;
  perPhotoMetrics?: SinglePhotoPixelMetrics[];
}

export interface CatIdentificationAnalysis {
  id: string;
  scannedAt: string;
  name?: string;
  primaryImage: string;
  additionalImages?: string[];
  originalImages?: string[];
  photosExaminedCount?: number;
  perPhotoObservations?: string[];
  modelUsed?: string;
  // 10 Identification Features
  coatPatternType: string;
  dominantBaseColor: string;
  whiteDistribution: string;
  facialMarkings: string;
  eyes: string;
  jawAndBuild: string;
  pawsAndLegs: string;
  tail: string;
  uniqueBodyMarkings: string;
  tnrEarTipStatus: TnrEarTipStatus;
  earDamageAndFeatures: string;
  // Health & Demographic Clues
  healthStatus: string;
  bodyCondition: string;
  gender: string;
  approximateAge: string;
  overallForensicSummary: string;
  warningNote?: string;
  idMarks?: {
    coatType?: string;
    tabbySubtype?: string;
    dominantColor?: string;
    whitePercent?: string;
    uniqueFingerprints?: string[];
  };
  vitals?: {
    sterilisation?: string;
    sex?: string;
    lifeStage?: string;
    bodyCondition?: string;
    health?: string;
    reproductiveStatus?: string;
    vetCare?: string;
  };
}

