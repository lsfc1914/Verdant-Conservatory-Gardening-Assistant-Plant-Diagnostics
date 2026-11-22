import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  Camera,
  Columns2,
  Plus,
  Trash2,
  Upload,
  X,
  ArrowUpDown,
  Bookmark,
  AlertCircle,
  Check,
  Pencil,
} from 'lucide-react';
import {
  GrowthLogEntry,
  GrowthStage,
  HealthStatus,
  PlantSpecimen,
} from '../types/plant';
import { processProgressPhoto } from '../utils/imageUtils';
import { ResilientImage } from './ResilientImage';

interface GrowthLogSectionProps {
  specimen: PlantSpecimen;
  onSaveSpecimenFirst: (specimen: PlantSpecimen) => void;
  onAddEntry: (
    specimenId: string,
    entry: Omit<GrowthLogEntry, 'id'>
  ) => void;
  onUpdateEntry: (
    specimenId: string,
    entryId: string,
    updates: Partial<Omit<GrowthLogEntry, 'id' | 'photoDataUrl'>>
  ) => void;
  onDeleteEntry: (specimenId: string, entryId: string) => void;
  openAddSignal?: number;
}

const GROWTH_STAGES: GrowthStage[] = [
  'Vegetative',
  'Sprouting',
  'Budding',
  'Flowering',
  'Recovery',
  'Dormant',
];

const HEALTH_OPTIONS: Array<{ value: HealthStatus; label: string }> = [
  { value: 'healthy', label: 'Healthy' },
  { value: 'attention', label: 'Needs Attention' },
  { value: 'critical', label: 'Treatment Required' },
];

function healthStatusText(status?: HealthStatus): string {
  if (status === 'healthy') return 'Healthy';
  if (status === 'attention') return 'Needs Attention';
  if (status === 'critical') return 'Treatment Required';
  return '';
}

function toDateInputValue(isoOrDate: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrDate)) return isoOrDate;
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

