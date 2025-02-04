// Wait for window load and Matter.js initialization
window.addEventListener('load', () => {
    if (typeof Matter === 'undefined') {
        console.error('Matter.js is not loaded properly');
        return;
    }

    // Initialize Matter.js modules
    const { Engine, Render, Runner, Bodies, Body, Composite, Common, Mouse, MouseConstraint, Vector } = Matter;

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
    if (typeof decomp === 'undefined') {
        console.error('poly-decomp.js is not loaded properly');
        return;
    }
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
        tempCanvas.width = 100;  // Increased canvas size for better detail
        tempCanvas.height = 100;
        
        // Draw letter with higher resolution
        tempCtx.font = 'bold 80px Arial';
        tempCtx.fillStyle = 'black';
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';
        tempCtx.fillText(randomLetter, tempCanvas.width / 2, tempCanvas.height / 2);
        
        // Get letter vertices with more detail
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const points = [];
        const step = 2; // Sample every 2 pixels for better performance while maintaining detail
        
        for (let y = 0; y < tempCanvas.height; y += step) {
            for (let x = 0; x < tempCanvas.width; x += step) {
                const index = (y * tempCanvas.width + x) * 4;
                if (imageData.data[index + 3] > 128) { // Alpha threshold
                    // Check if this is an edge pixel by looking at neighbors
                    const isEdge = (
                        x === 0 || x === tempCanvas.width - 1 || y === 0 || y === tempCanvas.height - 1 ||
                        imageData.data[((y - 1) * tempCanvas.width + x) * 4 + 3] <= 128 ||
                        imageData.data[((y + 1) * tempCanvas.width + x) * 4 + 3] <= 128 ||
                        imageData.data[(y * tempCanvas.width + x - 1) * 4 + 3] <= 128 ||
                        imageData.data[(y * tempCanvas.width + x + 1) * 4 + 3] <= 128
                    );
                    
                    if (isEdge) {
                        points.push([x - tempCanvas.width / 2, y - tempCanvas.height / 2]);
                    }
                }
            }
        }
        
        // Ensure we have enough points for decomposition
        if (points.length < 3) {
            console.warn('Not enough points for letter:', randomLetter);
            return;
        }
        
        try {
            // Decompose the concave shape into convex parts
            const decomposed = decomp.quickDecomp(points);
            
            // Create a compound body from the decomposed parts
            const parts = decomposed.map(vertices => {
                return Bodies.fromVertices(0, 0, [vertices.map(vertex => ({ x: vertex[0], y: vertex[1] }))], {
                    render: {
                        fillStyle: getRandomColor(),
                        strokeStyle: '#ffffff',
                        lineWidth: 1
                    }
                });
            });
            
            // Create compound body
            const letterBody = Body.create({
                parts: parts,
                position: { x, y },
                restitution: 0.4,
                friction: 0.1,
                density: 0.001
            });
            
            Composite.add(world, letterBody);
        } catch (error) {
            console.error('Error creating letter:', error);
        }
    }

    // Helper function to generate random colors
    function getRandomColor() {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB'];
        return colors[Math.floor(Math.random() * colors.length)];
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
}); 