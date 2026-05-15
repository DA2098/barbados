#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const IGNORE = ['node_modules', '.git', 'dist', 'build', 'uploads'];

const patterns = [
  /sk_live_[A-Za-z0-9_\-]+/g,
  /sk_test_[A-Za-z0-9_\-]+/g,
  /pk_live_[A-Za-z0-9_\-]+/g,
  /pk_test_[A-Za-z0-9_\-]+/g,
  /PAYPAL_CLIENT_SECRET\s*=\s*[^\n\r]+/gi,
  /PAYPAL_CLIENT_ID\s*=\s*[^\n\r]+/gi,
  /STRIPE_SECRET_KEY\s*=\s*[^\n\r]+/gi,
  /STRIPE_PUBLISHABLE_KEY\s*=\s*[^\n\r]+/gi,
  /-----BEGIN PRIVATE KEY-----/g,
  /PRIVATE_KEY\s*=\s*[^\n\r]+/gi
];

function walk(dir) {
  const results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (IGNORE.some((p) => file === p)) continue;
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results.push(...walk(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

function check() {
  const files = walk(repoRoot);
  const findings = [];
  for (const f of files) {
    // skip binary files
    if (f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.gif')) continue;
    let text = '';
    try { text = fs.readFileSync(f, 'utf8'); } catch { continue; }
    for (const pat of patterns) {
      const match = text.match(pat);
      if (match && match.length > 0) {
        findings.push({ file: path.relative(repoRoot, f), pattern: pat.toString(), matches: match.slice(0,5) });
      }
    }
  }

  if (findings.length > 0) {
    console.error('Potential secrets detected:');
    for (const fn of findings) {
      console.error(` - ${fn.file}: ${fn.matches.join(', ')}`);
    }
    console.error('\nCommit aborted. Remove secrets or add exceptions and re-run.');
    process.exitCode = 2;
    process.exit(2);
  }

  console.log('No obvious secrets found.');
}

check();
