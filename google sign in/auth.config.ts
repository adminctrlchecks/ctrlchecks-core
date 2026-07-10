const DEFAULT_GOOGLE_CLIENT_ID =
  '655808126279-pj3fiojdjpjju5tv8j2mkulklqj4rnsh.apps.googleusercontent.com';

export function getGoogleClientId(): string {
  const runtimeValue = (globalThis as any)?.__GOOGLE_CLIENT_ID__;
  if (typeof runtimeValue === 'string' && runtimeValue.trim()) {
    return runtimeValue.trim();
  }
  return DEFAULT_GOOGLE_CLIENT_ID;
}
