# Multiplayer Game Technical Documentation

## Project Overview

This is a real-time multiplayer game built from scratch using Node.js for the server-side logic and modern web technologies (HTML5 Canvas, TypeScript, Vite) for the client-side. The game features real-time physics simulation, collision detection, and WebSocket-based communication between multiple players.

## Architecture Overview

The project follows a client-server architecture with the following key components:

### Technology Stack

**Server Side:**
- **Node.js** with **TypeScript** for type safety
- **Express.js** for HTTP server setup
- **WebSocket (ws)** for real-time bidirectional communication
- **ESBuild** for fast bundling and development
- **Nodemon** for development hot-reloading

**Client Side:**
- **TypeScript** for type-safe client code
- **Vite** (with Rolldown) for fast development and building
- **HTML5 Canvas** for 2D rendering
- **WebSocket API** for real-time communication

## Core Game Systems

### 1. Entity System

The game implements a robust entity-component system where each player is represented as an `Entity` object.

#### Entity Class (`server/src/entity.ts`)

```typescript
class Entity {
    private id: number;           // Unique identifier
    private socket: WebSocket;    // WebSocket connection
    private velocity: ICoord;     // Current velocity vector
    private color: string;        // Visual representation color
    private pos: ICoord;          // Current position
    private mass: number;         // Entity mass for physics
    private radius: number;       // Collision radius
    private restitution: number; // Bounce factor (0.6)
}
```

**Key Features:**
- **Physics Properties**: Acceleration (0.8), friction (0.92), max speed (8)
- **Collision Detection**: Circular collision with radius-based detection
- **Boundary Constraints**: Entities bounce off world boundaries
- **Mass-based Interactions**: Heavier entities push lighter ones more

### 2. Physics Engine

The game implements a custom 2D physics engine with the following components:

#### Movement System
- **Input Processing**: WASD and Arrow keys mapped to directional movement
- **Velocity Accumulation**: Input adds to current velocity vector
- **Speed Capping**: Maximum velocity enforced to prevent infinite acceleration
- **Friction**: Gradual velocity reduction for realistic movement feel

#### Collision Resolution
The collision system uses a two-phase approach:

**Phase 1: Position Correction**
```typescript
// Calculate overlap and push entities apart based on mass ratio
const overlap = (this.radius + other.getRadius()) - distance;
const totalMass = this.mass + other.getMass();
const thisRatio = other.getMass() / totalMass;  // Heavier = push less
const otherRatio = this.mass / totalMass;       // Lighter = push more
```

**Phase 2: Velocity Response**
```typescript
// Apply impulse-based collision response
const impulseMagnitude = -(1 + this.restitution) * relativeVelAlongNormal / 
                        (1 / this.mass + 1 / other.getMass());
```

### 3. Entity Management System

#### EntityManager Class (`server/src/entity-manager.ts`)

The `EntityManager` uses the Singleton pattern to manage all game entities:

**Key Responsibilities:**
- **Entity Lifecycle**: Creation, updates, and removal
- **Collision Detection**: O(n²) collision checking between all entities
- **State Broadcasting**: Sending game state to all connected clients
- **Network Management**: Handling WebSocket connections and disconnections

**Game Loop Implementation:**
```typescript
const gameLoop = setInterval(() => {
    // Step 1: Update ALL entity physics first
    entityManager.update();
    
    // Step 2: Check for entity collisions
    entityManager.checkForCollisions();
    
    // Step 3: Broadcast state to all clients
    entityManager.broadcastState();
}, FPS_60); // 60 FPS = 16ms intervals
```

### 4. Network Architecture

#### WebSocket Communication Protocol

The game uses a custom message protocol over WebSocket:

**Client → Server Messages:**
```typescript
// Movement input
{ type: "MOVE", dir: "w", id: playerId }
```

**Server → Client Messages:**
```typescript
// Player registration
{ type: "REGISTER", id: playerId }

// New player joined
{ type: "NEW_PLAYER", pos: {x, y}, color: "rgb(r,g,b)", id: playerId, mass: 10 }

// Game state update
{ type: "STATE", state: [{id, pos: {x, y}}, ...] }
```

#### Connection Handling
- **Dynamic World Sizing**: Client sends canvas dimensions to server
- **Random Spawning**: Players spawn at random positions within world bounds
- **Duplicate Prevention**: Server checks for existing connections
- **Graceful Disconnection**: Entities are removed when clients disconnect

### 5. Client-Side Rendering

#### Player Class (`client/src/player.ts`)

The client-side `Player` class handles visual representation:

**Key Features:**
- **Smooth Interpolation**: Uses linear interpolation (lerp) for smooth movement
- **Canvas Rendering**: Draws circular entities with mass-based radius
- **State Synchronization**: Receives position updates from server

