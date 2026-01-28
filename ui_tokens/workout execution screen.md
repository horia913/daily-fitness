<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FitCoach Pro | Workout Execution</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        :root {
            --prismatic-1: #c084fc;
            --prismatic-2: #818cf8;
            --prismatic-3: #22d3ee;
            --carbon: #0f172a;
        }

        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--carbon);
            overflow-x: hidden;
            color: white;
            -webkit-tap-highlight-color: transparent;
        }

        .mono { font-family: 'JetBrains+Mono', monospace; }

        /* Aurora Animated Background */
        .aurora-container {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            z-index: -1;
            background: radial-gradient(circle at 20% 30%, rgba(192, 132, 252, 0.15) 0%, transparent 40%),
                        radial-gradient(circle at 80% 70%, rgba(34, 211, 238, 0.1) 0%, transparent 40%);
            animation: aurora-drift 20s ease-in-out infinite alternate;
        }

        @keyframes aurora-drift {
            from { transform: scale(1) rotate(0deg); }
            to { transform: scale(1.2) rotate(5deg); }
        }

        /* Grain Overlay */
        .grain {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            opacity: 0.04;
            pointer-events: none;
            z-index: 50;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }

        /* Glass Textures */
        .glass {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
        }

        .glass-active {
            background: rgba(192, 132, 252, 0.08);
            border: 1px solid rgba(192, 132, 252, 0.4);
            box-shadow: 0 0 20px rgba(192, 132, 252, 0.2);
            position: relative;
        }

        /* Shimmer Animation */
        .shimmer {
            position: relative;
            overflow: hidden;
        }
        .shimmer::after {
            content: "";
            position: absolute;
            top: -50%; left: -50%; width: 200%; height: 200%;
            background: linear-gradient(45deg, transparent, rgba(255,255,255,0.05), transparent);
            transform: rotate(45deg);
            animation: shimmer-slide 4s infinite linear;
        }
        @keyframes shimmer-slide {
            0% { transform: translateX(-100%) rotate(45deg); }
            100% { transform: translateX(100%) rotate(45deg); }
        }

        /* Prismatic Border */
        .prismatic-border {
            position: relative;
            border: none;
        }
        .prismatic-border::before {
            content: "";
            position: absolute;
            inset: -1px;
            padding: 1px;
            border-radius: inherit;
            background: linear-gradient(90deg, var(--prismatic-1), var(--prismatic-2), var(--prismatic-3), var(--prismatic-1));
            background-size: 300% 100%;
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            animation: border-flow 4s linear infinite;
        }
        @keyframes border-flow {
            0% { background-position: 0% 50%; }
            100% { background-position: 100% 50%; }
        }

        /* Press Interaction */
        .press-scale { transition: transform 0.1s ease; }
        .press-scale:active { transform: scale(0.96); }

        /* Custom Scrollbar */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
    </style>
