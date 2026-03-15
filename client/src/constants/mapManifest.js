import RUNTIME_MAP_REGISTRY from "../data/tuxemon/runtimeMapRegistry.json";

const tilemapContext = require.context("../assets/tilemaps", false, /\.json$/);

function resolveMapResource(resource) {
    if (!resource) {
        return null;
    }

    if (typeof resource === "string") {
        return resource;
    }

    if (typeof resource === "object" && resource.default) {
        return resource.default;
    }

    return resource;
}

function runtimeAssetToMapId(runtimeAsset = "") {
    const fileName = runtimeAsset.split("/").pop() || "";
    return fileName.replace(/\.json$/, "");
}

export const MAP_REGISTRY = Array.isArray(RUNTIME_MAP_REGISTRY)
    ? RUNTIME_MAP_REGISTRY
    : [];

export const MAP_MANIFEST = MAP_REGISTRY.reduce((manifest, entry) => {
    if (!entry?.runtimeAsset || entry.runtimeFormat !== "tiled-json") {
        return manifest;
    }

    const mapId = runtimeAssetToMapId(entry.runtimeAsset) || entry.id;
    const resourcePath = `./${mapId}.json`;

    if (!tilemapContext.keys().includes(resourcePath)) {
        return manifest;
    }

    const mapResource = resolveMapResource(tilemapContext(resourcePath));
    if (!mapResource) {
        return manifest;
    }

    manifest[entry.id] = mapResource;
    return manifest;
}, {});
