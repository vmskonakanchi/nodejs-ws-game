import type { WebSocket } from "ws";
import type { Entity } from "@/entity";

export class EntityManager {
    private entities: Record<number, Entity>;
    private entityCount: number;

    constructor(entities = {}) {
        this.entities = entities;

        if (entities) {
            this.entityCount = Object.entries(this.entities).length;
        } else {
            this.entityCount = 0;
        }
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

    public update() {
        Object.entries(this.entities).forEach(([_, entity]) => entity.update());
    }
}