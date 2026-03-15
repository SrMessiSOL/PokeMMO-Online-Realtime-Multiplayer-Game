import PRELOAD_MANIFEST from "../data/tuxemon/preloadManifest.json";

const tilesetContext = require.context("../assets/tilesets", false, /\.(png|jpg|jpeg)$/i);

function resolveAssetUrl(resource) {
    if (typeof resource === "string") {
        return resource;
    }

    if (resource && typeof resource === "object" && typeof resource.default === "string") {
        return resource.default;
    }

    return null;
}

function toResourcePath(runtimeAsset = "") {
    const fileName = runtimeAsset.split("/").pop() || "";
    return `./${fileName}`;
}

const runtimeTilesets = Array.isArray(PRELOAD_MANIFEST?.runtimeLoad?.tilesets)
    ? PRELOAD_MANIFEST.runtimeLoad.tilesets
    : [];

export const TILESET_MANIFEST = runtimeTilesets.reduce((manifest, tilesetEntry) => {
    const resourcePath = toResourcePath(tilesetEntry?.runtimeAsset);

    if (!tilesetContext.keys().includes(resourcePath)) {
        return manifest;
    }

    const assetUrl = resolveAssetUrl(tilesetContext(resourcePath));
    if (!assetUrl) {
        return manifest;
    }

    manifest[tilesetEntry.key] = assetUrl;
    return manifest;
}, {});
