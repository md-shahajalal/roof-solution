#!/usr/bin/env node
/**
 * Fails if the owner's home address leaks into anything shipped to the browser.
 *
 * The registered mailing address doubles as a home address, so the client asked
 * for it to stay off the public site. A grep in CI is cheaper than noticing it
 * after launch.
 *
 * Runs against src/ and public/ before build, and dist/ after.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const FORBIDDEN = [
  /1424\s+Yosemite/i,
  /Yosemite\s+Dr/i,
  /\bAntioch\b/i,
  /\b94509\b/,
];

const ROOTS = ['src', 'public', 'dist'].filter(existsSync);
const SKIP_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.ico', '.woff', '.woff2', '.map']);

const hits = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) { walk(path); continue; }
    if (SKIP_EXT.has(extname(path).toLowerCase())) continue;

    const text = readFileSync(path, 'utf8');
    for (const pattern of FORBIDDEN) {
      const match = text.match(pattern);
      if (match) hits.push({ path, found: match[0] });
    }
  }
}

ROOTS.forEach(walk);

if (hits.length) {
  console.error('\n  Private address found in shipped files:\n');
  for (const hit of hits) console.error(`    ${hit.path}  ->  "${hit.found}"`);
  console.error('\n  Show "Serving California" instead. See src/app/core/site.config.ts\n');
  process.exit(1);
}

console.log(`privacy check: clean (scanned ${ROOTS.join(', ')})`);
