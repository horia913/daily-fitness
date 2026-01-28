<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FitCoach Pro - Refractive UI</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-deep: #050507;
            --glass-base: rgba(18, 18, 23, 0.65);
            --glass-stroke: rgba(255, 255, 255, 0.08);
            --accent-glow: rgba(120, 140, 255, 0.15);
            --text-main: #f0f0f5;
            --text-dim: #9494a3;
            --accent-primary: #8e94ff;
            --accent-secondary: #00f2ff;
            --blur-radius: 24px;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-font-smoothing: antialiased;
        }

        body {
            background-color: var(--bg-deep);
            color: var(--text-main);
            font-family: 'Inter', sans-serif;
            overflow: hidden;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
        }

        /* Animated Refractive Background */
        .vapor-bg {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
            background: radial-gradient(circle at 20% 30%, #1a1a2e 0%, transparent 40%),
                        radial-gradient(circle at 80% 70%, #11111a 0%, transparent 40%);
            overflow: hidden;
        }

        .vapor-orb {
            position: absolute;
            width: 600px;
            height: 600px;
            background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%);
            filter: blur(80px);
            animation: float 20s infinite alternate ease-in-out;
        }

        @keyframes float {
            0% { transform: translate(-10%, -10%) scale(1); }
            100% { transform: translate(10%, 10%) scale(1.1); }
        }

        /* Mobile Container Mockup */
        .app-shell {
            width: 390px;
            height: 844px;
            background: var(--glass-base);
            border: 1px solid var(--glass-stroke);
            border-radius: 48px;
            position: relative;
            backdrop-filter: blur(var(--blur-radius));
            box-shadow: 0 40px 100px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.03);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        /* Header & Search */
        .header {
            padding: 60px 24px 20px;
        }

        .brand-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
        }

        .brand-row h1 {
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: var(--accent-primary);
        }

        .search-container {
            position: relative;
            width: 100%;
        }

        .search-input {
            width: 100%;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--glass-stroke);
            padding: 14px 14px 14px 44px;
            border-radius: 16px;
            color: var(--text-main);
            font-size: 15px;
            outline: none;
            transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
        }

        .search-input:focus {
            background: rgba(255, 255, 255, 0.06);
            border-color: rgba(255,255,255,0.2);
            box-shadow: 0 0 20px rgba(142, 148, 255, 0.1);
        }

        .search-icon {
            position: absolute;
            left: 16px;
            top: 50%;
            transform: translateY(-50%);
            opacity: 0.4;
        }

        /* Radix Tabs Style */
        .tabs-container {
            padding: 0 24px;
            margin-bottom: 24px;
        }

        .tabs-list {
            display: flex;
            background: rgba(0, 0, 0, 0.2);
            padding: 4px;
            border-radius: 14px;
            border: 1px solid var(--glass-stroke);
        }

        .tab-trigger {
            flex: 1;
            padding: 10px 0;
            text-align: center;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            border-radius: 10px;
            transition: all 0.2s;
            color: var(--text-dim);
        }

        .tab-trigger.active {
            background: rgba(255, 255, 255, 0.08);
            color: var(--text-main);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        /* Segmented Control Pill */
        .segmented-section {
            padding: 0 24px;
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .segmented-control {
            display: flex;
            gap: 8px;
            background: transparent;
        }

        .segment-pill {
            padding: 6px 14px;
            font-size: 12px;
            font-weight: 600;
            border-radius: 20px;
            border: 1px solid var(--glass-stroke);
            color: var(--text-dim);
            cursor: pointer;
            transition: 0.2s ease;
        }

        .segment-pill.active {
            border-color: var(--accent-primary);
            color: var(--accent-primary);
            background: rgba(142, 148, 255, 0.05);
        }

        /* Horizontal Chips */
        .chips-scroll {
            display: flex;
            gap: 12px;
            overflow-x: auto;
            padding: 0 24px 24px;
            scrollbar-width: none;
        }

        .chips-scroll::-webkit-scrollbar { display: none; }

        .chip {
            white-space: nowrap;
            padding: 10px 20px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--glass-stroke);
            border-radius: 100px;
            font-size: 13px;
            font-weight: 500;
            color: var(--text-dim);
            transition: all 0.3s;
        }

        .chip:hover {
            border-color: rgba(255,255,255,0.2);
            background: rgba(255, 255, 255, 0.06);
            color: var(--text-main);
        }

        /* Content Area */
        .content-area {
            flex: 1;
            padding: 0 24px;
            overflow-y: auto;
            mask-image: linear-gradient(to bottom, black 90%, transparent 100%);
        }

        .content-area::-webkit-scrollbar { width: 0; }

        .workout-card {
            background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
            border: 1px solid var(--glass-stroke);
            border-radius: 24px;
            padding: 20px;
            margin-bottom: 16px;
            position: relative;
            overflow: hidden;
            transition: transform 0.3s ease;
        }

        .workout-card:hover {
            transform: translateY(-2px);
            border-color: rgba(255,255,255,0.15);
        }

        .workout-card::after {
            content: '';
            position: absolute;
            top: 0; right: 0;
            width: 80px;
            height: 80px;
            background: radial-gradient(circle at top right, var(--accent-glow), transparent 70%);
            opacity: 0.5;
        }

        .card-meta {
            font-family: 'JetBrains Mono', monospace;
            font-size: 10px;
            text-transform: uppercase;
            color: var(--accent-secondary);
            margin-bottom: 8px;
            display: block;
            letter-spacing: 1px;
        }

        .card-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 12px;
        }

        .card-stats {
            display: flex;
            gap: 16px;
        }

        .stat-item {
            display: flex;
            flex-direction: column;
        }

        .stat-value {
            font-family: 'JetBrains Mono', monospace;
            font-size: 14px;
            color: var(--text-main);
        }

        .stat-label {
            font-size: 10px;
            color: var(--text-dim);
            text-transform: uppercase;
        }

        /* Navigation Bar Placeholder */
        .nav-bottom {
            height: 90px;
            background: rgba(10, 10, 15, 0.8);
            border-top: 1px solid var(--glass-stroke);
            display: flex;
            justify-content: space-around;
            align-items: center;
            padding-bottom: 20px;
        }

        .nav-icon {
            width: 24px;
            height: 24px;
            background: rgba(255,255,255,0.1);
            border-radius: 6px;
        }

        .nav-icon.active {
            background: var(--accent-primary);
            box-shadow: 0 0 15px var(--accent-primary);
        }
    </style>
