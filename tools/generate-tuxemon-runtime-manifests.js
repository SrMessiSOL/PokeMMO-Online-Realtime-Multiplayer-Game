#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TUXEMON_ROOT = path.join(ROOT, 'tuxemon');
const CLIENT_TILEMAPS_DIR = path.join(ROOT, 'client', 'src', 'assets', 'tilemaps');
const CLIENT_TILESETS_DIR = path.join(ROOT, 'client', 'src', 'assets', 'tilesets');
const OUT_DIR = path.join(ROOT, 'client', 'src', 'data', 'tuxemon');

function listFiles(dirPath, exts = []) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath)
    .map((name) => path.join(dirPath, name))
    .filter((p) => fs.statSync(p).isFile())
    .filter((p) => exts.length === 0 || exts.includes(path.extname(p).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
}

function walkFiles(dirPath, exts = []) {
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath, exts));
    } else if (exts.length === 0 || exts.includes(path.extname(fullPath).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function stableWrite(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function buildRuntimeMapRegistry() {
  const allTuxemonMapIds = new Set(readJson(path.join(OUT_DIR, 'maps.json')).map((m) => m.id));
  const runtimeTilemaps = listFiles(CLIENT_TILEMAPS_DIR, ['.json']);

  return runtimeTilemaps.map((filePath) => {
    const id = path.basename(filePath, '.json');
    const hasTuxemonSource = allTuxemonMapIds.has(id);
    return {
      id,
      runtimeFormat: 'tiled-json',
      runtimeAsset: `tilemaps/${path.basename(filePath)}`,
      source: hasTuxemonSource ? `tuxemon/maps/${id}` : null,
      defaultTilesetKey: 'tuxmon-sample-32px-extruded',
      spawnPointName: 'Spawn Point',
      traversable: true
    };
  }).sort((a, b) => a.id.localeCompare(b.id));
}

function buildPreloadManifest(runtimeMapRegistry) {
  const runtimeTilesets = listFiles(CLIENT_TILESETS_DIR, ['.png', '.jpg', '.jpeg']).map((filePath) => ({
    key: path.basename(filePath, path.extname(filePath)),
    runtimeAsset: `tilesets/${path.basename(filePath)}`
  }));

  const mapAssets = runtimeMapRegistry.map((entry) => ({
    key: entry.id,
    runtimeAsset: entry.runtimeAsset,
    format: entry.runtimeFormat
  }));

  const spriteAssets = walkFiles(path.join(TUXEMON_ROOT, 'sprites'), ['.png']).map((filePath) => path.relative(ROOT, filePath));
  const uiAssets = walkFiles(path.join(TUXEMON_ROOT, 'gfx', 'ui'), ['.png']).map((filePath) => path.relative(ROOT, filePath));
  const sfxAssets = walkFiles(path.join(TUXEMON_ROOT, 'sounds'), ['.ogg', '.wav', '.mp3']).map((filePath) => path.relative(ROOT, filePath));
  const musicAssets = walkFiles(path.join(TUXEMON_ROOT, 'music'), ['.ogg', '.wav', '.mp3']).map((filePath) => path.relative(ROOT, filePath));

  return {
    generatedFrom: 'tuxemon',
    runtimeLoad: {
      mapAssets,
      tilesets: runtimeTilesets
    },
    catalogOnly: {
      sprites: spriteAssets,
      ui: uiAssets,
      sfx: sfxAssets,
      music: musicAssets
    }
  };
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const runtimeMapRegistry = buildRuntimeMapRegistry();
  const preloadManifest = buildPreloadManifest(runtimeMapRegistry);

  stableWrite(path.join(OUT_DIR, 'runtimeMapRegistry.json'), runtimeMapRegistry);
  stableWrite(path.join(OUT_DIR, 'preloadManifest.json'), preloadManifest);

  console.log(`Generated runtime map registry entries: ${runtimeMapRegistry.length}`);
  console.log(`Generated preload tilesets: ${preloadManifest.runtimeLoad.tilesets.length}`);
}

main();
