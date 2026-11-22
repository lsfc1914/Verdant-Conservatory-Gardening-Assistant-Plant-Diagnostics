import React, { useRef, useState } from 'react';
import { Upload, Camera, AlertCircle, Loader2, Leaf } from 'lucide-react';
import { EnvironmentHint } from '../types/plant';
import {
  fetchSampleImagePayload,
  ProcessedImagePayload,
  processImageFile,
} from '../utils/imageUtils';
import { ResilientImage } from './ResilientImage';

interface PhotoAnalyzerProps {
  onAnalyze: (
    payload: ProcessedImagePayload,
    environmentHint: EnvironmentHint,
    symptomNotes: string
  ) => Promise<void>;
  isAnalyzing: boolean;
  errorMessage: string | null;
  onClearError: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

const SAMPLE_SPECIMENS: Array<{
  id: string;
  label: string;
  context: string;
  hint: EnvironmentHint;
  symptoms: string;
  imageUrl: string;
}> = [
  {
    id: 'sample-monstera',
    label: 'Monstera Leaf',
    context: 'Indoor houseplant · Foliage ID',
    hint: 'indoor',
    symptoms: '',
    imageUrl: '/src/assets/images/specimen_monstera_preview_1795385183903.jpg',
  },
  {
    id: 'sample-rose',
    label: 'Garden Rose Bud',
    context: 'Outdoor bed · Pest inspection',
    hint: 'outdoor',
    symptoms: 'Yellowing spots on leaves and tiny green insects near the bud',
    imageUrl: '/src/assets/images/specimen_rose_aphids_preview_1795385183952.jpg',
  },
  {
    id: 'sample-olive',
    label: 'Potted Olive Tree',
    context: 'Conservatory · Care blueprint',
    hint: 'auto',
    symptoms: '',
    imageUrl: '/src/assets/images/specimen_olive_tree_preview_1795385184317.jpg',
  },
];

export function PhotoAnalyzer({
  onAnalyze,
  isAnalyzing,
  errorMessage,
  onClearError,
  fileInputRef,
}: PhotoAnalyzerProps) {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [environmentHint, setEnvironmentHint] = useState<EnvironmentHint>('auto');
  const [symptomNotes, setSymptomNotes] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [loadingSampleId, setLoadingSampleId] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setLocalError(null);
    onClearError();
    try {
      const payload = await processImageFile(file);
      await onAnalyze(payload, environmentHint, symptomNotes);
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : 'Unable to read this image file.'
      );
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (isAnalyzing) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFile(file);
    }
  };

  const handleSampleClick = async (sample: (typeof SAMPLE_SPECIMENS)[number]) => {
    if (isAnalyzing) return;
    setLocalError(null);
    onClearError();
    setLoadingSampleId(sample.id);
    try {
      const payload = await fetchSampleImagePayload(sample.imageUrl);
      setEnvironmentHint(sample.hint);
      setSymptomNotes(sample.symptoms);
      await onAnalyze(payload, sample.hint, sample.symptoms);
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : 'Could not load sample image.'
      );
    } finally {
      setLoadingSampleId(null);
    }
  };

  const activeError = localError || errorMessage;

  return (
    <section className="space-y-6">
      {/* Conservatory Hero Header with atmospheric backdrop */}
      <div className="relative overflow-hidden rounded-xl border border-[#22312B] bg-[#111916]">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <p className="text-xs font-medium text-emerald-400 tracking-wide">
                Indoor Houseplants &amp; Outdoor Gardens
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#ECF2EF] text-balance leading-[1.15]">
                Identify any plant and diagnose leaf or pest issues from a photo.
              </h1>
              <p className="text-sm sm:text-base text-[#A3B5AC] leading-relaxed max-w-[58ch]">
                Upload a close-up of foliage, flowers, or stems. Receive taxonomic
                identification, pest and disease triage, tailored care instructions, and
                a persistent botanist thread saved locally.
              </p>
            </div>

            {/* Context Controls before upload */}
            <div className="space-y-4 pt-2 border-t border-[#1E2B26]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-medium text-[#8FA399]">
                  Growing environment
                </span>
                <div
                  role="group"
                  aria-label="Growing environment"
                  className="inline-flex items-center p-1 rounded-lg bg-[#0A0F0D] border border-[#22312B]"
                >
                  {(
                    [
                      { value: 'auto', label: 'Auto-detect' },
                      { value: 'indoor', label: 'Indoor' },
                      { value: 'outdoor', label: 'Outdoor' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setEnvironmentHint(opt.value)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        environmentHint === opt.value
                          ? 'bg-[#1D2B25] text-emerald-300'
                          : 'text-[#8FA399] hover:text-[#ECF2EF]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="symptom-notes-input"
                  className="block text-xs font-medium text-[#8FA399] mb-1.5"
                >
                  Observed symptoms or context (optional)
                </label>
                <input
                  id="symptom-notes-input"
                  type="text"
                  value={symptomNotes}
                  onChange={(e) => setSymptomNotes(e.target.value)}
                  placeholder="e.g., Brown crispy edges, sticky leaves, planted in partial shade..."
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0A0F0D] border border-[#22312B] text-sm text-[#ECF2EF] placeholder:text-[#5B7066] focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative min-h-[220px] lg:min-h-full border-t lg:border-t-0 lg:border-l border-[#22312B]">
            <ResilientImage
              src="/src/assets/images/conservatory_hero_backdrop_1795385184569.jpg"
              alt="Modern dark-framed glasshouse conservatory illuminated by warm grow lights at dusk"
              fallbackLabel="Verdant Conservatory"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F0D]/90 via-[#0A0F0D]/30 to-transparent flex items-end p-5">
              <div className="text-xs text-[#D2DDD7] space-y-1">
                <p className="font-medium text-[#ECF2EF]">
                  Photographic Inspection Tip
                </p>
                <p className="text-[#A3B5AC]">
                  Include both healthy foliage and any spots, webbing, or insects in clear
                  natural light.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden inputs for file picker & camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
        aria-label="Upload plant photo"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileInputChange}
        className="hidden"
        aria-label="Capture plant photo with camera"
      />

      {/* Primary Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!isAnalyzing) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-xl border border-dashed transition-colors p-8 sm:p-10 text-center ${
          isDragging
            ? 'border-emerald-400 bg-emerald-950/20'
            : 'border-[#2B3E36] bg-[#111916] hover:border-[#3A5349]'
        }`}
      >
        {isAnalyzing ? (
          <div className="py-6 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            <div className="space-y-1">
              <p className="text-base font-semibold text-[#ECF2EF]">
                Inspecting botanical morphology &amp; leaf health
              </p>
              <p className="text-xs text-[#8FA399]">
                Identifying species, checking for pests or pathogens, and assembling care
                parameters...
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#16201C] border border-[#22312B] flex items-center justify-center text-emerald-400">
              <Upload className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-[#ECF2EF]">
                Drop a plant photo here, or choose an image
              </p>
              <p className="text-xs text-[#8FA399]">
                Supports JPEG, PNG, and WebP · Analyzed securely and saved locally
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#06120D] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Choose Photo</span>
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#16201C] hover:bg-[#1E2C27] border border-[#2A3B34] text-[#ECF2EF] text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Use Camera</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {activeError && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 flex items-start gap-3 text-sm text-rose-200"
        >
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-medium text-rose-100">Analysis interrupted</p>
            <p className="text-rose-200/90">{activeError}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setLocalError(null);
              onClearError();
            }}
            className="text-xs font-medium text-rose-300 hover:text-rose-100 underline shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Quick Sample Specimens (runs real Gemini photo analysis) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-semibold text-[#ECF2EF]">
            Or test immediately with a botanical specimen
          </h2>
          <span className="text-xs text-[#8FA399] whitespace-nowrap">
            Runs live AI vision analysis
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {SAMPLE_SPECIMENS.map((sample) => {
            const isLoadingThis = loadingSampleId === sample.id && isAnalyzing;
            return (
              <button
                key={sample.id}
                type="button"
                disabled={isAnalyzing}
                onClick={() => void handleSampleClick(sample)}
                className="group text-left rounded-xl border border-[#22312B] bg-[#111916] hover:border-emerald-500/50 transition-colors overflow-hidden disabled:opacity-60 cursor-pointer"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-[#0A0F0D] relative">
                  <ResilientImage
                    src={sample.imageUrl}
                    alt={sample.label}
                    fallbackLabel={sample.label}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                  />
                  {isLoadingThis && (
                    <div className="absolute inset-0 bg-[#0A0F0D]/75 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[#ECF2EF] group-hover:text-emerald-300 transition-colors">
                      {sample.label}
                    </span>
                    <Leaf className="w-3.5 h-3.5 text-emerald-400/70 shrink-0" />
                  </div>
                  <p className="text-xs text-[#8FA399]">{sample.context}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
