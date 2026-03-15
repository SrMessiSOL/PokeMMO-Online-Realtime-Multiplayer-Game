const tilemapContext = require.context("../assets", true, /\.json$/);

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

    const mapResource = resolveMapResource(tilemapContext(resourcePath));
    if (!mapResource) {
        return manifest;
    }

    manifest[mapId] = mapResource;
    return manifest;
}, {});
