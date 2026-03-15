const tilemapContext = require.context("../assets", true, /\.json$/);

function getMapId(resourcePath) {
    const normalizedPath = resourcePath.replace("./", "");
    if (!normalizedPath.includes("tilemaps/")) {
        return null;
    }

    const fileName = normalizedPath.split("/").pop() || "";
    return fileName.replace(/\.json$/, "") || null;
}

export const MAP_MANIFEST = tilemapContext.keys().reduce((manifest, resourcePath) => {
    const mapId = getMapId(resourcePath);
    if (!mapId) {
        return manifest;
    }

    manifest[mapId] = tilemapContext(resourcePath);
    return manifest;
}, {});
