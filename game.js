const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const modeDark =
  document.querySelector(".game-wrapper").dataset.mode === "dark";

// Imágenes
const shipImg = new Image();
shipImg.src = modeDark ? "assets/ship-dark.svg" : "assets/ship.png";

const shipSpeedImg = new Image();
shipSpeedImg.src = modeDark
  ? "assets/ship-speed-dark.svg"
  : "assets/ship-speed.svg";

const moonImg = new Image();
moonImg.src = modeDark ? "assets/moon-dark.png" : "assets/moon.png";

const timeIconImg = new Image();
timeIconImg.src = "assets/icon-time.png";

// Imágenes de meteoritos
const meteor1Img = new Image();
meteor1Img.src = "assets/meteor-1.png";

const meteor2Img = new Image();
meteor2Img.src = "assets/meteor-2.png";

// Configuración de tamaños de meteoritos (ancho = alto para hacer cuadrados, radio de colisión)
const meteorSizes = [
  { width: 40, height: 40, radius: 20 }, // Pequeño cuadrado
  { width: 55, height: 55, radius: 27 }, // Mediano cuadrado
  { width: 75, height: 75, radius: 37 }, // Grande cuadrado (máximo 75px)
];

// Array de imágenes para seleccionar aleatoriamente
const meteorImages = [meteor1Img, meteor2Img];

// Estado inicial
const aceletateValue = 5;
let gameStarted = false;
let gameOver = false;
let gameWon = false;
let gamePaused = true; // Pausa completa del juego cuando acordeón está cerrado (inicia pausado)
let distanceToMoon = 18672;
let intervalMeteor = 800;

const ship = {
  x: 150 - 300, // 300px más a la izquierda desde nueva posición
  y: canvas.height / 2 - 42, // Centrada verticalmente (altura 84px / 2 = 42px)
  width: 160,
  height: 84,
  velocityY: 0,
  speed: 1,
  targetX: 150, // posición objetivo final (+50px)
  entering: false, // indica si está entrando
  arriving: false, // indica si está en la animación lenta final
  scale: 1, // Escala de la nave (1 = tamaño normal, 0 = invisible)
  enteringMoon: false, // indica si está entrando en la luna
};

const background = {
  baseSpeed: 2,
  currentSpeed: 2,
};

const moon = {
  x: canvas.width + distanceToMoon,
  y: 100,
  width: 360,
  height: 360,
  centeringToFinal: false, // indica si se está centrando para la animación final
};

// Estrellas
const stars = [];
for (let i = 0; i < 100; i++) {
  stars.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    radius: Math.random() * 1.5 + 0.5,
  });
}

// Meteoritos
const meteors = [];
let meteorInterval = null;

function spawnMeteor() {
  // Seleccionar aleatoriamente tipo de meteorito (meteor-1 o meteor-2)
  const imageIndex = Math.floor(Math.random() * meteorImages.length);
  const meteorImage = meteorImages[imageIndex];

  // Seleccionar aleatoriamente tamaño (pequeño, mediano, grande)
  const sizeIndex = Math.floor(Math.random() * meteorSizes.length);
  const size = meteorSizes[sizeIndex];

  const y = Math.random() * (canvas.height - size.height);
  meteors.push({
    x: canvas.width + Math.random() * 570,
    y,
    width: size.width,
    height: size.height,
    radius: size.radius, // Radio específico para colisiones
    speed: 2 + Math.random() * 2,
    angle: Math.random() * Math.PI * 2,
    image: meteorImage, // Referencia a la imagen específica
    type: imageIndex, // 0 = meteor-1, 1 = meteor-2
    sizeType: sizeIndex, // 0 = pequeño, 1 = mediano, 2 = grande
  });
}

function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const areaOrig = Math.abs(
    (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by)) / 2.0
  );
  const area1 = Math.abs(
    (px * (by - cy) + bx * (cy - py) + cx * (py - by)) / 2.0
  );
  const area2 = Math.abs(
    (ax * (py - cy) + px * (cy - ay) + cx * (ay - py)) / 2.0
  );
  const area3 = Math.abs(
    (ax * (by - py) + bx * (py - ay) + px * (ay - by)) / 2.0
  );
  return Math.abs(area1 + area2 + area3 - areaOrig) < 0.1;
}

