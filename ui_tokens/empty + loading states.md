<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FitCoach Pro | Vitreous Tectonics UI</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-deep: #05070a;
            --glass-border: rgba(255, 255, 255, 0.12);
            --glass-bg: rgba(255, 255, 255, 0.04);
            --accent-primary: #a78bfa;
            --accent-secondary: #2dd4bf;
        }

        body {
            background-color: var(--bg-deep);
            font-family: 'Inter', sans-serif;
            color: #e2e8f0;
            overflow-x: hidden;
            -webkit-font-smoothing: antialiased;
        }

        .mono { font-family: 'JetBrains Mono', monospace; }

        /* Animated Aurora Background */
        .aurora-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -2;
            overflow: hidden;
            filter: blur(80px);
            opacity: 0.6;
        }

        .aurora-blob {
            position: absolute;
            width: 60vw;
            height: 60vw;
            border-radius: 50%;
            mix-blend-mode: screen;
            animation: move 25s infinite alternate;
        }

        .blob-1 { background: radial-gradient(circle, #4f46e5 0%, transparent 70%); top: -10%; left: -10%; }
        .blob-2 { background: radial-gradient(circle, #7c3aed 0%, transparent 70%); bottom: -10%; right: -10%; animation-delay: -5s; }
        .blob-3 { background: radial-gradient(circle, #0d9488 0%, transparent 70%); top: 40%; left: 30%; animation-delay: -10s; }

        @keyframes move {
            from { transform: translate(0, 0) scale(1); }
            to { transform: translate(20%, 10%) scale(1.1); }
        }

        /* Granular Texture Overlay */
        .grain-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
            opacity: 0.4;
            pointer-events: none;
        }

        .vignette {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 0;
            background: radial-gradient(circle, transparent 20%, rgba(0,0,0,0.8) 100%);
            pointer-events: none;
        }

        /* Vitreous Tectonics Components */
        .glass-card {
            background: var(--glass-bg);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--glass-border);
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
            border-radius: 24px;
            transition: transform 0.3s ease, border-color 0.3s ease;
        }

        .glass-card:hover {
            border-color: rgba(255, 255, 255, 0.25);
            transform: translateY(-2px);
        }

        /* Skeleton Animations */
        .skeleton {
            background: linear-gradient(
                90deg,
                rgba(255, 255, 255, 0.03) 25%,
                rgba(255, 255, 255, 0.08) 50%,
                rgba(255, 255, 255, 0.03) 75%
            );
            background-size: 200% 100%;
            animation: skeleton-wave 2s infinite linear;
            border-radius: 8px;
        }

        @keyframes skeleton-wave {
            from { background-position: 200% 0; }
            to { background-position: -200% 0; }
        }

        .btn-premium {
            background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
            border: 1px solid rgba(255,255,255,0.2);
            backdrop-filter: blur(8px);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .btn-premium:active { transform: scale(0.96); }

        .badge-tip {
            background: rgba(45, 212, 191, 0.1);
            color: #2dd4bf;
            border: 1px solid rgba(45, 212, 191, 0.2);
            font-size: 10px;
            letter-spacing: 0.05em;
        }

        /* Layout Constraints */
        .app-container {
            max-width: 420px;
            margin: 0 auto;
            padding: 2rem 1.25rem;
            position: relative;
            z-index: 10;
        }

        .section-label {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.2em;
            color: rgba(255, 255, 255, 0.4);
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .section-label::after {
            content: "";
            height: 1px;
            flex-grow: 1;
            background: linear-gradient(90deg, rgba(255,255,255,0.1), transparent);
        }
    </style>
</head>
<body>

    <div class="aurora-container">
        <div class="aurora-blob blob-1"></div>
        <div class="aurora-blob blob-2"></div>
        <div class="aurora-blob blob-3"></div>
    </div>

    <svg class="grain-overlay">
        <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" />
    </svg>

    <div class="vignette"></div>

    <main class="app-container">
        
        <!-- HEADER -->
        <header class="mb-10 flex justify-between items-end">
            <div>
                <h1 class="text-2xl font-extrabold tracking-tight">FitCoach <span class="text-indigo-400">Pro</span></h1>
                <p class="mono text-[10px] opacity-50 uppercase tracking-widest mt-1">Status: Operational</p>
            </div>
            <div class="w-10 h-10 rounded-full glass-card flex items-center justify-center overflow-hidden border-indigo-500/30">
                <img src="https://api.dicebear.com/7.x/shapes/svg?seed=fitcoach" alt="avatar" class="w-6 h-6 opacity-80">
            </div>
        </header>

        <!-- SECTION A: EMPTY STATES -->
        <div class="mb-12">
            <div class="section-label">Section A: Empty States</div>
            
            <div class="space-y-4">
                <!-- Empty Workouts -->
                <div class="glass-card p-8 text-center relative overflow-hidden group">
                    <div class="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full"></div>
                    <div class="mb-6 flex justify-center">
                        <div class="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                            <svg class="w-8 h-8 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        </div>
                    </div>
                    <h3 class="text-lg font-semibold mb-2">No workouts assigned</h3>
                    <p class="text-sm text-slate-400 mb-6 leading-relaxed">Your trainer is currently sculpting your next session. Check back in a few.</p>
                    <button class="btn-premium w-full py-3 rounded-xl font-semibold text-sm tracking-wide">Browse Library</button>
                </div>

                <!-- Empty Meals -->
                <div class="glass-card p-5 flex items-start gap-4">
                    <div class="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                        <svg class="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                    </div>
                    <div class="flex-grow">
                        <div class="flex items-center gap-2 mb-1">
                            <h3 class="text-sm font-semibold">No meals logged today</h3>
                            <span class="badge-tip px-1.5 py-0.5 rounded mono uppercase">Tip</span>
                        </div>
                        <p class="text-xs text-slate-400 leading-normal">Fuel is the foundation of performance. Log your breakfast to see macros.</p>
                    </div>
                </div>

                <!-- Empty Habits -->
                <div class="glass-card p-4 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full border border-dashed border-white/20 flex items-center justify-center">
                            <div class="w-2 h-2 rounded-full bg-white/20"></div>
                        </div>
                        <span class="text-sm font-medium opacity-60">No habits configured</span>
                    </div>
                    <button class="text-xs font-bold text-indigo-400 px-3 py-1">Set Goal</button>
                </div>
            </div>
        </div>

        <!-- SECTION B: LOADING STATES -->
        <div class="mb-12">
            <div class="section-label">Section B: Loading States</div>

            <div class="space-y-6">
                <!-- Hero Skeleton -->
                <div class="glass-card p-6">
                    <div class="skeleton w-24 h-4 mb-4 opacity-40"></div>
                    <div class="skeleton w-full h-32 mb-4 opacity-20"></div>
                    <div class="flex gap-2">
                        <div class="skeleton w-16 h-8 opacity-30"></div>
                        <div class="skeleton w-16 h-8 opacity-30"></div>
                    </div>
                </div>

                <!-- List Skeletons -->
                <div class="space-y-4 px-2">
                    <div class="flex items-center gap-4">
                        <div class="skeleton w-10 h-10 rounded-full shrink-0 opacity-40"></div>
                        <div class="flex-grow space-y-2">
                            <div class="skeleton w-1/3 h-3 opacity-30"></div>
                            <div class="skeleton w-2/3 h-2 opacity-20"></div>
                        </div>
                    </div>
                    <div class="flex items-center gap-4">
                        <div class="skeleton w-10 h-10 rounded-full shrink-0 opacity-40"></div>
                        <div class="flex-grow space-y-2">
                            <div class="skeleton w-1/4 h-3 opacity-30"></div>
                            <div class="skeleton w-1/2 h-2 opacity-20"></div>
                        </div>
                    </div>
                    <div class="flex items-center gap-4">
                        <div class="skeleton w-10 h-10 rounded-full shrink-0 opacity-40"></div>
                        <div class="flex-grow space-y-2">
                            <div class="skeleton w-1/2 h-3 opacity-30"></div>
                            <div class="skeleton w-1/3 h-2 opacity-20"></div>
                        </div>
                    </div>
                </div>

                <!-- Form Skeleton -->
                <div class="space-y-3">
                    <div class="skeleton w-full h-12 rounded-xl opacity-20 border border-white/5"></div>
                    <div class="skeleton w-full h-12 rounded-xl opacity-20 border border-white/5"></div>
                </div>
            </div>
        </div>

        <!-- SECTION C: ERROR STATE -->
        <div>
            <div class="section-label">Section C: Error State</div>
            
            <div class="glass-card p-6 border-red-500/20 bg-red-500/5 relative overflow-hidden">
                <!-- Red glow effect -->
                <div class="absolute -bottom-10 -left-10 w-24 h-24 bg-red-500/10 blur-2xl rounded-full"></div>
                
                <div class="flex items-center gap-4 mb-4">
                    <div class="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    </div>
                    <div>
                        <h4 class="font-bold text-red-100">Sync Interrupted</h4>
                        <p class="mono text-[10px] text-red-400/70 tracking-tight uppercase">Error Code: 0x4492A</p>
                    </div>
                </div>
                
                <p class="text-sm text-slate-300/80 mb-5 leading-relaxed">
                    We're having trouble connecting to the biometric engine. Your data is safe locally.
                </p>

                <div class="flex gap-3">
                    <button class="btn-premium flex-grow py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-red-200 border-red-500/20">
                        Retry Connection
                    </button>
                    <button class="px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-xs font-medium opacity-60">
                        Ignore
                    </button>
                </div>
            </div>
        </div>

        <!-- BOTTOM NAV (Visual Anchor) -->
        <nav class="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2.5rem)] max-w-[380px] h-16 glass-card rounded-2xl flex items-center justify-around px-4 border-white/10">
            <div class="w-10 h-10 flex items-center justify-center text-indigo-400"><svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg></div>
            <div class="w-10 h-10 flex items-center justify-center opacity-40"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg></div>
            <div class="w-10 h-10 flex items-center justify-center opacity-40"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
            <div class="w-10 h-10 flex items-center justify-center opacity-40"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg></div>
        </nav>

        <div class="h-24"></div> <!-- Spacer -->
    </main>

    <script>
        // Subtle Parallax Effect on Cards
        document.addEventListener('mousemove', (e) => {
            const cards = document.querySelectorAll('.glass-card');
            const mouseX = e.clientX / window.innerWidth - 0.5;
            const mouseY = e.clientY / window.innerHeight - 0.5;

            cards.forEach(card => {
                const rect = card.getBoundingClientRect();
                const cardCenterX = rect.left + rect.width / 2;
                const cardCenterY = rect.top + rect.height / 2;
                
                // Only animate if somewhat near the viewport
                if (rect.top < window.innerHeight && rect.bottom > 0) {
                    card.style.transform = `perspective(1000px) rotateY(${mouseX * 2}deg) rotateX(${mouseY * -2}deg) translateY(${mouseY * 5}px)`;
                }
            });
        });
    </script>
</body>
</html>