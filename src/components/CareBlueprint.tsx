import { useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  MessageSquare,
  RotateCcw,
  Sun,
  Droplets,
  Thermometer,
  FlaskConical,
  Scissors,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CalendarRange,
  PawPrint,
  Download,
  Check,
} from 'lucide-react';
import { GrowthLogEntry, HealthStatus, PlantSpecimen } from '../types/plant';
import { ResilientImage } from './ResilientImage';
import { GrowthLogSection } from './GrowthLogSection';
import { GrowthTrendsChart } from './GrowthTrendsChart';

interface CareBlueprintProps {
  specimen: PlantSpecimen;
  onToggleSave: (specimen: PlantSpecimen) => void;
  onUpdateNotes: (
    specimenId: string,
    updates: { locationLabel?: string; userNotes?: string }
  ) => void;
  onAddGrowthEntry: (
    specimenId: string,
    entry: Omit<GrowthLogEntry, 'id'>
  ) => void;
  onUpdateGrowthEntry: (
    specimenId: string,
    entryId: string,
    updates: Partial<Omit<GrowthLogEntry, 'id' | 'photoDataUrl'>>
  ) => void;
  onDeleteGrowthEntry: (specimenId: string, entryId: string) => void;
  onExportPlant: (specimen: PlantSpecimen) => void;
  onOpenChat: (specimenId: string) => void;
  onNewScan: () => void;
}

function getEnvironmentLabel(env: PlantSpecimen['identity']['environment']): string {
  if (env === 'indoor') return 'Indoor Houseplant';
  if (env === 'outdoor') return 'Outdoor Garden';
  return 'Indoor & Outdoor';
}

function getHealthBadgeInfo(status: HealthStatus): {
  label: string;
  textClass: string;
  surfaceClass: string;
  Icon: typeof ShieldCheck;
} {
  if (status === 'healthy') {
    return {
      label: 'Healthy Foliage',
      textClass: 'text-emerald-300',
      surfaceClass: 'border-emerald-500/30 bg-emerald-950/25',
      Icon: ShieldCheck,
    };
  }
  if (status === 'critical') {
    return {
      label: 'Treatment Required',
      textClass: 'text-rose-300',
      surfaceClass: 'border-rose-500/35 bg-rose-950/25',
      Icon: ShieldAlert,
    };
  }
  return {
    label: 'Needs Attention',
    textClass: 'text-amber-300',
    surfaceClass: 'border-amber-500/35 bg-amber-950/25',
    Icon: AlertTriangle,
  };
}