function circleCollisionWithTriangle(meteor) {
  const centerX = meteor.x + meteor.width / 2;
  const centerY = meteor.y + meteor.height / 2;
  const radius = meteor.radius; // Usar el radio específico del meteorito

  const shipTipX = ship.x + 160;
  const shipBaseX = ship.x + 49;
  const shipTopY = ship.y;
  const shipBottomY = ship.y + ship.height;
  const shipMidY = ship.y + ship.height / 2;

  const A = { x: shipBaseX, y: shipTopY };
  const B = { x: shipBaseX, y: shipBottomY };
  const C = { x: shipTipX, y: shipMidY };

  const testPoints = [];
  for (let angle = 0; angle < 360; angle += 20) {
    const rad = (angle * Math.PI) / 180;
    const px = centerX + radius * Math.cos(rad);
    const py = centerY + radius * Math.sin(rad);
    testPoints.push({ x: px, y: py });
  }

  return testPoints.some((p) =>
    pointInTriangle(p.x, p.y, A.x, A.y, B.x, B.y, C.x, C.y)
  );
}

let distance = moon.x - ship.x - ship.width;
let startTime = null;
let endTime = null;
let targetX = null;
let targetY = null;
let timerPaused = true; // Controla si el temporizador está pausado (inicia pausado)
const landingSpeed = 0.05;

function update() {
  // No ejecutar lógica del juego si está pausado
  if (gamePaused) {
    return;
  }

  // Animar entrada de la nave solo después de pulsar startBtn
  if (ship.entering) {
    // Entrada rápida desacelerando
    let distanceToTarget = ship.targetX + 50 - ship.x;
    let speed = Math.max(3, distanceToTarget * 0.08); // desacelera al acercarse
    ship.x += speed;
    if (ship.x >= ship.targetX + 50) {
      ship.x = ship.targetX + 50;
      ship.entering = false;
      ship.arriving = true;
    }
    return;
  }
  if (ship.arriving) {
    // Desplazamiento lento a la izquierda hasta targetX
    ship.x -= 1.5;
    if (ship.x <= ship.targetX) {
      ship.x = ship.targetX;
      ship.arriving = false;
      gameStarted = true;
      // startTime ya fue establecido al hacer clic en Play
      meteorInterval = setInterval(spawnMeteor, intervalMeteor);
    }
    return;
  }
  if (!gameStarted || gameOver) return;

  background.currentSpeed = accelerate
    ? background.baseSpeed * aceletateValue
    : background.baseSpeed;
  const accelFactor = accelerate ? aceletateValue : 1;

  if (!gameWon) {
    if (up) ship.velocityY -= ship.speed * accelFactor;
    if (down) ship.velocityY += ship.speed * accelFactor;
  }

  ship.velocityY *= 0.9;
  ship.y += ship.velocityY;

  if (ship.y < 0) ship.y = 0;
  if (ship.y + ship.height > canvas.height)
    ship.y = canvas.height - ship.height;

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
      endTime = Date.now(); // Parar tiempo en colisión
      updateTimeDisplay(); // Actualización final del tiempo
    }
  }

  if (!gameOver && !gameWon && gameStarted) {
    distance = Math.max(0, moon.x - ship.x - ship.width);
  }

  // startTime ya se establece al hacer clic en Play

  if (!gameWon && moon.x < ship.x + ship.width) {
    gameWon = true;
    endTime = Date.now();
    updateTimeDisplay(); // Actualización final del tiempo
    if (meteorInterval) clearInterval(meteorInterval);

    // Iniciar animación final: centrar luna y nave hacia centro lunar
    moon.centeringToFinal = true;
    ship.enteringMoon = true;

    // Posición final de la luna (centrada)
    targetX = canvas.width / 2 - moon.width / 2;
    targetY = canvas.height / 2 - moon.height / 2;
  }

  if (gameWon && targetX !== null && targetY !== null) {
    // Animar luna hacia el centro del canvas
    if (moon.centeringToFinal) {
      moon.x += (targetX - moon.x) * landingSpeed;
      moon.y += (targetY - moon.y) * landingSpeed;
    }

    // Animar nave hacia el centro de la luna mientras se reduce
    if (ship.enteringMoon) {
      const moonCenterX = moon.x + moon.width / 2;
      const moonCenterY = moon.y + moon.height / 2;

      // Mover nave hacia centro de la luna
      ship.x += (moonCenterX - ship.width / 2 - ship.x) * landingSpeed * 1.5;
      ship.y += (moonCenterY - ship.height / 2 - ship.y) * landingSpeed * 1.5;

      // Reducir escala de la nave gradualmente
      ship.scale = Math.max(0, ship.scale - 0.015);
    }
  }
}

