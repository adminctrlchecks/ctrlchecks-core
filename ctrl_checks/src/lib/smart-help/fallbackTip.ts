import type { AIHelpContext, AIHelpTip } from './types';

export function buildFallbackTip(context: AIHelpContext): AIHelpTip {
  const { element } = context;
  const name = element.label || element.buttonText || element.type;

  if (element.errorText) {
    return {
      title: 'This needs a fix',
      tooltip: element.errorText,
      expanded_help: `${name} isn't valid yet — update it to match the expected format.`,
      suggested_action: 'Correct the highlighted field and try again.',
      confidence: 'low',
    };
  }

  if (element.emptyStateText) {
    return {
      title: 'Nothing here yet',
      tooltip: element.emptyStateText,
      expanded_help: 'This area fills in once there is data or you take the first action.',
      suggested_action: 'Use the button here to get started.',
      confidence: 'low',
    };
  }

  if (element.placeholder || element.type.includes('input') || element.type === 'text area' || element.type === 'select') {
    return {
      title: name || 'This field',
      tooltip: element.placeholder || `Enter a value for ${name}.`,
      expanded_help: 'Fields like this are used to configure what happens next.',
      suggested_action: 'Fill in a value that fits this field.',
      confidence: 'low',
    };
  }

  if (element.buttonText) {
    return {
      title: element.buttonText,
      tooltip: `Click to ${element.buttonText.toLowerCase()}.`,
      expanded_help: element.nearbyText || 'This action moves you to the next step.',
      suggested_action: `Click "${element.buttonText}" when you're ready.`,
      confidence: 'low',
    };
  }

  return {
    title: name || 'About this area',
    tooltip: element.nearbyText || 'This is part of the current screen.',
    expanded_help: 'Hover or click nearby controls for more specific guidance.',
    suggested_action: 'Explore the highlighted controls on this screen.',
    confidence: 'low',
  };
}
