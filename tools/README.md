# Tuxemon data generators

Run from repository root:

```bash
node tools/generate-tuxemon-data.js
node tools/generate-tuxemon-runtime-manifests.js
```

## Outputs

- `generate-tuxemon-data.js` writes normalized gameplay bundles into `client/src/data/tuxemon/` (`monsters`, `moves`, `items`, `elements`, `encounters`, `npcs`, `missions`, `maps`, `index`).
- `generate-tuxemon-runtime-manifests.js` writes runtime-loading metadata (`runtimeMapRegistry.json`, `preloadManifest.json`) used by the client map/tileset preload pipeline.
