import type { WebSocket } from "ws";
import type { Entity } from "@/entity";

export class EntityManager {
    private entities: Record<number, Entity>;
    private entityCount: number;
    private static instance: EntityManager;

    constructor(entities = {}) {
        this.entities = entities;

        if (entities) {
            this.entityCount = Object.entries(this.entities).length;
        } else {
            this.entityCount = 0;
        }
    }

    public static getInstance() {
        // singleton pattern for the entity manager

        if (!this.instance) {
            this.instance = new EntityManager();
        }
        return this.instance;
    }

    public getCount = () => this.entityCount;
    public getState = () => Object.entries(this.entities).map(([_, entity]) => entity.getJson());

    public findEntityBySocket = (sock: WebSocket) => Object.entries(this.entities).map(([_, client]) => client.getSocket()).find(c => c === sock);

    public findEntityById = (id: number) => this.entities[id];

    public deleteEntityBySocket = (socket: WebSocket) => {
        for (const [id, player] of Object.entries(this.entities)) {
            if (player.getSocket() === socket) {
                delete this.entities[parseInt(id)];
            }
        }
    }

    public addEntity(id: number, entity: Entity) {
        this.entities[id] = entity;
    }

    public broadcast(msg: Record<string, string | any>, except?: string) {
        // Broadcast the NEW player to all OTHER clients except the given id
        for (const id in this.entities) {
            const entity = this.entities[id];
            if (!entity) continue;
            entity.send(msg);
        }
    }

    public broadCastEntityToAllEntities(newEntity: Entity) {
        for (const id in this.entities) {
            const entity = this.entities[id];

            if (!entity) continue;

            newEntity.send({
                type: "NEW_PLAYER",
                pos: entity.getPos(),
                color: entity.getColor(),
                id: entity.getId(),
            });
        }
    }

    public broadCastEntityToAllEntitiesExcept(newEntity: Entity, exceptId: number) {
        for (const id in this.entities) {
            if (id == exceptId.toString()) continue;
            const client = this.entities[id];
            if (!client) continue;

            client.send({
                type: "NEW_PLAYER",
                pos: newEntity.getPos(),
                color: newEntity.getColor(),
                id: newEntity.getId(),
            });
        }
    }


    public broadcastState() {
        this.broadcast({ type: "STATE", state: this.getState() });
    }

    public checkForCollisions() {
        const entityArray = Object.values(this.entities);

        console.log(`Total entities: ${entityArray.length}`);

        if (entityArray.length <= 1) return;

        for (let i = 0; i < entityArray.length; i++) {
            for (let j = i + 1; j < entityArray.length; j++) {
                const entity1 = entityArray[i];
                const entity2 = entityArray[j];

                if (!entity1 || !entity2) {
                    console.log(`Skipping - null entity`);
                    continue;
                }

                console.log(`Checking collision between entity ${entity1.getId()} and ${entity2.getId()}`);

                const pos1 = entity1.getPos();
                const pos2 = entity2.getPos();

                const dx = pos2.x - pos1.x;
                const dy = pos2.y - pos1.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                const minDistance = entity1.getRadius() + entity2.getRadius();

                console.log(`Distance: ${distance.toFixed(2)}, MinDistance: ${minDistance}`);

                if (distance < minDistance) {
                    console.log(`🔴 COLLISION!`);
                    entity1.resolveCollisionWith(entity2, distance, dx, dy);
                }
            }
        }
    }

    public update() {
        Object.entries(this.entities).forEach(([_, entity]) => entity.update());
    }
}