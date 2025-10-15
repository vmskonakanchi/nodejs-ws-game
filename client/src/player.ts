export class Player {
    private ctx: CanvasRenderingContext2D;
    private x: number;
    private y: number;
    private targetX: number;
    private targetY: number;
    private color: string;
    private id: number;
    private radius: number = 20;
    private lerpSpeed: number = 0.1;
    private vX = 0;
    private vY = 0;
    private friction = 0.9; // static for now
    private maxSpeed = 8; // static for now
    
    constructor(ctx: CanvasRenderingContext2D | null, x: number, y: number, color: string, id: number) {
        if (!ctx) throw new Error("Context is null");
        this.ctx = ctx;
        this.x = x;
        this.y = y;
        this.targetX = x;  // ✅ Initialize targets
        this.targetY = y;
        this.color = color;
        this.id = id;
    }

    private lerp(start: number, end: number, t: number): number {
        return start + (end - start) * t;
    }

    update() {
        // applying velocity
        this.x += this.vX
        this.y += this.vY;

        // stopping when velocity is 0
        if (this.vX <= 0.1) this.x = 0;
        if (this.vY <= 0.1) this.y = 0;

        // capping at maxSpeed
        if(this.vX >= this.maxSpeed) this.vX = this.maxSpeed;
        if(this.vY >= this.maxSpeed) this.vY = this.maxSpeed;

        // applying friction
        this.vX *= this.friction;
        this.vY *= this.friction;

        this.x = this.lerp(this.x, this.targetX, this.lerpSpeed);
        this.y = this.lerp(this.y, this.targetY, this.lerpSpeed);
    }

    updatePos(x: number, y: number) {
        // Set target position instead of directly updating
        this.targetX = x;
        this.targetY = y;
    }

    draw() {
        this.ctx.fillStyle = this.color;
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    getId(): number {
        return this.id;
    }

    getPos() {
        return { x: this.x, y: this.y };
    }
}