</head>
<body>

    <div class="vapor-bg">
        <div class="vapor-orb" style="top: -100px; left: -100px;"></div>
        <div class="vapor-orb" style="bottom: -200px; right: -100px; background: rgba(0, 242, 255, 0.08);"></div>
    </div>

    <div class="app-shell">
        <header class="header">
            <div class="brand-row">
                <h1>FitCoach Pro</h1>
                <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(45deg, #8e94ff, #00f2ff);"></div>
            </div>
            
            <div class="search-container">
                <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input type="text" class="search-input" placeholder="Find routine, coach or meal...">
            </div>
        </header>

        <div class="tabs-container">
            <div class="tabs-list">
                <div class="tab-trigger active">Workouts</div>
                <div class="tab-trigger">Meals</div>
                <div class="tab-trigger">Habits</div>
            </div>
        </div>

        <div class="segmented-section">
            <div class="segmented-control">
                <div class="segment-pill active">Week</div>
                <div class="segment-pill">Month</div>
                <div class="segment-pill">All</div>
            </div>
            <span style="font-size: 11px; color: var(--text-dim); font-weight: 500;">SORT BY: NEW</span>
        </div>

        <div class="chips-scroll">
            <div class="chip" style="border-color: var(--accent-secondary); color: var(--text-main);">Strength</div>
            <div class="chip">Cardio</div>
            <div class="chip">Mobility</div>
            <div class="chip">HIIT</div>
            <div class="chip">Yoga</div>
            <div class="chip">Endurance</div>
        </div>

        <div class="content-area">
            <div class="workout-card">
                <span class="card-meta">Advanced • 45 Min</span>
                <h3 class="card-title">Hypertrophy Upper A</h3>
                <div class="card-stats">
                    <div class="stat-item">
                        <span class="stat-value">340</span>
                        <span class="stat-label">Kcal</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">85%</span>
                        <span class="stat-label">Intensity</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">12</span>
                        <span class="stat-label">Sets</span>
                    </div>
                </div>
            </div>

            <div class="workout-card">
                <span class="card-meta">Intermediate • 20 Min</span>
                <h3 class="card-title">Kinetic Flow Mobility</h3>
                <div class="card-stats">
                    <div class="stat-item">
                        <span class="stat-value">110</span>
                        <span class="stat-label">Kcal</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">40%</span>
                        <span class="stat-label">Intensity</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">6</span>
                        <span class="stat-label">Flows</span>
                    </div>
                </div>
            </div>

            <div class="workout-card">
                <span class="card-meta">Elite • 60 Min</span>
                <h3 class="card-title">Metabolic Conditioning</h3>
                <div class="card-stats">
                    <div class="stat-item">
                        <span class="stat-value">620</span>
                        <span class="stat-label">Kcal</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">95%</span>
                        <span class="stat-label">Intensity</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">4</span>
                        <span class="stat-label">Rounds</span>
                    </div>
                </div>
            </div>
        </div>

        <nav class="nav-bottom">
            <div class="nav-icon active"></div>
            <div class="nav-icon"></div>
            <div class="nav-icon"></div>
            <div class="nav-icon"></div>
        </nav>
    </div>

    <script>
        // Interactive Tab Switching Simulation
        const tabs = document.querySelectorAll('.tab-trigger');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
            });
        });

        const segments = document.querySelectorAll('.segment-pill');
        segments.forEach(seg => {
            seg.addEventListener('click', () => {
                segments.forEach(s => s.classList.remove('active'));
                seg.classList.add('active');
            });
        });
    </script>
</body>
</html>