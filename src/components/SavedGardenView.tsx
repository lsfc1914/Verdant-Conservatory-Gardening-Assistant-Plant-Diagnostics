import { useMemo, useState } from 'react';
import {
  Search,
  MessageSquare,
  Trash2,
  Camera,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Download,
  Check,
} from 'lucide-react';
import { PlantSpecimen } from '../types/plant';
import { ResilientImage } from './ResilientImage';

interface SavedGardenViewProps {
  plants: PlantSpecimen[];
  onSelectPlant: (plant: PlantSpecimen) => void;
  onOpenPlantChat: (plantId: string) => void;
  onDeletePlant: (plantId: string) => void;
  onExportBackup: () => void;
  onStartScan: () => void;
}

type GardenFilter = 'all' | 'indoor' | 'outdoor' | 'attention';

export function SavedGardenView({
  plants,
  onSelectPlant,
  onOpenPlantChat,
  onDeletePlant,
  onExportBackup,
  onStartScan,
}: SavedGardenViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<GardenFilter>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [exportedFeedback, setExportedFeedback] = useState(false);

  const filteredPlants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return plants.filter((p) => {
      if (filter === 'indoor' && p.identity.environment === 'outdoor') return false;
      if (filter === 'outdoor' && p.identity.environment === 'indoor') return false;
      if (filter === 'attention' && p.diagnosis.healthStatus === 'healthy') {
        return false;
      }

      if (!q) return true;
      return (
        p.identity.commonName.toLowerCase().includes(q) ||
        p.identity.scientificName.toLowerCase().includes(q) ||
        p.locationLabel.toLowerCase().includes(q) ||
        p.userNotes.toLowerCase().includes(q)
      );
    });
  }, [plants, searchQuery, filter]);

  if (plants.length === 0) {
    return (
      <section className="rounded-xl border border-[#22312B] bg-[#111916] overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-12 items-stretch">
          <div className="md:col-span-7 p-8 sm:p-10 flex flex-col justify-center space-y-4">
            <p className="text-xs font-medium text-emerald-400">
              Local Botanical Collection
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#ECF2EF] text-balance">
              Your saved garden log is empty.
            </h1>
            <p className="text-sm text-[#A3B5AC] leading-relaxed max-w-[52ch]">
              Identify an indoor houseplant or outdoor garden plant from a photo, then
              click Save to Garden to keep its care blueprint, pest treatment plan,
              and botanist chat history stored locally in this browser.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onStartScan}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#06120D] text-sm font-semibold transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Scan Your First Plant</span>
              </button>
            </div>
          </div>
          <div className="md:col-span-5 min-h-[220px] border-t md:border-t-0 md:border-l border-[#22312B]">
            <ResilientImage
              src="/src/assets/images/specimen_olive_tree_preview_1795385184317.jpg"
              alt="Potted olive tree inside a glasshouse conservatory"
              fallbackLabel="Conservatory Collection"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#ECF2EF]">
            Saved Garden Collection
          </h1>
          <p className="text-sm text-[#8FA399]">
            <span className="font-mono tabular-nums text-[#D2DDD7]">
              {plants.length}
            </span>{' '}
            {plants.length === 1 ? 'specimen' : 'specimens'} stored locally with care
            guides &amp; chat threads
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#6B7F75] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search species or bed..."
              aria-label="Search saved plants"
              className="pl-9 pr-3.5 py-2 rounded-lg bg-[#111916] border border-[#22312B] text-sm text-[#ECF2EF] placeholder:text-[#5B7066] focus:outline-none focus:border-emerald-400 w-56"
            />
          </div>

          <div
            role="group"
            aria-label="Filter saved plants"
            className="inline-flex items-center p-1 rounded-lg bg-[#111916] border border-[#22312B]"
          >
            {(
              [
                { value: 'all', label: 'All' },
                { value: 'indoor', label: 'Indoor' },
                { value: 'outdoor', label: 'Outdoor' },
                { value: 'attention', label: 'Needs Care' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilter(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filter === opt.value
                    ? 'bg-[#1D2B25] text-emerald-300'
                    : 'text-[#8FA399] hover:text-[#ECF2EF]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              onExportBackup();
              setExportedFeedback(true);
              setTimeout(() => setExportedFeedback(false), 2500);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#16201C] hover:bg-[#1E2C27] border border-[#2A3B34] text-xs font-medium text-[#ECF2EF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {exportedFeedback ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Backup Exported</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export JSON</span>
              </>
            )}
          </button>
        </div>
      </div>

      {filteredPlants.length === 0 ? (
        <div className="rounded-xl border border-[#22312B] bg-[#111916] p-10 text-center space-y-2">
          <p className="text-base font-medium text-[#ECF2EF]">
            No matching plants found
          </p>
          <p className="text-sm text-[#8FA399]">
            Try clearing your search term or switching the filter above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPlants.map((plant) => {
            const isHealthy = plant.diagnosis.healthStatus === 'healthy';
            const isCritical = plant.diagnosis.healthStatus === 'critical';
            const StatusIcon = isHealthy
              ? ShieldCheck
              : isCritical
                ? ShieldAlert
                : AlertTriangle;
            const statusTextClass = isHealthy
              ? 'text-emerald-400'
              : isCritical
                ? 'text-rose-400'
                : 'text-amber-400';

            return (
              <article
                key={plant.id}
                className="rounded-xl border border-[#22312B] bg-[#111916] overflow-hidden flex flex-col justify-between hover:border-[#344A41] transition-colors"
              >
                <div>
                  <button
                    type="button"
                    onClick={() => onSelectPlant(plant)}
                    className="w-full text-left block group cursor-pointer"
                  >
                    <div className="aspect-[4/3] w-full bg-[#0A0F0D] overflow-hidden border-b border-[#22312B]">
                      <ResilientImage
                        src={plant.thumbnailDataUrl}
                        alt={plant.identity.commonName}
                        fallbackLabel={plant.identity.commonName}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                      />
                    </div>

                    <div className="p-5 space-y-2.5">
                      <div className="flex items-center justify-between gap-2 text-xs text-[#8FA399]">
                        <span className="truncate">
                          {plant.identity.environment === 'both'
                            ? 'Indoor & Outdoor'
                            : plant.identity.environment === 'indoor'
                              ? 'Indoor'
                              : 'Outdoor'}
                          {' · '}
                          <span className="font-mono tabular-nums">
                            {plant.careGuide.watering.frequencyDays}
                          </span>
                          {(plant.growthLog?.length ?? 0) > 0 && (
                            <>
                              {' · '}
                              <span className="font-mono tabular-nums text-[#B6C5BD]">
                                {plant.growthLog?.length}{' '}
                                {plant.growthLog?.length === 1 ? 'log' : 'logs'}
                              </span>
                            </>
                          )}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 shrink-0 font-medium ${statusTextClass}`}
                        >
                          <StatusIcon className="w-3.5 h-3.5" />
                          <span>
                            {isHealthy
                              ? 'Healthy'
                              : isCritical
                                ? 'Treatment'
                                : 'Attention'}
                          </span>
                        </span>
                      </div>

                      <div>
                        <h2 className="font-display text-lg font-semibold text-[#ECF2EF] group-hover:text-emerald-300 transition-colors">
                          {plant.identity.commonName}
                        </h2>
                        <p className="font-display italic text-xs text-[#8FA399]">
                          {plant.identity.scientificName}
                        </p>
                      </div>

                      {(plant.locationLabel || plant.userNotes) && (
                        <p className="text-xs text-[#B6C5BD] line-clamp-2">
                          {plant.locationLabel
                            ? `${plant.locationLabel} — ${plant.userNotes || 'Saved specimen'}`
                            : plant.userNotes}
                        </p>
                      )}
                    </div>
                  </button>
                </div>

                <div className="px-5 py-3 border-t border-[#1E2B26] flex items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => onOpenPlantChat(plant.id)}
                    className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Open Chat</span>
                  </button>

                  {confirmDeleteId === plant.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onDeletePlant(plant.id);
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
                      onClick={() => setConfirmDeleteId(plant.id)}
                      aria-label={`Remove ${plant.identity.commonName}`}
                      className="inline-flex items-center gap-1 text-[#8FA399] hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
