import { Camera } from 'lucide-react';

export type AppView = 'identify' | 'garden' | 'chat';

interface TopBarProps {
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  savedCount: number;
  onTriggerScan: () => void;
}

export function TopBar({
  activeView,
  onSelectView,
  savedCount,
  onTriggerScan,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#22312B] bg-[#0A0F0D]/95 backdrop-blur-sm">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={() => onSelectView('identify')}
          className="font-display text-lg sm:text-xl font-semibold tracking-tight text-[#ECF2EF] whitespace-nowrap shrink-0 text-left hover:text-emerald-300 transition-colors cursor-pointer"
        >
          Verdant Conservatory
        </button>

        <nav
          aria-label="Primary"
          className="hidden md:flex items-center gap-7 text-sm font-medium"
        >
          <button
            type="button"
            onClick={() => onSelectView('identify')}
            className={`py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
              activeView === 'identify'
                ? 'border-emerald-400 text-[#ECF2EF]'
                : 'border-transparent text-[#8FA399] hover:text-[#ECF2EF]'
            }`}
          >
            Identify &amp; Diagnose
          </button>
          <button
            type="button"
            onClick={() => onSelectView('garden')}
            className={`py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
              activeView === 'garden'
                ? 'border-emerald-400 text-[#ECF2EF]'
                : 'border-transparent text-[#8FA399] hover:text-[#ECF2EF]'
            }`}
          >
            Saved Garden{' '}
            <span className="font-mono tabular-nums text-xs text-[#8FA399] ml-1">
              ({savedCount})
            </span>
          </button>
          <button
            type="button"
            onClick={() => onSelectView('chat')}
            className={`py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
              activeView === 'chat'
                ? 'border-emerald-400 text-[#ECF2EF]'
                : 'border-transparent text-[#8FA399] hover:text-[#ECF2EF]'
            }`}
          >
            Botanist Chat
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onTriggerScan}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#06120D] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          >
            <Camera className="w-4 h-4 shrink-0" />
            <span>Scan Plant</span>
          </button>
        </div>
      </div>

      {/* Compact mobile navigation row */}
      <nav
        aria-label="Mobile navigation"
        className="flex md:hidden items-center justify-around border-t border-[#1A2621] px-2 py-1.5 text-xs font-medium"
      >
        <button
          type="button"
          onClick={() => onSelectView('identify')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
            activeView === 'identify'
              ? 'bg-[#16201C] text-emerald-300'
              : 'text-[#8FA399]'
          }`}
        >
          Identify
        </button>
        <button
          type="button"
          onClick={() => onSelectView('garden')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
            activeView === 'garden'
              ? 'bg-[#16201C] text-emerald-300'
              : 'text-[#8FA399]'
          }`}
        >
          Garden ({savedCount})
        </button>
        <button
          type="button"
          onClick={() => onSelectView('chat')}
          className={`px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
            activeView === 'chat'
              ? 'bg-[#16201C] text-emerald-300'
              : 'text-[#8FA399]'
          }`}
        >
          Botanist Chat
        </button>
      </nav>
    </header>
  );
}
