export type HelpTrigger =
  | 'hover'
  | 'click'
  | 'error'
  | 'inactivity'
  | 'repeated_failed_attempt'
  | 'time_on_screen';

export type ValidationState = 'valid' | 'invalid' | 'unknown';
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface AIHelpPageContext {
  productName: string;
  route: string;
  pageTitle: string;
  sectionName: string | null;
}

export interface AIHelpElementContext {
  label: string | null;
  type: string;
  nearbyText: string | null;
  placeholder: string | null;
  buttonText: string | null;
  currentValue: string | null;
  validationState: ValidationState;
  errorText: string | null;
  emptyStateText: string | null;
}

export interface AIHelpUserContext {
  role: string | null;
  plan: string | null;
  deviceType: DeviceType;
  recentActions: string[];
}

export interface AIHelpTriggerContext {
  kind: HelpTrigger;
  hoverDurationMs: number;
  timeOnScreenMs: number;
  repeatedAttemptCount: number;
}

export interface AIHelpContext {
  page: AIHelpPageContext;
  element: AIHelpElementContext;
  user: AIHelpUserContext;
  trigger: AIHelpTriggerContext;
}

export type TipConfidence = 'high' | 'medium' | 'low';

export interface AIHelpTip {
  title: string;
  tooltip: string;
  expanded_help: string;
  suggested_action: string;
  confidence: TipConfidence;
}

export interface AIHelpUserOverrides {
  role?: string | null;
  plan?: string | null;
}
