#!/usr/bin/env node
/**
 * Turns environment variables into a TypeScript module the app can import.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  NOTHING HERE IS SECRET, AND NOTHING HERE CAN BE.
 *
 *  This is a static browser build. Every value below is compiled into the
 *  JavaScript that ships to the visitor and is readable in devtools in about
 *  four seconds. Two of the three are printed on the page in any case, and the
 *  form token appears in the form's `action` URL.
 *
 *  So this exists to configure a deployment, not to hide anything: one build
 *  can be pointed at a different inbox or a different number without editing
 *  code, and the owner's details need not sit in git history. Never put an API
 *  key, password or anything genuinely private through this file.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Why generate a file rather than use the builder's `define` option: `define`
 * takes literal values out of angular.json, which cannot read `process.env`.
 * Generating a module works the same way under `ng serve`, `ng test`, `ng build`
 * and on both hosts this site is deployed to, with nothing host-specific.
 *
 * Runs from the `prestart` / `prebuild` / `pretest` npm hooks, which each pass
 * the mode they belong to. Its output is gitignored, so a fresh clone must run
 * one of those before the app compiles.
 *
 * Usage: node tools/generate-env.mjs [--mode development|production]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join('src', 'app', 'core', 'environment.ts');

const MODES = ['development', 'production'];

/**
 * Development unless told otherwise.
 *
 * The safe default matters: an unflagged run is far more likely to be somebody
 * poking at the project than a real deploy, and a dev build that accidentally
 * carries production settings mails the owner's actual inbox.
 */
function readMode() {
  const flag = process.argv.indexOf('--mode');
  const value = flag > -1 ? process.argv[flag + 1] : (process.env.RM_ENV ?? process.env.NODE_ENV);
  if (!value) return 'development';
  if (!MODES.includes(value)) {
    console.error(`env: unknown mode "${value}". Expected one of ${MODES.join(', ')}.`);
    process.exit(1);
  }
  return value;
}

const mode = readMode();
const isProduction = mode === 'production';

/**
 * Defaults for a checkout with no `.env` files at all.
 *
 * `fallback` is the live business detail, so a fresh clone builds a correct
 * production site. `development` overrides it for dev builds, which is how test
 * enquiries reach the developer instead of the business: the split lives here
 * rather than in a `.env.development`, because every `.env*` file is gitignored
 * and would not survive a clone or reach a second machine.
 *
 * Either way an environment variable or a `.env` file still wins over both.
 */
const VARS = [
  {
    name: 'RM_PHONE',
    key: 'phone',
    fallback: '(707) 641-6198',
    note: 'Displayed form. `telHref` derives the dialable form from it.',
  },
  {
    name: 'RM_EMAIL',
    key: 'email',
    fallback: 'roofingsolutionsrm@gmail.com',
    development: 'mdshahajalal168@gmail.com',
    note: 'Public contact address, shown in the footer and linked with mailto:.',
  },
  {
    name: 'RM_FORM_TOKEN',
    key: 'formToken',
    fallback: 'roofingsolutionsrm@gmail.com',
    development: 'mdshahajalal168@gmail.com',
    note: 'FormSubmit endpoint: the destination address, or the random string standing in for it.',
  },
];

/** Minimal `.env` reader. `KEY=value`, `#` comments, optional surrounding quotes. */
function readDotEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const at = line.indexOf('=');
    if (at < 1) continue;
    const key = line.slice(0, at).trim();
    let value = line.slice(at + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/**
 * Lowest priority first, so later files overwrite earlier ones.
 *
 * The `.local` pair is for one developer's own machine — a personal test inbox
 * that should never reach anybody else's checkout, which is why both are
 * gitignored while their shared counterparts can be committed if you want the
 * split visible in the repo.
 */
const FILES = ['.env', '.env.local', `.env.${mode}`, `.env.${mode}.local`];

const fromFiles = {};
const loaded = [];
for (const file of FILES) {
  if (!existsSync(file)) continue;
  Object.assign(fromFiles, readDotEnv(file));
  loaded.push(file);
}

// A real environment variable beats every file, so a host's dashboard always
// wins over something left in a working copy.
const resolve = (name) => process.env[name] ?? fromFiles[name] ?? undefined;

const values = {};
const fellBack = [];

for (const { name, key, fallback, development } of VARS) {
  const found = resolve(name);
  if (found && found.trim()) {
    values[key] = found.trim();
  } else {
    values[key] = !isProduction && development ? development : fallback;
    fellBack.push(name);
  }
}

const body = VARS.map(
  ({ key, note }) => `  /** ${note} */\n  ${key}: ${JSON.stringify(values[key])},`,
).join('\n\n');

writeFileSync(
  OUT,
  `// GENERATED FILE — DO NOT EDIT AND DO NOT COMMIT.
//
// Written by tools/generate-env.mjs from environment variables (or .env files)
// before every build, serve and test run. Change the values in your environment,
// not here; anything typed into this file is overwritten on the next build.
//
// These values ship to the browser in plain text. See the header of
// tools/generate-env.mjs before adding anything else.
export const ENV = {
  /** Which set of settings this build was made with. */
  mode: ${JSON.stringify(mode)},

  /** True only for a production build. Handy for guarding dev-only behaviour. */
  production: ${isProduction},

${body}
} as const;
`,
  'utf8',
);

const source = loaded.length ? loaded.join(' < ') : 'built-in defaults';
console.log(`env: mode=${mode} (${source})`);

if (fellBack.length) {
  const which = isProduction ? 'built-in defaults' : 'built-in development defaults';
  console.log(`env: using ${which} for ${fellBack.join(', ')}`);
}
console.log(`env: estimate form delivers to ${values.formToken}`);

/**
 * A development build aimed at the live inbox.
 *
 * This is no longer the default — dev falls back to the developer's own address
 * — so reaching here means someone put the production value in an environment
 * variable or a `.env` file. That is occasionally deliberate and always worth
 * saying out loud, because the cost is real test enquiries landing in front of
 * the business.
 */
const productionToken = VARS.find((entry) => entry.name === 'RM_FORM_TOKEN')?.fallback;
if (!isProduction && values.formToken === productionToken) {
  console.warn(
    '\n  WARNING: this development build sends estimate enquiries to the LIVE\n' +
      `  business inbox (${productionToken}). Unset RM_FORM_TOKEN to use the\n` +
      '  development address instead.\n',
  );
}

/**
 * The schema.org block in index.html repeats the phone number and the email for
 * search engines, and it is static HTML that no environment variable reaches. If
 * a deployment is pointed at a different number, that block would go on telling
 * Google the old one — wrong in exactly the place that is hardest to notice.
 *
 * Only checked for production: a developer pointing dev at a test address has
 * not broken anything, and warning every serve would train them to ignore it.
 */
if (isProduction && existsSync(join('src', 'index.html'))) {
  const html = readFileSync(join('src', 'index.html'), 'utf8');
  const drift = [];

  const digits = values.phone.replace(/[^0-9]/g, '');
  if (!html.replace(/[^0-9"]/g, '').includes(digits)) drift.push(`phone ${values.phone}`);
  if (!html.includes(values.email)) drift.push(`email ${values.email}`);

  if (drift.length) {
    console.warn(
      `\n  WARNING: src/index.html structured data does not match ${drift.join(' or ')}.\n` +
        '  Search engines read that block, not the app. Update the "telephone" and\n' +
        '  "email" fields in src/index.html to match, or search results will show\n' +
        '  the old details.\n',
    );
  }
}
