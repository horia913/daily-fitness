<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Flash UI - Premium Fitness Notifications</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;600;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --obsidian-deep: #030303;
            --obsidian-surface: #0a0a0c;
            --glass-border: rgba(255, 255, 255, 0.08);
            --glass-shine: rgba(255, 255, 255, 0.03);
            
            --bio-cyan: #00f2ff;
            --bio-emerald: #00ffaa;
            --bio-crimson: #ff2d55;
            --bio-violet: #8a2be2;
            --bio-amber: #ffaa00;
            
            --font-sans: 'Plus Jakarta Sans', sans-serif;
            --font-mono: 'Space Mono', monospace;
            
            --blur: 24px;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-font-smoothing: antialiased;
        }

        body {
            background-color: var(--obsidian-deep);
            background-image: 
                radial-gradient(circle at 50% -20%, #1a1a2e 0%, transparent 50%),
                radial-gradient(circle at 0% 100%, #0a0a0f 0%, transparent 40%);
            color: #ffffff;
            font-family: var(--font-sans);
            height: 100vh;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        /* --- BACKGROUND TEXTURE --- */
        .obsidian-grain {
            position: fixed;
            inset: 0;
            opacity: 0.04;
            pointer-events: none;
            z-index: 0;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }

        /* --- LAYOUT --- */
        .dashboard-mock {
            width: 1000px;
            height: 700px;
            position: relative;
            background: rgba(5, 5, 5, 0.4);
            border: 1px solid var(--glass-border);
            border-radius: 40px;
            padding: 60px;
            box-shadow: 0 40px 100px rgba(0,0,0,0.8);
            display: grid;
            grid-template-columns: 1fr;
            gap: 40px;
            overflow: hidden;
        }

        /* --- TOAST STACK (Top Right) --- */
        .toast-stack {
            position: absolute;
            top: 40px;
            right: 40px;
            display: flex;
            flex-direction: column;
            gap: 16px;
            z-index: 100;
        }

        .toast {
            width: 340px;
            background: rgba(10, 10, 12, 0.7);
            backdrop-filter: blur(var(--blur));
            -webkit-backdrop-filter: blur(var(--blur));
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 16px 20px;
            display: flex;
            align-items: center;
            gap: 16px;
            transform: translateX(100%);
            animation: slideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            position: relative;
            overflow: hidden;
        }

        .toast::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 4px;
            background: var(--accent-color);
            box-shadow: 0 0 15px var(--accent-color);
        }

        .toast-info { --accent-color: var(--bio-violet); animation-delay: 0.1s; }
        .toast-success { --accent-color: var(--bio-emerald); animation-delay: 0.2s; }
        .toast-error { --accent-color: var(--bio-crimson); animation-delay: 0.3s; }

        .toast-icon {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            background: rgba(255,255,255,0.03);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            border: 1px solid rgba(255,255,255,0.05);
            color: var(--accent-color);
        }

        .toast-content h4 {
            font-size: 14px;
            font-weight: 800;
            letter-spacing: -0.01em;
            margin-bottom: 2px;
        }

        .toast-content p {
            font-size: 13px;
            color: rgba(255,255,255,0.5);
            line-height: 1.4;
        }

        /* --- INLINE ALERT --- */
        .main-content {
            display: flex;
            flex-direction: column;
            gap: 32px;
            opacity: 0;
            animation: fadeIn 0.8s ease-out 0.5s forwards;
        }

        .section-label {
            font-family: var(--font-mono);
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.3em;
            color: rgba(255,255,255,0.3);
            margin-bottom: 12px;
        }

        .inline-alert {
            background: linear-gradient(110deg, rgba(255, 170, 0, 0.05) 0%, rgba(10, 10, 10, 0.4) 100%);
            border: 1px solid rgba(255, 170, 0, 0.15);
            border-radius: 24px;
            padding: 30px;
            display: flex;
            align-items: flex-start;
            gap: 24px;
            position: relative;
            transition: all 0.4s ease;
        }

        .inline-alert:hover {
            border-color: rgba(255, 170, 0, 0.4);
            background: linear-gradient(110deg, rgba(255, 170, 0, 0.08) 0%, rgba(10, 10, 10, 0.5) 100%);
        }

        .warning-glow {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: var(--bio-amber);
            filter: blur(25px);
            position: absolute;
            top: 30px;
            left: 30px;
            opacity: 0.2;
            animation: pulse 3s infinite ease-in-out;
        }

        .inline-alert-icon {
            color: var(--bio-amber);
            padding-top: 4px;
        }

        .inline-alert-body h3 {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 8px;
            color: #fff;
        }

        .inline-alert-body p {
            font-size: 15px;
            color: rgba(255,255,255,0.6);
            max-width: 500px;
            line-height: 1.6;
        }

        /* --- DESTRUCTIVE BANNER --- */
        .destructive-area {
            margin-top: auto;
        }

        .destructive-banner {
            background: rgba(255, 45, 85, 0.03);
            border: 1px dashed rgba(255, 45, 85, 0.3);
            border-radius: 30px;
            padding: 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: relative;
            overflow: hidden;
        }

        .destructive-banner::after {
            content: '';
            position: absolute;
            bottom: 0;
            right: 0;
            width: 200px;
            height: 200px;
            background: radial-gradient(circle, rgba(255, 45, 85, 0.1) 0%, transparent 70%);
            pointer-events: none;
        }

        .destructive-content h2 {
            font-size: 24px;
            font-weight: 800;
            margin-bottom: 4px;
        }

        .destructive-content span {
            font-family: var(--font-mono);
            font-size: 13px;
            color: var(--bio-crimson);
            opacity: 0.8;
        }

        .action-group {
            display: flex;
            gap: 16px;
        }

        .btn {
            padding: 14px 28px;
            border-radius: 16px;
            font-weight: 700;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            border: 1px solid transparent;
            font-family: var(--font-sans);
        }

        .btn-ghost {
            background: rgba(255,255,255,0.05);
            color: #fff;
            border: 1px solid var(--glass-border);
        }

        .btn-ghost:hover {
            background: rgba(255,255,255,0.1);
            transform: translateY(-2px);
        }

        .btn-danger {
            background: var(--bio-crimson);
            color: #fff;
            box-shadow: 0 10px 30px rgba(255, 45, 85, 0.3);
        }

        .btn-danger:hover {
            transform: translateY(-2px);
            box-shadow: 0 15px 40px rgba(255, 45, 85, 0.5);
            filter: brightness(1.1);
        }

        /* --- ANIMATIONS --- */
        @keyframes slideIn {
            0% { transform: translateX(50px); opacity: 0; }
            100% { transform: translateX(0); opacity: 1; }
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse {
            0%, 100% { opacity: 0.2; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(1.2); }
        }

        /* --- SVG STYLING --- */
        svg {
            stroke-width: 2.5px;
            fill: none;
            stroke: currentColor;
        }

    </style>
</head>
<body>

    <div class="obsidian-grain"></div>

    <div class="dashboard-mock">
        <!-- Toast Notification Stack -->
        <div class="toast-stack">
            <div class="toast toast-info">
                <div class="toast-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                </div>
                <div class="toast-content">
                    <h4>New Sync Phase</h4>
                    <p>Your biometric data is updating...</p>
                </div>
            </div>

            <div class="toast toast-success">
                <div class="toast-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div class="toast-content">
                    <h4>PR Achieved</h4>
                    <p>Deadlift session verified.</p>
                </div>
            </div>

            <div class="toast toast-error">
                <div class="toast-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                </div>
                <div class="toast-content">
                    <h4>Heart Rate Spike</h4>
                    <p>Upper threshold exceeded by 5%.</p>
                </div>
            </div>
        </div>

        <!-- Main Content Area -->
        <div class="main-content">
            <div class="header">
                <div class="section-label">System Monitoring</div>
                <h1 style="font-size: 38px; font-weight: 800; letter-spacing: -0.04em;">Performance Metrics</h1>
            </div>

            <!-- Inline Warning Alert -->
            <div class="inline-section">
                <div class="section-label">Active Alerts</div>
                <div class="inline-alert">
                    <div class="warning-glow"></div>
                    <div class="inline-alert-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    </div>
                    <div class="inline-alert-body">
                        <h3>Low Hydration Warning</h3>
                        <p>Our sensors detect a 12% drop in cellular hydration levels compared to your baseline. We recommend 500ml of electrolyte-balanced water before your next set.</p>
                    </div>
                </div>
            </div>

            <!-- Destructive Confirmation Banner -->
            <div class="destructive-area">
                <div class="section-label">Advanced Actions</div>
                <div class="destructive-banner">
                    <div class="destructive-content">
                        <span>CRITICAL ACTION</span>
                        <h2>Delete AMRAP Session?</h2>
                        <p style="color: rgba(255,255,255,0.4); font-size: 14px; margin-top: 8px;">This action will permanently purge the raw kinetic data from the obsidian cloud.</p>
                    </div>
                    <div class="action-group">
                        <button class="btn btn-ghost">Dismiss</button>
                        <button class="btn btn-danger">Purge Data</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Simple interactivity for the high-fidelity feel
        document.querySelectorAll('.btn').forEach(button => {
            button.addEventListener('mousedown', () => {
                button.style.transform = 'scale(0.96) translateY(0)';
            });
            button.addEventListener('mouseup', () => {
                button.style.transform = 'scale(1) translateY(-2px)';
            });
        });

        // Simulating auto-closing toasts
        setTimeout(() => {
            const toasts = document.querySelectorAll('.toast');
            toasts.forEach((toast, index) => {
                setTimeout(() => {
                    toast.style.transition = "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)";
                    toast.style.opacity = "0";
                    toast.style.transform = "translateX(100px) scale(0.9)";
                }, 4000 + (index * 500));
            });
        }, 2000);
    </script>
</body>
</html>