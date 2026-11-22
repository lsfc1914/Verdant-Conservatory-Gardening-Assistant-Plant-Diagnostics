export type EnvironmentScope = 'indoor' | 'outdoor' | 'both';
export type EnvironmentHint = 'auto' | 'indoor' | 'outdoor';
export type HealthStatus = 'healthy' | 'attention' | 'critical';

export interface PlantIdentity {
  commonName: string;
  scientificName: string;
  family: string;
  environment: EnvironmentScope;
  confidence: 'High' | 'Moderate' | 'Low';
  summary: string;
  nativeRegion: string;
}

export interface PestDiagnosis {
  healthStatus: HealthStatus;
  statusHeadline: string;
  detectedIssues: string[];
  symptomsObserved: string[];
  immediateActions: string[];
  preventionTips: string[];
}

export interface CareGuide {
  light: {
    level: string;
    dailyHours: string;
    placementTip: string;
  };
  watering: {
    cadenceLabel: string;
    frequencyDays: string;
    method: string;
    moistureCheck: string;
  };
  soilAndPh: {
    mix: string;
    phRange: string;
    drainage: string;
  };
  climate: {
    tempRangeC: string;
    tempRangeF: string;
    humidityRange: string;
  };
  nutrition: {
    schedule: string;
    npkGuidance: string;
  };
  maintenance: {
    pruning: string;
    repottingOrMulching: string;
    propagation: string;
  };
  toxicity: {
    petSafe: boolean;
    notes: string;
  };
  seasonalCare: {
    springSummer: string;
    fallWinter: string;
  };
}

export interface PlantAnalysisResponse {
  isPlant: boolean;
  nonPlantMessage?: string;
  identity?: PlantIdentity;
  diagnosis?: PestDiagnosis;
  careGuide?: CareGuide;
}

export type GrowthStage =
  | 'Sprouting'
  | 'Vegetative'
  | 'Budding'
  | 'Flowering'
  | 'Recovery'
  | 'Dormant';

export interface GrowthLogEntry {
  id: string;
  capturedAt: string;
  photoDataUrl: string;
  note: string;
  heightLabel?: string;
  stage?: GrowthStage;
  healthStatus?: HealthStatus;
}

export interface PlantSpecimen {
  id: string;
  savedAt: string;
  updatedAt: string;
  thumbnailDataUrl: string;
  environmentHint: EnvironmentHint;
  symptomNotes: string;
  locationLabel: string;
  userNotes: string;
  isSaved: boolean;
  identity: PlantIdentity;
  diagnosis: PestDiagnosis;
  careGuide: CareGuide;
  growthLog?: GrowthLogEntry[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  imagePreviewUrl?: string;
  timestamp: string;
}

export type ChatThreadsMap = Record<string, ChatMessage[]>;
