import { unifiedNodeRegistry } from '../registry/unified-node-registry';
import type {
  FieldFillMode,
  FieldOwnershipClass,
} from '../types/unified-node-contract';
import { getCredentialVaultMetaForField } from './credential-field-vault-meta';
import { classifyFieldOwnership } from './field-ownership';
import { resolveEffectiveFieldFillMode } from './fill-mode-resolver';

export interface ResolvedFieldOwnershipPolicy {
  fillMode: FieldFillMode;
  mode: 'user' | 'ai_built' | 'ai_runtime';
  ownership: FieldOwnershipClass;
  supportsRuntimeAI: boolean;
  supportsBuildtimeAI: boolean;
  isVaultCredential: boolean;
  isLocked: boolean;
}

export type FieldOwnershipPolicyMap = Record<
  string,
  Record<string, ResolvedFieldOwnershipPolicy>
>;

export function resolveFieldOwnershipPolicy(
  nodeType: string,
  fieldName: string,
  config: Record<string, any> = {},
): ResolvedFieldOwnershipPolicy | undefined {
  const definition = unifiedNodeRegistry.get(nodeType);
  const field = definition?.inputSchema?.[fieldName];
  if (!field) return undefined;

  const ownership = field.ownership ?? classifyFieldOwnership(fieldName, field);
  const fillMode = resolveEffectiveFieldFillMode(fieldName, definition.inputSchema, config);
  const credentialPolicy = field.credentialTogglePolicy ?? 'locked';
  const credentialUnlocked =
    ownership === 'credential' &&
    credentialPolicy === 'unlockable' &&
    config._ownershipUnlock?.[fieldName] === true;
  const vaultMeta =
    ownership === 'credential'
      ? getCredentialVaultMetaForField(nodeType, fieldName)
      : undefined;

  return {
    fillMode,
    mode:
      fillMode === 'runtime_ai'
        ? 'ai_runtime'
        : fillMode === 'buildtime_ai_once'
          ? 'ai_built'
          : 'user',
    ownership,
    supportsRuntimeAI: field.fillMode?.supportsRuntimeAI !== false,
    supportsBuildtimeAI: field.fillMode?.supportsBuildtimeAI !== false,
    isVaultCredential: ownership === 'credential' && !!vaultMeta,
    isLocked: ownership === 'credential' && !credentialUnlocked,
  };
}