export function CareBlueprint({
  specimen,
  onToggleSave,
  onUpdateNotes,
  onAddGrowthEntry,
  onUpdateGrowthEntry,
  onDeleteGrowthEntry,
  onExportPlant,
  onOpenChat,
  onNewScan,
}: CareBlueprintProps) {
  const { identity, diagnosis, careGuide } = specimen;
  const healthMeta = getHealthBadgeInfo(diagnosis.healthStatus);
  const HealthIcon = healthMeta.Icon;
  const growthCount = specimen.growthLog?.length ?? 0;
  const [exportedFeedback, setExportedFeedback] = useState(false);
  const [openAddSignal, setOpenAddSignal] = useState(0);

  const handleRequestAddLog = () => {
    setOpenAddSignal((prev) => prev + 1);
    document
      .getElementById('visual-growth-log')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <article className="space-y-6">
      {/* Top Specimen Identity Panel */}
      <div className="rounded-xl border border-[#22312B] bg-[#111916] overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-12 items-stretch">
          <div className="md:col-span-5 relative min-h-[240px] bg-[#0A0F0D] border-b md:border-b-0 md:border-r border-[#22312B]">
            <ResilientImage
              src={specimen.thumbnailDataUrl}
              alt={`${identity.commonName} (${identity.scientificName})`}
              fallbackLabel={identity.commonName}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="md:col-span-7 p-6 flex flex-col justify-between gap-5">
            <div className="space-y-3">
              {/* Unboxed typographic metadata */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#8FA399]">
                <span>{getEnvironmentLabel(identity.environment)}</span>
                <span aria-hidden="true">·</span>
                <span>{identity.family}</span>
                <span aria-hidden="true">·</span>
                <span>{identity.confidence} match</span>
                <span aria-hidden="true">·</span>
                <span>Native: {identity.nativeRegion}</span>
              </div>

              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#ECF2EF] text-balance">
                  {identity.commonName}
                </h1>
                <p className="font-display italic text-base text-[#A3B5AC] mt-0.5">
                  {identity.scientificName}
                </p>
              </div>

              <p className="text-sm text-[#C3D1CA] leading-relaxed">
                {identity.summary}
              </p>
            </div>

            {/* Primary Actions */}
            <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-[#1E2B26]">
              <button
                type="button"
                onClick={() => onToggleSave(specimen)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  specimen.isSaved
                    ? 'bg-[#1A2923] border border-emerald-500/40 text-emerald-300 hover:bg-[#20332B]'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-[#06120D]'
                }`}
              >
                {specimen.isSaved ? (
                  <>
                    <BookmarkCheck className="w-4 h-4" />
                    <span>Saved in Garden</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4" />
                    <span>Save to Garden</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => onOpenChat(specimen.id)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#16201C] hover:bg-[#1E2C27] border border-[#2A3B34] text-[#ECF2EF] text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>Ask Botanist</span>
              </button>

              <button
                type="button"
                onClick={onNewScan}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[#8FA399] hover:text-[#ECF2EF] hover:bg-[#16201C] text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>New Scan</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onExportPlant(specimen);
                  setExportedFeedback(true);
                  setTimeout(() => setExportedFeedback(false), 2500);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[#8FA399] hover:text-[#ECF2EF] hover:bg-[#16201C] text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {exportedFeedback ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Exported</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Export JSON</span>
                  </>
                )}
              </button>

              <a
                href="#visual-growth-log"
                className="ml-auto text-xs font-medium text-[#8FA399] hover:text-emerald-300 transition-colors whitespace-nowrap shrink-0"
              >
                Growth Log{' '}
                <span className="font-mono tabular-nums">({growthCount})</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Pest & Disease Triage Panel */}
      <section className={`rounded-xl border p-6 space-y-5 ${healthMeta.surfaceClass}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide">
              <HealthIcon className={`w-4 h-4 ${healthMeta.textClass}`} />
              <span className={healthMeta.textClass}>{healthMeta.label}</span>
            </div>
            <h2 className="font-display text-xl font-semibold text-[#ECF2EF]">
              {diagnosis.statusHeadline}
            </h2>
          </div>

          {diagnosis.detectedIssues.length > 0 && (
            <div className="text-xs text-[#C3D1CA]">
              <span className="text-[#8FA399] mr-1.5">Detected:</span>
              <span>{diagnosis.detectedIssues.join(' · ')}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-3 border-t border-white/10">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-[#A3B5AC]">
              Visual Symptoms Observed
            </h3>
            <ul className="space-y-1.5 text-sm text-[#D2DDD7]">
              {diagnosis.symptomsObserved.length > 0 ? (
                diagnosis.symptomsObserved.map((item, idx) => (
                  <li key={idx} className="leading-relaxed">
                    • {item}
                  </li>
                ))
              ) : (
                <li className="text-[#8FA399]">
                  No lesions, chlorosis, or pest clusters visible.
                </li>
              )}
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-[#A3B5AC]">
              Immediate Action Plan
            </h3>
            <ol className="space-y-1.5 text-sm text-[#ECF2EF] list-decimal list-inside">
              {diagnosis.immediateActions.map((step, idx) => (
                <li key={idx} className="leading-relaxed">
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-[#A3B5AC]">
              Long-Term Prevention
            </h3>
            <ul className="space-y-1.5 text-sm text-[#D2DDD7]">
              {diagnosis.preventionTips.map((tip, idx) => (
                <li key={idx} className="leading-relaxed">
                  • {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Detailed Care Blueprint Grid */}
      <section className="rounded-xl border border-[#22312B] bg-[#111916] divide-y divide-[#22312B]">
        <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-semibold text-[#ECF2EF]">
            Care Blueprint
          </h2>
          <div className="flex items-center gap-2 text-xs text-[#8FA399]">
            <PawPrint className="w-3.5 h-3.5" />
            <span>
              {careGuide.toxicity.petSafe
                ? 'Non-toxic to pets'
                : 'Caution: toxic if ingested by pets'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#22312B]">
          {/* Light */}
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#ECF2EF]">
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Light Exposure</span>
              </div>
              <span className="font-mono tabular-nums text-xs text-emerald-300">
                {careGuide.light.dailyHours}
              </span>
            </div>
            <p className="text-sm font-medium text-[#D2DDD7]">
              {careGuide.light.level}
            </p>
            <p className="text-sm text-[#8FA399] leading-relaxed">
              {careGuide.light.placementTip}
            </p>
          </div>

          {/* Watering */}
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#ECF2EF]">
                <Droplets className="w-4 h-4 text-sky-400" />
                <span>Watering Schedule</span>
              </div>
              <span className="font-mono tabular-nums text-xs text-emerald-300">
                {careGuide.watering.frequencyDays}
              </span>
            </div>
            <p className="text-sm font-medium text-[#D2DDD7]">
              {careGuide.watering.cadenceLabel}
            </p>
            <p className="text-sm text-[#8FA399] leading-relaxed">
              {careGuide.watering.method} Check moisture: {careGuide.watering.moistureCheck}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#22312B]">
          {/* Soil & pH */}
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#ECF2EF]">
                <FlaskConical className="w-4 h-4 text-emerald-400" />
                <span>Soil &amp; Substrate</span>
              </div>
              <span className="font-mono tabular-nums text-xs text-emerald-300">
                {careGuide.soilAndPh.phRange}
              </span>
            </div>
            <p className="text-sm font-medium text-[#D2DDD7]">
              {careGuide.soilAndPh.mix}
            </p>
            <p className="text-sm text-[#8FA399] leading-relaxed">
              {careGuide.soilAndPh.drainage}
            </p>
          </div>

          {/* Climate */}
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#ECF2EF]">
                <Thermometer className="w-4 h-4 text-amber-400" />
                <span>Temperature &amp; Humidity</span>
              </div>
              <span className="font-mono tabular-nums text-xs text-emerald-300">
                {careGuide.climate.humidityRange}
              </span>
            </div>
            <p className="font-mono tabular-nums text-sm font-medium text-[#D2DDD7]">
              {careGuide.climate.tempRangeF} · {careGuide.climate.tempRangeC}
            </p>
            <p className="text-sm text-[#8FA399] leading-relaxed">
              Fertilizing: {careGuide.nutrition.schedule}. {careGuide.nutrition.npkGuidance}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#22312B]">
          {/* Pruning & Propagation */}
          <div className="p-6 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#ECF2EF]">
              <Scissors className="w-4 h-4 text-emerald-400" />
              <span>Pruning, Repotting &amp; Propagation</span>
            </div>
            <div className="space-y-2 text-sm text-[#A3B5AC] leading-relaxed">
              <p>
                <span className="text-[#ECF2EF] font-medium">Pruning: </span>
                {careGuide.maintenance.pruning}
              </p>
              <p>
                <span className="text-[#ECF2EF] font-medium">Root care: </span>
                {careGuide.maintenance.repottingOrMulching}
              </p>
              <p>
                <span className="text-[#ECF2EF] font-medium">Propagation: </span>
                {careGuide.maintenance.propagation}
              </p>
            </div>
          </div>

          {/* Seasonal Care & Toxicity */}
          <div className="p-6 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#ECF2EF]">
              <CalendarRange className="w-4 h-4 text-emerald-400" />
              <span>Seasonal Rhythm &amp; Safety</span>
            </div>
            <div className="space-y-2 text-sm text-[#A3B5AC] leading-relaxed">
              <p>
                <span className="text-[#ECF2EF] font-medium">Spring / Summer: </span>
                {careGuide.seasonalCare.springSummer}
              </p>
              <p>
                <span className="text-[#ECF2EF] font-medium">Fall / Winter: </span>
                {careGuide.seasonalCare.fallWinter}
              </p>
              <p>
                <span className="text-[#ECF2EF] font-medium">Toxicity: </span>
                {careGuide.toxicity.notes}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Personal Local Log Notes */}
      <section className="rounded-xl border border-[#22312B] bg-[#111916] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-[#ECF2EF]">
            Personal Garden Log
          </h2>
          <span className="text-xs text-[#8FA399]">
            {specimen.isSaved
              ? 'Changes saved locally'
              : 'Save plant to keep notes across sessions'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <label
              htmlFor="specimen-location"
              className="block text-xs font-medium text-[#8FA399] mb-1.5"
            >
              Placement / Garden Bed
            </label>
            <input
              id="specimen-location"
              type="text"
              value={specimen.locationLabel}
              onChange={(e) =>
                onUpdateNotes(specimen.id, { locationLabel: e.target.value })
              }
              placeholder="e.g., East Window or Raised Bed 2"
              className="w-full px-3.5 py-2 rounded-lg bg-[#0A0F0D] border border-[#22312B] text-sm text-[#ECF2EF] placeholder:text-[#5B7066] focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="specimen-notes"
              className="block text-xs font-medium text-[#8FA399] mb-1.5"
            >
              Care Observations &amp; Watering Notes
            </label>
            <input
              id="specimen-notes"
              type="text"
              value={specimen.userNotes}
              onChange={(e) =>
                onUpdateNotes(specimen.id, { userNotes: e.target.value })
              }
              placeholder="e.g., Treated with neem oil on Sunday; repotted into terracotta"
              className="w-full px-3.5 py-2 rounded-lg bg-[#0A0F0D] border border-[#22312B] text-sm text-[#ECF2EF] placeholder:text-[#5B7066] focus:outline-none focus:border-emerald-400"
            />
          </div>
        </div>
      </section>

      <GrowthTrendsChart
        specimen={specimen}
        onRequestAddLog={handleRequestAddLog}
      />

      <GrowthLogSection
        specimen={specimen}
        onSaveSpecimenFirst={(s) => {
          if (!s.isSaved) onToggleSave(s);
        }}
        onAddEntry={onAddGrowthEntry}
        onUpdateEntry={onUpdateGrowthEntry}
        onDeleteEntry={onDeleteGrowthEntry}
        openAddSignal={openAddSignal}
      />
    </article>
  );
}
