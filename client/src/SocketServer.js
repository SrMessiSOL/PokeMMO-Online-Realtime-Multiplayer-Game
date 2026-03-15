import * as Colyseus from "colyseus.js";

/*================================================
| Array with current online players
*/
let onlinePlayers = {};

const SOCKET_PROTOCOL = window.location.protocol === "https:" ? "wss" : "ws";
const SOCKET_HOST = window.location.hostname;
const SOCKET_PORT = 3000;
const SOCKET_URL = `${SOCKET_PROTOCOL}://${SOCKET_HOST}:${SOCKET_PORT}`;

/*================================================
| Colyseus connection with server
*/
const client = new Colyseus.Client(SOCKET_URL);
let roomPromise = null;

function connectToWorld() {
    if (roomPromise) {
        return roomPromise;
    }

    roomPromise = client.joinOrCreate("poke_world")
        .then((connectedRoom) => {
            console.log(connectedRoom.sessionId, "joined", connectedRoom.name);
            return connectedRoom;
        })
        .catch((error) => {
            roomPromise = null;
            console.log("JOIN ERROR", error);
            throw error;
        });

    return roomPromise;
}

async function disconnectFromWorld() {
    if (!roomPromise) {
        return;
    }

    try {
        const activeRoom = await roomPromise;
        await activeRoom.leave(true);
    } catch (error) {
        console.warn("LEAVE ERROR", error);
    } finally {
        roomPromise = null;
        onlinePlayers = {};
    }
}

connectToWorld();

export { onlinePlayers, connectToWorld, disconnectFromWorld };