function formatDisplayDate(dateStr: string): string {
  const normalized = toDateInputValue(dateStr);
  const [year, month, day] = normalized.split('-').map(Number);
  const d = new Date(year, (month || 1) - 1, day || 1);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysBetween(earlierDate: string, laterDate: string): number {
  const a = new Date(toDateInputValue(earlierDate)).getTime();
  const b = new Date(toDateInputValue(laterDate)).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

export function GrowthLogSection({
  specimen,
  onSaveSpecimenFirst,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  openAddSignal = 0,
}: GrowthLogSectionProps) {
  const entries = specimen.growthLog ?? [];
  const baselineDate = toDateInputValue(specimen.savedAt);

  const [isAdding, setIsAdding] = useState(false);
  const [capturedAt, setCapturedAt] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [stage, setStage] = useState<GrowthStage>('Vegetative');
  const [entryHealth, setEntryHealth] = useState<HealthStatus>(
    specimen.diagnosis.healthStatus
  );
  const [heightLabel, setHeightLabel] = useState('');
  const [note, setNote] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [compareMode, setCompareMode] = useState(false);
  const [compareLeftId, setCompareLeftId] = useState<string>('baseline');
  const [compareRightId, setCompareRightId] = useState<string>('');

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editHeight, setEditHeight] = useState('');
  const [editStage, setEditStage] = useState<GrowthStage>('Vegetative');
  const [editHealth, setEditHealth] = useState<HealthStatus>('healthy');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (openAddSignal > 0) {
      if (!specimen.isSaved) {
        onSaveSpecimenFirst(specimen);
      }
      setIsAdding(true);
    }
  }, [openAddSignal]);

  const sortedEntries = useMemo(() => {
    const copy = [...entries];
    copy.sort((a, b) => {
      const diff =
        new Date(toDateInputValue(a.capturedAt)).getTime() -
        new Date(toDateInputValue(b.capturedAt)).getTime();
      return sortOrder === 'newest' ? -diff : diff;
    });
    return copy;
  }, [entries, sortOrder]);

  const chronologicalForCompare = useMemo(() => {
    const baselineOption = {
      id: 'baseline',
      capturedAt: baselineDate,
      photoDataUrl: specimen.thumbnailDataUrl,
      note: 'Initial plant identification scan',
      stage: undefined as GrowthStage | undefined,
      heightLabel: undefined as string | undefined,
      isBaseline: true,
    };
    const sortedAsc = [...entries]
      .sort(
        (a, b) =>
          new Date(toDateInputValue(a.capturedAt)).getTime() -
          new Date(toDateInputValue(b.capturedAt)).getTime()
      )
      .map((e) => ({ ...e, isBaseline: false }));
    return [baselineOption, ...sortedAsc];
  }, [baselineDate, entries, specimen.thumbnailDataUrl]);

  const activeRightId = useMemo(() => {
    if (
      compareRightId &&
      chronologicalForCompare.some((c) => c.id === compareRightId)
    ) {
      return compareRightId;
    }
    return (
      chronologicalForCompare[chronologicalForCompare.length - 1]?.id ??
      'baseline'
    );
  }, [chronologicalForCompare, compareRightId]);

  const activeLeftId = useMemo(() => {
    if (
      compareLeftId &&
      chronologicalForCompare.some((c) => c.id === compareLeftId)
    ) {
      return compareLeftId;
    }
    return 'baseline';
  }, [chronologicalForCompare, compareLeftId]);

  const leftSnapshot = chronologicalForCompare.find(
    (c) => c.id === activeLeftId
  );
  const rightSnapshot = chronologicalForCompare.find(
    (c) => c.id === activeRightId
  );

  const handleSelectPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoError(null);
    try {
      const dataUrl = await processProgressPhoto(file);
      setPreviewPhoto(dataUrl);
    } catch (err) {
      setPhotoError(
        err instanceof Error ? err.message : 'Unable to process this photo.'
      );
    }
  };

  const handleCreateEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewPhoto) {
      setPhotoError('Please attach a progress photo first.');
      return;
    }

    onAddEntry(specimen.id, {
      capturedAt: capturedAt || new Date().toISOString().slice(0, 10),
      photoDataUrl: previewPhoto,
      note: note.trim(),
      heightLabel: heightLabel.trim() || undefined,
      stage,
      healthStatus: entryHealth,
    });

    setPreviewPhoto(null);
    setNote('');
    setHeightLabel('');
    setCapturedAt(new Date().toISOString().slice(0, 10));
    setIsAdding(false);
    setPhotoError(null);
  };

  const startEditing = (entry: GrowthLogEntry) => {
    setEditingEntryId(entry.id);
    setEditDate(toDateInputValue(entry.capturedAt));
    setEditNote(entry.note);
    setEditHeight(entry.heightLabel ?? '');
    setEditStage(entry.stage ?? 'Vegetative');
    setEditHealth(entry.healthStatus ?? specimen.diagnosis.healthStatus);
  };

  const saveEdit = (entryId: string) => {
    onUpdateEntry(specimen.id, entryId, {
      capturedAt: editDate,
      note: editNote.trim(),
      heightLabel: editHeight.trim() || undefined,
      stage: editStage,
      healthStatus: editHealth,
    });
    setEditingEntryId(null);
  };

  return (
    <section
      id="visual-growth-log"
      className="rounded-xl border border-[#22312B] bg-[#111916] divide-y divide-[#22312B]"
    >
      {/* Header */}
      <div className="p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#8FA399]">
            <span>Visual Growth Log</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-[#D2DDD7]">
              {entries.length}{' '}
              {entries.length === 1 ? 'progress photo' : 'progress photos'}
            </span>
          </div>
          <h2 className="font-display text-xl font-semibold text-[#ECF2EF]">
            Development Timeline
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {specimen.isSaved && entries.length >= 1 && (
            <button
              type="button"
              onClick={() => setCompareMode((prev) => !prev)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                compareMode
                  ? 'bg-[#1A2923] border-emerald-500/40 text-emerald-300'
                  : 'bg-[#16201C] border-[#2A3B34] text-[#D2DDD7] hover:text-[#ECF2EF]'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>{compareMode ? 'Hide Comparison' : 'Compare Over Time'}</span>
            </button>
          )}

          {specimen.isSaved && entries.length >= 2 && (
            <button
              type="button"
              onClick={() =>
                setSortOrder((prev) =>
                  prev === 'newest' ? 'oldest' : 'newest'
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#16201C] border border-[#2A3B34] text-xs font-medium text-[#A3B5AC] hover:text-[#ECF2EF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}</span>
            </button>
          )}

          {specimen.isSaved ? (
            <button
              type="button"
              onClick={() => {
                setIsAdding((prev) => !prev);
                setPhotoError(null);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#06120D] text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isAdding ? (
                <>
                  <X className="w-4 h-4" />
                  <span>Close Form</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Add Progress Photo</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onSaveSpecimenFirst(specimen);
                setIsAdding(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#06120D] text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Bookmark className="w-4 h-4" />
              <span>Save Plant &amp; Start Log</span>
            </button>
          )}
        </div>
      </div>

      {/* Unsaved Notice */}
      {!specimen.isSaved && (
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0E1512]">
          <p className="text-sm text-[#A3B5AC] leading-relaxed max-w-[62ch]">
            Save this specimen to your local garden collection to attach
            date-stamped progress photos, record height or growth stages, and
            compare foliage recovery over time.
          </p>
        </div>
      )}

      {/* Add Progress Entry Form */}
      {specimen.isSaved && isAdding && (
        <form
          onSubmit={handleCreateEntry}
          className="p-6 bg-[#0E1512] space-y-5"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => void handleSelectPhoto(e)}
            className="hidden"
            aria-label="Choose progress photo"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => void handleSelectPhoto(e)}
            className="hidden"
            aria-label="Capture progress photo with camera"
          />

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            {/* Photo Drop / Preview */}
            <div className="md:col-span-5 space-y-3">
              <div className="aspect-[4/3] w-full rounded-xl border border-dashed border-[#2B3E36] bg-[#0A0F0D] overflow-hidden flex flex-col items-center justify-center p-4 text-center">
                {previewPhoto ? (
                  <div className="relative w-full h-full">
                    <img
                      src={previewPhoto}
                      alt="Progress snapshot preview"
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setPreviewPhoto(null)}
                      aria-label="Clear selected photo"
                      className="absolute top-2 right-2 p-1.5 rounded-md bg-[#0A0F0D]/80 text-[#ECF2EF] hover:text-rose-300 border border-[#22312B] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-[#8FA399]">
                      Attach a current photo of this plant
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#16201C] hover:bg-[#1E2C27] border border-[#2A3B34] text-xs font-medium text-[#ECF2EF] cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Choose Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#16201C] hover:bg-[#1E2C27] border border-[#2A3B34] text-xs font-medium text-[#ECF2EF] cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Camera</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Metadata & Observation Fields */}
            <div className="md:col-span-7 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div>
                  <label
                    htmlFor="growth-date"
                    className="block text-xs font-medium text-[#8FA399] mb-1.5"
                  >
                    Photo Date
                  </label>
                  <input
                    id="growth-date"
                    type="date"
                    required
                    value={capturedAt}
                    onChange={(e) => setCapturedAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0A0F0D] border border-[#22312B] font-mono tabular-nums text-xs text-[#ECF2EF] focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label
                    htmlFor="growth-stage"
                    className="block text-xs font-medium text-[#8FA399] mb-1.5"
                  >
                    Growth Stage
                  </label>
                  <select
                    id="growth-stage"
                    value={stage}
                    onChange={(e) => setStage(e.target.value as GrowthStage)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0A0F0D] border border-[#22312B] text-xs text-[#ECF2EF] focus:outline-none focus:border-emerald-400"
                  >
                    {GROWTH_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="growth-health"
                    className="block text-xs font-medium text-[#8FA399] mb-1.5"
                  >
                    Health Status
                  </label>
                  <select
                    id="growth-health"
                    value={entryHealth}
                    onChange={(e) =>
                      setEntryHealth(e.target.value as HealthStatus)
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#0A0F0D] border border-[#22312B] text-xs text-[#ECF2EF] focus:outline-none focus:border-emerald-400"
                  >
                    {HEALTH_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="growth-height"
                    className="block text-xs font-medium text-[#8FA399] mb-1.5"
                  >
                    Height (optional)
                  </label>
                  <input
                    id="growth-height"
                    type="text"
                    value={heightLabel}
                    onChange={(e) => setHeightLabel(e.target.value)}
                    placeholder="e.g., 38 cm"
                    className="w-full px-3 py-2 rounded-lg bg-[#0A0F0D] border border-[#22312B] font-mono tabular-nums text-xs text-[#ECF2EF] placeholder:text-[#5B7066] focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="growth-note"
                  className="block text-xs font-medium text-[#8FA399] mb-1.5"
                >
                  Development Note
                </label>
                <textarea
                  id="growth-note"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g., Two new fenestrated leaves unfurled after moving closer to the east window; no new aphids seen."
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0A0F0D] border border-[#22312B] text-sm text-[#ECF2EF] placeholder:text-[#5B7066] focus:outline-none focus:border-emerald-400 resize-none"
                />
              </div>

              {photoError && (
                <div
                  role="alert"
                  className="flex items-center gap-2 text-xs text-rose-300"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{photoError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-[#8FA399] hover:text-[#ECF2EF] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#06120D] text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Entry</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Side-by-Side Comparison View */}
      {specimen.isSaved && compareMode && entries.length >= 1 && (
        <div className="p-6 bg-[#0D1411] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-[#ECF2EF]">
              Side-by-Side Comparison
            </h3>
            {leftSnapshot && rightSnapshot && (
              <span className="font-mono tabular-nums text-xs text-emerald-300">
                {(() => {
                  const diff = daysBetween(
                    leftSnapshot.capturedAt,
                    rightSnapshot.capturedAt
                  );
                  return diff === 0
                    ? 'Same day'
                    : diff > 0
                      ? `+${diff} days elapsed`
                      : `${diff} days`;
                })()}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                label: 'Earlier Snapshot',
                value: activeLeftId,
                onChange: setCompareLeftId,
                snapshot: leftSnapshot,
              },
              {
                label: 'Later Snapshot',
                value: activeRightId,
                onChange: setCompareRightId,
                snapshot: rightSnapshot,
              },
            ].map((slot) => (
              <div
                key={slot.label}
                className="rounded-xl border border-[#22312B] bg-[#111916] overflow-hidden"
              >
                <div className="px-4 py-2.5 border-b border-[#22312B] flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[#8FA399]">
                    {slot.label}
                  </span>
                  <select
                    aria-label={slot.label}
                    value={slot.value}
                    onChange={(e) => slot.onChange(e.target.value)}
                    className="bg-[#0A0F0D] border border-[#22312B] rounded px-2 py-1 text-xs font-mono tabular-nums text-[#ECF2EF] focus:outline-none focus:border-emerald-400"
                  >
                    {chronologicalForCompare.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {formatDisplayDate(opt.capturedAt)}
                        {opt.isBaseline
                          ? ' (Initial Scan)'
                          : opt.stage
                            ? ` · ${opt.stage}`
                            : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {slot.snapshot && (
                  <>
                    <div className="aspect-[4/3] w-full bg-[#0A0F0D]">
                      <ResilientImage
                        src={slot.snapshot.photoDataUrl}
                        alt={`${specimen.identity.commonName} on ${formatDisplayDate(slot.snapshot.capturedAt)}`}
                        fallbackLabel={formatDisplayDate(slot.snapshot.capturedAt)}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#8FA399]">
                        <span className="font-mono tabular-nums text-[#ECF2EF]">
                          {formatDisplayDate(slot.snapshot.capturedAt)}
                        </span>
                        {slot.snapshot.stage && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{slot.snapshot.stage}</span>
                          </>
                        )}
                        {slot.snapshot.heightLabel && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {slot.snapshot.heightLabel}
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-[#B6C5BD] leading-relaxed">
                        {slot.snapshot.note || 'No observation note recorded.'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chronological Growth Entries Grid */}
      {specimen.isSaved && (
        <div className="p-6">
          {sortedEntries.length === 0 ? (
            <div className="py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-12 rounded-lg overflow-hidden border border-[#22312B] shrink-0">
                  <ResilientImage
                    src={specimen.thumbnailDataUrl}
                    alt={`Baseline scan of ${specimen.identity.commonName}`}
                    fallbackLabel="Baseline"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-[#ECF2EF]">
                    Baseline scan recorded on{' '}
                    <span className="font-mono tabular-nums">
                      {formatDisplayDate(baselineDate)}
                    </span>
                  </p>
                  <p className="text-xs text-[#8FA399]">
                    No follow-up progress photos attached yet. Add a snapshot
                    above to begin tracking growth.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {sortedEntries.map((entry) => {
                const dayDelta = daysBetween(baselineDate, entry.capturedAt);
                const isEditing = editingEntryId === entry.id;

                return (
                  <article
                    key={entry.id}
                    className="rounded-xl border border-[#22312B] bg-[#0D1411] overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <div className="aspect-[4/3] w-full bg-[#0A0F0D] border-b border-[#22312B]">
                        <ResilientImage
                          src={entry.photoDataUrl}
                          alt={`${specimen.identity.commonName} progress on ${formatDisplayDate(entry.capturedAt)}`}
                          fallbackLabel={formatDisplayDate(entry.capturedAt)}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {isEditing ? (
                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-2.5">
                            <input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              aria-label="Edit photo date"
                              className="px-2.5 py-1.5 rounded bg-[#0A0F0D] border border-[#22312B] font-mono tabular-nums text-xs text-[#ECF2EF]"
                            />
                            <select
                              value={editStage}
                              onChange={(e) =>
                                setEditStage(e.target.value as GrowthStage)
                              }
                              aria-label="Edit growth stage"
                              className="px-2.5 py-1.5 rounded bg-[#0A0F0D] border border-[#22312B] text-xs text-[#ECF2EF]"
                            >
                              {GROWTH_STAGES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                            <select
                              value={editHealth}
                              onChange={(e) =>
                                setEditHealth(e.target.value as HealthStatus)
                              }
                              aria-label="Edit health status"
                              className="px-2.5 py-1.5 rounded bg-[#0A0F0D] border border-[#22312B] text-xs text-[#ECF2EF]"
                            >
                              {HEALTH_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={editHeight}
                              onChange={(e) => setEditHeight(e.target.value)}
                              placeholder="Height / spread (optional)"
                              className="px-2.5 py-1.5 rounded bg-[#0A0F0D] border border-[#22312B] font-mono tabular-nums text-xs text-[#ECF2EF]"
                            />
                          </div>
                          <textarea
                            rows={2}
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            placeholder="Development note..."
                            className="w-full px-2.5 py-1.5 rounded bg-[#0A0F0D] border border-[#22312B] text-xs text-[#ECF2EF] resize-none"
                          />
                          <div className="flex items-center justify-end gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => setEditingEntryId(null)}
                              className="px-2.5 py-1 text-[#8FA399] hover:text-[#ECF2EF] cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => saveEdit(entry.id)}
                              className="px-3 py-1 rounded bg-emerald-500 text-[#06120D] font-semibold cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#8FA399]">
                            <span className="inline-flex items-center gap-1.5 font-mono tabular-nums text-[#ECF2EF]">
                              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                              {formatDisplayDate(entry.capturedAt)}
                            </span>
                            <span className="font-mono tabular-nums text-xs text-emerald-300">
                              {dayDelta >= 0
                                ? `Day ${dayDelta}`
                                : `${dayDelta}d vs scan`}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#8FA399]">
                            {entry.stage && <span>{entry.stage}</span>}
                            {entry.healthStatus && (
                              <>
                                {entry.stage && <span aria-hidden="true">·</span>}
                                <span
                                  className={
                                    entry.healthStatus === 'healthy'
                                      ? 'text-emerald-400'
                                      : entry.healthStatus === 'critical'
                                        ? 'text-rose-400'
                                        : 'text-amber-400'
                                  }
                                >
                                  {healthStatusText(entry.healthStatus)}
                                </span>
                              </>
                            )}
                            {entry.heightLabel && (
                              <>
                                {(entry.stage || entry.healthStatus) && (
                                  <span aria-hidden="true">·</span>
                                )}
                                <span className="font-mono tabular-nums text-[#D2DDD7]">
                                  {entry.heightLabel}
                                </span>
                              </>
                            )}
                          </div>

                          <p className="text-sm text-[#C3D1CA] leading-relaxed">
                            {entry.note || 'No observation note recorded.'}
                          </p>
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="px-4 py-2.5 border-t border-[#1E2B26] flex items-center justify-between gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => startEditing(entry)}
                          className="inline-flex items-center gap-1 text-[#8FA399] hover:text-[#ECF2EF] cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit</span>
                        </button>

                        {confirmDeleteId === entry.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteEntry(specimen.id, entry.id);
                                setConfirmDeleteId(null);
                              }}
                              className="text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                            >
                              Remove
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-[#8FA399] hover:text-[#ECF2EF] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(entry.id)}
                            className="inline-flex items-center gap-1 text-[#8FA399] hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