function drawStars() {
  ctx.fillStyle = modeDark ? "white" : "black";
  for (let star of stars) {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTriangleBoundingBox() {
  ctx.strokeStyle = "red";
  ctx.beginPath();
  ctx.moveTo(ship.x + 49, ship.y);
  ctx.lineTo(ship.x + 49, ship.y + ship.height);
  ctx.lineTo(ship.x + 160, ship.y + ship.height / 2);
  ctx.closePath();
  ctx.stroke();
}

function drawMeteorBoundingBox(meteor) {
  const cx = meteor.x + meteor.width / 2;
  const cy = meteor.y + meteor.height / 2;
  ctx.beginPath();
  ctx.strokeStyle = "red";
  ctx.arc(cx, cy, meteor.radius, 0, Math.PI * 2); // Usar el radio específico del meteorito
  ctx.stroke();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = modeDark ? "#000" : "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawStars();

  ctx.drawImage(moonImg, moon.x, moon.y, moon.width, moon.height);

  // Dibujar meteoritos siempre que existan
  for (let meteor of meteors) {
    ctx.save();
    ctx.translate(meteor.x + meteor.width / 2, meteor.y + meteor.height / 2);
    ctx.rotate(meteor.angle);
    ctx.drawImage(
      meteor.image, // Usar la imagen específica del meteorito
      -meteor.width / 2,
      -meteor.height / 2,
      meteor.width,
      meteor.height
    );
    ctx.restore();
    //drawMeteorBoundingBox(meteor);
  }

  // Mostrar la nave según el estado de entrada/animación
  if (ship.entering) {
    drawShipWithScale(shipSpeedImg);
  } else if (ship.arriving) {
    drawShipWithScale(shipImg);
  } else if (gameStarted) {
    const currentShipImg = accelerate ? shipSpeedImg : shipImg;
    drawShipWithScale(currentShipImg);
  }

  // Función para dibujar la nave con escala
  function drawShipWithScale(shipImage) {
    if (ship.scale <= 0) return; // No dibujar si la escala es 0 o negativa

    ctx.save();
    const scaledWidth = ship.width * ship.scale;
    const scaledHeight = ship.height * ship.scale;
    const centerX = ship.x + ship.width / 2;
    const centerY = ship.y + ship.height / 2;

    ctx.translate(centerX, centerY);
    ctx.scale(ship.scale, ship.scale);
    ctx.drawImage(
      shipImage,
      -ship.width / 2,
      -ship.height / 2,
      ship.width,
      ship.height
    );
    ctx.restore();
    // drawTriangleBoundingBox();
  }

  // Solo actualizar tiempo si el juego ha empezado, está activo (no terminado) y no pausado
  if (gameStarted && !gameOver && !gameWon && !timerPaused) {
    updateTimeDisplay();
  }

  if ((gameOver || gameWon) && !gamePaused) {
    if (gameOver) {
      // Texto simple para choque
      ctx.fillStyle = modeDark ? "#fff" : "#000";
      ctx.font = "32px slunssen";
      ctx.textAlign = "center";
      ctx.fillText("HAS CHOCADO!", canvas.width / 2, 220);
    } else if (gameWon) {
      // Textos especiales para victoria
      drawVictoryTexts();
    }

    // Mostrar botón restart en la posición del time-box
    document.getElementById("restartBtn").removeAttribute("style");
  }

  // Función para dibujar los textos de victoria
  function drawVictoryTexts() {
    ctx.fillStyle = modeDark ? "#fff" : "#000";
    ctx.font = "24px slunssen";

    // Texto "EDG TO THE MOON" a la izquierda de la luna
    ctx.textAlign = "right";
    const leftTextX = moon.x - 20;
    const textY = moon.y + moon.height / 2;
    ctx.fillText("EDG TO THE MOON", leftTextX, textY);

    // Obtener tiempo final formateado
    const finalTime = getFinalTimeString();

    // Ícono y texto de tiempo a la derecha de la luna
    const rightX = moon.x + moon.width + 20;
    const iconSize = 24;

    // Dibujar ícono de tiempo PNG
    ctx.drawImage(
      timeIconImg,
      rightX,
      textY - iconSize / 2 - 9,
      iconSize,
      iconSize
    );

    // Texto de tiempo
    ctx.textAlign = "left";
    ctx.fillText(`TIME ${finalTime}`, rightX + iconSize + 8, textY);
  }

  // Función para obtener el tiempo final formateado
  function getFinalTimeString() {
    if (startTime && endTime) {
      const elapsed = Math.floor((endTime - startTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      return `${minutes < 10 ? "0" : ""}${minutes}:${
        seconds < 10 ? "0" : ""
      }${seconds} S`;
    }
    return "00:00 S";
  }
}

// Función para actualizar el tiempo en la caja HTML
function updateTimeDisplay() {
  const timeDisplay = document.getElementById("timeDisplay");

  if (startTime) {
    const now = endTime || Date.now();
    const elapsed = Math.floor((now - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    timeDisplay.textContent = `${minutes < 10 ? "0" : ""}${minutes}:${
      seconds < 10 ? "0" : ""
    }${seconds} s`;
  } else {
    timeDisplay.textContent = "00:00 s";
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

document.addEventListener("keydown", (e) => {
  // Prevenir scroll solo cuando el juego esté iniciado o la nave esté entrando
  if (gameStarted || ship.entering || ship.arriving) {
    if (e.code === "ArrowUp" || e.code === "ArrowDown" || e.code === "Space") {
      e.preventDefault(); // Bloquea el comportamiento por defecto (scroll)
    }
  }

  if (e.code === "ArrowUp") up = true;
  if (e.code === "ArrowDown") down = true;
  if (e.code === "Space") accelerate = true;
});

document.addEventListener("keyup", (e) => {
  // Prevenir scroll solo cuando el juego esté iniciado o la nave esté entrando
  if (gameStarted || ship.entering || ship.arriving) {
    if (e.code === "ArrowUp" || e.code === "ArrowDown" || e.code === "Space") {
      e.preventDefault(); // Bloquea el comportamiento por defecto (scroll)
    }
  }

  if (e.code === "ArrowUp") up = false;
  if (e.code === "ArrowDown") down = false;
  if (e.code === "Space") accelerate = false;
});

document.getElementById("startBtn").addEventListener("click", () => {
  if (!gameStarted && !ship.entering) {
    document.getElementById("startBtn").parentElement.style.display = "none";
    ship.x = ship.targetX - 300;
    ship.entering = true;
    startTime = Date.now(); // Iniciar tiempo inmediatamente
  }
});

// Función para reiniciar el juego sin recargar la página
function restartGame() {
  // Reiniciar variables del estado del juego
  gameStarted = false;
  gameOver = false;
  gameWon = false;
  gamePaused = false; // Reiniciar pausa del juego
  startTime = null;
  endTime = null;
  targetX = null;
  targetY = null;
  timerPaused = false; // Reiniciar estado del temporizador
  distance = moon.x - ship.x - ship.width;

  // Reiniciar posición de la nave
  ship.x = 150 - 300; // Posición inicial fuera de pantalla
  ship.y = canvas.height / 2 - 42; // Centrada verticalmente (altura 84px / 2 = 42px)
  ship.velocityY = 0;
  ship.entering = false;
  ship.arriving = false;
  ship.scale = 1; // Reiniciar escala normal
  ship.enteringMoon = false; // Reiniciar animación lunar

  // Reiniciar posición de la luna
  moon.x = canvas.width + distanceToMoon;
  moon.y = 100; // Reiniciar posición Y inicial
  moon.centeringToFinal = false; // Reiniciar animación de centrado

  // Limpiar meteoritos
  meteors.length = 0;
  if (meteorInterval) {
    clearInterval(meteorInterval);
    meteorInterval = null;
  }

  // Reiniciar controles
  up = false;
  down = false;
  accelerate = false;

  // Mostrar controles iniciales y ocultar botón restart
  document.getElementById("startBtn").parentElement.style.display = "";
  document.getElementById("restartBtn").style.display = "none";

  // Restaurar visibilidad normal del button-overlay
  const buttonOverlay = document.querySelector(".button-overlay");
  buttonOverlay.style.opacity = "";
  buttonOverlay.style.zIndex = "";
  buttonOverlay.style.pointerEvents = "";

  // Actualizar tiempo en la caja
  updateTimeDisplay();
}

document.getElementById("restartBtn").addEventListener("click", () => {
  restartGame();
});

// Función para calcular y establecer alturas dinámicas basadas en el canvas
function updateContainerHeights() {
  const canvas = document.getElementById("gameCanvas");
  const gameWrapper = document.querySelector(".game-wrapper");
  const gameContainer = document.querySelector(".game-container");

  // Obtener dimensiones reales del canvas después del renderizado
  const canvasRect = canvas.getBoundingClientRect();
  const canvasHeight = canvasRect.height;

  console.log("Altura real del canvas:", canvasHeight + "px");

  // Establecer altura del wrapper igual al canvas
  gameWrapper.style.height = canvasHeight + "px";

  // Establecer altura del container (si no está minimizado)
  if (!gameContainer.classList.contains("minimized")) {
    gameContainer.style.height = canvasHeight + "px";
  }

  // Actualizar tamaño del logo EDG basado en proporción con wrapper
  const gameLogo = document.querySelector(".game-logo");
  if (gameLogo) {
    const wrapperHeight = canvasHeight;
    // Proporción: si wrapper=683px entonces logo=210px (210/683 = 0.3075)
    const logoHeight = wrapperHeight * 0.3075;
    gameLogo.style.height = logoHeight + "px";

    console.log("=== TAMAÑO LOGO EDG ===");
    console.log("Wrapper altura:", wrapperHeight + "px");
    console.log("Logo altura calculada:", logoHeight + "px");
  }

  // Centrar button-overlay específicamente en game-wrapper
  const buttonOverlay = document.querySelector(".button-overlay");
  if (buttonOverlay) {
    // Obtener altura real del game-wrapper
    const wrapperRect = gameWrapper.getBoundingClientRect();
    const wrapperHeight = wrapperRect.height;

    // Obtener altura del button-overlay para centrarlo correctamente
    const overlayRect = buttonOverlay.getBoundingClientRect();
    const overlayHeight = overlayRect.height;

    // Fórmula de centrado: (altura_wrapper - altura_overlay) / 2
    const centerPosition = (wrapperHeight - overlayHeight) / 2;

    // Asegurar que la posición no sea negativa
    const finalPosition = Math.max(0, centerPosition);

    buttonOverlay.style.bottom = finalPosition + "px";

    console.log("=== CENTRADO BUTTON-OVERLAY ===");
    console.log("Game-wrapper altura:", wrapperHeight + "px");
    console.log("Button-overlay altura:", overlayHeight + "px");
    console.log(
      "Cálculo: (" + wrapperHeight + " - " + overlayHeight + ") / 2 =",
      centerPosition
    );
    console.log("Posición final bottom:", finalPosition + "px");
  }
}

// Llamar al cargar la página y cuando cambie el tamaño de ventana
window.addEventListener("load", () => {
  // Pequeño delay para asegurar que todo esté renderizado
  setTimeout(updateContainerHeights, 100);
});
window.addEventListener("resize", updateContainerHeights);

// Asegurar que se ejecute después de que las imágenes se carguen
canvas.addEventListener("load", () => {
  setTimeout(updateContainerHeights, 100);
});

document.getElementById("stopBtn").addEventListener("click", (e) => {
  e.preventDefault();
  const gameContainer = document.querySelector(".game-container");
  const canvas = document.getElementById("gameCanvas");

  if (!gameContainer.classList.contains("minimized")) {
    // Cerrar persiana (hacia abajo) - pausar completamente el juego
    gamePaused = true;
    timerPaused = true;
    gameContainer.classList.add("minimized");
    gameContainer.style.height = "109px";
  } else {
    // Abrir persiana (hacia arriba) - resetear el juego (incluye reactivar todo)
    restartGame();

    gameContainer.classList.remove("minimized");

    // Restaurar altura basada en el canvas
    const canvasRect = canvas.getBoundingClientRect();
    gameContainer.style.height = canvasRect.height + "px";
  }
});

gameLoop();
