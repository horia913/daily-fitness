<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FitCoach Pro UI Kit</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-deep: #050507;
            --glass-base: rgba(20, 20, 25, 0.7);
            --glass-border: rgba(255, 255, 255, 0.1);
            --domain-strength: #A855F7;
            --domain-hypertrophy: #06B6D4;
            --domain-conditioning: #F59E0B;
            --domain-mobility: #22C55E;
            --domain-recovery: #64748B;
        }

        body {
            background-color: var(--bg-deep);
            font-family: 'Inter', sans-serif;
            color: #ffffff;
            overflow-x: hidden;
            -webkit-font-smoothing: antialiased;
        }

        .mono { font-family: 'JetBrains Mono', monospace; }

        /* Animated Aurora Background */
        .aurora-container {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            z-index: -1;
            overflow: hidden;
            background: radial-gradient(circle at center, #0a0a0f 0%, #050507 100%);
        }

        .blob {
            position: absolute;
            width: 500px;
            height: 500px;
            filter: blur(80px);
            border-radius: 50%;
            opacity: 0.25;
            animation: move 20s infinite alternate ease-in-out;
        }

        .blob-1 { background: #06B6D4; top: -10%; left: -10%; animation-delay: 0s; }
        .blob-2 { background: #A855F7; bottom: 10%; right: -10%; animation-delay: -5s; }
        .blob-3 { background: #4F46E5; top: 40%; left: 30%; animation-delay: -10s; }

        @keyframes move {
            0% { transform: translate(0, 0) scale(1); }
            100% { transform: translate(100px, 50px) scale(1.2); }
        }

        .grain {
            position: fixed;
            inset: 0;
            z-index: -1;
            opacity: 0.04;
            pointer-events: none;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }

        .vignette {
            position: fixed;
            inset: 0;
            z-index: -1;
            background: radial-gradient(circle, transparent 20%, rgba(0,0,0,0.6) 100%);
        }

        /* Glassmorphism */
        .glass {
            background: var(--glass-base);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--glass-border);
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .glass-hero {
            position: relative;
            overflow: hidden;
        }
        .glass-hero::after {
            content: '';
            position: absolute;
            left: 0; top: 0; bottom: 0;
            width: 4px;
            background: linear-gradient(to bottom, #06B6D4, #A855F7);
        }

        /* Micro-interactions */
        .tap-active:active {
            transform: scale(0.97);
            transition: transform 0.1s ease;
        }

        /* Shimmer Effect */
        @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
        .shimmer-bg {
            position: relative;
            overflow: hidden;
        }
        .shimmer-bg::after {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
            animation: shimmer 2s infinite;
        }

        /* Custom UI Elements */
        .checkbox-custom:checked + div {
            background-color: #06B6D4;
            border-color: #06B6D4;
        }

        input:focus, textarea:focus {
            outline: none;
            border-color: #06B6D4 !important;
            box-shadow: 0 0 10px rgba(6, 182, 212, 0.2);
        }

        .pr-badge {
            background: linear-gradient(135deg, #F59E0B, #D97706);
            box-shadow: 0 0 12px rgba(245, 158, 11, 0.4);
        }

        .scrollbar-hide::-webkit-scrollbar { display: none; }
    </style>
</head>
<body class="flex justify-center min-h-screen">

    <div class="aurora-container">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
        <div class="blob blob-3"></div>
        <div class="vignette"></div>
        <div class="grain"></div>
    </div>

    <!-- Main Mobile Container -->
    <main class="w-full max-w-[430px] min-h-screen relative pb-32">
        
        <!-- Header -->
        <header class="pt-12 px-6 pb-6 flex justify-between items-end">
            <div>
                <h2 class="text-xs uppercase tracking-[0.2em] text-cyan-400 font-bold mb-1">Design System</h2>
                <h1 class="text-3xl font-bold tracking-tight">Component Gallery</h1>
            </div>
            <div class="w-10 h-10 rounded-full glass border border-white/20 flex items-center justify-center">
                <div class="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-cyan-400"></div>
            </div>
        </header>

        <div class="px-6 space-y-10">

            <!-- Section: Surfaces -->
            <section>
                <label class="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-4 block">Surfaces</label>
                <div class="space-y-4">
                    <!-- Hero Glass -->
                    <div class="glass glass-hero p-5 rounded-3xl tap-active cursor-pointer">
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <h3 class="text-xl font-bold">Elite Coaching</h3>
                                <p class="text-sm text-white/50">Tier 1 • Premium Access</p>
                            </div>
                            <span class="mono text-xs bg-white/10 px-2 py-1 rounded">V2.4</span>
                        </div>
                        <div class="flex -space-x-2">
                            <div class="w-8 h-8 rounded-full border-2 border-black/50 bg-slate-400"></div>
                            <div class="w-8 h-8 rounded-full border-2 border-black/50 bg-slate-500"></div>
                            <div class="w-8 h-8 rounded-full border-2 border-black/50 bg-slate-600"></div>
                            <div class="w-8 h-8 rounded-full border-2 border-black/50 glass flex items-center justify-center text-[10px]">+12</div>
                        </div>
                    </div>

                    <!-- Standard Glass -->
                    <div class="glass p-5 rounded-2xl tap-active cursor-pointer">
                        <h4 class="font-semibold mb-1">Standard Container</h4>
                        <p class="text-sm text-white/60">Used for primary dashboard widgets and data visualization.</p>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <!-- Compact Glass -->
                        <div class="glass p-4 rounded-2xl tap-active cursor-pointer">
                            <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mb-3">
                                <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                            </div>
                            <p class="text-xs text-white/50">Compact</p>
                            <p class="font-bold">Grid Cell</p>
                        </div>
                        <div class="glass p-4 rounded-2xl tap-active cursor-pointer border-cyan-500/30">
                            <div class="w-8 h-8 rounded-lg bg-cyan-400/10 flex items-center justify-center mb-3">
                                <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            </div>
                            <p class="text-xs text-white/50">Active</p>
                            <p class="font-bold">Focused</p>
                        </div>
                    </div>

                    <!-- List Row Glass -->
                    <div class="glass p-3 px-4 rounded-xl flex items-center gap-4 tap-active cursor-pointer">
                        <div class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                        </div>
                        <div class="flex-1">
                            <p class="text-sm font-semibold">List Row Interaction</p>
                            <p class="text-[10px] text-white/40">Swipe for more options</p>
                        </div>
                        <svg class="w-4 h-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                    </div>
                </div>
            </section>

            <!-- Section: Buttons -->
            <section>
                <label class="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-4 block">Buttons</label>
                <div class="space-y-4">
                    <!-- Primary CTA -->
                    <button class="w-full h-14 bg-cyan-500 hover:bg-cyan-400 transition-colors rounded-2xl font-bold flex items-center justify-center gap-2 tap-active shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                        Primary Action
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
                    </button>
                    <!-- Secondary -->
                    <button class="w-full h-14 glass rounded-2xl font-bold tap-active">
                        Secondary Action
                    </button>
                    <div class="grid grid-cols-2 gap-4">
                        <button class="h-12 text-sm font-semibold text-white/60 tap-active">Ghost Button</button>
                        <button class="h-12 text-sm font-semibold text-rose-500/80 tap-active bg-rose-500/10 rounded-xl border border-rose-500/20">Destructive</button>
                    </div>
                </div>
            </section>

            <!-- Section: Badges -->
            <section>
                <label class="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-4 block">Badges & Labels</label>
                <div class="flex flex-wrap gap-3 items-center">
                    <span class="px-2 py-0.5 bg-cyan-500 text-[10px] font-black uppercase rounded text-black">Filled</span>
                    <span class="px-2 py-0.5 border border-white/20 text-[10px] font-bold uppercase rounded text-white/70">Outline</span>
                    <span class="px-2 py-0.5 glass flex items-center gap-1 text-[10px] font-bold uppercase rounded">
                        <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        Icon
                    </span>
                    <span class="pr-badge px-3 py-1 text-[10px] font-black uppercase rounded-full text-white animate-pulse">PR / New Record</span>
                </div>
                
                <div class="flex flex-wrap gap-2 mt-6">
                    <span class="px-2 py-1 rounded bg-[#A855F7]/20 border border-[#A855F7]/30 text-[#A855F7] text-[9px] font-bold tracking-wider">STRENGTH</span>
                    <span class="px-2 py-1 rounded bg-[#06B6D4]/20 border border-[#06B6D4]/30 text-[#06B6D4] text-[9px] font-bold tracking-wider">HYPERTROPHY</span>
                    <span class="px-2 py-1 rounded bg-[#F59E0B]/20 border border-[#F59E0B]/30 text-[#F59E0B] text-[9px] font-bold tracking-wider">CONDITIONING</span>
                    <span class="px-2 py-1 rounded bg-[#22C55E]/20 border border-[#22C55E]/30 text-[#22C55E] text-[9px] font-bold tracking-wider">MOBILITY</span>
                    <span class="px-2 py-1 rounded bg-[#64748B]/20 border border-[#64748B]/30 text-[#64748B] text-[9px] font-bold tracking-wider">RECOVERY</span>
                </div>
            </section>

            <!-- Section: Inputs -->
            <section>
                <label class="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-4 block">Inputs</label>
                <div class="space-y-4">
                    <input type="text" placeholder="Training Goal" class="w-full h-12 glass rounded-xl px-4 text-sm border-white/10 placeholder:text-white/20">
                    <div class="relative">
                        <select class="w-full h-12 glass rounded-xl px-4 text-sm border-white/10 appearance-none text-white/60">
                            <option>Advanced Athlete</option>
                            <option>Intermediate</option>
                            <option>Beginner</option>
                        </select>
                        <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/20">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                        </div>
                    </div>
                    <div class="flex items-center justify-between glass p-4 rounded-xl">
                        <span class="text-sm font-medium">Daily Reminders</span>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" class="sr-only peer" checked>
                            <div class="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                        </label>
                    </div>
                </div>
            </section>

            <!-- Section: Progress -->
            <section>
                <label class="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-4 block">Progress Visualization</label>
                <div class="space-y-6">
                    <!-- Linear Progress -->
                    <div class="space-y-2">
                        <div class="flex justify-between text-xs mb-1">
                            <span class="text-white/50">Weekly Volume</span>
                            <span class="mono text-cyan-400">82%</span>
                        </div>
                        <div class="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                            <div class="h-full bg-cyan-500 rounded-full shimmer-bg" style="width: 82%"></div>
                        </div>
                    </div>

                    <div class="flex items-center justify-around py-2">
                        <!-- Step Indicator -->
                        <div class="flex items-center gap-2">
                            <div class="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
                            <div class="w-2.5 h-2.5 rounded-full bg-cyan-500/30"></div>
                            <div class="w-2.5 h-2.5 rounded-full bg-cyan-500/30"></div>
                        </div>

                        <!-- Mini Ring -->
                        <div class="relative w-12 h-12 flex items-center justify-center">
                            <svg class="w-full h-full -rotate-90">
                                <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="4" fill="transparent" class="text-white/5" />
                                <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="4" fill="transparent" stroke-dasharray="125.6" stroke-dashoffset="30" class="text-purple-500" />
                            </svg>
                            <span class="absolute text-[10px] font-bold mono">75</span>
                        </div>

                        <!-- Progress Chip -->
                        <div class="glass px-3 py-1.5 rounded-full flex items-center gap-2">
                            <div class="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                            <span class="text-[10px] font-bold mono">3 / 5 Sets</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Section: Domain Tokens -->
            <section>
                <label class="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-4 block">Domain Tokens</label>
                <div class="flex flex-col gap-3">
                    <!-- Strength -->
                    <div class="glass p-3 rounded-2xl flex items-center gap-4">
                        <div class="w-12 h-12 rounded-xl bg-[#A855F7]/10 flex items-center justify-center text-[#A855F7]">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                        </div>
                        <div class="flex-1">
                            <p class="text-sm font-bold">Strength</p>
                            <p class="text-[10px] mono text-white/40">4 sessions completed</p>
                        </div>
                        <div class="text-right">
                            <p class="mono text-sm text-[#A855F7]">Level 14</p>
                        </div>
                    </div>
                    <!-- Hypertrophy -->
                    <div class="glass p-3 rounded-2xl flex items-center gap-4">
                        <div class="w-12 h-12 rounded-xl bg-[#06B6D4]/10 flex items-center justify-center text-[#06B6D4]">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                        </div>
                        <div class="flex-1">
                            <p class="text-sm font-bold">Hypertrophy</p>
                            <p class="text-[10px] mono text-white/40">Focused Mass Build</p>
                        </div>
                        <div class="text-right">
                            <p class="mono text-sm text-[#06B6D4]">Level 09</p>
                        </div>
                    </div>
                    <!-- Conditioning -->
                    <div class="glass p-3 rounded-2xl flex items-center gap-4">
                        <div class="w-12 h-12 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B]">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.99 7.99 0 0120 13a7.99 7.99 0 01-2.343 5.657z"/></svg>
                        </div>
                        <div class="flex-1">
                            <p class="text-sm font-bold">Conditioning</p>
                            <p class="text-[10px] mono text-white/40">Metabolic Engine</p>
                        </div>
                        <div class="text-right">
                            <p class="mono text-sm text-[#F59E0B]">Level 21</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>

        <!-- Floating Bottom Tab Bar -->
        <div class="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-[380px] h-20 glass rounded-[32px] flex items-center justify-around px-2 z-50">
            <button class="w-12 h-12 flex items-center justify-center text-cyan-400">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
            </button>
            <button class="w-12 h-12 flex items-center justify-center text-white/30 hover:text-white/60">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            </button>
            
            <!-- Center FAB -->
            <button class="w-16 h-16 bg-gradient-to-tr from-cyan-500 to-indigo-600 rounded-full flex items-center justify-center -translate-y-4 shadow-xl shadow-cyan-500/20 border-4 border-[#050507]">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"/></svg>
            </button>

            <button class="w-12 h-12 flex items-center justify-center text-white/30 hover:text-white/60">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </button>
            <button class="w-12 h-12 flex items-center justify-center text-white/30 hover:text-white/60">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            </button>
        </div>

    </main>

</body>
</html>