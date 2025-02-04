// Initialize Matter.js modules
const { Engine, Render, Runner, Bodies, Composite, Common, Mouse, MouseConstraint, Vector } = Matter;

// Create engine and world
const engine = Engine.create();
const world = engine.world;

// Get canvas and create renderer
const canvas = document.getElementById('game-canvas');
const renderer = Render.create({
    canvas: canvas,
    engine: engine,
    options: {
        width: window.innerWidth,
        height: window.innerHeight,
        wireframes: false,
        background: '#1a1a1a'
    }
});

// Create walls
const wallThickness = 60;
const walls = [
    Bodies.rectangle(window.innerWidth / 2, window.innerHeight + wallThickness / 2, window.innerWidth, wallThickness, { isStatic: true }), // Bottom
    Bodies.rectangle(-wallThickness / 2, window.innerHeight / 2, wallThickness, window.innerHeight, { isStatic: true }), // Left
    Bodies.rectangle(window.innerWidth + wallThickness / 2, window.innerHeight / 2, wallThickness, window.innerHeight, { isStatic: true }), // Right
];
Composite.add(world, walls);

// Enable decomp.js
Common.setDecomp(decomp);

// Create letters when clicking
canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    createLetter(x, y);
});

// Function to create a letter with physics
function createLetter(x, y) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomLetter = letters[Math.floor(Math.random() * letters.length)];
    
    // Create a temporary canvas to generate letter path
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = 60;
    tempCanvas.height = 60;
    
    // Draw letter
    tempCtx.font = 'bold 48px Arial';
    tempCtx.fillStyle = 'black';
    tempCtx.textAlign = 'center';
    tempCtx.textBaseline = 'middle';
    tempCtx.fillText(randomLetter, tempCanvas.width / 2, tempCanvas.height / 2);
    
    // Get letter vertices
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const points = [];
    
    for (let i = 0; i < imageData.data.length; i += 4) {
        if (imageData.data[i + 3] > 0) {
            const px = (i / 4) % tempCanvas.width;
            const py = Math.floor((i / 4) / tempCanvas.width);
            points.push({ x: px, y: py });
        }
    }
    
    // Create hull from points
    const hull = new ConvexHull(points);
    const vertices = hull.getHull().map(point => Vector.create(point.x - tempCanvas.width / 2, point.y - tempCanvas.height / 2));
    
    // Create physics body
    const letterBody = Bodies.fromVertices(x, y, [vertices], {
        render: {
            fillStyle: getRandomColor(),
            strokeStyle: '#ffffff',
            lineWidth: 1
        },
        restitution: 0.4,
        friction: 0.1,
        density: 0.001
    });
    
    Composite.add(world, letterBody);
}

// Helper function to generate random colors
function getRandomColor() {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// ConvexHull algorithm (Graham Scan)
class ConvexHull {
    constructor(points) {
        this.points = points;
    }
    
    getHull() {
        const points = [...this.points];
        points.sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);
        
        const lower = [];
        for (let i = 0; i < points.length; i++) {
            while (lower.length >= 2 && this.cross(lower[lower.length - 2], lower[lower.length - 1], points[i]) <= 0) {
                lower.pop();
            }
            lower.push(points[i]);
        }
        
        const upper = [];
        for (let i = points.length - 1; i >= 0; i--) {
            while (upper.length >= 2 && this.cross(upper[upper.length - 2], upper[upper.length - 1], points[i]) <= 0) {
                upper.pop();
            }
            upper.push(points[i]);
        }
        
        upper.pop();
        lower.pop();
        return lower.concat(upper);
    }
    
    cross(o, a, b) {
        return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    }
}

// Handle window resize
window.addEventListener('resize', () => {
    renderer.canvas.width = window.innerWidth;
    renderer.canvas.height = window.innerHeight;
    Render.setPixelRatio(renderer, window.devicePixelRatio);
});

// Add mouse control
const mouse = Mouse.create(renderer.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        stiffness: 0.2,
        render: {
            visible: false
        }
    }
});
Composite.add(world, mouseConstraint);
renderer.mouse = mouse;

// Start the engine
Runner.run(engine);
Render.run(renderer); 