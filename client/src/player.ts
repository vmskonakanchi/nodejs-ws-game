export class Player {
    private ctx: CanvasRenderingContext2D;
    private x: number;
    private y: number;
    private targetX: number;
    private targetY: number;
    private color: string;
    private id: number;
    private radius = 20;
    private lerpSpeed = 0.1;

    constructor(ctx: CanvasRenderingContext2D | null, x: number, y: number, color: string, id: number) {
        if (!ctx) throw new Error("Context is null");
        this.ctx = ctx;
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.color = color;
        this.id = id;
    }

    private lerp(start: number, end: number, t: number): number {
        return start + (end - start) * t;
    }

    update() {
        // applying velocity
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