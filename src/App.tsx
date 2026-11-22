import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChatMessage,
  ChatThreadsMap,
  EnvironmentHint,
  GrowthLogEntry,
  PlantAnalysisResponse,
  PlantSpecimen,
} from './types/plant';
import {
  exportGardenBackupJson,
  exportSinglePlantJson,
  loadChatThreads,
  loadSavedPlants,
  persistChatThreads,
  persistSavedPlants,
} from './utils/storage';
import { ProcessedImagePayload } from './utils/imageUtils';
import { AppView, TopBar } from './components/TopBar';
import { PhotoAnalyzer } from './components/PhotoAnalyzer';
import { CareBlueprint } from './components/CareBlueprint';
import { BotanistChat } from './components/BotanistChat';
import { SavedGardenView } from './components/SavedGardenView';

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function App() {
  const [savedPlants, setSavedPlants] = useState<PlantSpecimen[]>(() =>
    loadSavedPlants()
  );
  const [chatThreads, setChatThreads] = useState<ChatThreadsMap>(() =>
    loadChatThreads()
  );

  const [activeView, setActiveView] = useState<AppView>('identify');
  const [currentSpecimen, setCurrentSpecimen] = useState<PlantSpecimen | null>(
    null
  );
  const [activeThreadKey, setActiveThreadKey] = useState<string>('general');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [isSendingChat, setIsSendingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const ok = persistSavedPlants(savedPlants);
    if (!ok) {
      setStorageWarning(
        'Browser local storage is full. Consider removing older saved plants to free space.'
      );
    }
  }, [savedPlants]);

  useEffect(() => {
    const ok = persistChatThreads(chatThreads);
    if (!ok) {
      setStorageWarning(
        'Browser local storage is full. Older chat messages could not be saved.'
      );
    }
  }, [chatThreads]);

  const availableChatPlants = useMemo(() => {
    if (
      currentSpecimen &&
      !savedPlants.some((p) => p.id === currentSpecimen.id)
    ) {
      return [currentSpecimen, ...savedPlants];
    }
    return savedPlants;
  }, [currentSpecimen, savedPlants]);

  const activeChatPlant = useMemo(() => {
    if (activeThreadKey === 'general') return null;
    if (currentSpecimen && currentSpecimen.id === activeThreadKey) {
      return currentSpecimen;
    }
    return savedPlants.find((p) => p.id === activeThreadKey) ?? null;
  }, [activeThreadKey, currentSpecimen, savedPlants]);

  const handleAnalyzePhoto = async (
    payload: ProcessedImagePayload,
    environmentHint: EnvironmentHint,
    symptomNotes: string
  ) => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await fetch('/api/analyze-plant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: payload.base64,
          mimeType: payload.mimeType,
          environmentHint,
          symptomNotes,
        }),
      });

      const data = (await response.json()) as PlantAnalysisResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze plant image.');
      }

      if (!data.isPlant || !data.identity || !data.diagnosis || !data.careGuide) {
        setAnalysisError(
          data.nonPlantMessage ||
            'No plant was clearly detected in that photo. Please upload a closer shot of leaves, stems, or flowers.'
        );
        return;
      }

      const now = new Date().toISOString();
      const newSpecimen: PlantSpecimen = {
        id: createId('plant'),
        savedAt: now,
        updatedAt: now,
        thumbnailDataUrl: payload.thumbnailDataUrl,
        environmentHint,
        symptomNotes,
        locationLabel: '',
        userNotes: '',
        isSaved: false,
        identity: data.identity,
        diagnosis: data.diagnosis,
        careGuide: data.careGuide,
      };

      setCurrentSpecimen(newSpecimen);
      setActiveThreadKey(newSpecimen.id);
      setActiveView('identify');
    } catch (err) {
      setAnalysisError(
        err instanceof Error
          ? err.message
          : 'An error occurred while analyzing the plant photo.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleSave = (specimen: PlantSpecimen) => {
    const alreadySaved = savedPlants.some((p) => p.id === specimen.id);
    if (alreadySaved) {
      setSavedPlants((prev) => prev.filter((p) => p.id !== specimen.id));
      if (currentSpecimen?.id === specimen.id) {
        setCurrentSpecimen({ ...specimen, isSaved: false });
      }
    } else {
      const savedCopy: PlantSpecimen = {
        ...specimen,
        isSaved: true,
        updatedAt: new Date().toISOString(),
      };
      setSavedPlants((prev) => [savedCopy, ...prev]);
      setCurrentSpecimen(savedCopy);
    }
  };

  const handleUpdateNotes = (
    specimenId: string,
    updates: { locationLabel?: string; userNotes?: string }
  ) => {
    const updatedAt = new Date().toISOString();
    if (currentSpecimen?.id === specimenId) {
      setCurrentSpecimen((prev) =>
        prev ? { ...prev, ...updates, updatedAt } : null
      );
    }
    setSavedPlants((prev) =>
      prev.map((p) => (p.id === specimenId ? { ...p, ...updates, updatedAt } : p))
    );
  };

  const handleAddGrowthEntry = (
    specimenId: string,
    entryData: Omit<GrowthLogEntry, 'id'>
  ) => {
    const newEntry: GrowthLogEntry = {
      ...entryData,
      id: createId('growth'),
    };
    const updatedAt = new Date().toISOString();

    if (currentSpecimen?.id === specimenId) {
      setCurrentSpecimen((prev) =>
        prev
          ? {
              ...prev,
              isSaved: true,
              updatedAt,
              growthLog: [newEntry, ...(prev.growthLog ?? [])],
            }
          : null
      );
    }

    setSavedPlants((prev) => {
      const exists = prev.some((p) => p.id === specimenId);
      if (exists) {
        return prev.map((p) =>
          p.id === specimenId
            ? {
                ...p,
                updatedAt,
                growthLog: [newEntry, ...(p.growthLog ?? [])],
              }
            : p
        );
      }
      if (currentSpecimen?.id === specimenId) {
        return [
          {
            ...currentSpecimen,
            isSaved: true,
            updatedAt,
            growthLog: [newEntry, ...(currentSpecimen.growthLog ?? [])],
          },
          ...prev,
        ];
      }
      return prev;
    });
  };

  const handleUpdateGrowthEntry = (
    specimenId: string,
    entryId: string,
    updates: Partial<Omit<GrowthLogEntry, 'id' | 'photoDataUrl'>>
  ) => {
    const updatedAt = new Date().toISOString();
    const mapEntries = (entries: GrowthLogEntry[] = []) =>
      entries.map((entry) =>
        entry.id === entryId ? { ...entry, ...updates } : entry
      );

    if (currentSpecimen?.id === specimenId) {
      setCurrentSpecimen((prev) =>
        prev
          ? { ...prev, updatedAt, growthLog: mapEntries(prev.growthLog) }
          : null
      );
    }
    setSavedPlants((prev) =>
      prev.map((p) =>
        p.id === specimenId
          ? { ...p, updatedAt, growthLog: mapEntries(p.growthLog) }
          : p
      )
    );
  };

  const handleDeleteGrowthEntry = (specimenId: string, entryId: string) => {
    const updatedAt = new Date().toISOString();
    const filterEntries = (entries: GrowthLogEntry[] = []) =>
      entries.filter((entry) => entry.id !== entryId);

    if (currentSpecimen?.id === specimenId) {
      setCurrentSpecimen((prev) =>
        prev
          ? { ...prev, updatedAt, growthLog: filterEntries(prev.growthLog) }
          : null
      );
    }
    setSavedPlants((prev) =>
      prev.map((p) =>
        p.id === specimenId
          ? { ...p, updatedAt, growthLog: filterEntries(p.growthLog) }
          : p
      )
    );
  };

  const handleDeletePlant = (plantId: string) => {
    setSavedPlants((prev) => prev.filter((p) => p.id !== plantId));
    if (currentSpecimen?.id === plantId) {
      setCurrentSpecimen((prev) =>
        prev ? { ...prev, isSaved: false } : null
      );
    }
    setChatThreads((prev) => {
      if (!(plantId in prev)) return prev;
      const copy = { ...prev };
      delete copy[plantId];
      return copy;
    });
    if (activeThreadKey === plantId) {
      setActiveThreadKey('general');
    }
  };

  const handleSendChatMessage = async (
    threadKey: string,
    text: string,
    attachment?: ProcessedImagePayload
  ) => {
    const trimmed = text.trim();
    if (!trimmed && !attachment) return;

    const existingHistory = chatThreads[threadKey] ?? [];
    const userMessage: ChatMessage = {
      id: createId('msg'),
      role: 'user',
      text: trimmed || 'Please inspect this follow-up plant photo.',
      imagePreviewUrl: attachment?.thumbnailDataUrl,
      timestamp: new Date().toISOString(),
    };

    const nextHistoryWithUser = [...existingHistory, userMessage];
    setChatThreads((prev) => ({
      ...prev,
      [threadKey]: nextHistoryWithUser,
    }));

    setIsSendingChat(true);
    setChatError(null);

    const plantContext =
      threadKey === 'general'
        ? null
        : currentSpecimen?.id === threadKey
          ? currentSpecimen
          : savedPlants.find((p) => p.id === threadKey) ?? null;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.text,
          history: existingHistory.map((m) => ({ role: m.role, text: m.text })),
          activePlant: plantContext,
          imageBase64: attachment?.base64,
          mimeType: attachment?.mimeType,
        }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };
      if (!response.ok || !data.reply) {
        throw new Error(data.error || 'Failed to get a response from the botanist.');
      }

      const botMessage: ChatMessage = {
        id: createId('msg'),
        role: 'model',
        text: data.reply,
        timestamp: new Date().toISOString(),
      };

      setChatThreads((prev) => ({
        ...prev,
        [threadKey]: [...(prev[threadKey] ?? nextHistoryWithUser), botMessage],
      }));
    } catch (err) {
      setChatError(
        err instanceof Error
          ? err.message
          : 'Could not reach the botanist chat service.'
      );
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleClearThread = (threadKey: string) => {
    setChatThreads((prev) => {
      const copy = { ...prev };
      delete copy[threadKey];
      return copy;
    });
  };

  const handleTriggerScan = () => {
    setCurrentSpecimen(null);
    setAnalysisError(null);
    setActiveView('identify');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenChatForPlant = (plantId: string) => {
    setActiveThreadKey(plantId);
    setActiveView('chat');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectSavedPlant = (plant: PlantSpecimen) => {
    setCurrentSpecimen(plant);
    setActiveThreadKey(plant.id);
    setActiveView('identify');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0A0F0D] text-[#ECF2EF] flex flex-col">
      <TopBar
        activeView={activeView}
        onSelectView={setActiveView}
        savedCount={savedPlants.length}
        onTriggerScan={handleTriggerScan}
      />

      {storageWarning && (
        <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-8 pt-4">
          <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-4 py-2.5 text-xs text-amber-200 flex items-center justify-between gap-4">
            <span>{storageWarning}</span>
            <button
              type="button"
              onClick={() => setStorageWarning(null)}
              className="underline hover:text-amber-100 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-8 py-6 sm:py-8">
        {activeView === 'identify' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8">
              {currentSpecimen ? (
                <CareBlueprint
                  specimen={currentSpecimen}
                  onToggleSave={handleToggleSave}
                  onUpdateNotes={handleUpdateNotes}
                  onAddGrowthEntry={handleAddGrowthEntry}
                  onUpdateGrowthEntry={handleUpdateGrowthEntry}
                  onDeleteGrowthEntry={handleDeleteGrowthEntry}
                  onExportPlant={(plant) =>
                    exportSinglePlantJson(plant, chatThreads[plant.id] ?? [])
                  }
                  onOpenChat={handleOpenChatForPlant}
                  onNewScan={handleTriggerScan}
                />
              ) : (
                <PhotoAnalyzer
                  onAnalyze={handleAnalyzePhoto}
                  isAnalyzing={isAnalyzing}
                  errorMessage={analysisError}
                  onClearError={() => setAnalysisError(null)}
                  fileInputRef={fileInputRef}
                />
              )}
            </div>

            <aside className="lg:col-span-4 lg:sticky lg:top-24">
              <BotanistChat
                threadKey={activeThreadKey}
                messages={chatThreads[activeThreadKey] ?? []}
                activePlant={activeChatPlant}
                availablePlants={availableChatPlants}
                onSelectThread={setActiveThreadKey}
                onSendMessage={handleSendChatMessage}
                onClearThread={handleClearThread}
                isSending={isSendingChat}
                errorMessage={chatError}
                onClearError={() => setChatError(null)}
                compact
              />
            </aside>
          </div>
        )}

        {activeView === 'garden' && (
          <SavedGardenView
            plants={savedPlants}
            onSelectPlant={handleSelectSavedPlant}
            onOpenPlantChat={handleOpenChatForPlant}
            onDeletePlant={handleDeletePlant}
            onExportBackup={() => exportGardenBackupJson(savedPlants, chatThreads)}
            onStartScan={handleTriggerScan}
          />
        )}

        {activeView === 'chat' && (
          <div className="max-w-4xl mx-auto">
            <BotanistChat
              threadKey={activeThreadKey}
              messages={chatThreads[activeThreadKey] ?? []}
              activePlant={activeChatPlant}
              availablePlants={availableChatPlants}
              onSelectThread={setActiveThreadKey}
              onSendMessage={handleSendChatMessage}
              onClearThread={handleClearThread}
              isSending={isSendingChat}
              errorMessage={chatError}
              onClearError={() => setChatError(null)}
            />
          </div>
        )}
      </main>
    </div>
  );
}
