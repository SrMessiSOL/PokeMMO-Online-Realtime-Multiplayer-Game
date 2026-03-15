const tilemapContext = require.context("../assets/tilemaps", false, /\.json$/);

export const MAP_MANIFEST = tilemapContext.keys().reduce((manifest, relativePath) => {
    const mapName = relativePath.replace("./", "").replace(/\.json$/, "");
    manifest[mapName] = tilemapContext(relativePath);
    return manifest;
}, {});
