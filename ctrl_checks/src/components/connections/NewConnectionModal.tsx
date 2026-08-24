import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ServicePickerGrid } from './ServicePickerGrid';
import { CredentialFormRenderer } from './CredentialFormRenderer';
import { CredentialGuidePanel } from './CredentialGuidePanel';
import { OAuthConnectButton } from './OAuthConnectButton';
import { ProviderLogo } from './ProviderLogo';
import { isComingSoonProvider } from './connectionAvailability';
import { useConnections, useCreateConnection } from '@/hooks/useConnections';
import { useCredentialTypes } from '@/hooks/useCredentialTypes';
import { useToast } from '@/hooks/use-toast';
import type { CredentialTypeDefinition } from '@/lib/api/connections';
import { GuidedStatusCard } from '@/components/ui/guided-status-card';
import { getAIGuidance } from '@/lib/ai-error-guidance';
import type { GuidedStatusContent } from '@/lib/workflow-guidance';

type Step = 'pick' | 'choose' | 'form';

function titleCaseProviderLabel(provider: string | null): string {
  if (!provider) return 'service';
  return provider
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedCredentialTypeId?: string;
  /** Provider-level entry: opens the auth-method chooser when the provider has >1 method,
   *  or jumps straight to the form when it has exactly one. Ignored if a specific
   *  preselectedCredentialTypeId is given. */
  preselectedProvider?: string;
  onSaved?: () => void;
}

