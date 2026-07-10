#!/usr/bin/env node
/**
 * get-test-token.js
 * Signs into Cognito and prints your IdToken for live testing.
 *
 * Usage (from repo root):
 *   node scripts/get-test-token.js your@email.com YourPassword123
 *
 * Reads COGNITO_* from worker/.env automatically.
 */

const https  = require('https');
const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

// ── 1. Load worker/.env ────────────────────────────────────────────────────
const envPath = path.join(__dirname, '..', 'worker', '.env');
if (!fs.existsSync(envPath)) {
  console.error('ERROR: worker/.env not found at', envPath);
  process.exit(1);
}

const env = {};
fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});

const USER_POOL_ID   = env.COGNITO_USER_POOL_ID;
const CLIENT_ID      = env.COGNITO_CLIENT_ID;
const CLIENT_SECRET  = env.COGNITO_CLIENT_SECRET;
const REGION         = env.AWS_REGION || 'ap-south-1';

if (!USER_POOL_ID || !CLIENT_ID) {
  console.error('ERROR: COGNITO_USER_POOL_ID or COGNITO_CLIENT_ID missing from worker/.env');
  process.exit(1);
}

// ── 2. Parse args ──────────────────────────────────────────────────────────
const [,, USERNAME, PASSWORD] = process.argv;
if (!USERNAME || !PASSWORD) {
  console.error('Usage: node scripts/get-test-token.js <email> <password>');
  process.exit(1);
}

// ── 3. Compute SECRET_HASH (required when app client has a secret) ─────────
function secretHash(username) {
  if (!CLIENT_SECRET) return undefined;
  return crypto
    .createHmac('sha256', CLIENT_SECRET)
    .update(username + CLIENT_ID)
    .digest('base64');
}

// ── 4. Call Cognito InitiateAuth ───────────────────────────────────────────
const authParams = {
  USERNAME,
  PASSWORD,
};
const hash = secretHash(USERNAME);
if (hash) authParams.SECRET_HASH = hash;

const body = JSON.stringify({
  AuthFlow: 'USER_PASSWORD_AUTH',
  ClientId: CLIENT_ID,
  AuthParameters: authParams,
});

const options = {
  hostname: `cognito-idp.${REGION}.amazonaws.com`,
  path: '/',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-amz-json-1.1',
    'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
    'Content-Length': Buffer.byteLength(body),
  },
};

console.log(`Signing in as ${USERNAME} via Cognito (${REGION})...`);

const req = https.request(options, res => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    let parsed;
    try { parsed = JSON.parse(data); } catch {
      console.error('ERROR: Non-JSON response from Cognito:', data);
      process.exit(1);
    }

    if (parsed.__type || parsed.message) {
      console.error(`ERROR: ${parsed.__type || 'Cognito error'}: ${parsed.message}`);
      process.exit(1);
    }

    const token = parsed?.AuthenticationResult?.IdToken;
    if (!token) {
      console.error('ERROR: No IdToken in response:', JSON.stringify(parsed, null, 2));
      process.exit(1);
    }

    console.log('\n✅ Success! Your LIVE_TEST_BEARER_TOKEN:\n');
    console.log(token);
    console.log('\n--- Copy everything above the dashes ---');
    console.log('Store on server:');
    console.log(`  ssh -i ~/.ssh/id_ed25519 root@187.127.185.105`);
    console.log(`  echo 'LIVE_TEST_BEARER_TOKEN=${token.slice(0,20)}...' >> /opt/ctrlchecks-worker/.env.live-test`);
    console.log(`  chmod 600 /opt/ctrlchecks-worker/.env.live-test`);
    console.log('\nToken expires in ~1 hour. Re-run this script to refresh.');
  });
});

req.on('error', err => {
  console.error('ERROR: Network error:', err.message);
  process.exit(1);
});

req.write(body);
req.end();
