import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { startOAuth, reconnectOAuth } from '@/lib/api/connections';
import { invalidateAfterConnectionChange } from '@/lib/queryInvalidation';
import { getBackendUrl } from '@/lib/api/getBackendUrl';

type OAuthStatus = 'idle' | 'opening' | 'waiting' | 'success' | 'error';

export function useOAuthFlow() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<OAuthStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const openOAuthPopup = useCallback((url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const popup = window.open(url, 'oauth-connect', 'width=600,height=700,left=200,top=100');
      if (!popup) {
        reject(new Error('Popup was blocked. Please allow popups for this site.'));
        return;
      }

      let settled = false;
      let bc: BroadcastChannel | null = null;

      const cleanup = () => {
        window.removeEventListener('message', onMessage);
        clearTimeout(timeout);
        clearInterval(closedInterval);
        try { bc?.close(); } catch { /* ignore */ }
      };

      const finish = (callback: () => void) => {
        if (settled) return;
        settled = true;
        cleanup();
        callback();
      };

      const timeout = window.setTimeout(() => {
        finish(() => reject(new Error('OAuth window timed out. Please try connecting again.')));
      }, 5 * 60_000);

      // BroadcastChannel: works even when COOP severs window.opener.
      // The relay page at /auth/oauth-relay broadcasts on this channel (same origin).
      try {
        bc = new BroadcastChannel('oauth_callback');
        bc.addEventListener('message', (e: MessageEvent) => {
          if (e.data?.type === 'oauth-success') {
            finish(resolve);
          } else if (e.data?.type === 'oauth-error') {
            finish(() => reject(new Error(e.data.message || 'OAuth failed')));
          }
        });
      } catch { /* BroadcastChannel not supported in this browser */ }

      const allowedOrigins = new Set([
        window.location.origin,
        new URL(getBackendUrl()).origin,
      ]);

      // postMessage fallback (works for providers without COOP)
      const onMessage = (event: MessageEvent) => {
        if (!allowedOrigins.has(event.origin)) return;
        if (event.data?.type === 'oauth-success') {
          finish(resolve);
        } else if (event.data?.type === 'oauth-error') {
          finish(() => reject(new Error(event.data.message || 'OAuth failed')));
        }
      };
      window.addEventListener('message', onMessage);

      // Poll for the popup being closed without posting a success/error message.
      // This catches the case where the user manually closes the popup window.
      const closedInterval = window.setInterval(() => {
        try {
          if (popup.closed) {
            finish(() => reject(new Error('Connection cancelled')));
          }
        } catch {
          // Cross-Origin-Opener-Policy can block popup.closed while OAuth is on
          // the provider domain. Keep waiting for the callback message.
        }
      }, 500);
    });
  }, []);

  const connect = useCallback(
    async (credentialTypeId: string, opts?: { connectionId?: string; scopes?: string[]; returnTo?: string }) => {
      setStatus('opening');
      setError(null);
      try {
        const { authorizationUrl } = await startOAuth(credentialTypeId, {
          returnTo: `${window.location.origin}/connections`,
          ...opts,
        });
        setStatus('waiting');
        await openOAuthPopup(authorizationUrl);
        setStatus('success');
        invalidateAfterConnectionChange(qc);
      } catch (err) {
        const statusCode = (err as any)?.statusCode as number | undefined;
        const msg = statusCode === 503
          ? 'Service temporarily unavailable — please try again in a moment.'
          : (err instanceof Error ? err.message : 'OAuth connection failed');
        setError(msg);
        setStatus('error');
        throw err;
      }
    },
    [openOAuthPopup, qc],
  );

  const reconnect = useCallback(
    async (connectionId: string, opts?: { scopes?: string[]; returnTo?: string }) => {
      setStatus('opening');
      setError(null);
      try {
        const { authorizationUrl } = await reconnectOAuth(connectionId, {
          returnTo: `${window.location.origin}/connections`,
          ...opts,
        });
        setStatus('waiting');
        await openOAuthPopup(authorizationUrl);
        setStatus('success');
        invalidateAfterConnectionChange(qc);
      } catch (err) {
        const statusCode = (err as any)?.statusCode as number | undefined;
        const msg = statusCode === 503
          ? 'Service temporarily unavailable — please try again in a moment.'
          : (err instanceof Error ? err.message : 'Reconnect failed');
        setError(msg);
        setStatus('error');
        throw err;
      }
    },
    [openOAuthPopup, qc],
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return { status, error, connect, reconnect, reset, isLoading: status === 'opening' || status === 'waiting' };
}
