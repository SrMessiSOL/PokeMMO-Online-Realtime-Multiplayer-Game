const tilesetContext = require.context("../assets", true, /\.(png|jpg|jpeg)$/i);

function getTilesetKey(resourcePath) {
    const normalizedPath = resourcePath.replace("./", "");
    if (!normalizedPath.includes("tilesets/")) {
        return null;
    }

    const fileName = normalizedPath.split("/").pop() || "";
    return fileName.replace(/\.[^/.]+$/, "") || null;
}

export const TILESET_MANIFEST = tilesetContext.keys().reduce((manifest, resourcePath) => {
    const tilesetKey = getTilesetKey(resourcePath);
    if (!tilesetKey) {
        return manifest;
    }

    manifest[tilesetKey] = tilesetContext(resourcePath);
    return manifest;
}, {});
