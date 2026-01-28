<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FitCoach Pro - Universal Lists</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-base: #020617;
            --basalt-surface: #0f172a;
            --workout: #38bdf8;
            --meal: #4ade80;
            --habit: #fbbf24;
            --challenge: #f43f5e;
        }

        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--bg-base);
            color: #f1f5f9;
            overflow-x: hidden;
            -webkit-font-smoothing: antialiased;
        }

        .mono { font-family: 'JetBrains Mono', monospace; }

        /* Aurora Background */
        .aurora-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
            overflow: hidden;
            filter: blur(100px);
            opacity: 0.4;
        }

        .blob {
            position: absolute;
            width: 50vw;
            height: 50vw;
            border-radius: 50%;
            filter: blur(80px);
            animation: move 20s infinite alternate;
        }

        .blob-1 { background: #1e3a8a; top: -10%; left: -10%; animation-duration: 15s; }
        .blob-2 { background: #4c1d95; bottom: -10%; right: -10%; animation-duration: 25s; }
        .blob-3 { background: #064e3b; top: 40%; left: 30%; animation-duration: 20s; }

        @keyframes move {
            from { transform: translate(0, 0) scale(1); }
            to { transform: translate(10%, 15%) scale(1.1); }
        }

        /* Grain & Vignette */
        .grain {
            position: fixed;
            inset: 0;
            z-index: 100;
            pointer-events: none;
            opacity: 0.04;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }

        .vignette {
            position: fixed;
            inset: 0;
            z-index: 99;
            pointer-events: none;
            background: radial-gradient(circle, transparent 40%, rgba(0,0,0,0.7) 100%);
        }

        /* Slab-Cast Basalt System */
        .basalt-card {
            background: rgba(15, 23, 42, 0.7);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 
                0 4px 6px -1px rgba(0, 0, 0, 0.3), 
                inset 0 1px 1px rgba(255, 255, 255, 0.05);
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .basalt-row {
            background: rgba(30, 41, 59, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.03);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .basalt-row:active {
            transform: scale(0.985);
            background: rgba(30, 41, 59, 0.8);
            box-shadow: inset 0 2px 8px rgba(0,0,0,0.4);
        }

        .basalt-row:hover {
            background: rgba(255, 255, 255, 0.04);
            border-color: rgba(255, 255, 255, 0.15);
        }

        /* Domain Accents */
        .accent-workout { border-left: 4px solid var(--workout); }
        .accent-meal { border-left: 4px solid var(--meal); }
        .accent-habit { border-left: 4px solid var(--habit); }
        .accent-challenge { border-left: 4px solid var(--challenge); }

        /* Custom Scrollbar */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }

        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        .pill-active {
            background: white;
            color: black;
            box-shadow: 0 0 20px rgba(255,255,255,0.2);
        }
    </style>
</head>
<body class="p-4 flex justify-center items-start min-h-screen">

    <div class="grain"></div>
    <div class="vignette"></div>
    <div class="aurora-container">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
        <div class="blob blob-3"></div>
    </div>

    <!-- Mobile Device Mockup Container -->
    <div class="w-full max-w-[400px] bg-slate-950 rounded-[48px] border-[8px] border-slate-900 shadow-2xl relative overflow-hidden h-[844px] flex flex-col">
        
        <!-- Status Bar -->
        <div class="flex justify-between items-center px-8 pt-6 pb-2 text-xs font-semibold opacity-60">
            <span>9:41</span>
            <div class="flex gap-1.5 items-center">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21L15.6 16.2C14.6 15.4 13.3 15 12 15C10.7 15 9.4 15.4 8.4 16.2L12 21ZM12 3C7.2 3 3.1 5 0 8.3L12 21L24 8.3C20.9 5 16.8 3 12 3Z"/></svg>
                <div class="w-5 h-2.5 border border-current rounded-sm relative"><div class="absolute top-0.5 left-0.5 bottom-0.5 right-1 bg-current rounded-px"></div></div>
            </div>
        </div>

        <!-- Header -->
        <header class="px-6 py-4 space-y-6 sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md">
            <div class="flex justify-between items-center">
                <h1 class="text-3xl font-extrabold tracking-tight text-white uppercase italic">Browse</h1>
                <div class="w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden bg-slate-800">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="profile">
                </div>
            </div>

            <!-- Segmented Toggle -->
            <div class="flex p-1 bg-white/5 rounded-2xl border border-white/5 gap-1">
                <button class="flex-1 py-2 text-[10px] font-bold uppercase tracking-wider pill-active rounded-xl">Workouts</button>
                <button class="flex-1 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 rounded-xl hover:text-white transition-colors">Meals</button>
                <button class="flex-1 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 rounded-xl hover:text-white transition-colors">Habits</button>
                <button class="flex-1 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 rounded-xl hover:text-white transition-colors">Clubs</button>
            </div>
        </header>

        <!-- Main Content Area -->
        <div class="flex-1 overflow-y-auto hide-scrollbar px-4 pb-12 space-y-4">
            
            <!-- Sticky Filter Chips -->
            <div class="sticky top-0 z-30 flex gap-2 overflow-x-auto py-2 hide-scrollbar bg-transparent">
                <div class="px-4 py-1.5 bg-white text-black rounded-full text-xs font-bold whitespace-nowrap">All</div>
                <div class="px-4 py-1.5 bg-slate-800 text-slate-300 border border-white/10 rounded-full text-xs font-bold whitespace-nowrap">Strength</div>
                <div class="px-4 py-1.5 bg-slate-800 text-slate-300 border border-white/10 rounded-full text-xs font-bold whitespace-nowrap">Cardio</div>
                <div class="px-4 py-1.5 bg-slate-800 text-slate-300 border border-white/10 rounded-full text-xs font-bold whitespace-nowrap">HIIT</div>
                <div class="px-4 py-1.5 bg-slate-800 text-slate-300 border border-white/10 rounded-full text-xs font-bold whitespace-nowrap">Yoga</div>
            </div>

            <!-- List rows container -->
            <div class="space-y-2">

                <!-- 1. Standard Row (Workout) -->
                <div class="basalt-row rounded-2xl p-4 flex items-center gap-4 cursor-pointer">
                    <div class="w-12 h-12 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-400 border border-sky-500/30">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    </div>
                    <div class="flex-1">
                        <h4 class="text-[14px] font-bold leading-tight">Hypertrophy Chest</h4>
                        <p class="text-[11px] text-slate-400">45 Min • Advanced • Gym</p>
                    </div>
                    <svg class="w-4 h-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </div>

                <!-- 2. Row with left accent stripe (Meal) -->
                <div class="basalt-row accent-meal rounded-2xl p-4 flex items-center gap-4 cursor-pointer">
                    <div class="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18z"/></svg>
                    </div>
                    <div class="flex-1">
                        <div class="flex items-center gap-2">
                            <h4 class="text-[14px] font-bold leading-tight">Tuna Grain Bowl</h4>
                            <span class="text-[9px] font-black bg-emerald-400 text-black px-1.5 py-0.5 rounded tracking-tighter">NEW</span>
                        </div>
                        <p class="text-[11px] text-slate-400">High Protein • 15 Min prep</p>
                    </div>
                    <div class="mono text-[13px] font-bold text-emerald-400">540 kcal</div>
                </div>

                <!-- 3. Row with mini-progress (Habit) -->
                <div class="basalt-row rounded-2xl p-4 flex items-center gap-4 cursor-pointer">
                    <div class="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 border border-amber-500/30">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                    </div>
                    <div class="flex-1">
                        <h4 class="text-[14px] font-bold leading-tight">Daily Hydration</h4>
                        <div class="w-full h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                            <div class="h-full bg-amber-400 w-3/4"></div>
                        </div>
                    </div>
                    <div class="mono text-[12px] font-medium opacity-50">6/8 L</div>
                </div>

                <!-- 4. Row with two badges & stats (Challenge) -->
                <div class="basalt-row accent-challenge rounded-2xl p-4 flex items-center gap-4 cursor-pointer">
                    <div class="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400 border border-rose-500/30">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                    </div>
                    <div class="flex-1">
                        <h4 class="text-[14px] font-bold leading-tight">30-Day Lean Shred</h4>
                        <div class="flex gap-1.5 mt-1">
                            <span class="text-[8px] font-black border border-rose-500/40 text-rose-300 px-1.5 py-0.5 rounded-full">STREAK 4</span>
                            <span class="text-[8px] font-black border border-white/20 text-white px-1.5 py-0.5 rounded-full uppercase">Global</span>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="mono text-[14px] font-bold text-rose-500">Day 12</div>
                    </div>
                </div>

                <!-- 5. Completed State -->
                <div class="basalt-row rounded-2xl p-4 flex items-center gap-4 opacity-50 grayscale bg-white/5">
                    <div class="w-12 h-12 rounded-xl bg-emerald-500/40 flex items-center justify-center text-white">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                    </div>
                    <div class="flex-1">
                        <h4 class="text-[14px] font-bold leading-tight line-through">AM Yoga Flow</h4>
                        <p class="text-[11px]">Completed at 06:45 AM</p>
                    </div>
                </div>

                <!-- 6. Locked State -->
                <div class="basalt-row rounded-2xl p-4 flex items-center gap-4 cursor-not-allowed border-dashed border-white/5">
                    <div class="w-12 h-12 rounded-xl bg-slate-900/50 flex items-center justify-center text-slate-600 border border-white/5">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C9.243 2 7 4.243 7 7V10H6C4.897 10 4 10.897 4 12V20C4 21.103 4.897 22 6 22H18C19.103 22 20 21.103 20 20V12C20 10.897 19.103 10 18 10H17V7C17 4.243 14.757 2 12 2ZM9 7C9 5.346 10.346 4 12 4C13.654 4 15 5.346 15 7V10H9V7ZM12 17C11.172 17 10.5 16.328 10.5 15.5C10.5 14.672 11.172 14 12 14C12.828 14 13.5 14.672 13.5 15.5C13.5 16.328 12.828 17 12 17Z"/></svg>
                    </div>
                    <div class="flex-1">
                        <h4 class="text-[14px] font-bold leading-tight text-slate-600">Pro Powerlifting Prep</h4>
                        <p class="text-[10px] uppercase font-bold tracking-widest text-sky-500/60 mt-0.5">Unlock with Premium</p>
                    </div>
                </div>

                <!-- 7. Row with Numeric Stat (Workout) -->
                <div class="basalt-row accent-workout rounded-2xl p-4 flex items-center gap-4 cursor-pointer">
                    <div class="w-12 h-12 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-400 border border-sky-500/30">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg>
                    </div>
                    <div class="flex-1">
                        <h4 class="text-[14px] font-bold leading-tight">Deadlift Target</h4>
                        <p class="text-[11px] text-slate-400">Previous best: 225 lbs</p>
                    </div>
                    <div class="text-right">
                        <span class="text-[9px] font-black bg-sky-400 text-black px-1.5 py-0.5 rounded tracking-tighter mb-1 inline-block">PR</span>
                        <div class="mono text-[16px] font-bold text-white">245<span class="text-[10px] ml-0.5 opacity-50">lbs</span></div>
                    </div>
                </div>

                <!-- 8. Simple Content (Meal) -->
                <div class="basalt-row rounded-2xl p-4 flex items-center gap-4 cursor-pointer">
                    <div class="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M3 9h1m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 100 14 7 7 0 000-14z"/></svg>
                    </div>
                    <div class="flex-1">
                        <h4 class="text-[14px] font-bold leading-tight">Post-Workout Smoothie</h4>
                        <p class="text-[11px] text-slate-400">Whey, Banana, Almond Butter</p>
                    </div>
                    <div class="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                        <svg class="w-4 h-4 text-white/40" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    </div>
                </div>

                <!-- 9. Urgent / Due State (Habit) -->
                <div class="basalt-row accent-habit rounded-2xl p-4 flex items-center gap-4 cursor-pointer">
                    <div class="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 border border-amber-500/30 animate-pulse">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    </div>
                    <div class="flex-1">
                        <div class="flex items-center gap-2">
                            <h4 class="text-[14px] font-bold leading-tight">Standing Desk Break</h4>
                            <span class="text-[9px] font-black bg-rose-500 text-white px-1.5 py-0.5 rounded animate-bounce">DUE</span>
                        </div>
                        <p class="text-[11px] text-slate-400">Missed by 15 mins</p>
                    </div>
                </div>

                <!-- 10. Client / People Pattern (Social) -->
                <div class="basalt-row rounded-2xl p-4 flex items-center gap-4 cursor-pointer">
                    <div class="w-12 h-12 rounded-xl overflow-hidden border-2 border-white/10">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" alt="user">
                    </div>
                    <div class="flex-1">
                        <h4 class="text-[14px] font-bold leading-tight">Coach Sarah Miller</h4>
                        <p class="text-[11px] text-sky-400 font-medium italic">Active Session</p>
                    </div>
                    <div class="flex -space-x-2">
                        <div class="w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-900"></div>
                        <div class="w-6 h-6 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-[8px] font-bold">+4</div>
                    </div>
                </div>

            </div>
        </div>

        <!-- Navigation Bar -->
        <nav class="mt-auto bg-slate-950/90 backdrop-blur-xl border-t border-white/10 px-8 py-6 flex justify-between items-center rounded-b-[48px]">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
            <div class="w-12 h-12 -mt-10 bg-white rounded-2xl shadow-lg shadow-white/10 flex items-center justify-center text-black">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
            </div>
            <svg class="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        </nav>

        <!-- Notch Mock -->
        <div class="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-slate-950 rounded-3xl"></div>
    </div>

</body>
</html>