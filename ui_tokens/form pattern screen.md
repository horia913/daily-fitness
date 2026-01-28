<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>FitCoach Pro | Create Meal Plan</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        :root {
            --bg-dark: #0a0a0c;
            --accent-nutrition: #10b981;
            --refraction-border: rgba(255, 255, 255, 0.15);
            --strata-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.8);
        }

        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--bg-dark);
            color: #ffffff;
            overflow-x: hidden;
            -webkit-font-smoothing: antialiased;
        }

        .mono { font-family: 'JetBrains Mono', monospace; }

        /* Aurora Background */
        .aurora-container {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            z-index: -2;
            overflow: hidden;
            background: radial-gradient(circle at 20% 30%, #1e1b4b 0%, #0a0a0c 100%);
        }

        .aurora {
            position: absolute;
            width: 200%; height: 200%;
            top: -50%; left: -50%;
            background: radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 40%),
                        radial-gradient(circle at 80% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 40%),
                        radial-gradient(circle at 20% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 40%);
            filter: blur(80px);
            animation: rotate Aurora 20s linear infinite;
        }

        @keyframes rotateAurora {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        /* Grain Overlay */
        .grain {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            z-index: -1;
            opacity: 0.04;
            pointer-events: none;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3ExternalIcon%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }

        /* Vignette */
        .vignette {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            z-index: -1;
            background: radial-gradient(circle, transparent 20%, rgba(0,0,0,0.6) 100%);
            pointer-events: none;
        }

        /* Refractive Monolithic Strata */
        .glass-card {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(24px) saturate(180%);
            -webkit-backdrop-filter: blur(24px) saturate(180%);
            border: 1px solid var(--refraction-border);
            border-top: 1px solid rgba(255, 255, 255, 0.3);
            border-left: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: var(--strata-shadow), inset 0 0 20px rgba(255,255,255,0.02);
            border-radius: 24px;
        }

        .input-field {
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: white;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border-radius: 12px;
        }

        .input-field:focus {
            outline: none;
            border-color: var(--accent-nutrition);
            background: rgba(0, 0, 0, 0.5);
            box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
        }

        /* Toggle Switch */
        .switch {
            position: relative;
            display: inline-block;
            width: 44px;
            height: 24px;
        }

        .switch input { opacity: 0; width: 0; height: 0; }

        .slider {
            position: absolute;
            cursor: pointer;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: rgba(255,255,255,0.1);
            transition: .4s;
            border-radius: 34px;
            border: 1px solid rgba(255,255,255,0.1);
        }

        .slider:before {
            position: absolute;
            content: "";
            height: 18px; width: 18px;
            left: 2px; bottom: 2px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.5);
        }

        input:checked + .slider { background-color: var(--accent-nutrition); }
        input:checked + .slider:before { transform: translateX(20px); }

        /* Custom Checkbox */
        .checkbox-container input {
            appearance: none;
            width: 20px;
            height: 20px;
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 6px;
            background: rgba(255,255,255,0.05);
            cursor: pointer;
            position: relative;
        }

        .checkbox-container input:checked {
            background: var(--accent-nutrition);
            border-color: var(--accent-nutrition);
        }

        .checkbox-container input:checked::after {
            content: '✓';
            position: absolute;
            color: black;
            font-size: 14px;
            font-weight: bold;
            left: 4px;
            top: -1px;
        }

        .sticky-cta {
            background: rgba(10, 10, 12, 0.7);
            backdrop-filter: blur(16px);
            border-top: 1px solid var(--refraction-border);
        }

        .success-state { border-color: #10b981 !important; background: rgba(16, 185, 129, 0.05); }
        .error-state { border-color: #ef4444 !important; background: rgba(239, 68, 68, 0.05); }

        .reveal {
            animation: fadeInUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }

        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
</head>
<body class="pb-32">

    <div class="aurora-container">
        <div class="aurora"></div>
    </div>
    <div class="grain"></div>
    <div class="vignette"></div>

    <!-- Header -->
    <header class="p-6 pt-12 max-w-lg mx-auto w-full">
        <div class="flex items-center justify-between mb-6">
            <button class="w-10 h-10 flex items-center justify-center rounded-full glass-card border-white/10">
                <i data-lucide="chevron-left" class="w-5 h-5"></i>
            </button>
            <span class="text-[10px] tracking-[0.2em] uppercase font-bold text-emerald-500 mono bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">Nutrition v2.4</span>
        </div>
        <div class="reveal" style="animation-delay: 0.1s;">
            <h1 class="text-4xl font-extrabold tracking-tight mb-1">Create Meal Plan</h1>
            <p class="text-white/50 text-sm font-light">Craft a tailored nutritional strategy for your athlete.</p>
        </div>
    </header>

    <main class="px-6 max-w-lg mx-auto w-full space-y-6">
        
        <!-- Help Callout -->
        <div class="glass-card p-4 flex items-center gap-4 reveal" style="animation-delay: 0.2s;">
            <div class="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <i data-lucide="sparkles" class="w-5 h-5 text-blue-400"></i>
            </div>
            <p class="text-xs text-blue-100/80 leading-relaxed">
                <span class="font-bold text-blue-300">Coach Tip:</span> Linking goals to metabolic rates increases client adherence by 40%.
            </p>
        </div>

        <!-- Form Card -->
        <section class="glass-card p-6 space-y-8 reveal" style="animation-delay: 0.3s;">
            
            <!-- Plan Name (Success State) -->
            <div class="space-y-2">
                <div class="flex justify-between items-center">
                    <label class="text-[11px] uppercase tracking-widest font-bold text-white/40 mono">Meal Plan Name</label>
                    <span class="text-[10px] text-emerald-400 mono">Available</span>
                </div>
                <input type="text" value="Hypertrophy Phase 1" class="input-field success-state w-full px-4 py-3 text-sm focus:ring-0" placeholder="e.g. Summer Shred">
            </div>

            <!-- Goal & Calories -->
            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                    <label class="text-[11px] uppercase tracking-widest font-bold text-white/40 mono">Goal</label>
                    <div class="relative">
                        <select class="input-field w-full px-4 py-3 text-sm appearance-none bg-black/40">
                            <option>Muscle Gain</option>
                            <option>Fat Loss</option>
                            <option>Maintenance</option>
                        </select>
                        <i data-lucide="chevron-down" class="absolute right-3 top-3.5 w-4 h-4 text-white/40 pointer-events-none"></i>
                    </div>
                </div>
                <div class="space-y-2">
                    <label class="text-[11px] uppercase tracking-widest font-bold text-white/40 mono">Calories</label>
                    <input type="number" value="2850" class="input-field w-full px-4 py-3 text-sm mono" placeholder="0000">
                </div>
            </div>

            <!-- Macros Row -->
            <div class="space-y-3">
                <label class="text-[11px] uppercase tracking-widest font-bold text-white/40 mono">Macros Split (g)</label>
                <div class="grid grid-cols-3 gap-3">
                    <div class="relative">
                        <input type="number" value="180" class="input-field w-full px-4 py-4 text-center text-lg font-bold mono bg-emerald-500/5">
                        <span class="absolute -top-1.5 left-2 px-1 text-[9px] font-bold text-emerald-400 bg-[#16161a]">PRO</span>
                    </div>
                    <div class="relative">
                        <input type="number" value="320" class="input-field w-full px-4 py-4 text-center text-lg font-bold mono bg-blue-500/5">
                        <span class="absolute -top-1.5 left-2 px-1 text-[9px] font-bold text-blue-400 bg-[#16161a]">CARB</span>
                    </div>
                    <div class="relative">
                        <input type="number" value="75" class="input-field w-full px-4 py-4 text-center text-lg font-bold mono bg-orange-500/5">
                        <span class="absolute -top-1.5 left-2 px-1 text-[9px] font-bold text-orange-400 bg-[#16161a]">FAT</span>
                    </div>
                </div>
            </div>

            <!-- Notes (Error State) -->
            <div class="space-y-2">
                <label class="text-[11px] uppercase tracking-widest font-bold text-white/40 mono">Special Instructions</label>
                <textarea rows="3" class="input-field error-state w-full px-4 py-3 text-sm" placeholder="Add specific timing or supplement advice...">Include 5g Creatine daily. Avoid</textarea>
                <p class="text-[10px] text-red-400 flex items-center gap-1 mono">
                    <i data-lucide="alert-circle" class="w-3 h-3"></i> Finish your sentence to provide clear instructions.
                </p>
            </div>

            <div class="h-px bg-white/5 w-full"></div>

            <!-- Toggles & Checks -->
            <div class="space-y-5">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-semibold">Allow client swaps</p>
                        <p class="text-[10px] text-white/40">Users can exchange ingredients within macro limits</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox" checked>
                        <span class="slider"></span>
                    </label>
                </div>

                <div class="flex flex-col gap-4">
                    <label class="checkbox-container flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked>
                        <span class="text-sm font-medium text-white/70 group-hover:text-white transition-colors">Include optional snacks</span>
                    </label>
                    <label class="checkbox-container flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox">
                        <span class="text-sm font-medium text-white/70 group-hover:text-white transition-colors">Vegetarian alternative option</span>
                    </label>
                </div>
            </div>

        </section>
    </main>

    <!-- Sticky Bottom Bar -->
    <div class="fixed bottom-0 left-0 right-0 p-6 sticky-cta z-50">
        <div class="max-w-lg mx-auto flex gap-4">
            <button class="flex-1 glass-card border-white/5 py-4 px-2 text-sm font-bold uppercase tracking-widest text-white/70 hover:bg-white/5 active:scale-95 transition-all">
                Preview
            </button>
            <button class="flex-[2] bg-emerald-500 hover:bg-emerald-400 text-black py-4 px-2 text-sm font-extrabold uppercase tracking-widest rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2">
                Save Plan <i data-lucide="arrow-right" class="w-4 h-4"></i>
            </button>
        </div>
    </div>

    <script>
        // Initialize Lucide Icons
        lucide.createIcons();

        // Optional: Simple scroll reveal effect
        const observerOptions = {
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('reveal');
                }
            });
        }, observerOptions);

        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    </script>
</body>
</html>