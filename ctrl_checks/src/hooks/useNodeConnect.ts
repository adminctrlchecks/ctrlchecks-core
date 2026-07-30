/**
 * One-click connect for a node's missing credential.
 *
 * The previous flow was chip → Sheet → "Connect with Google" → popup: three steps where the
 * middle one added nothing, because for an OAuth provider the panel's entire content *was*
 * that one button. This collapses it — OAuth starts on the chip click itself.
 *
 * The split is on `credentialType.authType`, never on node identity, so it holds for every
 * current and future provider:
 *
 *   oauth2     -> start the popup immediately, no panel
 *   api key    -> report `needs-form`; the caller shows a small form anchored to the chip
 *   unmapped   -> report `unsupported`; the caller links to /connections
 *
 * Popup note: `useOAuthFlow().connect()` awaits `startOAuth()` before `window.open`, which is
 * the same shape `OAuthConnectButton` already uses successfully. What must NOT be added is a
 * *further* await before that — so credential types are read from react-query cache, which
 * the stage prefetches on mount, rather than being fetched inside the click handler.
 */

import { useCallback, useState } from 'react';
import { useCredentialTypes } from './useCredentialTypes';
import { useOAuthFlow } from './useOAuthFlow';
import type { CredentialTypeDefinition } from '@/lib/api/connections';

export type NodeConnectOutcome =
  | { kind: 'connected' }
  | { kind: 'needs-form'; credentialType: CredentialTypeDefinition }
  | { kind: 'unsupported' }
  /**
   * The popup ended without confirming success — but that is NOT the same as failing.
   *
   * The success message is delivered on a same-origin channel, so it is lost whenever the
   * callback completes on a different origin than the page (any provider whose redirect URI
   * points at another deployment). The connection is frequently saved anyway. The caller must
   * verify against the connections system before showing `message` to the user.
   */
  | { kind: 'unverified'; message: string };

export function findCredentialTypeForProvider(
  credentialTypes: CredentialTypeDefinition[],
  provider: string | undefined,
  credentialTypeId?: string,
): CredentialTypeDefinition | undefined {
  if (credentialTypeId) {
    const byId = credentialTypes.find((t) => t.id === credentialTypeId);
    if (byId) return byId;
  }
  if (!provider) return undefined;
  const lower = provider.toLowerCase();
  return (
    credentialTypes.find((t) => t.provider === provider) ||
    credentialTypes.find((t) => t.provider?.toLowerCase() === lower)
  );
}

export function useNodeConnect() {
  const { data: credentialTypes = [], isLoading } = useCredentialTypes();
  const oauthFlow = useOAuthFlow();
  /** Node type currently mid-connect, so the chip can show a spinner. */
  const [connectingNodeType, setConnectingNodeType] = useState<string | null>(null);

  const connect = useCallback(
    async (input: {
      nodeType: string;
      provider?: string;
      credentialTypeId?: string;
    }): Promise<NodeConnectOutcome> => {
      const credentialType = findCredentialTypeForProvider(
        credentialTypes,
        input.provider,
        input.credentialTypeId,
      );

      if (!credentialType) return { kind: 'unsupported' };
      if (credentialType.authType !== 'oauth2') {
        return { kind: 'needs-form', credentialType };
      }

      setConnectingNodeType(input.nodeType);
      try {
        // Deliberately no `scopes` override.
        //
        // The backend treats `scopes` as a REPLACEMENT, not an addition:
        //   const scopes = input.scopes?.length ? input.scopes : definition.oauth2.defaultScopes;
        //
        // Passing the gate's per-node minimum (google_sheets -> just
        // `.../auth/spreadsheets`) therefore drops every default scope the OAuth client is
        // actually registered for, and Google rejects the request outright with a generic
        // "Something went wrong" page. Even when a provider accepts the narrowed set, the
        // resulting grant is smaller than the app's defaults, so the very next node needing
        // Drive or Gmail fails readiness with `missing_scope`.
        //
        // First-time connect must use the credential type's defaults, exactly as
        // `OAuthConnectButton` does. Requesting extra scopes belongs to the *reconnect*
        // flow (see `handleRepairGroup` in pages/Connections.tsx), which widens an existing
        // grant rather than establishing one.
        await oauthFlow.connect(credentialType.id, {
          // Return to wherever the user is standing, not a hardcoded page — the popup
          // closes onto this same screen. Not part of the provider URL: `redirect_uri` comes
          // from the credential type's own OAuth client config.
          returnTo: `${window.location.origin}${window.location.pathname}${window.location.search}`,
        });
        return { kind: 'connected' };
      } catch (err) {
        // Deliberately NOT an error. "Connection cancelled" is what this throws both when the
        // user really cancelled and when the popup completed on an origin whose success
        // message could not reach us. Only a verification against the connections system can
        // tell those apart, so hand the message back and let the caller decide.
        return {
          kind: 'unverified',
          message: err instanceof Error ? err.message : 'Connection could not be confirmed.',
        };
      } finally {
        setConnectingNodeType(null);
      }
    },
    [credentialTypes, oauthFlow],
  );

  return { connect, connectingNodeType, credentialTypesLoading: isLoading };
}