```typescript
private lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
}

update() {
    this.x = this.lerp(this.x, this.targetX, this.lerpSpeed);
    this.y = this.lerp(this.y, this.targetY, this.lerpSpeed);
}
```

#### Rendering Loop
```typescript
const gameLoop = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    players.forEach(p => p.update());  // Update positions
    players.forEach(p => p.draw());   // Render entities
    requestAnimationFrame(gameLoop);
};
```

## Development Workflow

### Build System

**Server Development:**
```bash
npm run dev  # Concurrent TypeScript compilation + nodemon
npm run build  # Production build with ESBuild
npm start     # Run production build
```

**Client Development:**
```bash
npm run dev     # Vite development server
npm run build   # TypeScript compilation + Vite build
npm run preview # Preview production build
```

### Development Tools

- **ESBuild**: Ultra-fast bundling for server-side TypeScript
- **Vite**: Modern build tool with HMR for client development
- **Concurrently**: Run multiple development processes simultaneously
- **Nodemon**: Auto-restart server on file changes

## Performance Considerations

### Server-Side Optimizations

1. **Efficient Collision Detection**: O(n²) algorithm optimized for small player counts
2. **60 FPS Game Loop**: Consistent 16ms update intervals
3. **Singleton EntityManager**: Single instance reduces memory overhead
4. **Direct Socket Communication**: No middleware overhead

### Client-Side Optimizations

1. **RequestAnimationFrame**: Smooth 60 FPS rendering
2. **Linear Interpolation**: Smooth movement without jitter
3. **Canvas Optimization**: Efficient 2D rendering
4. **Minimal DOM Manipulation**: Canvas-based rendering

## Scalability Considerations

### Current Limitations

- **Collision Detection**: O(n²) complexity limits concurrent players
- **Single Server**: No horizontal scaling implemented
- **Memory Management**: Entities persist until disconnection

### Potential Improvements

1. **Spatial Partitioning**: Implement quadtree for collision detection
2. **Server Clustering**: Multiple game servers with load balancing
3. **Entity Pooling**: Reuse entity objects to reduce garbage collection
4. **Delta Compression**: Send only changed data instead of full state

## Security Considerations

### Current Implementation

- **Input Validation**: Basic key validation on client side
- **No Authentication**: Players can connect without verification
- **Direct Socket Access**: No rate limiting implemented

### Recommended Enhancements

1. **Input Sanitization**: Server-side validation of all inputs
2. **Rate Limiting**: Prevent spam movement commands
3. **Authentication**: User accounts and session management
4. **Anti-Cheat**: Server-side position validation

## Code Quality & Architecture

### Design Patterns Used

1. **Singleton Pattern**: EntityManager ensures single instance
2. **Observer Pattern**: Entity removal notifications
3. **Factory Pattern**: Entity creation through EntityManager
4. **Strategy Pattern**: Different collision resolution strategies

### TypeScript Benefits

- **Type Safety**: Compile-time error detection
- **Interface Definitions**: Clear contracts between components
- **IntelliSense**: Better development experience
- **Refactoring Safety**: Automated refactoring with confidence

## Deployment Considerations

### Production Setup

1. **Environment Variables**: PORT configuration
2. **Process Management**: PM2 or similar for production
3. **Reverse Proxy**: Nginx for WebSocket proxying
4. **SSL/TLS**: HTTPS/WSS for secure connections

### Monitoring

- **Connection Tracking**: Monitor active WebSocket connections
- **Performance Metrics**: Track game loop timing
- **Error Logging**: Comprehensive error tracking
- **Player Analytics**: Game session data

## Future Enhancements

### Game Features

1. **Power-ups**: Temporary speed boosts, shields
2. **Team Mechanics**: Cooperative gameplay elements
3. **Scoring System**: Points for survival time, collisions
4. **Customization**: Player skins, colors, names

### Technical Improvements

1. **Database Integration**: Persistent player data
2. **Matchmaking**: Skill-based player matching
3. **Spectator Mode**: Watch games without participating
4. **Replay System**: Record and playback game sessions

## Conclusion

This multiplayer game demonstrates a solid foundation for real-time multiplayer experiences. The architecture is clean, the physics are realistic, and the networking is efficient. The codebase serves as an excellent example of how to build multiplayer games from scratch using modern web technologies.

The project showcases several important concepts:
- Real-time communication with WebSockets
- Custom physics engine implementation
- Entity-component architecture
- Client-server synchronization
- Modern TypeScript development practices

This foundation can be extended with additional features, improved scalability, and enhanced security measures for production deployment.
