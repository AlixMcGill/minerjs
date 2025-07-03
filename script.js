
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Minimal Perlin noise
const noise = (() => {
    const permutation = [...Array(256).keys()];
    permutation.sort(() => Math.random() - 0.5);
    const p = [...permutation, ...permutation];

    function fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    function lerp(t, a, b) {
        return a + t * (b - a);
    }
    function grad(hash, x, y) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
    return {
        perlin2(x, y) {
            const X = Math.floor(x) & 255;
            const Y = Math.floor(y) & 255;

            x -= Math.floor(x);
            y -= Math.floor(y);

            const u = fade(x);
            const v = fade(y);

            const aa = p[p[X] + Y];
            const ab = p[p[X] + Y + 1];
            const ba = p[p[X + 1] + Y];
            const bb = p[p[X + 1] + Y + 1];

            const gradAA = grad(aa, x, y);
            const gradBA = grad(ba, x - 1, y);
            const gradAB = grad(ab, x, y - 1);
            const gradBB = grad(bb, x - 1, y - 1);

            const lerpX1 = lerp(u, gradAA, gradBA);
            const lerpX2 = lerp(u, gradAB, gradBB);
            return lerp(v, lerpX1, lerpX2);
        }
    };
})();


function createEmpty2DArray(row, col, defaultValue = null) {
    const array2D = [];
    for (let i = 0; i < row; i++) {
        const rowArr = [];
        for (let j = 0; j < col; j++) {
            rowArr.push(defaultValue);
        }
        array2D.push(rowArr);
    }
    return array2D;
}

class Block {
    constructor() {
        this.width = canvas.width / 16;
        this.height = canvas.width / 16;
    }

    draw(ctx, type, x, y) {
        if (type === 0) return;

        switch (type) {
            case 1: 
                ctx.fillStyle = 'grey';
                break;
            default:
                ctx.fillStyle = 'black';
        }

        ctx.fillRect(x, y, this.width, this.height);
    }
}

let cameraX = 0;
let cameraY = 0;
const cameraSpeed = .2; // in blocks
const player = {
    x: 4,
    y: 4,
    width: .5,
    height: .5,
    vx: 0,
    vy: 0,
    speed: 0.05,
    jumpPower: -0.08,
    gravity: 0.001,
    grounded: false
};

const keysPressed = {};

document.addEventListener('keydown', (e) => {
    keysPressed[e.key.toLowerCase()] = true;
});

document.addEventListener('keyup', (e) => {
    keysPressed[e.key.toLowerCase()] = false;
});

// Prevent right-click context menu on canvas
canvas.addEventListener('contextmenu', e => e.preventDefault());

// Mouse clicks for break/place blocks
canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const gridX = Math.floor(cameraX + mouseX / blockSize);
    const gridY = Math.floor(cameraY + mouseY / blockSize);

    if (gridX < 0 || gridX >= numCols || gridY < 0 || gridY >= numRows) return;

    if (e.button === 0) { // left click = break
        if (!isPlayerOccupying(gridX, gridY)) {
            gameGrid[gridY][gridX] = 0;
        }
    } else if (e.button === 2) { // right click = place
        if (!isPlayerOccupying(gridX, gridY)) {
            gameGrid[gridY][gridX] = 1;
        }
    }
});

// Helper function to prevent breaking/placing blocks inside the player
function isPlayerOccupying(x, y) {
    return (
        x >= Math.floor(player.x) &&
        x < Math.floor(player.x + player.width) &&
        y >= Math.floor(player.y) &&
        y < Math.floor(player.y + player.height)
    );
}

function isSolid(x, y) {
    const col = Math.floor(x);
    const row = Math.floor(y);
    return gameGrid[row]?.[col] === 1;
}

function updatePlayer() {
    // Horizontal movement
    if (keysPressed['a']) player.vx = -player.speed;
    else if (keysPressed['d']) player.vx = player.speed;
    else player.vx = 0;

    // Jump
    if (keysPressed[' '] && player.grounded) {
        player.vy = player.jumpPower;
        player.grounded = false;
    }

    // Gravity
    player.vy += player.gravity;

// --- Horizontal collision ---
    const nextX = player.x + player.vx;
    const collisionLeft = isSolid(nextX, player.y) || isSolid(nextX, player.y + player.height - 0.1);
    const collisionRight = isSolid(nextX + player.width, player.y) || isSolid(nextX + player.width, player.y + player.height - 0.1);

    if (player.vx < 0 && !collisionLeft) {
        player.x = nextX;
    } else if (player.vx > 0 && !collisionRight) {
        player.x = nextX;
    } else {
        // Collision on X axis, stop horizontal velocity
        player.vx = 0;
    }

    // --- Vertical collision ---
    const nextY = player.y + player.vy;

    if (!isSolid(player.x, nextY + player.height) && !isSolid(player.x + player.width - 0.1, nextY + player.height)) {
        // No collision below, falling or jumping
        player.y = nextY;
        player.grounded = false;
    } else {
        // Landed on ground or hit ceiling
        player.vy = 0;
        player.grounded = true;

        // Snap player exactly on top of block
        const blockRow = Math.floor(nextY + player.height);
        player.y = blockRow - player.height;
    }
    // Clamp within map bounds
    player.x = Math.max(0, Math.min(numCols - player.width, player.x));
    player.y = Math.max(0, Math.min(numRows - player.height, player.y));
}




const blockSize = canvas.width / 16;
const numRows = 200;
const numCols = 600;

const gameGrid = createEmpty2DArray(numRows, numCols);

const blockProb = 0.5;
const blockInstance = new Block();
const visibleCols = 17;
const visibleRows = 9;

const scale = 0.2;







for (let i = 0; i < numRows; i++) {
    for (let j = 0; j < numCols; j++) {
        const value = noise.perlin2(j * scale, i * scale);
        gameGrid[i][j] = value > 0 ? 1 : 0;


        if (i < 6) gameGrid[i][j] = 0;
    }
}




function drawPlayer() {
    const screenX = (player.x - cameraX) * blockSize;
    const screenY = (player.y - cameraY) * blockSize;

    ctx.fillStyle = 'blue';
    ctx.fillRect(screenX, screenY, player.width * blockSize, player.height * blockSize);
}

function drawGameGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    cameraX = player.x - visibleCols / 2;
    cameraY = player.y - visibleRows / 2;

   // Clamp to map edges
    cameraX = Math.max(0, Math.min(numCols - visibleCols, cameraX));
    cameraY = Math.max(0, Math.min(numRows - visibleRows, cameraY));


    for (let i = 0; i < visibleRows; i++) {
        for (let j = 0; j < visibleCols; j++) {
            const gridY = Math.floor(i + cameraY);
            const gridX = Math.floor(j + cameraX);

            const blockType = gameGrid[gridY][gridX];

            const x = j * blockSize - (cameraX % 1) * blockSize;
            const y = i * blockSize - (cameraY % 1) * blockSize;

            blockInstance.draw(ctx, blockType, x, y);
        }
    }
}



function gameLoop() {
    updatePlayer();
    drawGameGrid(); // <-- CALL the function
    drawPlayer();
    requestAnimationFrame(gameLoop);
}

gameLoop(); // start the loop

