import type { WebSocket } from "ws";
import type { ICoord, IDir } from "@/types";

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

    // COLLISION VARIABLES
    private radius: number;         // this is because all the entities have a circle collider by default
    private restitution: number;    // how much bouncy the entity is

    constructor(socket: WebSocket, pos: ICoord, color: string, id: number, world: ICoord) {
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

        // COLLISION DATA
        this.radius = 20;           // matching client side radius of entities
        this.restitution = 0.6;  // for bouncing back after collision
    }

    public getPos = () => this.pos;
    public getColor = () => this.color;
    public getVelocity = () => this.velocity;
    public getSocket = () => this.socket;
    public getId = () => this.id;
    public getRadius = () => this.radius;
    public getJson = () => ({
        id: this.id,
        pos: this.pos
    })

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

        this.checkForCollisions();
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

    private handleCollisionWith(other: Entity) {
        // Check if this has collided with other entity
    }

    public checkForCollisions() {
        this.checkForBoundaryCollisions();
    }

    public update() {
        this.updatePhysics();
    }

}