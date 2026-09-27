/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, Loader2, LogIn, ShieldAlert } from 'lucide-react';
import { useOpsHub } from '../store';

interface GoogleSignInModalProps {
  forceShow?: boolean;
  onSuccess?: () => void;
}

export const GoogleSignInModal: React.FC<GoogleSignInModalProps> = ({
  forceShow = false,
  onSuccess,
}) => {
  const { clientId, setGoogleCredential, needsGoogleSignIn } = useOpsHub();
  const buttonContainerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Check if google accounts script is loaded
    const checkGsi = () => {
      if ((window as any).google?.accounts?.id) {
        setScriptLoaded(true);
        return true;
      }
      return false;
    };

    if (checkGsi()) return;

    const interval = setInterval(() => {
      if (checkGsi()) {
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !clientId || !buttonContainerRef.current) return;

    try {
      const google = (window as any).google;
      google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => {
          if (response?.credential) {
            setAuthError(null);
            setGoogleCredential(response.credential);
            if (onSuccess) onSuccess();
          } else {
            setAuthError('No credential received from Google.');
          }
        },
        auto_select: true,
        cancel_on_tap_outside: false,
      });

      // Clear container and render button
      buttonContainerRef.current.innerHTML = '';
      google.accounts.id.renderButton(buttonContainerRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'pill',
        logo_alignment: 'left',
        width: 260,
      });

      // Also trigger prompt if needed for silent auto-select
      google.accounts.id.prompt();
    } catch (err: any) {
      console.warn('GSI render error:', err);
    }
  }, [scriptLoaded, clientId, setGoogleCredential, onSuccess]);

  if (!forceShow && !needsGoogleSignIn) return null;

  return (
    <div className="w-full flex flex-col items-center justify-center space-y-4">
      {clientId ? (
        <>
          <div ref={buttonContainerRef} className="min-h-[44px] flex items-center justify-center" />

          {!scriptLoaded && (
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Loading Google Sign-in...</span>
            </div>
          )}

          {authError && (
            <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100 max-w-xs text-center">
              {authError}
            </p>
          )}
        </>
      ) : (
        <div className="text-center space-y-2 max-w-xs">
          <p className="text-xs text-stone-500 bg-stone-50 p-3 rounded-2xl border border-stone-200/80">
            Google sign-in not active (Client ID not configured in Settings).
          </p>
          {forceShow && onSuccess && (
            <button
              onClick={onSuccess}
              className="px-4 py-2 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              Continue without Google sign-in
            </button>
          )}
        </div>
      )}
    </div>
  );
};
