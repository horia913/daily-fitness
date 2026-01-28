<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Phosphor Workout Builder</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #050608;
            --card-bg: rgba(15, 17, 20, 0.8);
            --phosphor-primary: #00ff9d;
            --phosphor-secondary: #00e5ff;
            --phosphor-warmup: #f0db4f;
            --phosphor-dropset: #ff4d4d;
            --glass-border: rgba(255, 255, 255, 0.06);
            --text-main: #e2e8f0;
            --text-dim: #64748b;
            --glow-strength: 15px;
            --font-sans: 'Geist', sans-serif;
            --font-mono: 'JetBrains Mono', monospace;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            cursor: crosshair;
        }

        body {
            background-color: var(--bg-color);
            color: var(--text-main);
            font-family: var(--font-sans);
            display: flex;
            justify-content: center;
            align-items: flex-start;
            min-height: 100vh;
            padding: 40px 20px;
            overflow-x: hidden;
        }

        /* Kinetic Phosphor Diffusion Filter */
        .diffusion-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1000;
            background: radial-gradient(circle at 50% 50%, transparent 0%, rgba(5, 6, 8, 0.4) 100%);
            mix-blend-mode: screen;
            opacity: 0.5;
        }

        .grain {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            opacity: 0.04;
            pointer-events: none;
            z-index: 1001;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3ExternalIcon%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }

        .builder-container {
            width: 100%;
            max-width: 680px;
            z-index: 10;
        }

        .header {
            margin-bottom: 48px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-bottom: 1px solid var(--glass-border);
            padding-bottom: 24px;
        }

        .header h1 {
            font-weight: 800;
            letter-spacing: -0.04em;
            font-size: 2rem;
            text-transform: uppercase;
            color: var(--text-main);
            text-shadow: 0 0 20px rgba(0, 255, 157, 0.2);
        }

        .header span {
            font-family: var(--font-mono);
            font-size: 0.75rem;
            color: var(--phosphor-primary);
            text-transform: uppercase;
        }

        .workout-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
            perspective: 1000px;
        }

        .exercise-block {
            background: var(--card-bg);
            border: 1px solid var(--glass-border);
            border-radius: 12px;
            padding: 20px;
            display: grid;
            grid-template-columns: 32px 1fr auto;
            align-items: center;
            gap: 20px;
            backdrop-filter: blur(12px);
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            position: relative;
            overflow: hidden;
        }

        .exercise-block:hover {
            border-color: rgba(0, 255, 157, 0.3);
            transform: translateX(4px);
            box-shadow: -10px 0 30px -10px rgba(0, 255, 157, 0.15);
        }

        .exercise-block.dragging {
            opacity: 0.5;
            scale: 0.98;
            border-color: var(--phosphor-primary);
            box-shadow: 0 0 40px rgba(0, 255, 157, 0.4);
        }

        .drag-handle {
            display: flex;
            flex-direction: column;
            gap: 3px;
            cursor: grab;
            padding: 10px 0;
        }

        .drag-handle span {
            width: 4px;
            height: 4px;
            background: var(--text-dim);
            border-radius: 50%;
            box-shadow: 0 0 5px rgba(255,255,255,0.1);
        }

        .exercise-block:hover .drag-handle span {
            background: var(--phosphor-primary);
            box-shadow: 0 0 8px var(--phosphor-primary);
        }

        .info {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .info h3 {
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--text-main);
        }

        .meta {
            display: flex;
            gap: 16px;
            font-family: var(--font-mono);
            font-size: 0.8rem;
            color: var(--text-dim);
        }

        .meta b {
            color: var(--phosphor-secondary);
            font-weight: normal;
        }

        .badges {
            display: flex;
            gap: 8px;
        }

        .badge {
            font-family: var(--font-mono);
            font-size: 0.65rem;
            padding: 4px 10px;
            border-radius: 200px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--glass-border);
            color: var(--text-dim);
            transition: all 0.3s ease;
        }

        .badge.superset { border-color: var(--phosphor-secondary); color: var(--phosphor-secondary); box-shadow: 0 0 10px rgba(0, 229, 255, 0.1); }
        .badge.circuit { border-color: var(--phosphor-primary); color: var(--phosphor-primary); box-shadow: 0 0 10px rgba(0, 255, 157, 0.1); }
        .badge.warmup { border-color: var(--phosphor-warmup); color: var(--phosphor-warmup); box-shadow: 0 0 10px rgba(240, 219, 79, 0.1); }
        .badge.dropset { border-color: var(--phosphor-dropset); color: var(--phosphor-dropset); box-shadow: 0 0 10px rgba(255, 77, 77, 0.1); }

        .add-block-btn {
            margin-top: 24px;
            width: 100%;
            padding: 20px;
            background: transparent;
            border: 1px dashed var(--glass-border);
            border-radius: 12px;
            color: var(--text-dim);
            font-family: var(--font-mono);
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 12px;
        }

        .add-block-btn:hover {
            border-color: var(--phosphor-primary);
            color: var(--phosphor-primary);
            background: rgba(0, 255, 157, 0.02);
            box-shadow: inset 0 0 20px rgba(0, 255, 157, 0.05);
            transform: translateY(2px);
        }

        .drop-zone-highlight {
            height: 4px;
            background: var(--phosphor-primary);
            margin: 4px 0;
            border-radius: 2px;
            box-shadow: 0 0 15px var(--phosphor-primary);
            display: none;
            transition: all 0.2s ease;
        }

        .exercise-block::after {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(90deg, transparent, rgba(0, 255, 157, 0.03), transparent);
            transform: translateX(-100%);
            transition: transform 0.8s ease;
        }

        .exercise-block:hover::after {
            transform: translateX(100%);
        }

        @keyframes phosphorPulse {
            0% { opacity: 0.3; }
            50% { opacity: 0.6; }
            100% { opacity: 0.3; }
        }

        .glow-point {
            position: absolute;
            width: 100px;
            height: 100px;
            background: var(--phosphor-primary);
            filter: blur(60px);
            border-radius: 50%;
            opacity: 0.15;
            z-index: -1;
            animation: phosphorPulse 4s infinite ease-in-out;
        }
    </style>
