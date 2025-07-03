const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function createEmpty2DArray(row, col, defaultvalue = null) {
    const array2D = [];

    for (let i = 0; i < row; i++) {
        const row = []
        for (let j = 0; j < col; j++) {
            row.push(defaultvalue);
        }
        array2D.push(row);
    }

    return array2D;
}

class block {
    constructor() {
        this.width = 10;
        this.height = 10;
    }

    draw(ctx,type, x, y) {
        switch (type) {
            case 0:
                return;
                break;
            case 1: 
                ctx.fillStyle = 'grey';
                break;
        }
        ctx.fillRect(x,y,this.width, this.height)
    }
}

const blockSize = 10;
const numRows = 200;
const numCols = 600;

const gameGrid = createEmpty2DArray(numRows, numCols);

const blockProb = 0.5;
const blockInstance = new block();

for (let i = 0; i < numRows; i++) {
    for (let j = 0; j < numCols; j++) {
        const randValue = Math.random();

        gameGrid[i][j] = randValue < blockProb ? 1 : 0;
    }
}

function drawGameGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const visibleCols = Math.ceil(canvas.width / blockWidth);
    const visibleRows = Math.ceil(canvas.height / blockHeight);

    for (let i = 0; i < Math.min(numRows, visibleRows); i++) {
        for (let j = 0; j < Math.min(numCols, visibleCols); j++) {
            const blockType = gameGrid[i][j];

            const x = j * blockWidth;
            const y = i * blockHeight;

            blockInstance.draw(ctx, blockType, x, y);
        }
    }
}


// game loop

function gameLoop() {
    drawGameGrid
    requestAnimationFrame(gameLoop)
}

gameLoop();

