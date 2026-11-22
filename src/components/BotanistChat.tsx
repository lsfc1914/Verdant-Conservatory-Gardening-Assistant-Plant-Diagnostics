import React, { useEffect, useRef, useState } from 'react';
import {
  Send,
  Paperclip,
  X,
  Trash2,
  Loader2,
  Sprout,
  AlertCircle,
} from 'lucide-react';
import { ChatMessage, PlantSpecimen } from '../types/plant';
import { ProcessedImagePayload, processImageFile } from '../utils/imageUtils';
import { MarkdownProse } from './MarkdownProse';
import { ResilientImage } from './ResilientImage';

interface BotanistChatProps {
  threadKey: string;
  messages: ChatMessage[];
  activePlant: PlantSpecimen | null;
  availablePlants: PlantSpecimen[];
  onSelectThread: (threadKey: string) => void;
  onSendMessage: (
    threadKey: string,
    text: string,
    attachment?: ProcessedImagePayload
  ) => Promise<void>;
  onClearThread: (threadKey: string) => void;
  isSending: boolean;
  errorMessage: string | null;
  onClearError: () => void;
  compact?: boolean;
}

export function BotanistChat({
  threadKey,
  messages,
  activePlant,
  availablePlants,
  onSelectThread,
  onSendMessage,
  onClearThread,
  isSending,
  errorMessage,
  onClearError,
  compact = false,
}: BotanistChatProps) {
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<ProcessedImagePayload | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isSending]);

  useEffect(() => {
    setConfirmClear(false);
  }, [threadKey]);

  const starterPrompts = activePlant
    ? [
        `Build a 2-week recovery & watering routine for this ${activePlant.identity.commonName}`,
        'What organic soil mix and pot drainage works best?',
        'How should I adjust care between winter and summer?',
        'How do I propagate a healthy cutting from this plant?',
      ]
    : [
        'Why are the lower leaves on my indoor plant turning yellow?',
        'What is the safest organic spray for aphids and spider mites?',
        'How do I improve clay garden soil for perennial beds?',
        'Which houseplants thrive in low light north-facing rooms?',
      ];

  const handleAttachChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAttachError(null);
    try {
      const processed = await processImageFile(file);
      setAttachment(processed);
    } catch (err) {
      setAttachError(
        err instanceof Error ? err.message : 'Unable to attach image.'
      );
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isSending) return;
    const trimmed = draft.trim();
    if (!trimmed && !attachment) return;

    const currentText = trimmed;
    const currentAttachment = attachment ?? undefined;
    setDraft('');
    setAttachment(null);
    setAttachError(null);
    onClearError();

    await onSendMessage(threadKey, currentText, currentAttachment);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <section
      className={`rounded-xl border border-[#22312B] bg-[#111916] flex flex-col overflow-hidden ${
        compact ? 'h-[680px]' : 'h-[calc(100vh-11rem)] min-h-[540px]'
      }`}
    >
      {/* Chat Context Header */}
      <div className="px-5 py-3.5 border-b border-[#22312B] flex flex-wrap items-center justify-between gap-3 bg-[#0E1512]">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-emerald-400">
            Botanist Consultation
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <select
              aria-label="Select plant conversation context"
              value={threadKey}
              onChange={(e) => onSelectThread(e.target.value)}
              className="w-full max-w-[260px] bg-transparent text-sm font-semibold text-[#ECF2EF] focus:outline-none cursor-pointer truncate"
            >
              <option value="general" className="bg-[#111916] text-[#ECF2EF]">
                General Garden Consultation
              </option>
              {availablePlants.map((p) => (
                <option
                  key={p.id}
                  value={p.id}
                  className="bg-[#111916] text-[#ECF2EF]"
                >
                  {p.identity.commonName} ({p.identity.scientificName})
                </option>
              ))}
            </select>
          </div>
        </div>

        {messages.length > 0 && (
          <div className="shrink-0">
            {confirmClear ? (
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    onClearThread(threadKey);
                    setConfirmClear(false);
                  }}
                  className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 font-medium cursor-pointer"
                >
                  Confirm clear
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="px-2 py-1 text-[#8FA399] hover:text-[#ECF2EF] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-[#8FA399] hover:text-[#ECF2EF] hover:bg-[#16201C] transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Active Specimen Context Strip */}
      {activePlant && (
        <div className="px-5 py-2.5 border-b border-[#1E2B26] bg-[#131C18] flex items-center gap-3">
          <div className="w-9 h-9 rounded-md overflow-hidden border border-[#22312B] shrink-0">
            <ResilientImage
              src={activePlant.thumbnailDataUrl}
              alt={activePlant.identity.commonName}
              fallbackLabel={activePlant.identity.commonName}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-[#ECF2EF] truncate">
              {activePlant.identity.commonName} ·{' '}
              <span className="italic text-[#8FA399]">
                {activePlant.identity.scientificName}
              </span>
            </p>
            <p className="text-xs text-[#8FA399] truncate">
              {activePlant.diagnosis.statusHeadline}
            </p>
          </div>
        </div>
      )}

      {/* Scrollable Message Thread */}
      <div className="flex-1 overflow-y-auto conservatory-scroll p-5 space-y-5">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-between gap-6 py-2">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-[#16201C] border border-[#22312B] flex items-center justify-center text-emerald-400">
                <Sprout className="w-4 h-4" />
              </div>
              <h3 className="font-display text-lg font-semibold text-[#ECF2EF]">
                {activePlant
                  ? `Ask about your ${activePlant.identity.commonName}`
                  : 'Ask the Head Botanist'}
              </h3>
              <p className="text-sm text-[#8FA399] leading-relaxed">
                {activePlant
                  ? 'Your specimen profile and pest diagnosis are already loaded into this thread. Ask follow-up questions or attach a fresh leaf photo.'
                  : 'Get help diagnosing indoor houseplants, outdoor perennials, soil chemistry, pruning schedules, or organic pest treatments.'}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-[#8FA399]">
                Suggested questions
              </p>
              <div className="grid grid-cols-1 gap-2">
                {starterPrompts.map((promptText) => (
                  <button
                    key={promptText}
                    type="button"
                    disabled={isSending}
                    onClick={() => void onSendMessage(threadKey, promptText)}
                    className="text-left px-3.5 py-2.5 rounded-lg border border-[#22312B] bg-[#0D1411] hover:border-emerald-500/40 hover:bg-[#141E1A] text-xs sm:text-sm text-[#D2DDD7] transition-colors cursor-pointer"
                  >
                    {promptText}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[90%] rounded-xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-[#192A23] border border-emerald-500/30 text-[#ECF2EF]'
                      : 'bg-[#0D1311] border border-[#22312B] text-[#D2DDD7]'
                  }`}
                >
                  {msg.imagePreviewUrl && (
                    <div className="mb-2.5 w-44 aspect-[4/3] rounded-lg overflow-hidden border border-[#22312B]">
                      <ResilientImage
                        src={msg.imagePreviewUrl}
                        alt="Follow-up plant photo"
                        fallbackLabel="Attached Photo"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  {msg.role === 'user' ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.text}
                    </p>
                  ) : (
                    <MarkdownProse content={msg.text} />
                  )}
                </div>
                <span className="mt-1 text-[11px] font-mono tabular-nums text-[#6B7F75]">
                  {msg.role === 'user' ? 'You' : 'Botanist'} ·{' '}
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}

            {isSending && (
              <div className="flex items-start">
                <div className="rounded-xl px-4 py-3 bg-[#0D1311] border border-[#22312B] flex items-center gap-2.5 text-sm text-[#8FA399]">
                  <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                  <span>Reviewing botanical notes...</span>
                </div>
              </div>
            )}
            <div ref={scrollEndRef} />
          </>
        )}
      </div>

      {/* Inline Chat Error */}
      {(errorMessage || attachError) && (
        <div className="mx-4 mb-2 px-3.5 py-2.5 rounded-lg border border-rose-500/40 bg-rose-950/30 flex items-center gap-2 text-xs text-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="flex-1">{attachError || errorMessage}</span>
          <button
            type="button"
            onClick={() => {
              setAttachError(null);
              onClearError();
            }}
            className="text-rose-300 hover:text-rose-100 underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="p-3.5 border-t border-[#22312B] bg-[#0E1512] space-y-2.5"
      >
        {attachment && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#16201C] border border-[#22312B]">
            <img
              src={attachment.thumbnailDataUrl}
              alt="Follow-up attachment preview"
              className="w-10 h-10 rounded object-cover"
            />
            <span className="text-xs text-[#C3D1CA] flex-1">
              Follow-up leaf photo attached
            </span>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              aria-label="Remove attached image"
              className="p-1 text-[#8FA399] hover:text-[#ECF2EF] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAttachChange}
          className="hidden"
          aria-label="Attach follow-up plant photo"
        />

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
            title="Attach follow-up photo"
            aria-label="Attach follow-up photo"
            className="h-10 w-10 rounded-lg border border-[#22312B] bg-[#111916] hover:bg-[#192520] text-[#8FA399] hover:text-emerald-300 flex items-center justify-center shrink-0 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <textarea
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              activePlant
                ? `Ask about ${activePlant.identity.commonName}...`
                : 'Ask a gardening or pest question...'
            }
            className="flex-1 min-h-[40px] max-h-28 px-3.5 py-2 rounded-lg bg-[#0A0F0D] border border-[#22312B] text-sm text-[#ECF2EF] placeholder:text-[#5B7066] focus:outline-none focus:border-emerald-400 resize-none"
          />

          <button
            type="submit"
            disabled={isSending || (!draft.trim() && !attachment)}
            aria-label="Send message"
            className="h-10 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-[#1C2A24] disabled:text-[#5B7066] text-[#06120D] text-sm font-semibold inline-flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </form>
    </section>
  );
}
