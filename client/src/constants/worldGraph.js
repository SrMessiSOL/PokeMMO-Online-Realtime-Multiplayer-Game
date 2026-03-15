import WORLD_GRAPH_DATA from "../data/tuxemon/worldGraph.json";

const NODES = Array.isArray(WORLD_GRAPH_DATA?.nodes) ? WORLD_GRAPH_DATA.nodes : [];
const NODE_BY_ID = new Map(NODES.map((node) => [node.id, node]));

export function getMapNode(mapId) {
    return NODE_BY_ID.get(mapId) || null;
}

export function hasMapNode(mapId) {
    return NODE_BY_ID.has(mapId);
}

export function getDefaultSpawnPointForMap(mapId) {
    return getMapNode(mapId)?.defaultSpawnPoint || "Spawn Point";
}

export function getAllowedTransitionsForMap(mapId) {
    const edges = getMapNode(mapId)?.edges;
    return Array.isArray(edges) ? edges : [];
}

export function findTransitionEdge(fromMapId, toMapId) {
    return getAllowedTransitionsForMap(fromMapId).find((edge) => edge.toMap === toMapId) || null;
}

export function isValidMapTransition(fromMapId, toMapId) {
    if (!fromMapId || !toMapId) {
        return false;
    }

    return Boolean(findTransitionEdge(fromMapId, toMapId));
}

export function resolveWorldTransition(fromMapId, worldObject) {
    const targetMapId = worldObject?.name;
    if (!targetMapId) {
        return null;
    }

    const edge = findTransitionEdge(fromMapId, targetMapId);
    if (!edge) {
        return null;
    }

    const worldProperties = Array.isArray(worldObject?.properties) ? worldObject.properties : [];
    const getProperty = (name) => worldProperties.find((property) => property.name === name)?.value;

    return {
        map: targetMapId,
        spawnPointName: getProperty("spawnPoint") || edge.spawnPointName || "Spawn Point",
        playerTexturePosition: getProperty("playerTexturePosition") || edge.facing || "front"
    };
}
