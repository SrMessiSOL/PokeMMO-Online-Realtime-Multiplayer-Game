const tilesetContext = require.context("../assets", true, /\.(png|jpg|jpeg)$/i);

function resolveAssetUrl(resource) {
    if (typeof resource === "string") {
        return resource;
    }

    if (resource && typeof resource === "object" && typeof resource.default === "string") {
        return resource.default;
    }

    return null;
}

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

    const assetUrl = resolveAssetUrl(tilesetContext(resourcePath));
    if (!assetUrl) {
        return manifest;
    }

    manifest[tilesetKey] = assetUrl;
    return manifest;
}, {});
