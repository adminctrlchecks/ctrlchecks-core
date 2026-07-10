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

type Step = 'pick' | 'form';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedCredentialTypeId?: string;
  onSaved?: () => void;
}

export function NewConnectionModal({ open, onOpenChange, preselectedCredentialTypeId, onSaved }: Props) {
  const { toast } = useToast();
  const { data: types = [] } = useCredentialTypes();
  const { data: connections = [] } = useConnections();
  const createMut = useCreateConnection();

  const [step, setStep] = useState<Step>('pick');
  const [selectedType, setSelectedType] = useState<CredentialTypeDefinition | null>(null);
  const [connectionName, setConnectionName] = useState('');
  const [activeFieldName, setActiveFieldName] = useState<string | null>(null);
  const [saveGuidance, setSaveGuidance] = useState<GuidedStatusContent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // When types load and a preset is given, jump straight to the form step
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
      setSelectedType(found);
      setConnectionName(`My ${found.displayName}`);
      setActiveFieldName(found.inputFields[0]?.name ?? null);
      setStep('form');
    }
  }, [open, onOpenChange, preselectedCredentialTypeId, step, toast, types]);

  function handleSelect(type: CredentialTypeDefinition) {
    if (isComingSoonProvider(type.provider)) {
      toast({
        title: 'Coming soon',
        description: `${type.displayName} connections are not available yet.`,
      });
      return;
    }
    setSelectedType(type);
    setConnectionName(`My ${type.displayName}`);
    setActiveFieldName(type.inputFields[0]?.name ?? null);
    setStep('form');
  }

  function handleBack() {
    setStep('pick');
    setSelectedType(null);
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
            {step === 'form' && !preselectedCredentialTypeId && (
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {selectedType && <ProviderLogo provider={selectedType.provider} size={28} />}
            <DialogTitle>
              {step === 'pick' ? 'Choose a service' : `Connect ${selectedType?.displayName ?? ''}`}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {step === 'pick'
                ? 'Choose a service to create a new connection.'
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
