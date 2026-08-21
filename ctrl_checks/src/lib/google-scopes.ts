export const GOOGLE_IDENTITY_SCOPES = [
  'openid',
  'email',
  'profile',
].join(' ');

export const INTEGRATION_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
].join(' ');

export const GOOGLE_CONNECTOR_SCOPES = `${GOOGLE_IDENTITY_SCOPES} ${INTEGRATION_SCOPES}`;
