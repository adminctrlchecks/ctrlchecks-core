import type { ProviderInterpreter } from '../types';

/**
 * Slack — second of the settled priority providers (§7 Q7).
 *
 * Slack returns machine-readable `error` strings (`channel_not_found`, `not_in_channel`,
 * …) which the node override surfaces as `_errorCode`. These map cleanly to fields, which
 * makes Slack the best-covered provider here.
 */
export const slackInterpreter: ProviderInterpreter = {
  provider: 'slack',
  nodeTypes: ['slack', 'slack_trigger'],
  mappings: [
    {
      codes: ['channel_not_found'],
      messageIncludes: ['channel_not_found'],
      fieldName: 'channel',
      headline: "That Slack channel couldn't be found.",
      why: 'Slack does not recognise this channel for the connected workspace.',
      nextSteps: [
        'Check the channel name — use the name without the # , or the channel ID.',
        'Confirm the channel exists in the workspace you connected.',
        'For a private channel, invite the app to it first.',
      ],
    },
    {
      codes: ['not_in_channel'],
      messageIncludes: ['not_in_channel'],
      fieldName: 'channel',
      headline: 'The app needs to be invited to that channel.',
      why: 'The channel exists, but the connected Slack app is not a member, so it cannot post there.',
      nextSteps: [
        'In Slack, open the channel and type /invite @YourAppName.',
        'Or choose a public channel the app is already in.',
      ],
    },
    {
      codes: ['is_archived'],
      messageIncludes: ['is_archived'],
      fieldName: 'channel',
      headline: 'That channel is archived.',
      why: 'Slack does not accept new messages in an archived channel.',
      nextSteps: ['Pick an active channel, or un-archive this one in Slack.'],
    },
    {
      codes: ['invalid_auth', 'not_authed', 'token_revoked', 'account_inactive'],
      messageIncludes: ['invalid_auth', 'not_authed', 'token_revoked', 'account_inactive'],
      headline: 'Your Slack connection needs renewing.',
      why: 'The stored authorisation is no longer valid — it may have been revoked in Slack.',
      nextSteps: ['Reconnect your Slack workspace.'],
      isConnectionProblem: true,
    },
    {
      codes: ['missing_scope'],
      messageIncludes: ['missing_scope'],
      headline: 'Your Slack connection is missing a permission this step needs.',
      why: 'The workspace is connected, but the app was not granted the scope this action requires.',
      nextSteps: [
        'Reconnect Slack and accept the additional permission.',
        'A workspace admin may need to approve it.',
      ],
      isConnectionProblem: true,
    },
    {
      codes: ['msg_too_long'],
      messageIncludes: ['msg_too_long'],
      fieldName: 'text',
      headline: 'That message is too long for Slack.',
      why: 'Slack caps a single message at 40,000 characters.',
      nextSteps: [
        'Shorten the message.',
        'If it is built from earlier data, trim or summarise that data first.',
      ],
    },
    {
      codes: ['no_text'],
      messageIncludes: ['no_text', 'no message text'],
      fieldName: 'text',
      headline: 'This message has no content yet.',
      why: 'Slack needs message text, and this field resolved to empty.',
      nextSteps: [
        'Enter the message text.',
        'If it maps from an earlier step, check that step actually produced a value.',
      ],
    },
    {
      codes: ['user_not_found'],
      messageIncludes: ['user_not_found'],
      fieldName: 'user',
      headline: "That Slack user couldn't be found.",
      why: 'Slack does not recognise this user in the connected workspace.',
      nextSteps: [
        'Use the Slack member ID (starts with U), not the display name.',
        'Confirm the user is in the workspace you connected.',
      ],
    },
    {
      codes: ['ratelimited', 'rate_limited'],
      statuses: [429],
      messageIncludes: ['ratelimited', 'rate limited'],
      headline: 'Slack is asking us to slow down.',
      why: 'The workspace has hit its rate limit. Nothing is wrong with your setup.',
      nextSteps: ['Wait a moment and test this step again.'],
    },
  ],
};
