import './style.css'
import { Player } from './player';

const allowedKeys = ['w', 'a', 's', 'd', 'up', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp'];

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `<canvas id="game"></canvas>`;

const canvas = document.getElementById("game") as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const ctx = canvas.getContext("2d");

const ws = new WebSocket(`ws://localhost:5000?width=${canvas.width}&height=${canvas.height}`);

let players = new Set<Player>();

ws.onopen = () => {
  console.log("Socket connected");
}

ws.onmessage = (e) => {
  try {
    const serverData = JSON.parse(e.data);

    if (!serverData.type) return;

    console.log(e.data);

    switch (serverData.type) {
      case "REGISTER":
        sessionStorage.setItem("id", serverData.id)
        break;
      case "NEW_PLAYER":
        const { color, pos, id } = serverData;
        const { x, y } = pos;
        const newPlayer = new Player(ctx, x, y, color, id);
        players.add(newPlayer);
        break;
      case "STATE":
        const { state } = serverData as { state: any[] };
        state.forEach(s => {
          const sPlayer = findPlayerById(s.id);
          if (!sPlayer) return;
          sPlayer.updatePos(s.pos.x, s.pos.y);
        });
        break;

      default:
        break;
    }
  } catch (error) {
    console.error(error);
  }
}

const findPlayerById = (id: number) => {
  for (const p of players) {
    if (p.getId() === id) return p;
  }

  return null;
}

window.addEventListener("keydown", (ev) => {
  const id = sessionStorage.getItem("id");

  if (!id) return;

  if (!allowedKeys.includes(ev.key)) return;

  ws.send(JSON.stringify({ type: "MOVE", dir: ev.key, id }));
})

const gameLoop = () => {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // update pos
  players.forEach(p => p.update())

  // drawing player
  players.forEach(p => p.draw())

  requestAnimationFrame(gameLoop); // keeps the loop running
}

// Start the loop
requestAnimationFrame(gameLoop);