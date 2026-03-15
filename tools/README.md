# Tuxemon data generators

Run from repository root:

```bash
node tools/generate-tuxemon-data.js
node tools/generate-tuxemon-runtime-manifests.js
node tools/generate-world-graph.js
```

## Outputs

- `generate-tuxemon-data.js` writes normalized gameplay bundles into `client/src/data/tuxemon/` (`monsters`, `moves`, `items`, `elements`, `encounters`, `npcs`, `missions`, `maps`, `index`).
- `generate-tuxemon-runtime-manifests.js` writes runtime-loading metadata (`runtimeMapRegistry.json`, `preloadManifest.json`) used by the client map/tileset preload pipeline.

- `generate-world-graph.js` writes `worldGraph.json` by extracting map nodes, spawn points, and world-transition edges from runtime tilemap object layers.