export function NewConnectionModal({ open, onOpenChange, preselectedCredentialTypeId, preselectedProvider, onSaved }: Props) {
  const { toast } = useToast();
  const { data: types = [] } = useCredentialTypes();
  const { data: connections = [] } = useConnections();
  const createMut = useCreateConnection();

  const [step, setStep] = useState<Step>('pick');
  const [selectedType, setSelectedType] = useState<CredentialTypeDefinition | null>(null);
  const [chosenProvider, setChosenProvider] = useState<string | null>(null);
  const [connectionName, setConnectionName] = useState('');
  const [activeFieldName, setActiveFieldName] = useState<string | null>(null);
  const [saveGuidance, setSaveGuidance] = useState<GuidedStatusContent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // All credential types registered for a given provider (e.g. HubSpot → OAuth2 + Private App).
  const typesForProvider = (provider: string) => types.filter((t) => t.provider === provider);

  function goToForm(type: CredentialTypeDefinition) {
    setSelectedType(type);
    setConnectionName(`My ${type.displayName}`);
    setActiveFieldName(type.inputFields[0]?.name ?? null);
    setStep('form');
  }

  // When types load and a specific credential type is preset, jump straight to its form.
  useEffect(() => {
    if (!open || !preselectedCredentialTypeId || types.length === 0) return;
    const found = types.find((t) => t.id === preselectedCredentialTypeId);
    if (found && step === 'pick') {
      if (isComingSoonProvider(found.provider)) {
        toast({
          title: 'Coming soon',
          description: `${found.displayName} connections are not available yet.`,
        });
        onOpenChange(false);
        return;
      }
      goToForm(found);
    }
  }, [open, onOpenChange, preselectedCredentialTypeId, step, toast, types]);

  // Provider-level entry: show the auth-method chooser when the provider has >1 method,
  // or jump straight to the form for a single-method provider.
  useEffect(() => {
    if (!open || preselectedCredentialTypeId || !preselectedProvider || types.length === 0) return;
    if (step !== 'pick') return;
    const providerTypes = typesForProvider(preselectedProvider);
    if (providerTypes.length === 0) return;
    if (isComingSoonProvider(preselectedProvider)) {
      toast({ title: 'Coming soon', description: `${preselectedProvider} connections are not available yet.` });
      onOpenChange(false);
      return;
    }
    if (providerTypes.length === 1) {
      goToForm(providerTypes[0]);
    } else {
      setChosenProvider(preselectedProvider);
      setStep('choose');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preselectedCredentialTypeId, preselectedProvider, step, types]);

  function handleSelect(type: CredentialTypeDefinition) {
    if (isComingSoonProvider(type.provider)) {
      toast({
        title: 'Coming soon',
        description: `${type.displayName} connections are not available yet.`,
      });
      return;
    }
    // If this provider offers more than one auth method, let the user choose it explicitly
    // rather than silently committing to whichever type the picker surfaced.
    const providerTypes = typesForProvider(type.provider);
    if (providerTypes.length > 1) {
      setChosenProvider(type.provider);
      setStep('choose');
      return;
    }
    goToForm(type);
  }

  function handleChooseMethod(type: CredentialTypeDefinition) {
    goToForm(type);
  }

  function handleBack() {
    // From the form, step back to the method chooser when the provider had multiple methods;
    // otherwise return to the service picker.
    if (step === 'form' && chosenProvider && typesForProvider(chosenProvider).length > 1) {
      setSelectedType(null);
      setConnectionName('');
      setActiveFieldName(null);
      setStep('choose');
      return;
    }
    setStep('pick');
    setSelectedType(null);
    setChosenProvider(null);
    setConnectionName('');
    setActiveFieldName(null);
  }

  async function handleCredentialSubmit(credentials: Record<string, string>) {
    if (!selectedType || isSubmitting) return;
    setIsSubmitting(true); // immediate feedback before any await
    try {
      await createMut.mutateAsync({
        name: connectionName || `My ${selectedType.displayName}`,
        credentialTypeId: selectedType.id,
        provider: selectedType.provider,
        authType: selectedType.authType,
        credentials,
      });
      toast({ title: 'Connection saved', description: `${connectionName} is ready to use.` });
      onOpenChange(false);
      reset();
      onSaved?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save connection';
      getAIGuidance(
        { code: 'SAVE_FAILED', message: msg, operation: 'save' } as any,
        { provider: selectedType?.provider, operation: 'connect' }
      ).then(setSaveGuidance);
    } finally {
      setIsSubmitting(false);
    }
  }

  const credentialFormApiError = createMut.isError
    ? (createMut.error instanceof Error ? createMut.error.message : 'Failed to save connection')
    : null;

  function handleOAuthSuccess() {
    toast({ title: 'Connected!', description: `${selectedType?.displayName} connected successfully.` });
    onOpenChange(false);
    reset();
    onSaved?.();
  }

  function reset() {
    setStep('pick');
    setSelectedType(null);
    setChosenProvider(null);
    setConnectionName('');
    setActiveFieldName(null);
    setIsSubmitting(false);
  }

  function handleGuideFieldSelect(fieldName: string) {
    setActiveFieldName(fieldName);
    if (typeof document === 'undefined') return;
    const field = document.getElementById(`credential-${selectedType?.id}-${fieldName}`);
    field?.focus();
    field?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function handleOpenChange(val: boolean) {
    if (!val) reset();
    onOpenChange(val);
  }

  const isOAuth = selectedType?.authType === 'oauth2';
  const hasFields = (selectedType?.inputFields?.length ?? 0) > 0;
  const connectedTypeIds = new Set(connections.map((connection) => connection.credentialTypeId));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={step === 'form' ? 'max-w-4xl max-h-[90vh] overflow-y-auto' : 'max-w-lg max-h-[90vh] overflow-y-auto'}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            {((step === 'form' && (!preselectedCredentialTypeId || (chosenProvider && typesForProvider(chosenProvider).length > 1))) ||
              (step === 'choose' && !preselectedProvider)) && (
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {(selectedType || (step === 'choose' && chosenProvider)) && (
              <ProviderLogo provider={selectedType?.provider ?? chosenProvider ?? ''} size={28} />
            )}
            <DialogTitle>
              {step === 'pick'
                ? 'Choose a service'
                : step === 'choose'
                  ? `Connect ${titleCaseProviderLabel(chosenProvider)}`
                  : `Connect ${selectedType?.displayName ?? ''}`}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {step === 'pick'
                ? 'Choose a service to create a new connection.'
                : step === 'choose'
                  ? `Choose how to connect ${titleCaseProviderLabel(chosenProvider)}.`
                  : `Authorize or configure ${selectedType?.displayName ?? 'this service'} for workflow use.`}
            </DialogDescription>
          </div>
          {saveGuidance && (
            <div className="mt-3">
              <GuidedStatusCard
                title={saveGuidance.title}
                description={saveGuidance.description}
                resolution={saveGuidance.resolution}
                nextSteps={saveGuidance.nextSteps}
                tone={saveGuidance.tone}
                onDismiss={() => setSaveGuidance(null)}
              />
            </div>
          )}
        </DialogHeader>

        {step === 'pick' && <ServicePickerGrid onSelect={handleSelect} connectedTypeIds={connectedTypeIds} />}

        {step === 'choose' && chosenProvider && (
          <div className="space-y-3 pt-1">
            <p className="text-sm text-muted-foreground">
              {titleCaseProviderLabel(chosenProvider)} supports more than one way to connect. Pick the method you want to use.
            </p>
            <div className="space-y-2">
              {typesForProvider(chosenProvider).map((type) => {
                const alreadyConnected = connectedTypeIds.has(type.id);
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleChooseMethod(type)}
                    className="flex w-full items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
                  >
                    <ProviderLogo provider={type.provider} size={28} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{type.displayName}</p>
                        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {type.authType === 'oauth2' ? 'OAuth' : 'API key'}
                        </span>
                        {alreadyConnected && (
                          <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary">
                            Connected
                          </span>
                        )}
                      </div>
                      {type.guide?.summary && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{type.guide.summary}</p>
                      )}
                    </div>
                    <ArrowLeft className="h-4 w-4 rotate-180 shrink-0 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 'form' && selectedType && (
          <div className="grid gap-5 pt-1 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5">
              <>
                  <CredentialGuidePanel
                    credentialType={selectedType}
                    activeFieldName={activeFieldName}
                    onFieldSelect={handleGuideFieldSelect}
                    compact
                    className="lg:hidden"
                  />

                  {/* Connection name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="conn-name">Connection Name</Label>
                    <Input
                      id="conn-name"
                      value={connectionName}
                      onChange={(e) => setConnectionName(e.target.value)}
                      placeholder={`My ${selectedType.displayName}`}
                    />
                  </div>

                  {/* OAuth flow */}
                  {isOAuth && (
                    <div className="space-y-3">
                      {hasFields && (
                        <CredentialFormRenderer
                          credentialType={selectedType}
                          onSubmit={handleCredentialSubmit}
                          isSubmitting={isSubmitting}
                          activeFieldName={activeFieldName}
                          onFieldFocus={setActiveFieldName}
                          apiError={credentialFormApiError}
                        />
                      )}
                      <OAuthConnectButton
                        credentialType={selectedType}
                        onSuccess={handleOAuthSuccess}
                        className="w-full"
                      />
                    </div>
                  )}

                  {/* API key / manual flow */}
                  {!isOAuth && hasFields && (
                    <CredentialFormRenderer
                      credentialType={selectedType}
                      onSubmit={handleCredentialSubmit}
                      isSubmitting={isSubmitting}
                      submitLabel={selectedType.form.submitLabel ?? 'Save & Test Connection'}
                      activeFieldName={activeFieldName}
                      onFieldFocus={setActiveFieldName}
                      apiError={credentialFormApiError}
                    />
                  )}

                  {!isOAuth && !hasFields && (
                    <p className="text-sm text-muted-foreground">
                      No additional configuration required for this connection type.
                    </p>
                  )}
                </>
            </div>

            <CredentialGuidePanel
              credentialType={selectedType}
              activeFieldName={activeFieldName}
              onFieldSelect={handleGuideFieldSelect}
              className="hidden max-h-[70vh] overflow-y-auto lg:block"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
