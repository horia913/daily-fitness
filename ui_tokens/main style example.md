<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Flash UI - My Training</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --strength: #A855F7;
            --hypertrophy: #06B6D4;
            --conditioning: #F59E0B;
            --mobility: #22C55E;
            --recovery: #64748B;
            --bg-deep: #050507;
        }

        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--bg-deep);
            color: #ffffff;
            overflow-x: hidden;
            -webkit-tap-highlight-color: transparent;
        }

        .mono { font-family: 'JetBrains Mono', monospace; }

        /* --- BACKGROUND KINETICS --- */
        .aurora-container {
            position: fixed;
            inset: 0;
            z-index: -1;
            overflow: hidden;
            filter: blur(100px);
            opacity: 0.6;
        }

        .blob {
            position: absolute;
            width: 500px;
            height: 500px;
            border-radius: 50%;
            mix-blend-mode: screen;
            animation: move 20s infinite alternate;
        }

        @keyframes move {
            from { transform: translate(-20%, -20%) rotate(0deg); }
            to { transform: translate(40%, 30%) rotate(360deg); }
        }

        .grain-overlay {
            position: fixed;
            inset: 0;
            z-index: 0;
            opacity: 0.03;
            pointer-events: none;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }

        .vignette {
            position: fixed;
            inset: 0;
            background: radial-gradient(circle at center, transparent 0%, rgba(5,5,7,0.8) 100%);
            pointer-events: none;
            z-index: 1;
        }

        /* --- MACHINED CRYSTALLINE COMPONENTS --- */
        .glass-card {
            background: rgba(20, 20, 25, 0.7);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            position: relative;
            overflow: hidden;
            box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
            transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .glass-card::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
        }

        .glass-card:active {
            transform: scale(0.97);
        }

        .card-accent-hyper { border-left: 3px solid var(--hypertrophy); }
        .card-accent-strength { border-left: 3px solid var(--strength); }
        .card-accent-cond { border-left: 3px solid var(--conditioning); }
        .card-accent-mob { border-left: 3px solid var(--mobility); }
        .card-accent-rec { border-left: 3px solid var(--recovery); }

        /* --- SHIMMER & GLOW --- */
        .shimmer-bar {
            position: relative;
            overflow: hidden;
        }

        .shimmer-bar::after {
            content: '';
            position: absolute;
            top: 0; left: -100%; width: 100%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            animation: shimmer 2.5s infinite;
        }

        @keyframes shimmer {
            100% { left: 100%; }
        }

        .cta-pulse {
            animation: pulse-glow 2s infinite ease-in-out;
        }

        @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 0px var(--hypertrophy); }
            50% { box-shadow: 0 0 15px var(--hypertrophy); }
        }

        /* --- UI HELPERS --- */
        .tab-bar {
            background: rgba(10, 10, 12, 0.85);
            backdrop-filter: blur(24px);
            border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .fab-glow {
            box-shadow: 0 0 25px rgba(6, 182, 212, 0.4);
        }

        .badge-pr {
            background: rgba(168, 85, 247, 0.2);
            color: var(--strength);
            border: 1px solid rgba(168, 85, 247, 0.3);
            text-shadow: 0 0 8px rgba(168, 85, 247, 0.5);
        }
    </style>
</head>
<body class="p-6 pb-32">

    <!-- Ambient BG Layers -->
    <div class="aurora-container">
        <div class="blob" style="background: var(--hypertrophy); top: -10%; left: -10%;"></div>
        <div class="blob" style="background: var(--strength); bottom: -10%; right: -10%; animation-delay: -5s;"></div>
        <div class="blob" style="background: #312e81; top: 30%; right: 10%; animation-delay: -10s;"></div>
    </div>
    <div class="grain-overlay"></div>
    <div class="vignette"></div>

    <div class="relative z-10 max-w-md mx-auto">
        <!-- Header -->
        <header class="mb-8">
            <div class="flex justify-between items-end">
                <div>
                    <p class="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold mb-1">Active Program</p>
                    <h1 class="text-3xl font-extrabold tracking-tight">My Training</h1>
                </div>
                <div class="text-right">
                    <p class="mono text-xs text-gray-400">MON, OCT 24</p>
                </div>
            </div>
        </header>

        <!-- Primary Program Card -->
        <div class="glass-card card-accent-hyper rounded-3xl p-6 mb-6">
            <div class="flex justify-between items-start mb-6">
                <div>
                    <h2 class="text-xl font-bold leading-tight">Hypertrophy<br>Phase 2: Peak</h2>
                    <span class="inline-flex items-center mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold badge-pr">
                        <svg class="w-2.5 h-2.5 mr-1 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                        NEW RECORD
                    </span>
                </div>
                <div class="text-right">
                    <p class="mono text-2xl font-bold text-cyan-400">68%</p>
                    <p class="text-[10px] text-gray-400 uppercase tracking-tighter">Completed</p>
                </div>
            </div>

            <div class="mb-6">
                <div class="flex justify-between text-[11px] mb-2 text-gray-300 mono">
                    <span>DAY 18 OF 24</span>
                    <span>6 SESSIONS LEFT</span>
                </div>
                <div class="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div class="h-full bg-cyan-500 rounded-full shimmer-bar" style="width: 68%"></div>
                </div>
            </div>

            <button class="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-2xl transition-all cta-pulse active:scale-[0.98] flex justify-center items-center gap-2">
                <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                START NEXT WORKOUT
            </button>
        </div>

        <!-- Metrics Row -->
        <div class="grid grid-cols-3 gap-4 mb-8">
            <div class="glass-card rounded-2xl p-4 text-center">
                <p class="mono text-xl font-bold">24</p>
                <p class="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Workouts</p>
            </div>
            <div class="glass-card rounded-2xl p-4 text-center">
                <p class="mono text-xl font-bold">38.5</p>
                <p class="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Hours</p>
            </div>
            <div class="glass-card rounded-2xl p-4 text-center">
                <div class="flex items-center justify-center gap-1">
                    <p class="mono text-xl font-bold text-amber-400">12</p>
                    <svg class="w-3 h-3 fill-amber-400" viewBox="0 0 24 24"><path d="M17.66 11.5c-.21 0-.41.01-.61.04-.37-.82-.84-1.57-1.4-2.22l-.01.01c-.55-.63-1.18-1.18-1.89-1.63a11.05 11.05 0 00-1.74-3.32c-.17-.22-.44-.35-.72-.35s-.56.13-.72.35c-.17.21-.35.43-.51.65-.63.83-1.14 1.76-1.52 2.67-1.78 1.1-3.23 2.72-4.14 4.64-.09.18-.17.37-.24.55-.17.43-.3.87-.39 1.32-.42 2.1-.2 4.29.59 6.22l.06.13c.8 1.83 2.21 3.32 3.99 4.22.46.23.95.42 1.45.57l.06.02a11.04 11.04 0 005.15 0l.06-.02c.5-.15.99-.34 1.45-.57 1.78-.89 3.19-2.39 3.99-4.22l.06-.13c.45-1.1.66-2.26.63-3.41-.01-1.14-.23-2.24-.62-3.26-.06-.18-.15-.35-.24-.52-.16-.3-.34-.59-.55-.86l.01-.01c-.48-.63-1.04-1.19-1.68-1.67-.02.16-.03.32-.03.49 0 3.31-2.69 6-6 6z"/></svg>
                </div>
                <p class="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Streak</p>
            </div>
        </div>

        <!-- Up Next Card -->
        <h3 class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 px-1">Up Next</h3>
        <div class="glass-card card-accent-strength rounded-2xl p-5 mb-8 flex items-center justify-between group">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
                    <svg class="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14 4.14 5.57 2 7.71 3.43 9.14 2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22 14.86 20.57 16.29 22 18.43 19.86 19.86 21.29 21.29 19.86 19.86 18.43 22 16.29 20.57 14.86z"/></svg>
                </div>
                <div>
                    <h4 class="font-bold">Upper Body Power</h4>
                    <div class="flex items-center gap-2 mt-1">
                        <span class="bg-purple-500/10 text-purple-400 text-[9px] px-2 py-0.5 rounded border border-purple-500/20 font-bold uppercase tracking-wider flex items-center gap-1">
                            <div class="w-1 h-1 bg-purple-400 rounded-full animate-pulse"></div>
                            Strength Focus
                        </span>
                        <span class="text-[10px] text-gray-500 mono">55 MIN</span>
                    </div>
                </div>
            </div>
            <svg class="w-5 h-5 text-gray-600 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7"/></svg>
        </div>

        <!-- Templates List -->
        <div class="flex justify-between items-center mb-4 px-1">
            <h3 class="text-xs font-bold uppercase tracking-widest text-gray-400">Saved Templates</h3>
            <button class="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">View All</button>
        </div>
        
        <div class="space-y-3">
            <!-- Row 1 -->
            <div class="glass-card card-accent-cond rounded-xl p-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8c0-6.12-4.5-11.33-4.5-11.33z"/></svg>
                    </div>
                    <div>
                        <p class="text-sm font-bold">Metcon Circuit B</p>
                        <p class="text-[10px] text-gray-500 mono">32 MIN • CONDITIONING</p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <span class="text-[9px] font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400">STREAK: 4</span>
                </div>
            </div>

            <!-- Row 2 -->
            <div class="glass-card card-accent-mob rounded-xl p-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                        <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M14 9V4a2 2 0 012-2h1a1 1 0 010 2h-1v5h3a2 2 0 012 2v1a1 1 0 01-2 0v-1h-3v9a2 2 0 01-2 2h-4a2 2 0 01-2-2V9h3a1 1 0 011 1v1h3V9h-1z"/></svg>
                    </div>
                    <div>
                        <p class="text-sm font-bold">Hip Flow Mobility</p>
                        <p class="text-[10px] text-gray-500 mono">15 MIN • MOBILITY</p>
                    </div>
                </div>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/20 text-green-400">STRETCH</span>
            </div>

            <!-- Row 3 -->
            <div class="glass-card card-accent-rec rounded-xl p-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-slate-500/10 flex items-center justify-center text-slate-400">
                        <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 100-16 8 8 0 000 16zm-1-5h2v2h-2v-2zm0-8h2v6h-2V7z"/></svg>
                    </div>
                    <div>
                        <p class="text-sm font-bold">Post-Session Recovery</p>
                        <p class="text-[10px] text-gray-500 mono">10 MIN • RECOVERY</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Floating Tab Bar -->
    <div class="fixed bottom-6 left-6 right-6 z-50">
        <div class="tab-bar rounded-3xl h-16 flex items-center justify-around px-2 max-w-md mx-auto relative shadow-2xl">
            <!-- Left Tabs -->
            <button class="w-12 h-12 flex items-center justify-center text-cyan-400">
                <svg class="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            </button>
            <button class="w-12 h-12 flex items-center justify-center text-gray-500">
                <svg class="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            </button>
            
            <!-- FAB -->
            <div class="relative -top-8">
                <button class="w-16 h-16 bg-cyan-500 rounded-2xl flex items-center justify-center text-black fab-glow rotate-45 transform transition-transform hover:scale-110 active:scale-90">
                    <svg class="w-8 h-8 -rotate-45 fill-current" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                </button>
            </div>

            <!-- Right Tabs -->
            <button class="w-12 h-12 flex items-center justify-center text-gray-500">
                <svg class="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
            </button>
            <button class="w-12 h-12 flex items-center justify-center text-gray-500">
                <div class="w-7 h-7 rounded-full border-2 border-gray-600 overflow-hidden">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Profile">
                </div>
            </button>
        </div>
    </div>

</body>
</html>