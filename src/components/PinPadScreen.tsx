/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Delete, KeyRound, Lock, ShieldAlert, Sparkles } from 'lucide-react';
import { useOpsHub } from '../store';
import { GoogleSignInModal } from './GoogleSignInModal';

interface PinPadScreenProps {
  onSuccess: () => void;
}

export const PinPadScreen: React.FC<PinPadScreenProps> = ({ onSuccess }) => {
  const { verifyAndUnlockPin, needsGoogleSignIn, userEmail, clientId } = useOpsHub();

  const [digits, setDigits] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(5);

  const handleDigit = (d: string) => {
    if (digits.length >= 4) return;
    setErrorMsg(null);
    const next = digits + d;
    setDigits(next);

    if (next.length === 4) {
      // Validate
      setTimeout(async () => {
        const result = await verifyAndUnlockPin(next);
        if (result.success) {
          onSuccess();
        } else {
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 500);
          setDigits('');
          if (result.attemptsRemaining !== undefined) {
            setAttemptsLeft(result.attemptsRemaining);
            if (result.attemptsRemaining <= 0) {
              setErrorMsg('5 failed attempts. Please authenticate with Google.');
            } else {
              setErrorMsg(
                `Incorrect PIN. ${result.attemptsRemaining} attempt${
                  result.attemptsRemaining === 1 ? '' : 's'
                } remaining.`
              );
            }
          } else {
            setErrorMsg('Incorrect PIN. Please try again.');
          }
        }
      }, 50);
    }
  };

  const handleDelete = () => {
    setDigits((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  // Listen for keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [digits]);

  // If 5 wrong tries or Google re-auth required
  if (needsGoogleSignIn) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-3xl p-8 border border-stone-200 shadow-xl text-center space-y-6 animate-in fade-in">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/80 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-stone-900">
              PIN Lock Locked Out
            </h2>
            <p className="text-xs text-stone-500 leading-relaxed">
              5 incorrect PIN attempts were detected. Please re-authenticate with your Google account to regain access.
            </p>
          </div>

          <div className="pt-2">
            <GoogleSignInModal forceShow={true} onSuccess={onSuccess} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5] flex flex-col items-center justify-center p-4">
      <div
        className={`w-full max-w-xs bg-white rounded-3xl p-8 border border-stone-200 shadow-xl text-center space-y-6 transition-transform ${
          isShaking ? 'translate-x-[-8px] animate-wiggle' : ''
        }`}
      >
        <div className="w-12 h-12 rounded-2xl bg-stone-900 text-white flex items-center justify-center mx-auto shadow-md">
          <Lock className="w-5 h-5 text-indigo-300" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-bold text-stone-900 tracking-tight">
            Lenzo Ops Hub
          </h2>
          <p className="text-xs text-stone-500">
            Enter your 4-digit PIN to continue
          </p>
          {userEmail && (
            <p className="text-[11px] font-mono text-stone-400 truncate">
              {userEmail}
            </p>
          )}
        </div>

        {/* 4 dots display */}
        <div className="flex items-center justify-center gap-4 py-2">
          {[0, 1, 2, 3].map((i) => {
            const isFilled = i < digits.length;
            return (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-stone-900 scale-110 shadow-xs'
                    : 'bg-stone-200 border border-stone-300/80'
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        {errorMsg && (
          <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl py-2 px-3 animate-in fade-in">
            {errorMsg}
          </p>
        )}

        {/* Number Pad Grid */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handleDigit(n)}
              className="h-14 rounded-2xl bg-stone-50 hover:bg-stone-100 active:bg-stone-200 border border-stone-200/80 text-lg font-bold text-stone-800 transition-all active:scale-95 flex items-center justify-center shadow-2xs"
            >
              {n}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setDigits('')}
            className="h-14 rounded-2xl text-xs font-semibold text-stone-400 hover:text-stone-700 transition-colors flex items-center justify-center"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-stone-50 hover:bg-stone-100 active:bg-stone-200 border border-stone-200/80 text-lg font-bold text-stone-800 transition-all active:scale-95 flex items-center justify-center shadow-2xs"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl text-stone-500 hover:bg-stone-100 active:bg-stone-200 transition-colors flex items-center justify-center"
            title="Delete"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
