prompt 6
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FitCoach Pro - Monolith Shell</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #050507;
            --accent-primary: #00f2ff;
            --accent-secondary: #7000ff;
            --glass-bg: rgba(20, 20, 25, 0.6);
            --glass-border: rgba(255, 255, 255, 0.08);
            --text-main: #ffffff;
            --text-dim: #888891;
            --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            --font-mono: 'JetBrains Mono', monospace;
            --aurora-1: rgba(0, 242, 255, 0.12);
            --aurora-2: rgba(112, 0, 255, 0.15);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
        }

        body {
            background: var(--bg-color);
            color: var(--text-main);
            font-family: var(--font-sans);
            overflow: hidden;
            height: 100vh;
            width: 100vw;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        /* The Vaporous Background */
        .app-shell {
            position: relative;
            width: 100%;
            height: 100vh;
            max-width: 430px; /* iPhone 14 Pro Max width approx */
            background: var(--bg-color);
            overflow: hidden;
            box-shadow: 0 0 100px rgba(0,0,0,0.5);
            display: flex;
            flex-direction: column;
        }

        .aurora-container {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 0;
            filter: blur(80px);
            opacity: 0.6;
        }

        .aurora-blob {
            position: absolute;
            width: 300px;
            height: 300px;
            border-radius: 50%;
            animation: drift 20s infinite alternate ease-in-out;
        }

        .blob-1 {
            background: var(--aurora-1);
            top: -50px;
            left: -50px;
        }

        .blob-2 {
            background: var(--aurora-2);
            bottom: -50px;
            right: -50px;
            animation-delay: -5s;
        }

        @keyframes drift {
            from { transform: translate(0, 0) scale(1); }
            to { transform: translate(50px, 100px) scale(1.2); }
        }

        /* Glass Header */
        .header {
            position: sticky;
            top: 0;
            width: 100%;
            height: 80px;
            padding: 0 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            z-index: 100;
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--glass-border);
        }

        .user-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 1.5px solid var(--accent-primary);
            padding: 2px;
            background: linear-gradient(45deg, var(--bg-color), #1a1a1f);
            overflow: hidden;
        }

        .user-avatar img {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            object-fit: cover;
            filter: grayscale(0.2);
        }

        .screen-title {
            font-size: 16px;
            font-weight: 600;
            letter-spacing: -0.02em;
            text-transform: uppercase;
            font-family: var(--font-mono);
            color: var(--text-main);
        }

        .action-btn {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--glass-border);
            color: var(--text-main);
            cursor: pointer;
            transition: 0.3s cubic-bezier(0.2, 0, 0, 1);
        }

        .action-btn:hover {
            background: rgba(255, 255, 255, 0.08);
            transform: translateY(-2px);
        }

        /* Main Content Area */
        .content-scroll {
            flex: 1;
            overflow-y: auto;
            padding: 24px;
            z-index: 1;
            mask-image: linear-gradient(to bottom, black 90%, transparent 100%);
        }

        .content-placeholder {
            opacity: 0.4;
        }

        .metric-card {
            background: rgba(255,255,255,0.03);
            border: 1px solid var(--glass-border);
            padding: 20px;
            border-radius: 24px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }

        .metric-label {
            font-family: var(--font-mono);
            font-size: 12px;
            color: var(--text-dim);
            text-transform: uppercase;
            margin-bottom: 8px;
        }

        .metric-value {
            font-size: 32px;
            font-weight: 700;
            letter-spacing: -1px;
        }

        /* Kinetic Bottom Navigation */
        .nav-container {
            position: absolute;
            bottom: 34px;
            left: 50%;
            transform: translateX(-50%);
            width: calc(100% - 48px);
            z-index: 100;
        }

        .bottom-nav {
            background: var(--glass-bg);
            backdrop-filter: blur(24px);
            border: 1px solid var(--glass-border);
            border-radius: 32px;
            height: 72px;
            display: flex;
            align-items: center;
            justify-content: space-around;
            padding: 0 12px;
            position: relative;
            box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }

        .nav-item {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: var(--text-dim);
            text-decoration: none;
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            width: 48px;
            height: 48px;
        }

        .nav-item.active {
            color: var(--accent-primary);
        }

        .nav-item.active svg {
            filter: drop-shadow(0 0 8px var(--accent-primary));
        }

        .nav-item svg {
            width: 22px;
            height: 22px;
            stroke-width: 2px;
        }

        .nav-label {
            font-size: 10px;
            font-weight: 600;
            margin-top: 4px;
            opacity: 0;
            transform: translateY(4px);
            transition: 0.3s ease;
        }

        .nav-item.active .nav-label {
            opacity: 1;
            transform: translateY(0);
        }

        /* Badge */
        .badge {
            position: absolute;
            top: 10px;
            right: 8px;
            width: 6px;
            height: 6px;
            background: var(--accent-primary);
            border-radius: 50%;
            box-shadow: 0 0 10px var(--accent-primary);
        }

        /* Floating Action Button (FAB) */
        .fab-container {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            bottom: 30px; /* Aligns with nav but sits higher */
            z-index: 101;
        }

        .fab {
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, var(--accent-secondary), #4e00b3);
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            box-shadow: 0 12px 24px rgba(112, 0, 255, 0.3), inset 0 2px 4px rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.1);
            cursor: pointer;
            transition: 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            margin-bottom: 28px;
        }

        .fab:hover {
            transform: scale(1.1) rotate(5deg);
            box-shadow: 0 16px 32px rgba(112, 0, 255, 0.4);
        }

        .fab svg {
            width: 28px;
            height: 28px;
        }

        /* Monolith Kinetic Overlay */
        .scanline {
            width: 100%;
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(0, 242, 255, 0.1), transparent);
            position: absolute;
            top: 0;
            animation: scan 8s linear infinite;
            z-index: 200;
            pointer-events: none;
        }

        @keyframes scan {
            0% { top: 0%; }
            100% { top: 100%; }
        }

        .active-glow {
            position: absolute;
            bottom: -15px;
            width: 40px;
            height: 10px;
            background: var(--accent-primary);
            filter: blur(15px);
            opacity: 0.4;
            transition: 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
    </style>
</head>
<body>

    <div class="app-shell">
        <div class="aurora-container">
            <div class="aurora-blob blob-1"></div>
            <div class="aurora-blob blob-2"></div>
        </div>
        
        <div class="scanline"></div>

        <header class="header">
            <div class="user-avatar">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=050507" alt="User">
            </div>
            <div class="screen-title">My Training</div>
            <button class="action-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>
            </button>
        </header>

        <main class="content-scroll">
            <div class="metric-card">
                <div>
                    <p class="metric-label">Daily Target</p>
                    <h2 class="metric-value">2,450 <span style="font-size: 14px; font-family: var(--font-mono); color: var(--text-dim);">KCAL</span></h2>
                </div>
                <div style="text-align: right;">
                    <svg width="40" height="40" viewBox="0 0 40 40">
                        <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="4"/>
                        <circle cx="20" cy="20" r="18" fill="none" stroke="var(--accent-primary)" stroke-width="4" stroke-dasharray="80 113" stroke-linecap="round"/>
                    </svg>
                </div>
            </div>

            <div class="metric-card">
                <div>
                    <p class="metric-label">Active Strain</p>
                    <h2 class="metric-value">14.8 <span style="font-size: 14px; font-family: var(--font-mono); color: var(--text-dim);">PRO</span></h2>
                </div>
                <div style="color: var(--accent-secondary)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                </div>
            </div>

            <div class="content-placeholder">
                <div style="height: 100px; width: 100%; background: rgba(255,255,255,0.02); border-radius: 20px; border: 1px dashed var(--glass-border); margin-bottom: 20px;"></div>
                <div style="height: 100px; width: 100%; background: rgba(255,255,255,0.02); border-radius: 20px; border: 1px dashed var(--glass-border); margin-bottom: 20px;"></div>
                <div style="height: 100px; width: 100%; background: rgba(255,255,255,0.02); border-radius: 20px; border: 1px dashed var(--glass-border);"></div>
            </div>
        </main>

        <div class="fab-container">
            <button class="fab">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
        </div>

        <div class="nav-container">
            <nav class="bottom-nav">
                <a href="#" class="nav-item">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                    <span class="nav-label">Home</span>
                </a>
                <a href="#" class="nav-item active">
                    <div class="active-glow"></div>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>
                    <span class="nav-label">Train</span>
                </a>
                
                <!-- Spacer for FAB -->
                <div style="width: 60px;"></div>

                <a href="#" class="nav-item">
                    <div class="badge"></div>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20v-6M6 20V10M18 20V4"></path></svg>
                    <span class="nav-label">Stats</span>
                </a>
                <a href="#" class="nav-item">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    <span class="nav-label">Profile</span>
                </a>
            </nav>
        </div>
    </div>

    <script>
        // Simple Interaction logic
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                navItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                // Move the glow element
                const existingGlow = document.querySelector('.active-glow');
                if (existingGlow) existingGlow.remove();
                
                const glow = document.createElement('div');
                glow.className = 'active-glow';
                item.appendChild(glow);
            });
        });
    </script>
</body>
</html>