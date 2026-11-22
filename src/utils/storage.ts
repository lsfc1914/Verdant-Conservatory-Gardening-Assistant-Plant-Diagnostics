import { ChatMessage, ChatThreadsMap, PlantSpecimen } from '../types/plant';

const PLANTS_STORAGE_KEY = 'verdant_conservatory_plants_v1';
const CHATS_STORAGE_KEY = 'verdant_conservatory_chats_v1';

export interface GardenBackupPayload {
  schemaVersion: 1;
  exportedAt: string;
  source: 'Verdant Conservatory';
  plantCount: number;
  growthLogEntryCount: number;
  plants: PlantSpecimen[];
  chatThreads: ChatThreadsMap;
}

export interface SinglePlantBackupPayload {
  schemaVersion: 1;
  exportedAt: string;
  source: 'Verdant Conservatory';
  plant: PlantSpecimen;
  chatHistory: ChatMessage[];
}

export function loadSavedPlants(): PlantSpecimen[] {
  try {
    const raw = localStorage.getItem(PLANTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PlantSpecimen[]) : [];
  } catch {
    return [];
  }
}

export function persistSavedPlants(plants: PlantSpecimen[]): boolean {
  try {
    localStorage.setItem(PLANTS_STORAGE_KEY, JSON.stringify(plants));
    return true;
  } catch {
    return false;
  }
}

export function loadChatThreads(): ChatThreadsMap {
  try {
    const raw = localStorage.getItem(CHATS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as ChatThreadsMap) : {};
  } catch {
    return {};
  }
}

export function persistChatThreads(threads: ChatThreadsMap): boolean {
  try {
    localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(threads));
    return true;
  } catch {
    return false;
  }
}

function triggerJsonDownload(payload: unknown, filename: string): void {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportGardenBackupJson(
  plants: PlantSpecimen[],
  chatThreads: ChatThreadsMap
): void {
  const dateStamp = new Date().toISOString().slice(0, 10);
  const growthLogEntryCount = plants.reduce(
    (sum, p) => sum + (p.growthLog?.length ?? 0),
    0
  );

  const savedPlantIds = new Set(plants.map((p) => p.id));
  const relevantThreads: ChatThreadsMap = {};
  for (const [key, messages] of Object.entries(chatThreads)) {
    if (key === 'general' || savedPlantIds.has(key)) {
      relevantThreads[key] = messages;
    }
  }

  const payload: GardenBackupPayload = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    source: 'Verdant Conservatory',
    plantCount: plants.length,
    growthLogEntryCount,
    plants,
    chatThreads: relevantThreads,
  };

  triggerJsonDownload(payload, `verdant-conservatory-backup-${dateStamp}.json`);
}

export function exportSinglePlantJson(
  plant: PlantSpecimen,
  chatHistory: ChatMessage[]
): void {
  const dateStamp = new Date().toISOString().slice(0, 10);
  const slug = plant.identity.commonName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const payload: SinglePlantBackupPayload = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    source: 'Verdant Conservatory',
    plant,
    chatHistory,
  };

  triggerJsonDownload(
    payload,
    `${slug || 'plant-record'}-${dateStamp}.json`
  );
}