</head>
<body>
    <div class="grain"></div>
    <div class="diffusion-overlay"></div>
    <div class="glow-point" style="top: 10%; right: 10%;"></div>
    <div class="glow-point" style="bottom: 20%; left: 5%; background: var(--phosphor-secondary);"></div>

    <main class="builder-container">
        <header class="header">
            <div>
                <span>Phase 01 / Hypertrophy</span>
                <h1>Daily Builder</h1>
            </div>
            <div style="text-align: right;">
                <span style="color: var(--text-dim);">Auto-saving...</span>
            </div>
        </header>

        <div class="workout-list" id="sortable-list">
            <!-- Block 1 -->
            <div class="exercise-block" draggable="true">
                <div class="drag-handle">
                    <span></span><span></span><span></span>
                </div>
                <div class="info">
                    <h3>Deep Incline DB Press</h3>
                    <div class="meta">
                        <span>SETS: <b>4</b></span>
                        <span>REPS: <b>8-12</b></span>
                        <span>RPE: <b>9.0</b></span>
                    </div>
                </div>
                <div class="badges">
                    <div class="badge warmup">Warm-up</div>
                </div>
            </div>

            <!-- Block 2 -->
            <div class="exercise-block" draggable="true">
                <div class="drag-handle">
                    <span></span><span></span><span></span>
                </div>
                <div class="info">
                    <h3>Weighted Chest Dips</h3>
                    <div class="meta">
                        <span>SETS: <b>3</b></span>
                        <span>REPS: <b>AMRAP</b></span>
                        <span>REST: <b>120s</b></span>
                    </div>
                </div>
                <div class="badges">
                    <div class="badge superset">Superset</div>
                </div>
            </div>

            <!-- Block 3 -->
            <div class="exercise-block" draggable="true">
                <div class="drag-handle">
                    <span></span><span></span><span></span>
                </div>
                <div class="info">
                    <h3>Lateral Raise Cable Fly</h3>
                    <div class="meta">
                        <span>SETS: <b>5</b></span>
                        <span>REPS: <b>15+</b></span>
                        <span>INT: <b>Slow Ecc.</b></span>
                    </div>
                </div>
                <div class="badges">
                    <div class="badge circuit">Circuit</div>
                </div>
            </div>

            <!-- Block 4 -->
            <div class="exercise-block" draggable="true">
                <div class="drag-handle">
                    <span></span><span></span><span></span>
                </div>
                <div class="info">
                    <h3>Tricep Rope Pushdowns</h3>
                    <div class="meta">
                        <span>SETS: <b>2</b></span>
                        <span>REPS: <b>12</b></span>
                        <span>LOAD: <b>Max</b></span>
                    </div>
                </div>
                <div class="badges">
                    <div class="badge dropset">Dropset</div>
                </div>
            </div>
        </div>

        <button class="add-block-btn">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 1V13M1 7H13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Add Exercise Block
        </button>
    </main>

    <script>
        const list = document.getElementById('sortable-list');
        let dragItem = null;

        list.addEventListener('dragstart', (e) => {
            dragItem = e.target;
            e.target.classList.add('dragging');
            // Kinetic Diffusion: create a ghost-like effect on drag start
            setTimeout(() => e.target.style.opacity = "0.2", 0);
        });

        list.addEventListener('dragend', (e) => {
            e.target.classList.remove('dragging');
            e.target.style.opacity = "1";
            dragItem = null;
        });

        list.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = getDragAfterElement(list, e.clientY);
            const draggable = document.querySelector('.dragging');
            if (afterElement == null) {
                list.appendChild(draggable);
            } else {
                list.insertBefore(draggable, afterElement);
            }
        });

        function getDragAfterElement(container, y) {
            const draggableElements = [...container.querySelectorAll('.exercise-block:not(.dragging)')];

            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }

        // Add visual phosphor trail effect on mouse move (Subtle)
        document.addEventListener('mousemove', (e) => {
            const glow = document.querySelector('.glow-point');
            const x = e.clientX;
            const y = e.clientY;
            
            // Move the first glow point slightly towards the cursor to create "Kinetic" feel
            const moveX = (x - window.innerWidth / 2) * 0.05;
            const moveY = (y - window.innerHeight / 2) * 0.05;
            
            glow.style.transform = `translate(${moveX}px, ${moveY}px)`;
        });
    </script>
</body>
</html>