<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Flash UI: Vitreous Tectonic Dashboard</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #030405;
            --surface: #0a0c10;
            --glass: rgba(255, 255, 255, 0.035);
            --glass-border: rgba(255, 255, 255, 0.08);
            --glass-highlight: rgba(255, 255, 255, 0.12);
            --accent: #00f2ff;
            --accent-muted: rgba(0, 242, 255, 0.2);
            --text-main: #f8fafc;
            --text-dim: #94a3b8;
            --mono: 'JetBrains Mono', monospace;
            --sans: 'Inter', sans-serif;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-tap-highlight-color: transparent;
        }

        body {
            background-color: var(--bg);
            color: var(--text-main);
            font-family: var(--sans);
            min-height: 100vh;
            overflow-x: hidden;
            background-image: 
                radial-gradient(circle at 50% -20%, #1e293b 0%, transparent 50%),
                radial-gradient(circle at 0% 100%, #0c1117 0%, transparent 40%);
        }

        /* Tectonic Depth Layering */
        .dashboard-container {
            max-width: 480px;
            margin: 0 auto;
            padding: 24px 16px;
            display: flex;
            flex-direction: column;
            gap: 24px;
            perspective: 1000px;
        }

        .header {
            padding: 0 8px;
            animation: slideDown 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .header h1 {
            font-size: 2rem;
            font-weight: 800;
            letter-spacing: -0.04em;
            text-transform: uppercase;
            background: linear-gradient(180deg, #fff 0%, #64748b 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .header p {
            color: var(--text-dim);
            font-size: 0.875rem;
            margin-top: 4px;
        }

        /* Vitreous Cards */
        .glass-card {
            background: var(--glass);
            backdrop-filter: blur(12px) saturate(180%);
            -webkit-backdrop-filter: blur(12px) saturate(180%);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            position: relative;
            overflow: hidden;
            box-shadow: 
                0 10px 30px -10px rgba(0,0,0,0.5),
                inset 0 1px 1px var(--glass-highlight);
        }

        .glass-card::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; height: 1px;
            background: linear-gradient(90deg, transparent, var(--glass-highlight), transparent);
        }

        /* Table Mechanics */
        .table-viewport {
            height: 400px;
            overflow-y: auto;
            overflow-x: auto;
            scrollbar-width: none;
            position: relative;
        }

        .table-viewport::-webkit-scrollbar { display: none; }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.8125rem;
            text-align: left;
        }

        thead {
            position: sticky;
            top: 0;
            z-index: 10;
            background: rgba(10, 12, 16, 0.8);
            backdrop-filter: blur(10px);
        }

        th {
            padding: 16px 12px;
            font-weight: 600;
            color: var(--text-dim);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 1px solid var(--glass-border);
            white-space: nowrap;
            cursor: pointer;
            transition: color 0.2s ease;
        }

        th:hover {
            color: var(--accent);
        }

        .sort-icon {
            display: inline-flex;
            flex-direction: column;
            margin-left: 4px;
            vertical-align: middle;
            opacity: 0.3;
        }

        th.active .sort-icon {
            opacity: 1;
            color: var(--accent);
        }

        td {
            padding: 16px 12px;
            border-bottom: 1px solid rgba(255,255,255,0.03);
            vertical-align: middle;
            font-family: var(--mono);
        }

        tr {
            transition: background 0.2s ease, transform 0.2s ease;
        }

        tr:hover {
            background: rgba(255, 255, 255, 0.02);
        }

        tr.selected {
            background: var(--accent-muted);
            box-shadow: inset 2px 0 0 var(--accent);
        }

        .metric-val {
            color: var(--text-main);
            font-weight: 500;
        }

        .streak-badge {
            background: rgba(255, 255, 255, 0.08);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.75rem;
            border: 1px solid var(--glass-border);
        }

        /* Empty State */
        .empty-state {
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 400px;
            text-align: center;
            padding: 40px;
            animation: fadeIn 0.5s ease;
        }

        .empty-illustration {
            width: 120px;
            height: 120px;
            margin-bottom: 24px;
            position: relative;
        }

        .tectonic-plate {
            position: absolute;
            border: 1px solid var(--accent);
            opacity: 0.2;
            width: 100%;
            height: 100%;
            transform: rotateX(60deg) rotateZ(45deg);
            animation: float 4s infinite ease-in-out;
        }

        .tectonic-plate:nth-child(2) {
            transform: rotateX(60deg) rotateZ(45deg) translateZ(20px);
            animation-delay: -1s;
            opacity: 0.1;
        }

        /* Controls */
        .controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 10px;
        }

        .btn-toggle {
            background: transparent;
            border: 1px solid var(--glass-border);
            color: var(--text-dim);
            padding: 8px 16px;
            border-radius: 100px;
            font-size: 0.75rem;
            cursor: pointer;
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 0.1em;
        }

        .btn-toggle:hover {
            border-color: var(--accent);
            color: var(--accent);
            background: var(--accent-muted);
        }

        /* Animations */
        @keyframes slideDown {
            from { transform: translateY(-20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.98); }
            to { opacity: 1; transform: scale(1); }
        }

        @keyframes float {
            0%, 100% { transform: rotateX(60deg) rotateZ(45deg) translateZ(0); }
            50% { transform: rotateX(60deg) rotateZ(45deg) translateZ(15px); }
        }

        /* State Classes */
        .is-empty .table-viewport table { display: none; }
        .is-empty .empty-state { display: flex; }

    </style>
</head>
<body>

    <div class="dashboard-container">
        <header class="header">
            <p>Vitreous Tectonic / Mobile</p>
            <h1>Coach Flux</h1>
        </header>

        <div class="glass-card" id="mainCard">
            <div class="table-viewport">
                <table id="analyticsTable">
                    <thead>
                        <tr>
                            <th>Athlete</th>
                            <th class="active">Workouts <span class="sort-icon">▲</span></th>
                            <th>Vol <span class="sort-icon">▼</span></th>
                            <th>Strk</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr onclick="selectRow(this)">
                            <td style="font-family: var(--sans); font-weight: 500;">Erikson, M.</td>
                            <td class="metric-val">24</td>
                            <td class="metric-val">12.5k</td>
                            <td><span class="streak-badge">12d</span></td>
                        </tr>
                        <tr class="selected" onclick="selectRow(this)">
                            <td style="font-family: var(--sans); font-weight: 500;">Sanz, J.</td>
                            <td class="metric-val">21</td>
                            <td class="metric-val">18.2k</td>
                            <td><span class="streak-badge">08d</span></td>
                        </tr>
                        <tr onclick="selectRow(this)">
                            <td style="font-family: var(--sans); font-weight: 500;">Doyle, K.</td>
                            <td class="metric-val">19</td>
                            <td class="metric-val">9.1k</td>
                            <td><span class="streak-badge">04d</span></td>
                        </tr>
                        <tr onclick="selectRow(this)">
                            <td style="font-family: var(--sans); font-weight: 500;">Lee, H.</td>
                            <td class="metric-val">18</td>
                            <td class="metric-val">22.4k</td>
                            <td><span class="streak-badge">31d</span></td>
                        </tr>
                        <tr onclick="selectRow(this)">
                            <td style="font-family: var(--sans); font-weight: 500;">Grant, A.</td>
                            <td class="metric-val">15</td>
                            <td class="metric-val">14.0k</td>
                            <td><span class="streak-badge">02d</span></td>
                        </tr>
                        <tr onclick="selectRow(this)">
                            <td style="font-family: var(--sans); font-weight: 500;">Vance, R.</td>
                            <td class="metric-val">12</td>
                            <td class="metric-val">7.8k</td>
                            <td><span class="streak-badge">00d</span></td>
                        </tr>
                        <tr onclick="selectRow(this)">
                            <td style="font-family: var(--sans); font-weight: 500;">Wong, P.</td>
                            <td class="metric-val">09</td>
                            <td class="metric-val">5.2k</td>
                            <td><span class="streak-badge">01d</span></td>
                        </tr>
                    </tbody>
                </table>

                <div class="empty-state">
                    <div class="empty-illustration">
                        <div class="tectonic-plate"></div>
                        <div class="tectonic-plate"></div>
                    </div>
                    <h3 style="margin-bottom: 8px;">No data yet</h3>
                    <p style="color: var(--text-dim); font-size: 0.875rem;">Waiting for athletes to sync their vitreous nodes.</p>
                </div>
            </div>
        </div>

        <div class="controls">
            <button class="btn-toggle" onclick="toggleEmptyState()">Toggle Empty State</button>
            <div style="font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.2em;">
                Last Sync: 04:02ms
            </div>
        </div>
    </div>

    <script>
        function toggleEmptyState() {
            const card = document.getElementById('mainCard');
            card.classList.toggle('is-empty');
            const btn = document.querySelector('.btn-toggle');
            btn.innerText = card.classList.contains('is-empty') ? 'Show Data' : 'Empty State';
        }

        function selectRow(row) {
            // Remove selection from all rows
            const rows = document.querySelectorAll('tr');
            rows.forEach(r => r.classList.remove('selected'));
            
            // Add to current
            row.classList.add('selected');
        }

        // Add subtle parallax to the card based on mouse/touch
        const card = document.getElementById('mainCard');
        document.addEventListener('mousemove', (e) => {
            if (window.innerWidth < 768) return;
            const xAxis = (window.innerWidth / 2 - e.pageX) / 50;
            const yAxis = (window.innerHeight / 2 - e.pageY) / 50;
            card.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
        });

        // Click sort simulation
        document.querySelectorAll('th').forEach(header => {
            header.addEventListener('click', () => {
                document.querySelectorAll('th').forEach(h => h.classList.remove('active'));
                header.classList.add('active');
            });
        });
    </script>
</body>
</html>