</head>
<body class="p-4 pt-8 min-h-screen">
    <div class="grain"></div>
    <div class="aurora-container"></div>

    <!-- Header Section -->
    <header class="flex flex-col gap-1 mb-6">
        <div class="flex justify-between items-center">
            <div class="flex items-center gap-2">
                <span class="flex h-2 w-2 rounded-full bg-purple-500 animate-pulse"></span>
                <span class="text-[10px] font-bold tracking-[0.2em] text-purple-400 uppercase">Strength Domain</span>
            </div>
            <div class="flex items-center gap-2 glass px-3 py-1 rounded-full border-white/5">
                <span class="text-[10px] font-bold text-red-400 tracking-wider">LIVE</span>
                <span class="mono text-sm font-bold text-white/90">38:12</span>
            </div>
        </div>
        <h1 class="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
            Upper Body Power
        </h1>
    </header>

    <!-- Hero Card -->
    <div class="glass shimmer rounded-3xl p-6 mb-6 relative overflow-hidden border-white/10">
        <div class="flex justify-between items-start mb-4">
            <div>
                <h2 class="text-2xl font-bold mb-1">Bench Press</h2>
                <div class="flex gap-2">
                    <span class="text-xs font-medium text-white/50">Flat Barbell</span>
                    <span class="text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">Set 3 of 5</span>
                </div>
            </div>
            <div class="flex flex-col items-end">
                <div class="bg-cyan-500/20 border border-cyan-400/30 px-2 py-1 rounded-lg flex items-center gap-1.5">
                    <i data-lucide="timer" class="w-3 h-3 text-cyan-400"></i>
                    <span class="mono text-xs font-bold text-cyan-300">01:45</span>
                </div>
                <div class="mt-2 flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full">
                    <i data-lucide="trophy" class="w-2.5 h-2.5 text-yellow-500"></i>
                    <span class="text-[9px] font-bold text-yellow-500 uppercase tracking-tighter">PR Track</span>
                </div>
            </div>
        </div>

        <!-- PR Mini Card -->
        <div class="flex gap-4 p-3 bg-black/20 rounded-2xl border border-white/5">
            <div class="flex-1">
                <p class="text-[9px] text-white/40 uppercase font-bold tracking-widest mb-1">Last Best</p>
                <p class="mono text-sm font-bold">90<span class="text-white/40 text-[10px] ml-0.5">kg</span> <span class="text-white/20 mx-1">×</span> 6</p>
            </div>
            <div class="w-[1px] bg-white/10"></div>
            <div class="flex-1">
                <p class="text-[9px] text-purple-400 uppercase font-bold tracking-widest mb-1">Today Best</p>
                <p class="mono text-sm font-bold text-purple-400">92.5<span class="text-purple-400/40 text-[10px] ml-0.5">kg</span> <span class="text-purple-400/20 mx-1">×</span> 6</p>
            </div>
        </div>
    </div>

    <!-- Set Rows List -->
    <div class="space-y-3 mb-32">
        <!-- Set Row 1 (Done) -->
        <div class="glass flex items-center p-4 rounded-2xl opacity-50 grayscale-[0.5]">
            <span class="mono text-xs text-white/30 w-6">1</span>
            <div class="flex-1 flex justify-center mono text-lg">90.0kg</div>
            <div class="flex-1 flex justify-center mono text-lg">8 reps</div>
            <div class="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center text-green-400">
                <i data-lucide="check" class="w-5 h-5"></i>
            </div>
        </div>

        <!-- Set Row 2 (Done) -->
        <div class="glass flex items-center p-4 rounded-2xl opacity-50 grayscale-[0.5]">
            <span class="mono text-xs text-white/30 w-6">2</span>
            <div class="flex-1 flex justify-center mono text-lg">90.0kg</div>
            <div class="flex-1 flex justify-center mono text-lg">6 reps</div>
            <div class="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center text-green-400">
                <i data-lucide="check" class="w-5 h-5"></i>
            </div>
        </div>

        <!-- Set Row 3 (ACTIVE) -->
        <div class="glass-active prismatic-border flex items-center p-4 rounded-2xl">
            <span class="mono text-xs text-purple-400 w-6">3</span>
            <div class="flex-1 flex flex-col items-center">
                <span class="text-[9px] text-purple-400/60 uppercase font-bold mb-1">Weight</span>
                <div class="mono text-2xl font-bold">92.5</div>
            </div>
            <div class="flex-1 flex flex-col items-center">
                <span class="text-[9px] text-purple-400/60 uppercase font-bold mb-1">Reps</span>
                <div class="mono text-2xl font-bold">6</div>
            </div>
            <button class="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/40 press-scale">
                <i data-lucide="plus" class="w-6 h-6"></i>
            </button>
        </div>

        <!-- Set Row 4 (Upcoming) -->
        <div class="glass flex items-center p-4 rounded-2xl border-white/5">
            <span class="mono text-xs text-white/20 w-6">4</span>
            <div class="flex-1 flex justify-center mono text-lg text-white/40">92.5kg</div>
            <div class="flex-1 flex justify-center mono text-lg text-white/40">6 reps</div>
            <div class="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/20">
                <i data-lucide="circle" class="w-5 h-5"></i>
            </div>
        </div>

        <!-- Set Row 5 (Upcoming) -->
        <div class="glass flex items-center p-4 rounded-2xl border-white/5">
            <span class="mono text-xs text-white/20 w-6">5</span>
            <div class="flex-1 flex justify-center mono text-lg text-white/40">92.5kg</div>
            <div class="flex-1 flex justify-center mono text-lg text-white/40">6 reps</div>
            <div class="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/20">
                <i data-lucide="circle" class="w-5 h-5"></i>
            </div>
        </div>
    </div>

    <!-- Rest Timer Modal (Bottom Sheet Mock) -->
    <div class="fixed bottom-0 left-0 right-0 z-40 px-2 pb-2">
        <div class="glass bg-slate-900/80 rounded-t-[40px] border-t-white/20 p-8 pb-32 flex flex-col items-center transform translate-y-12 backdrop-blur-3xl">
            <div class="w-12 h-1.5 bg-white/10 rounded-full mb-8"></div>
            
            <div class="relative mb-6">
                <!-- Circular Progress Ring -->
                <svg class="w-48 h-48 -rotate-90">
                    <circle cx="96" cy="96" r="88" stroke="currentColor" stroke-width="4" fill="transparent" class="text-white/5" />
                    <circle cx="96" cy="96" r="88" stroke="currentColor" stroke-width="6" fill="transparent" stroke-dasharray="552" stroke-dashoffset="180" class="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                    <span class="mono text-5xl font-bold tracking-tighter">00:54</span>
                    <span class="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Resting...</span>
                </div>
            </div>

            <div class="flex gap-4 w-full">
                <button class="flex-1 glass py-4 rounded-2xl font-bold text-sm press-scale border-white/10">+30s</button>
                <button class="flex-1 bg-white text-black py-4 rounded-2xl font-bold text-sm press-scale shadow-xl">Skip Rest</button>
            </div>
        </div>
    </div>

    <!-- Bottom Sticky Action Bar -->
    <div class="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
        <div class="max-w-md mx-auto flex flex-col gap-3">
            <div class="flex gap-3">
                <button class="flex-[2] bg-purple-600 hover:bg-purple-500 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 press-scale relative overflow-hidden">
                    <span class="relative z-10">Finish Exercise</span>
                    <i data-lucide="chevron-right" class="w-5 h-5 relative z-10"></i>
                    <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer-slide_3s_infinite]"></div>
                </button>
                <button class="flex-1 glass border-white/20 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-2 press-scale">
                    <i data-lucide="timer" class="w-5 h-5"></i>
                    <span>Rest</span>
                </button>
            </div>
            <button class="text-white/30 text-xs font-bold uppercase tracking-widest py-2 hover:text-white/60 transition-colors">
                Swap Exercise
            </button>
        </div>
    </div>

    <script>
        lucide.createIcons();
    </script>
</body>
</html>