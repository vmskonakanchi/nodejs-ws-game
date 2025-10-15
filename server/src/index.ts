import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';

const app = express();
const port = parseInt(process.env.PORT || "5000");
const maxClients = parseInt(process.env.MAX_CLIENTS || "10");

const server = app.listen(port, () => {
    console.log(`Game server is listening on ${port}`);
})

const wss = new WebSocketServer({ server });

interface IPlayer {
    socket: WebSocket;
    pos: { x: number, y: number };
    color: string;
    speed: number;
    id: number;
}

const clients: Record<string, IPlayer> = {};

let playerCounter = 1;


const generateRandomPos = (boundX: number, boundY: number) => {
    return {
        x: Math.random() * boundX,
        y: Math.random() * boundY,
    };
};


const getRandomColor = () => {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `rgb(${r}, ${g}, ${b})`;
}

wss.on("connection", (socket, req) => {
    const searchParams = new URLSearchParams(req.url?.replace("/", ""));

    const boundX = parseInt(searchParams.get("width") || "500");
    const boundY = parseInt(searchParams.get("height") || "500");

    const newPlayer: IPlayer = { pos: generateRandomPos(boundX, boundY), socket, color: getRandomColor(), speed: 5, id: playerCounter };

    if (Object.entries(clients).length >= maxClients) {
        console.log(`Max clients reached`);
        return;
    }

    const exitingSocket = findPlayerBySocket(socket);

    if (exitingSocket) {
        // we have an existing client
        return;
    }

    console.log(`New client connected`);

    const playerId = playerCounter;
    socket.send(JSON.stringify({ id: playerCounter, type: "REGISTER" }));
    clients[playerCounter] = newPlayer;
    playerCounter++;

    // FIRST: Send all EXISTING players to the NEW client
    for (const id in clients) {
        const client = clients[id];
        if (!client) continue;
        socket.send(JSON.stringify({
            type: "NEW_PLAYER",
            pos: client.pos,
            color: client.color,
            id: client.id,
        }));
    }

    // THEN: Broadcast the NEW player to all OTHER clients (not to themselves again)
    for (const id in clients) {
        if (id == playerId.toString()) continue; // Skip the new player
        const client = clients[id];
        if (!client) continue;

        console.log(`Broadcasting NEW player to ${id}`);

        client.socket.send(JSON.stringify({
            type: "NEW_PLAYER",
            pos: newPlayer.pos,
            color: newPlayer.color,
            id: newPlayer.id,
        }));
    }

    socket.on("message", (data: string) => {
        const clientData = JSON.parse(data);

        if (!clientData.type) return;

        switch (clientData.type) {
            case "MOVE":
                const { id, dir } = clientData;
                const currentClient = clients[id];

                if (!currentClient) return;

                switch (dir) {
                    case "w":
                        currentClient.pos.y -= currentClient.speed;
                        break;
                    case "a":
                        currentClient.pos.x -= currentClient.speed;
                        break;
                    case "s":
                        currentClient.pos.y += currentClient.speed;
                        break;
                    case "d":
                        currentClient.pos.x += currentClient.speed;
                        break;

                    case "ArrowUp":
                        currentClient.pos.y -= currentClient.speed;
                        break;
                    case "ArrowLeft":
                        currentClient.pos.x -= currentClient.speed;
                        break;
                    case "ArrowDown":
                        currentClient.pos.y += currentClient.speed;
                        break;
                    case "ArrowRight":
                        currentClient.pos.x += currentClient.speed;
                        break;
                    default:
                        console.log(`Unknow direction ${dir}`)
                        break;
                }
                // broadcast(id, { type: "STATE", clients: Object.entries(clients).map(([id, player]) => player) });
                broadcast(id, { type: "STATE", state: Object.entries(clients).map(([_, player]) => ({ pos: player.pos, id: player.id })) });
                break;

            default:
                break;
        }
    });

    socket.on("close", () => {
        console.log("Client disconnected");

        for (const [id, player] of Object.entries(clients)) {
            if (player.socket === socket) {
                delete clients[id];
            }
        }
    })
});

const broadcast = (except: string, msg: Record<string, string | any>) => {
    // Broadcast the NEW player to all OTHER clients (not to themselves again)
    for (const id in clients) {
        const client = clients[id];
        if (!client) continue;
        client.socket.send(JSON.stringify(msg));
    }
}

const findPlayerBySocket = (sock: WebSocket) => Object.entries(clients).map(([id, client]) => client.socket).find(c => c === sock);