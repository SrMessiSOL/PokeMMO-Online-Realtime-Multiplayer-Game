#!/usr/bin/env node
/*
 * Normalize monster JSON files into this project's shared schema.
 *
 * Supports multiple source layouts so you can combine imports from
 * Tuxemon + SolaMon style repos into one normalized output directory.
 *
 * Usage examples:
 *   node tools/import-tuxemon/importMonsters.js \
 *     --source /path/to/tuxemon/data/db/monster \
 *     --sourceType tuxemon \
 *     --target ./shared/data/monsters
 *
 *   node tools/import-tuxemon/importMonsters.js \
 *     --source /path/to/solamon/monsters \
 *     --sourceType solamon \
 *     --target ./shared/data/monsters \
 *     --idPrefix solamon
 */

const fs = require('fs');
const path = require('path');

function getArg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) {
    return fallback;
  }

  return process.argv[index + 1];
}

function asInt(value, fallback) {
  return Number.isInteger(value) ? value : fallback;
}

function slugify(input) {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeFromTuxemon(raw, fallbackId) {
  const id = raw.slug || raw.id || fallbackId;
  return {
    id,
    name: raw.name,
    types: Array.isArray(raw.types) ? raw.types : [],
    baseStats: {
      hp: asInt(raw.hp, 10),
      atk: asInt(raw.attack, 5),
      def: asInt(raw.defense, 5),
      spd: asInt(raw.speed, 5)
    },
    learnset: Array.isArray(raw.moves) ? raw.moves : [],
    sprite: raw.sprite || null
  };
}

function normalizeFromSolaMon(raw, fallbackId) {
  const stats = raw.baseStats || raw.stats || {};
  const moveList = raw.learnset || raw.moves || raw.skills || [];
  const primaryName = raw.name || raw.displayName || raw.monsterName;
  const id = raw.id || raw.slug || (primaryName ? slugify(primaryName) : fallbackId);

  return {
    id,
    name: primaryName,
    types: Array.isArray(raw.types)
      ? raw.types
      : (Array.isArray(raw.type) ? raw.type : (raw.type ? [raw.type] : [])),
    baseStats: {
      hp: asInt(stats.hp, asInt(raw.hp, 10)),
      atk: asInt(stats.atk, asInt(stats.attack, asInt(raw.attack, 5))),
      def: asInt(stats.def, asInt(stats.defense, asInt(raw.defense, 5))),
      spd: asInt(stats.spd, asInt(stats.speed, asInt(raw.speed, 5)))
    },
    learnset: Array.isArray(moveList) ? moveList : [],
    sprite: raw.sprite || raw.image || null
  };
}

const sourceDir = getArg('--source', process.env.MONSTER_SOURCE_DIR);
const sourceType = (getArg('--sourceType', process.env.MONSTER_SOURCE_TYPE) || 'tuxemon').toLowerCase();
const targetDir = getArg('--target', path.resolve(process.cwd(), 'shared/data/monsters'));
const idPrefix = getArg('--idPrefix', '').trim();
const overwrite = getArg('--overwrite', 'true').toLowerCase() !== 'false';

if (!sourceDir) {
  console.error('Missing --source argument (or MONSTER_SOURCE_DIR env var).');
  process.exit(1);
}

if (!['tuxemon', 'solamon'].includes(sourceType)) {
  console.error(`Unsupported --sourceType: ${sourceType}. Expected "tuxemon" or "solamon".`);
  process.exit(1);
}

if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
  console.error(`Source directory does not exist or is not a directory: ${sourceDir}`);
  process.exit(1);
}

fs.mkdirSync(targetDir, { recursive: true });

const files = fs.readdirSync(sourceDir).filter((name) => name.endsWith('.json'));

if (!files.length) {
  console.warn(`No JSON files found in source directory: ${sourceDir}`);
}

let imported = 0;
let skipped = 0;
let conflicts = 0;

for (const fileName of files) {
  const filePath = path.join(sourceDir, fileName);

  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const fallbackId = fileName.replace(/\.json$/i, '');
    const normalized = sourceType === 'solamon'
      ? normalizeFromSolaMon(raw, fallbackId)
      : normalizeFromTuxemon(raw, fallbackId);

    if (!normalized.id || !normalized.name) {
      skipped += 1;
      console.warn(`Skipping ${fileName}: missing required id/name fields after normalization.`);
      continue;
    }

    normalized.id = idPrefix ? `${idPrefix}-${normalized.id}` : normalized.id;

    const outFile = path.join(targetDir, `${normalized.id}.json`);
    if (!overwrite && fs.existsSync(outFile)) {
      conflicts += 1;
      console.warn(`Conflict ${fileName}: output already exists (${outFile}); skipping due to --overwrite false.`);
      continue;
    }

    fs.writeFileSync(outFile, JSON.stringify(normalized, null, 2));
    imported += 1;
  } catch (error) {
    skipped += 1;
    console.warn(`Skipping ${fileName}: ${error.message}`);
  }
}

console.log(
  `Monster import complete. SourceType: ${sourceType}. Imported: ${imported}. Skipped: ${skipped}. Conflicts: ${conflicts}. Output: ${targetDir}`
);
