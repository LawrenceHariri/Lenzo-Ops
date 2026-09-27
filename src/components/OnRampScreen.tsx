/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Battery,
  BatteryCharging,
  BatteryLow,
  Compass,
  HelpCircle,
  Loader2,
  Sparkles,
  Star,
} from 'lucide-react';
import { callOnRampCoach } from '../coachApi';
import { formatDisplayDate, today } from '../logic';
import { useOpsHub } from '../store';
import { SaveStateRecord } from '../types';

interface OnRampScreenProps {
  onComplete: () => void;
}

export const OnRampScreen: React.FC<OnRampScreenProps> = ({ onComplete }) => {
  const { tables, serverDate } = useOpsHub();
  const currentDate = today(serverDate);

  const saveStateRows = tables['Save State'] || [];

  // Read onramp_prompt from Coach Config
  const onRampSystemPrompt = useMemo(() => {
    const configRow = (tables['Coach Config'] || []).find(
      (c) => c.Key === 'onramp_prompt'
    );
    if (configRow?.Value && configRow.Value.trim()) {
      return configRow.Value.trim();
    }
    return `You are the Lenzo Ops Hub On-Ramp Coach. The user just completed their morning recall test.
Compare what they thought they were doing with what their saved card actually says.
Provide 2 to 4 crisp, encouraging, grounded lines orienting them for their work today.
Point out the single priority focus, highlight any discrepancies calmly, and set a focused momentum.`;
  }, [tables['Coach Config']]);

  // Find rows from the latest Date that has rows
  const { latestDate, latestRows, daysOld } = useMemo(() => {
    if (saveStateRows.length === 0) {
      return { latestDate: '', latestRows: [], daysOld: 0 };
    }

    // Collect all valid dates
    const dates = Array.from(
      new Set(
        saveStateRows
          .map((r) => (r.Date || '').trim())
          .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
      )
    ).sort((a, b) => b.localeCompare(a));

    if (dates.length === 0) {
      return { latestDate: '', latestRows: [], daysOld: 0 };
    }

    const latest = dates[0];
    const rows = saveStateRows
      .filter((r) => (r.Date || '').trim() === latest)
      .reverse(); // Newest first

    // Calculate days old
    const p1 = latest.split('-').map(Number);
    const p2 = currentDate.split('-').map(Number);
    const d1 = new Date(p1[0], p1[1] - 1, p1[2]);
    const d2 = new Date(p2[0], p2[1] - 1, p2[2]);
    const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));

    return { latestDate: latest, latestRows: rows, daysOld: diffDays };
  }, [saveStateRows, currentDate]);

  // If no save state rows exist at all, skip directly
  if (latestRows.length === 0) {
    onComplete();
    return null;
  }

  // Selected card from the latest date
  const [selectedCard, setSelectedCard] = useState<SaveStateRecord | null>(() => {
    return latestRows.length === 1 ? latestRows[0] : null;
  });

  // Step 1: Recall guess
  const [userGuess, setUserGuess] = useState('');
  const [hasRevealed, setHasRevealed] = useState(false);

  // Gemini Coach Commentary state
  const [coachCommentary, setCoachCommentary] = useState<string | null>(null);
  const [isCoachLoading, setIsCoachLoading] = useState(false);

  // Step 3: Clarity rating (1 to 5 stars, default 4)
  const [clarityRating, setClarityRating] = useState<number>(4);

  // Helper to trigger coach on reveal
  const triggerCoachReveal = async (guess: string, card: SaveStateRecord) => {
    setHasRevealed(true);
    setIsCoachLoading(true);
    setCoachCommentary(null);

    try {
      const prompt = `Morning Recall Assessment:
- Project / Area: ${card.Area || 'General'}
- User Recall Guess: "${guess || '(Did not recall)'}"

Actual Saved Card:
- Next Action: ${card['Next Action'] || 'None'}
- In My Head: ${card['In My Head'] || 'None'}
- Don't Redo: ${card["Don't Redo"] || 'None'}
- Previous Energy: ${card.Energy || 'None'}

Provide 2-4 lines orienting the user today:`;

      const commentary = await callOnRampCoach(onRampSystemPrompt, prompt);
      setCoachCommentary(commentary.trim());
    } catch (err: any) {
      console.warn('On-Ramp Coach call skipped or failed:', err);
      // Gracefully continue without coach blocking
    } finally {
      setIsCoachLoading(false);
    }
  };

  // Helper to handle "Skip"
  const handleSkip = () => {
    localStorage.setItem(`opshub.onramp.${currentDate}`, 'true');
    onComplete();
  };

  // Helper to handle "Start" button
  const handleStart = () => {
    if (!selectedCard) {
      handleSkip();
      return;
    }

    // Save clarity rating to localStorage
    localStorage.setItem(`opshub.clarity.${currentDate}`, String(clarityRating));

    // Mark on-ramp completed for today
    localStorage.setItem(`opshub.onramp.${currentDate}`, 'true');

    // Pin this card's Next action in localStorage to be "Your one thing" on Today
    const pinnedPayload = {
      text: selectedCard['Next Action'] || '',
      area: selectedCard.Area || 'Ops',
      date: selectedCard.Date || currentDate,
      completed: false,
    };
    localStorage.setItem(
      `opshub.pinned_one_thing.${currentDate}`,
      JSON.stringify(pinnedPayload)
    );

    onComplete();
  };

  const formattedCardDate = formatDisplayDate(latestDate).formatted;

  return (
    <div className="min-h-screen bg-[#F7F7F5] flex flex-col justify-between p-4 sm:p-8">
      {/* Top Bar with gentle context */}
      <div className="max-w-xl w-full mx-auto flex items-center justify-between text-xs text-stone-500">
        <div className="flex items-center gap-2 font-medium">
          <Compass className="w-4 h-4 text-indigo-600" />
          <span>Morning On-Ramp</span>
        </div>
        <button
          onClick={handleSkip}
          className="text-stone-400 hover:text-stone-700 text-xs transition-colors"
        >
          Skip to Today
        </button>
      </div>

      {/* Main Center Content */}
      <div className="max-w-xl w-full mx-auto my-auto py-8 space-y-6">
        {/* Banner if older than 3 days */}
        {daysOld > 3 && (
          <div className="p-4 bg-amber-50 border border-amber-200/90 rounded-2xl flex items-center gap-3 text-xs text-amber-900 shadow-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-medium">
              This is {daysOld} days old — take 2 extra minutes to re-read.
            </span>
          </div>
        )}

        {/* Multi-Area Picker if multiple cards exist on latestDate and none selected yet */}
        {latestRows.length > 1 && !selectedCard ? (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-md space-y-5 animate-in fade-in">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                Last session: {formattedCardDate}
              </span>
              <h2 className="text-xl font-bold text-stone-900">
                Where do you want to start?
              </h2>
              <p className="text-xs text-stone-500">
                You saved state in {latestRows.length} areas last time. Pick the one you want to tackle first.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {latestRows.map((card, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedCard(card)}
                  className="w-full text-left p-4 sm:p-5 rounded-2xl bg-stone-50 hover:bg-stone-100/80 border border-stone-200 hover:border-indigo-400 transition-all flex items-start justify-between gap-3 group"
                >
                  <div className="space-y-1">
                    <span className="px-2.5 py-0.5 rounded-md bg-white border border-stone-200 text-xs font-semibold text-stone-800">
                      {card.Area || 'General'}
                    </span>
                    <h3 className="font-semibold text-stone-900 text-sm mt-2 line-clamp-2">
                      {card['Next Action']}
                    </h3>
                    {card['In My Head'] && (
                      <p className="text-xs text-stone-500 line-clamp-1">
                        {card['In My Head']}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="w-5 h-5 text-stone-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all mt-1 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ) : selectedCard && !hasRevealed ? (
          /* Step 1 — Recall */
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-md space-y-6 animate-in fade-in">
            <div className="space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 inline-block px-2.5 py-1 rounded-full">
                Last time: {selectedCard.Area || 'Focus'} · {formattedCardDate}
              </div>
              <h2 className="text-2xl font-bold text-stone-900 tracking-tight pt-1">
                What were you about to do?
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
                Take 5 seconds to test your recall before looking. Actively retrieving sharpens your mental focus.
              </p>
            </div>

            <div>
              <textarea
                rows={3}
                autoFocus
                value={userGuess}
                onChange={(e) => setUserGuess(e.target.value)}
                placeholder="I think I was working on..."
                className="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all leading-relaxed"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const guess = '(I did not recall)';
                  setUserGuess(guess);
                  triggerCoachReveal(guess, selectedCard);
                }}
                className="text-xs font-semibold text-stone-400 hover:text-stone-700 transition-colors py-2"
              >
                I don&apos;t remember
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerCoachReveal(userGuess, selectedCard);
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl text-xs font-semibold bg-stone-900 hover:bg-black text-white shadow-md transition-all active:scale-95 inline-flex items-center justify-center gap-2"
              >
                <span>Reveal card</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : selectedCard && hasRevealed ? (
          /* Step 2 — Reveal & Step 3 — Rate */
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-md space-y-6 animate-in fade-in">
            {/* User's guess above in small grey text */}
            {userGuess && userGuess !== '(I did not recall)' && (
              <div className="text-xs text-stone-400 italic bg-stone-50 p-3 rounded-xl border border-stone-100">
                <span className="font-semibold text-stone-500 not-italic">
                  Your guess was:
                </span>{' '}
                &ldquo;{userGuess}&rdquo;
              </div>
            )}

            {/* Gemini On-Ramp Coach Commentary (2-4 lines) */}
            {isCoachLoading ? (
              <div className="p-4 bg-indigo-50/60 border border-indigo-100/90 rounded-2xl flex items-center gap-3 text-xs text-indigo-900 animate-pulse">
                <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
                <span className="font-medium">
                  Morning Coach is reviewing your recall...
                </span>
              </div>
            ) : coachCommentary ? (
              <div className="p-4 sm:p-5 bg-gradient-to-br from-indigo-50/70 to-stone-50 rounded-2xl border border-indigo-100 shadow-xs space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Coach Orientation</span>
                </div>
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-line font-normal">
                  {coachCommentary}
                </p>
              </div>
            ) : null}

            {/* Revealed Card Content */}
            <div className="p-5 sm:p-6 bg-stone-50 rounded-2xl border border-stone-200/90 space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-md bg-white border border-stone-200 text-xs font-semibold text-stone-700">
                  {selectedCard.Area || 'Ops'}
                </span>
                <span className="text-[11px] font-mono text-stone-400">
                  Saved {formattedCardDate}
                </span>
              </div>

              {/* Next Action in large text */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Next Action
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-stone-900 leading-snug">
                  {selectedCard['Next Action']}
                </h3>
              </div>

              {/* In My Head */}
              {selectedCard['In My Head'] && (
                <div className="pt-2 border-t border-stone-200/60">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-0.5">
                    In My Head
                  </div>
                  <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-wrap">
                    {selectedCard['In My Head']}
                  </p>
                </div>
              )}

              {/* Don't Redo */}
              {selectedCard["Don't Redo"] && (
                <div className="pt-2 border-t border-stone-200/60">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700 mb-0.5">
                    ⛔ Don&apos;t Redo
                  </div>
                  <p className="text-xs text-rose-900 bg-rose-50/60 p-2.5 rounded-xl border border-rose-100">
                    {selectedCard["Don't Redo"]}
                  </p>
                </div>
              )}

              {/* Energy */}
              {selectedCard.Energy && (
                <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-xs text-stone-500">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Previous Energy
                  </span>
                  <span className="font-semibold text-stone-700">
                    {selectedCard.Energy}
                  </span>
                </div>
              )}
            </div>

            {/* Step 3 — Rate: "How clear is it now?" 1-5 stars */}
            <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-2 text-center">
              <label className="block text-xs font-semibold text-stone-700">
                How clear is it now?
              </label>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = star <= clarityRating;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setClarityRating(star)}
                      className="p-1 text-stone-300 hover:text-amber-400 transition-colors"
                      title={`${star} star${star > 1 ? 's' : ''}`}
                    >
                      <Star
                        className={`w-6 h-6 transition-all ${
                          isFilled
                            ? 'fill-amber-400 text-amber-400 scale-105'
                            : 'text-stone-300'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <div className="text-[11px] text-stone-400 font-mono">
                {clarityRating === 5
                  ? 'Crystal clear (5/5)'
                  : clarityRating === 4
                  ? 'Very clear (4/5)'
                  : clarityRating === 3
                  ? 'Somewhat clear (3/5)'
                  : clarityRating === 2
                  ? 'Foggy (2/5)'
                  : 'Lost (1/5)'}
              </div>
            </div>

            {/* Button "Start" */}
            <button
              type="button"
              onClick={handleStart}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold bg-stone-900 hover:bg-black text-white shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2"
            >
              <span>Start</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : null}
      </div>

      {/* Footer subtle skip */}
      <div className="max-w-xl w-full mx-auto text-center">
        <button
          onClick={handleSkip}
          className="text-[11px] text-stone-400 hover:text-stone-600 transition-colors"
        >
          Skip on-ramp for today
        </button>
      </div>
    </div>
  );
};
