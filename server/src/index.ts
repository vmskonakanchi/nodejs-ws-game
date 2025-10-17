import express from 'express';
import { WebSocketServer } from 'ws';
import { generateRandomPos, getRandomColor } from '@/utils';
import { Entity } from '@/entity';
import { EntityManager } from '@/entity-manager';

const app = express();
const port = parseInt(process.env.PORT || "5000");

const server = app.listen(port, () => {
    console.log(`Game server is listening on ${port}`);
})

const wss = new WebSocketServer({ server });

const entityManager = new EntityManager();

let playerCounter = 1;

wss.on("connection", (socket, req) => {
    const searchParams = new URLSearchParams(req.url?.replace("/", ""));

    const boundX = parseInt(searchParams.get("width") || "500");
    const boundY = parseInt(searchParams.get("height") || "500");

    const newEntity = new Entity(socket, generateRandomPos(boundX, boundY), getRandomColor(), playerCounter);

    const exitingSocket = entityManager.findEntityBySocket(socket);

    if (exitingSocket) {
        // we have an existing client
        return;
    }

    console.log(`New client connected`);

    const playerId = playerCounter;
    newEntity.send({ id: playerCounter, type: "REGISTER" });
    entityManager.addEntity(playerCounter, newEntity);
    playerCounter++;

    // FIRST: Send all EXISTING players to the NEW client
    entityManager.broadCastEntityToAllEntities(newEntity);

    // THEN: Broadcast the NEW player to all OTHER clients except itseld
    entityManager.broadCastEntityToAllEntitiesExcept(newEntity, playerId);

    socket.on("message", (data: string) => {
        const clientData = JSON.parse(data);

        if (!clientData.type) return;

        switch (clientData.type) {
            case "MOVE":
                const { id, dir } = clientData;
                const currentClient = entityManager.findEntityById(id);
                if (!currentClient) return;
                currentClient.move(dir);
                break;

            default:
                break;
        }
    });

    socket.on("close", () => {
        console.log("Client disconnected");
        entityManager.deleteEntityBySocket(socket);
    })
});

// Server game loop
const gameLoop = setInterval(() => {
    // Step 1: Update ALL players' physics first
    entityManager.update();

    entityManager.broadcastState();
}, 16); // Also changed to 16ms for ~60 FPS


process.on("beforeexit", () => {
    // cleanup all the variables
    clearInterval(gameLoop);
})