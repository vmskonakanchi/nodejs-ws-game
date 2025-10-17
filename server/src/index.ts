import express from 'express';
import { WebSocketServer } from 'ws';
import { generateRandomPos, getRandomColor } from '@/utils';
import { Entity } from '@/entity';
import { EntityManager } from '@/entity-manager';
import { ICoord } from '@/types';

const app = express();
const port = parseInt(process.env.PORT || "5000");

const FPS_60 = 16; // 16ms gives 60 frames per second
const FPS_30 = 33; // 33ms gives 30 frames per second

const server = app.listen(port, () => {
    console.log(`Game server is listening on ${port}`);
})

const wss = new WebSocketServer({ server });

const entityManager = EntityManager.getInstance();

wss.on("connection", (socket, req) => {
    const searchParams = new URLSearchParams(req.url?.replace("/", ""));

    const world: ICoord = {
        x: parseInt(searchParams.get("width") || "500"),
        y: parseInt(searchParams.get("height") || "500"),
    }

    const randmPos = generateRandomPos(world.x, world.y);
    const randomColor = getRandomColor();

    const exitingSocket = entityManager.findEntityBySocket(socket);

    if (exitingSocket) {
        // we have an existing client
        console.log(`Client is already connected`)
        return;
    }

    console.log(`New client connected`);

    entityManager.addEntity(socket, randmPos, randomColor, world);

    socket.on("message", (data: string) => {
        const clientData = JSON.parse(data);

        if (!clientData.type) return;

        switch (clientData.type) {
            case "MOVE":
                const { id, dir } = clientData;
                entityManager.moveEntity(id, dir);
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
    // Step 1: Update ALL entity' physics first
    entityManager.update();

    // STEP 2: Checking entity collissions
    entityManager.checkForCollisions();

    // STEP 3: Broadcast the state to clients
    entityManager.broadcastState();
}, FPS_60);


process.on("beforeexit", () => {
    // cleanup all the variables
    clearInterval(gameLoop);
})