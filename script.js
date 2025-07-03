
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

const keysPressed = {};

document.addEventListener('keydown', (e) => {
    keysPressed[e.key.toLowerCase()] = true;
});

document.addEventListener('keyup', (e) => {
    keysPressed[e.key.toLowerCase()] = false;
});

function updateCamera() {
    if (keysPressed['w']) cameraY -= cameraSpeed;
    if (keysPressed['s']) cameraY += cameraSpeed;
    if (keysPressed['a']) cameraX -= cameraSpeed;
    if (keysPressed['d']) cameraX += cameraSpeed;

    // Clamp camera to bounds
    cameraX = Math.max(0, Math.min(numCols - visibleCols, cameraX));
    cameraY = Math.max(0, Math.min(numRows - visibleRows, cameraY));
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

function drawGameGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

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
    updateCamera();
    drawGameGrid(); // <-- CALL the function
    requestAnimationFrame(gameLoop);
}

gameLoop(); // start the loop

