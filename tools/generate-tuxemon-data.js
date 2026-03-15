#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DB_ROOT = path.join(ROOT, 'tuxemon', 'db');
const MAPS_ROOT = path.join(ROOT, 'tuxemon', 'maps');
const OUT_ROOT = path.join(ROOT, 'client', 'src', 'data', 'tuxemon');

function listFiles(dirPath, extensions = []) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath)
    .map((name) => path.join(dirPath, name))
    .filter((fullPath) => fs.statSync(fullPath).isFile())
    .filter((fullPath) => extensions.length === 0 || extensions.includes(path.extname(fullPath).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function toTitleCase(input = '') {
  return input
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function stableWriteJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function parseElements() {
  const elementFiles = listFiles(path.join(DB_ROOT, 'element'), ['.yaml', '.yml']);

  return elementFiles.map((filePath) => {
    const raw = readText(filePath);
    const slug = (raw.match(/^slug:\s*([^\n#]+)$/m)?.[1] || path.basename(filePath, path.extname(filePath))).trim();
    const icon = (raw.match(/^icon:\s*([^\n#]+)$/m)?.[1] || '').trim() || null;
    const matchups = [];

    const lines = raw.split(/\r?\n/);
    let currentAgainst = null;
    lines.forEach((line) => {
      const against = line.match(/^\s*-\s*against:\s*([^\n#]+)$/);
      if (against) {
        currentAgainst = against[1].trim();
        return;
      }

      const multiplier = line.match(/^\s*multiplier:\s*([0-9.]+)$/);
      if (multiplier && currentAgainst) {
        matchups.push({ against: currentAgainst, multiplier: Number(multiplier[1]) });
        currentAgainst = null;
      }
    });

    return {
      slug,
      name: toTitleCase(slug),
      icon,
      matchups,
      source: path.relative(ROOT, filePath)
    };
  }).sort((a, b) => a.slug.localeCompare(b.slug));
}

function parseMoves(elementsBySlug) {
  const files = listFiles(path.join(DB_ROOT, 'technique'), ['.json']);
  return files.map((filePath, index) => {
    const raw = readJson(filePath);
    const slug = raw.slug || path.basename(filePath, '.json');
    const typeSlug = Array.isArray(raw.types) && raw.types.length ? raw.types[0] : 'neutral';
    const resolvedTypeName = elementsBySlug.get(typeSlug)?.name || toTitleCase(typeSlug);
    const pp = Math.max(1, Number(raw.recharge) || 1);

    return {
      id: Number(raw.tech_id) || index + 1,
      slug,
      displayName: toTitleCase(slug),
      typeSlug,
      type: resolvedTypeName,
      damageClass: raw.sort === 'damage' ? 'physical' : 'status',
      category: raw.sort === 'damage' ? 'physical' : 'status',
      power: raw.power == null ? null : Math.max(0, Math.round(Number(raw.power) * 100)),
      accuracy: raw.accuracy == null ? null : Math.max(0, Math.round(Number(raw.accuracy) * 100)),
      pp,
      maxPp: pp,
      currentPp: pp,
      desc: raw.description || '',
      source: path.relative(ROOT, filePath)
    };
  }).sort((a, b) => a.id - b.id || a.slug.localeCompare(b.slug));
}

function parseMonsters(elementsBySlug, movesBySlug) {
  const files = listFiles(path.join(DB_ROOT, 'monster'), ['.json']);
  return files.map((filePath, index) => {
    const raw = readJson(filePath);
    const slug = raw.slug || path.basename(filePath, '.json');
    const types = (Array.isArray(raw.types) ? raw.types : [])
      .map((typeSlug) => elementsBySlug.get(typeSlug)?.name || toTitleCase(typeSlug));

    const moveRefs = [];
    for (const moveSetEntry of (raw.moveset || [])) {
      const moveSlug = moveSetEntry?.technique;
      if (!moveSlug || moveRefs.some((entry) => entry.slug === moveSlug)) {
        continue;
      }
      const move = movesBySlug.get(moveSlug);
      if (move) {
        moveRefs.push({ id: move.id, slug: move.slug });
      }
      if (moveRefs.length >= 4) break;
    }

    const base = 40 + ((raw.evolutions || []).length * 5);

    return {
      id: index + 1,
      externalId: raw.txmn_id ?? null,
      slug,
      name: toTitleCase(slug),
      type: types.length ? types : ['Neutral'],
      typeSlugs: Array.isArray(raw.types) ? raw.types : [],
      height: raw.height ?? 0,
      weight: raw.weight ?? 0,
      category: toTitleCase(raw.species || ''),
      description: `${toTitleCase(slug)} from the Tuxemon content pack.`,
      localizedDex: {
        en: {
          name: toTitleCase(slug),
          category: toTitleCase(raw.species || ''),
          description: `${toTitleCase(slug)} from Tuxemon.`
        },
        de: {
          name: toTitleCase(slug),
          category: toTitleCase(raw.species || ''),
          description: `${toTitleCase(slug)} from Tuxemon.`
        }
      },
      baseStats: {
        hp: base,
        attack: base,
        defense: base,
        spAtk: base,
        spDef: base,
        speed: base
      },
      moves: moveRefs,
      source: path.relative(ROOT, filePath)
    };
  }).sort((a, b) => a.id - b.id || a.slug.localeCompare(b.slug));
}

function parseItems() {
  const files = listFiles(path.join(DB_ROOT, 'item'), ['.json']);
  return files.map((filePath) => {
    const raw = readJson(filePath);
    const slug = raw.slug || path.basename(filePath, '.json');
    return {
      id: slug,
      slug,
      name: toTitleCase(slug),
      category: 'Items',
      quantity: 0,
      holdable: Boolean(raw.holdable),
      effect: raw.effects || {},
      desc: raw.description || '',
      source: path.relative(ROOT, filePath)
    };
  }).sort((a, b) => a.slug.localeCompare(b.slug));
}

function parseJsonCollection(folderName) {
  const files = listFiles(path.join(DB_ROOT, folderName), ['.json']);
  return files.map((filePath) => {
    const raw = readJson(filePath);
    const slug = raw.slug || path.basename(filePath, '.json');
    return {
      slug,
      source: path.relative(ROOT, filePath),
      data: raw
    };
  }).sort((a, b) => a.slug.localeCompare(b.slug));
}

function parseYamlCollection(folderName) {
  const files = listFiles(path.join(DB_ROOT, folderName), ['.yaml', '.yml']);
  return files.map((filePath) => ({
    slug: path.basename(filePath, path.extname(filePath)),
    format: 'yaml',
    source: path.relative(ROOT, filePath),
    raw: readText(filePath)
  })).sort((a, b) => a.slug.localeCompare(b.slug));
}

function parseMaps() {
  const files = listFiles(MAPS_ROOT, []);
  return files.map((filePath) => ({
    id: path.basename(filePath, path.extname(filePath)),
    file: path.basename(filePath),
    ext: path.extname(filePath).replace('.', '').toLowerCase(),
    source: path.relative(ROOT, filePath)
  })).sort((a, b) => a.id.localeCompare(b.id));
}

function validateBundle(name, collection, requiredKeys) {
  assert(Array.isArray(collection), `${name} must be an array`);
  collection.forEach((entry, index) => {
    requiredKeys.forEach((key) => {
      assert(Object.prototype.hasOwnProperty.call(entry, key), `${name}[${index}] missing key: ${key}`);
    });
  });
}

function main() {
  fs.mkdirSync(OUT_ROOT, { recursive: true });

  const elements = parseElements();
  const elementsBySlug = new Map(elements.map((entry) => [entry.slug, entry]));

  const moves = parseMoves(elementsBySlug);
  const movesBySlug = new Map(moves.map((entry) => [entry.slug, entry]));

  const monsters = parseMonsters(elementsBySlug, movesBySlug);
  const items = parseItems();
  const encounters = parseYamlCollection('encounter');
  const npcs = parseJsonCollection('npc');
  const missions = parseYamlCollection('mission');
  const maps = parseMaps();

  validateBundle('elements', elements, ['slug', 'name', 'source']);
  validateBundle('moves', moves, ['id', 'slug', 'type', 'source']);
  validateBundle('monsters', monsters, ['id', 'slug', 'name', 'moves', 'source']);
  validateBundle('items', items, ['id', 'slug', 'name', 'source']);
  validateBundle('encounters', encounters, ['slug', 'format', 'source', 'raw']);
  validateBundle('npcs', npcs, ['slug', 'source', 'data']);
  validateBundle('missions', missions, ['slug', 'format', 'source', 'raw']);
  validateBundle('maps', maps, ['id', 'file', 'ext', 'source']);

  stableWriteJson(path.join(OUT_ROOT, 'elements.json'), elements);
  stableWriteJson(path.join(OUT_ROOT, 'moves.json'), moves);
  stableWriteJson(path.join(OUT_ROOT, 'monsters.json'), monsters);
  stableWriteJson(path.join(OUT_ROOT, 'items.json'), items);
  stableWriteJson(path.join(OUT_ROOT, 'encounters.json'), encounters);
  stableWriteJson(path.join(OUT_ROOT, 'npcs.json'), npcs);
  stableWriteJson(path.join(OUT_ROOT, 'missions.json'), missions);
  stableWriteJson(path.join(OUT_ROOT, 'maps.json'), maps);

  const index = {
    generatedFrom: 'tuxemon',
    counts: {
      monsters: monsters.length,
      moves: moves.length,
      items: items.length,
      elements: elements.length,
      encounters: encounters.length,
      npcs: npcs.length,
      missions: missions.length,
      maps: maps.length
    }
  };
  stableWriteJson(path.join(OUT_ROOT, 'index.json'), index);

  console.log('Generated tuxemon bundles:', index.counts);
}

main();
