const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Imágenes
const shipImg = new Image();
shipImg.src = "assets/ship.png";

const shipSpeedImg = new Image();
shipSpeedImg.src = "assets/ship-speed.png";

const moonImg = new Image();
moonImg.src = "assets/moon.png";

const meteorImg = new Image();
meteorImg.src = "assets/meteor.svg";

// Estado inicial
const aceletateValue = 2;
let gameStarted = false;
let gameOver = false;
let gameWon = false;
let distanceToMoon = 3000;

const ship = {
  x: 100,
  y: canvas.height / 2,
  width: 172,
  height: 85,
  velocityY: 0,
  speed: 0.4
};

const background = {
  baseSpeed: 2,
  currentSpeed: 2
};

const moon = {
  x: canvas.width + distanceToMoon,
  y: 100,
  width: 360,
  height: 360
};

// Estrellas
const stars = [];
for (let i = 0; i < 100; i++) {
  stars.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    radius: Math.random() * 1.5 + 0.5
  });
}

// Meteoritos
const meteors = [];
let meteorInterval = null;

function spawnMeteor() {
  const y = Math.random() * (canvas.height - 98);
  meteors.push({
    x: canvas.width + Math.random() * 570,
    y,
    width: 49,
    height: 98,
    speed: 2 + Math.random() * 2,
    angle: Math.random() * Math.PI * 2
  });
}

function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const areaOrig = Math.abs((ax*(by - cy) + bx*(cy - ay) + cx*(ay - by)) / 2.0);
  const area1 = Math.abs((px*(by - cy) + bx*(cy - py) + cx*(py - by)) / 2.0);
  const area2 = Math.abs((ax*(py - cy) + px*(cy - ay) + cx*(ay - py)) / 2.0);
  const area3 = Math.abs((ax*(by - py) + bx*(py - ay) + px*(ay - by)) / 2.0);
  return Math.abs(area1 + area2 + area3 - areaOrig) < 0.1;
}

function circleCollisionWithTriangle(meteor) {
  const centerX = meteor.x + meteor.width / 2;
  const centerY = meteor.y + meteor.height / 2;
  const radius = 30;

  const shipTipX = ship.x + 172;
  const shipBaseX = ship.x + 53;
  const shipTopY = ship.y;
  const shipBottomY = ship.y + ship.height;
  const shipMidY = ship.y + ship.height / 2;

  const A = { x: shipBaseX, y: shipTopY };
  const B = { x: shipBaseX, y: shipBottomY };
  const C = { x: shipTipX, y: shipMidY };

  const testPoints = [];
  for (let angle = 0; angle < 360; angle += 20) {
    const rad = angle * Math.PI / 180;
    const px = centerX + radius * Math.cos(rad);
    const py = centerY + radius * Math.sin(rad);
    testPoints.push({ x: px, y: py });
  }

  return testPoints.some(p => pointInTriangle(p.x, p.y, A.x, A.y, B.x, B.y, C.x, C.y));
}

let distance = moon.x - ship.x - ship.width;
let startTime = null;
let endTime = null;
let targetX = null;
let targetY = null;
const landingSpeed = 0.05;

function update() {
  if (!gameStarted || gameOver) return;

  background.currentSpeed = accelerate ? background.baseSpeed * aceletateValue : background.baseSpeed;
  const accelFactor = accelerate ? aceletateValue : 1;

  if (!gameWon) {
    if (up) ship.velocityY -= ship.speed * accelFactor;
    if (down) ship.velocityY += ship.speed * accelFactor;
  }

  ship.velocityY *= 0.9;
  ship.y += ship.velocityY;

  if (ship.y < 0) ship.y = 0;
  if (ship.y + ship.height > canvas.height) ship.y = canvas.height - ship.height;

  const starSpeed = background.baseSpeed * (accelerate ? 0.5 : 0.25);
  for (let star of stars) {
    star.x -= starSpeed;
    if (star.x < 0) star.x = canvas.width;
  }

  if (!gameWon) moon.x -= background.currentSpeed;

  for (let meteor of meteors) {
    meteor.x -= meteor.speed + (accelerate ? aceletateValue : 0);
  }

  for (let meteor of meteors) {
    if (!gameWon && circleCollisionWithTriangle(meteor)) {
      gameOver = true;
    }
  }

  if (!gameOver && !gameWon && gameStarted) {
    distance = Math.max(0, moon.x - ship.x - ship.width);
  }

  if (gameStarted && !startTime) {
    startTime = Date.now();
  }

  if (!gameWon && moon.x < ship.x + ship.width) {
    gameWon = true;
    endTime = Date.now();
    if (meteorInterval) clearInterval(meteorInterval);
    targetX = canvas.width / 2 - (ship.width + 53) / 2;
    targetY = 340;
  }

  if (gameWon && targetX !== null && targetY !== null) {
    ship.x += (targetX - ship.x) * landingSpeed;
    ship.y += (targetY - ship.y) * landingSpeed;
  }
}

