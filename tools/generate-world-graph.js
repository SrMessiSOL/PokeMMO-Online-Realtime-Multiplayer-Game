#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TILEMAPS_DIR = path.join(ROOT, 'client', 'src', 'assets', 'tilemaps');
const RUNTIME_REGISTRY_PATH = path.join(ROOT, 'client', 'src', 'data', 'tuxemon', 'runtimeMapRegistry.json');
const OUT_PATH = path.join(ROOT, 'client', 'src', 'data', 'tuxemon', 'worldGraph.json');

function listJsonMaps() {
  return fs.readdirSync(TILEMAPS_DIR)
    .filter((name) => name.endsWith('.json'))
    .map((name) => path.join(TILEMAPS_DIR, name))
    .sort((a, b) => a.localeCompare(b));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getPropertyValue(object, propertyName) {
  const property = (object?.properties || []).find((entry) => entry.name === propertyName);
  return property?.value;
}

function main() {
  const runtimeRegistry = fs.existsSync(RUNTIME_REGISTRY_PATH) ? readJson(RUNTIME_REGISTRY_PATH) : [];
  const runtimeMapIds = new Set((Array.isArray(runtimeRegistry) ? runtimeRegistry : []).map((entry) => entry.id));

  const mapFiles = listJsonMaps();
  const mapNodes = [];

  mapFiles.forEach((filePath) => {
    const mapId = path.basename(filePath, '.json');
    const payload = readJson(filePath);
    const worldLayer = (payload.layers || []).find((layer) => layer.type === 'objectgroup' && layer.name === 'Worlds');
    const spawnLayer = (payload.layers || []).find((layer) => layer.type === 'objectgroup' && layer.name === 'SpawnPoints');

    const spawnPoints = (spawnLayer?.objects || []).map((entry) => entry.name).filter(Boolean).sort((a, b) => a.localeCompare(b));

    const edges = (worldLayer?.objects || []).map((worldObject) => ({
      toMap: worldObject.name,
      spawnPointName: getPropertyValue(worldObject, 'spawnPoint') || 'Spawn Point',
      facing: getPropertyValue(worldObject, 'playerTexturePosition') || 'front',
      triggerName: worldObject.name,
      triggerBounds: {
        x: Math.round(worldObject.x || 0),
        y: Math.round(worldObject.y || 0),
        width: Math.round(worldObject.width || 0),
        height: Math.round(worldObject.height || 0)
      }
    }))
      .filter((edge) => Boolean(edge.toMap))
      .sort((a, b) => a.toMap.localeCompare(b.toMap));

    mapNodes.push({
      id: mapId,
      isRuntimeMap: runtimeMapIds.has(mapId),
      defaultSpawnPoint: spawnPoints.includes('Spawn Point') ? 'Spawn Point' : (spawnPoints[0] || 'Spawn Point'),
      spawnPoints,
      edges
    });
  });

  mapNodes.sort((a, b) => a.id.localeCompare(b.id));

  const graph = {
    generatedFrom: 'tilemap-world-objects',
    nodeCount: mapNodes.length,
    edgeCount: mapNodes.reduce((total, node) => total + node.edges.length, 0),
    nodes: mapNodes
  };

  fs.writeFileSync(OUT_PATH, `${JSON.stringify(graph, null, 2)}\n`, 'utf8');
  console.log(`Generated world graph nodes=${graph.nodeCount} edges=${graph.edgeCount}`);
}

main();
