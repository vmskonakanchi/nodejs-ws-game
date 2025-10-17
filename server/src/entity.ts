import type { WebSocket } from "ws";
import type { ICoord, IDir } from "@/types";
import { EventEmitter } from "stream";

export class Entity {
    private id: number;
    private socket: WebSocket;
    private velocity: ICoord;
    private color: string;
    private pos: ICoord;
    private acceleration: number;
    private friction: number;
    private maxSpeed: number;
    private world: ICoord;
    private mass: number;

    // COLLISION VARIABLES
    private radius: number;         // this is because all the entities have a circle collider by default
    private restitution: number;    // how much bouncy the entity is lower means lower bouncing


    // EVENTS
    private onRemove: (id: number) => void;

    constructor(socket: WebSocket, pos: ICoord, color: string, id: number, world: ICoord, onRemove: (id: number) => void) {
        // ENTITY DATA
        this.socket = socket;
        this.pos = pos;
        this.color = color;
        this.id = id;
        this.velocity = { x: 0, y: 0 };
        this.world = world;


        // STATIC DATA
        this.acceleration = 0.8;    // How quickly players speed up
        this.friction = 0.92;       // How quickly they slow down (0.9-0.95 feels good)
        this.maxSpeed = 8;          // Maximum velocity in any direction
        this.mass = 10;             // The mass of the entity

        // COLLISION DATA
        this.radius = 20;           // matching client side radius of entities
        this.restitution = 0.6;  // for bouncing back after collision

        // EVENT EMITTER FUNCTIONS
        this.onRemove = onRemove;
    }

    // GETTERS

    public getPos = () => this.pos;
    public getColor = () => this.color;
    public getVelocity = () => this.velocity;
    public getSocket = () => this.socket;
    public getId = () => this.id;
    public getRadius = () => this.radius;
    public getMass = () => this.mass;
    public getJson = () => ({ id: this.id, pos: this.pos })

    // NETWORKING METHODS

    public send(msg: Record<string, any>) {
        this.socket.send(JSON.stringify(msg));
    }

    // PHYSICS METHODS

    public move(dir: IDir) {
        switch (dir) {
            case "w":
                this.velocity.y -= this.acceleration;
                break;
            case "a":
                this.velocity.x -= this.acceleration;
                break;
            case "s":
                this.velocity.y += this.acceleration;
                break;
            case "d":
                this.velocity.x += this.acceleration;
                break;

            case "ArrowUp":
                this.velocity.y -= this.acceleration;
                break;
            case "ArrowLeft":
                this.velocity.x -= this.acceleration;
                break;
            case "ArrowDown":
                this.velocity.y += this.acceleration;
                break;
            case "ArrowRight":
                this.velocity.x += this.acceleration;
                break;
            default:
                console.log(`Unknow direction ${dir}`)
                break;
        }
    }

    private capVelocity() {
        // calculating current speed
        const speed = Math.sqrt(Math.pow(this.velocity.x, 2) + Math.pow(this.velocity.y, 2));

        // checking if going more than speed
        if (speed > this.maxSpeed) {
            const scale = this.maxSpeed / speed;
            this.velocity.x *= scale;
            this.velocity.y *= scale;
        }
    }

    private updatePhysics() {
        // applying friction
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;

        // stopping the entity if the velocity is very small
        if (Math.abs(this.velocity.x) < 0.1) this.velocity.x = 0;
        if (Math.abs(this.velocity.y) < 0.1) this.velocity.y = 0;

        this.capVelocity(); // capping the this velocity

        // changing postition based on velocity
        this.pos.x += this.velocity.x;
        this.pos.y += this.velocity.y;

        this.checkForBoundaryCollisions();
    }

    private checkForBoundaryCollisions() {
        // checking collision with the walls

        if ((this.pos.x - this.radius) < 0) {
            // checking left wall
            this.pos.x = this.radius;
            if (this.velocity.x < 0) { // Only bounce if moving left (into wall)
                this.velocity.x = -this.velocity.x * this.restitution;
            }
        }

        if ((this.pos.x + this.radius) > this.world.x) {
            // checking right wall
            this.pos.x = this.world.x - this.radius;
            if (this.velocity.x > 0) { // Only bounce if moving right (into wall)
                this.velocity.x = -this.velocity.x * this.restitution;
            }
        }

        if ((this.pos.y - this.radius) < 0) {
            // checking top wall
            this.pos.y = this.radius;
            if (this.velocity.y < 0) { // Only bounce if moving up (into wall)
                this.velocity.y = -this.velocity.y * this.restitution;
            }
        }

        if ((this.pos.y + this.radius) > this.world.y) {
            // checking bottom wall
            this.pos.y = this.world.y - this.radius;
            if (this.velocity.y > 0) { // Only bounce if moving down (into wall)
                this.velocity.y = -this.velocity.y * this.restitution;
            }
        }

    }

    public resolveCollisionWith(other: Entity, distance: number, dx: number, dy: number) {
        // PHASE 1: POSITION CORRECTION (Direct manipulation)
        // This prevents overlap and repeated collision detection

        // Handle edge case
        if (distance === 0) {
            this.pos.x += (Math.random() - 0.5) * 2;
            this.pos.y += (Math.random() - 0.5) * 2;
            return;
        }

        // Calculate collision normal (direction)
        const nx = dx / distance;
        const ny = dy / distance;

        // Calculate overlap
        const overlap = (this.radius + other.getRadius()) - distance;

        // Push entities apart based on mass ratio
        const totalMass = this.mass + other.getMass();
        const thisRatio = other.getMass() / totalMass;  // Heavier = push less
        const otherRatio = this.mass / totalMass;       // Lighter = push more

        this.pos.x -= nx * overlap * thisRatio;
        this.pos.y -= ny * overlap * thisRatio;

        const otherPos = other.getPos();
        otherPos.x += nx * overlap * otherRatio;
        otherPos.y += ny * overlap * otherRatio;


        // PHASE 2: VELOCITY RESPONSE (Physics-based)
        // This creates the bounce/push effect

        const thisVel = this.velocity;
        const otherVel = other.getVelocity();

        // Calculate relative velocity
        const relativeVelX = thisVel.x - otherVel.x;
        const relativeVelY = thisVel.y - otherVel.y;

        // Project relative velocity onto collision normal (dot product)
        const relativeVelAlongNormal = relativeVelX * nx + relativeVelY * ny;

        // Only apply impulse if moving toward each other
        if (relativeVelAlongNormal < 0) {
            // Calculate impulse magnitude (based on mass and restitution)
            const impulseMagnitude = -(1 + this.restitution) * relativeVelAlongNormal / (1 / this.mass + 1 / other.getMass());

            // Apply impulse to velocities (mass affects how much velocity changes)
            const impulseX = impulseMagnitude * nx;
            const impulseY = impulseMagnitude * ny;

            thisVel.x += impulseX / this.mass;
            thisVel.y += impulseY / this.mass;

            otherVel.x -= impulseX / other.getMass();
            otherVel.y -= impulseY / other.getMass();

            // INCREASING MASS (agar.io mechanic)

        }
    }

    public update() {
        // called by entity manager, for each frame in the game loop
        this.updatePhysics();
    }


    // ENTITY METHODS

    public remove() {
        // method to remove the entity from the game

        // calling method to notify others
        this.onRemove(this.id);

        // disconnecting from the network
        this.socket.close();
    }

}