function drawStars() {
  ctx.fillStyle = "black";
  for (let star of stars) {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTriangleBoundingBox() {
  ctx.strokeStyle = "red";
  ctx.beginPath();
  ctx.moveTo(ship.x + 53, ship.y);
  ctx.lineTo(ship.x + 53, ship.y + ship.height);
  ctx.lineTo(ship.x + 172, ship.y + ship.height / 2);
  ctx.closePath();
  ctx.stroke();
}

function drawMeteorBoundingBox(meteor) {
  const cx = meteor.x + meteor.width / 2;
  const cy = meteor.y + meteor.height / 2;
  ctx.beginPath();
  ctx.strokeStyle = "red";
  ctx.arc(cx, cy, 30, 0, Math.PI * 2);
  ctx.stroke();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawStars();
  ctx.drawImage(moonImg, moon.x, moon.y, moon.width, moon.height);

  if (gameStarted) {
    for (let meteor of meteors) {
      ctx.save();
      ctx.translate(meteor.x + meteor.width / 2, meteor.y + meteor.height / 2);
      ctx.rotate(meteor.angle);
      ctx.drawImage(meteorImg, -meteor.width / 2, -meteor.height / 2, meteor.width, meteor.height);
      ctx.restore();
      drawMeteorBoundingBox(meteor);
    }
  }

  const currentShipImg = accelerate ? shipSpeedImg : shipImg;
  ctx.drawImage(currentShipImg, ship.x, ship.y, ship.width, ship.height);
  drawTriangleBoundingBox();

  ctx.fillStyle = "#000";
  ctx.font = "20px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Distancia: " + Math.ceil(distance) + " al", 20, 30);

  if (startTime) {
    const now = endTime || Date.now();
    const elapsed = Math.floor((now - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    ctx.textAlign = "right";
    ctx.fillText(`Tiempo: ${minutes}m ${seconds < 10 ? "0" : ""}${seconds}s`, canvas.width - 20, 30);
  }

  if (gameOver || gameWon) {
    ctx.fillStyle = "#000";
    ctx.font = "32px sans-serif";
    ctx.textAlign = "center";
    const message = gameOver ? "Has chocado!" : "¡Llegaste a la Luna!";
    ctx.fillText(message, canvas.width / 2, 220);
    document.getElementById("restartBtn").removeAttribute("style");
  }
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

let up = false;
let down = false;
let accelerate = false;

document.addEventListener("keydown", e => {
  if (e.code === "ArrowUp") up = true;
  if (e.code === "ArrowDown") down = true;
  if (e.code === "Space") accelerate = true;
});
document.addEventListener("keyup", e => {
  if (e.code === "ArrowUp") up = false;
  if (e.code === "ArrowDown") down = false;
  if (e.code === "Space") accelerate = false;
});

document.getElementById("startBtn").addEventListener("click", () => {
  if (!gameStarted) {
    gameStarted = true;
    startTime = Date.now();
    meteorInterval = setInterval(spawnMeteor, 1500);
    document.getElementById("startBtn").style.display = "none";
  }
});

document.getElementById("restartBtn").addEventListener("click", () => {
  location.reload();
});

gameLoop();
