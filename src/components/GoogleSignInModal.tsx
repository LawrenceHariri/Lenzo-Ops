/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AlertCircle, Loader2, LogIn } from 'lucide-react';
import { useOpsHub } from '../store';

interface GoogleSignInModalProps {
  forceShow?: boolean;
  onSuccess?: () => void;
}

export const GoogleSignInModal: React.FC<GoogleSignInModalProps> = ({
  forceShow = false,
  onSuccess,
}) => {
  const { signInWithGoogleAuth, needsGoogleSignIn, userEmail } = useOpsHub();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  if (!forceShow && !needsGoogleSignIn) return null;

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await signInWithGoogleAuth();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Firebase Auth sign in failed:', err);
      setAuthError(err?.message || 'Google sign-in was cancelled or failed.');
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center space-y-4">
      <button
        type="button"
        onClick={handleSignIn}
        disabled={isSigningIn}
        className="group relative flex items-center justify-center gap-3 w-full max-w-[280px] px-4 py-2.5 bg-white hover:bg-stone-50 active:bg-stone-100 text-stone-700 text-sm font-medium rounded-2xl border border-stone-300 shadow-xs transition-all hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isSigningIn ? (
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
        ) : (
          <svg
            className="w-5 h-5 shrink-0"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.66-5.17 3.66-9.12z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.36 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.13z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
            />
          </svg>
        )}
        <span>{isSigningIn ? 'Connecting...' : 'Sign in with Google'}</span>
      </button>

      {authError && (
        <div className="flex items-start gap-2 text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100 max-w-xs text-left">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
          <span>{authError}</span>
        </div>
      )}
    </div>
  );
};
