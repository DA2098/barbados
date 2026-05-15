#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
const examplePath = path.resolve(__dirname, '.env.example');

function parseEnv(file) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const lines = text.split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const k = trimmed.slice(0, idx).trim();
    const v = trimmed.slice(idx + 1).trim();
    env[k] = v;
  }
  return env;
}

const env = parseEnv(envPath);
const example = parseEnv(examplePath);

const required = [
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'PAYPAL_ENV',
  'PAYPAL_CLIENT_ID',
  'PAYPAL_CLIENT_SECRET',
  'PAYPAL_WEBHOOK_ID',
  'FRONTEND_URL'
];

console.log('Checking payment-related environment variables in backend/.env');
console.log('If you haven\'t created backend/.env yet, copy backend/.env.example -> backend/.env and paste your keys.');
console.log('');

const missing = [];
for (const key of required) {
  const val = env[key];
  if (!val) {
    missing.push(key);
    console.log(`- MISSING: ${key}`);
  } else {
    const safe = (key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN')) ? '[SET]' : env[key];
    console.log(`- OK: ${key} = ${safe}`);
  }
}

if (missing.length === 0) {
  console.log('\nAll required payment env vars appear set. Restart the backend after changes.');
  process.exit(0);
} else {
  console.log('\nMissing variables detected. Edit backend/.env and fill them. Example keys in backend/.env.example.');
  process.exit(2);
}
