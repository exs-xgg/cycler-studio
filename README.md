# 🚴 Cycler

**Real-time bike fit analysis and indoor trainer integration — all in your browser.**

Cycler is a web-based cycling companion that uses your webcam and AI pose estimation to evaluate your bike fit in real time, and connects to Bluetooth smart trainers to capture live training data. No app install, no cloud uploads — everything runs locally in the browser.

---

## ✨ Features

### 🎯 Bike Fit Analysis
- **AI-powered pose detection** using TensorFlow.js MoveNet Thunder — runs entirely in-browser via WebGL
- **Real-time skeleton overlay** drawn on the webcam feed as you pedal
- **Joint angle measurement** for elbow, hip, and knee with smoothing filters to reduce noise
- **Automated 20-second recording** session that collects hundreds of data points
- **Fit / Not Fit verdict** based on biomechanical reference ranges from cycling fit literature
- **Per-joint breakdown** with specific adjustment advice (saddle height, stem length, handlebar position)
- **Interactive charts** showing angle variation over the session via Recharts
- **Configurable riding position** — Race/Aero, Endurance, or Casual — each with tailored ideal ranges
- **Bike type selection** — Road, Hybrid, or Mountain
- **Exportable metadata** — copy raw JSON results to clipboard for record keeping

### 📡 Indoor Trainer Integration
- **Web Bluetooth connectivity** to smart trainers supporting FTMS (Fitness Machine Service) or Cycling Power Service (CPS)
- **Live telemetry dashboard** displaying power (W), cadence (RPM), and speed (km/h)
- **Power zone classification** based on configurable FTP (7-zone model from Active Recovery to Neuromuscular)
- **Training session recording** with start/stop/reset controls and a live elapsed timer
- **Session statistics** — average power, max power, normalized power (NP), average/max cadence, average speed, and total distance
- **Real-time data charts** with a rolling 5-minute history window
- **Trainer control support** — set target power (ERG mode) or resistance level via FTMS Control Point when the trainer supports it
- **Persistent configuration** — FTP, wheel circumference, smoothing factor, and update frequency saved to localStorage

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| AI / ML | TensorFlow.js (WebGL backend) + MoveNet Thunder |
| Bluetooth | Web Bluetooth API |
| Charts | Recharts |
| Icons | Lucide React |
| Styling | Vanilla CSS with glassmorphism design |
| Deployment | Docker (multi-stage: Node build → Nginx) |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- A browser with **WebGL** support (Chrome or Edge recommended)
- A browser with **Web Bluetooth** support for trainer features (Chrome or Edge — not supported in Firefox/Safari)
- A **webcam** for bike fit analysis
- **HTTPS or localhost** — both WebRTC (camera) and Web Bluetooth require a secure context

### Install & Run

```bash
# Clone the repository
git clone https://github.com/your-org/cycler.git
cd cycler

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Build for Production

```bash
npm run build
npm run preview   # preview the production build locally
```

---

## 🐳 Docker Deployment

A multi-stage Dockerfile is included that builds the app and serves it with Nginx.

```bash
# Build and run with Docker Compose
docker compose up --build -d

# The app will be served at http://localhost:8080
```

Or build the image directly:

```bash
docker build -t cycler .
docker run -p 8080:80 cycler
```

> **Note:** Web Bluetooth requires HTTPS in production. When deploying behind a reverse proxy, make sure TLS is terminated before reaching Nginx.

---

## 📖 Usage Guide

### Bike Fit Analysis

1. Open the app and navigate to **Fit Analysis**.
2. Grant camera access when prompted — position your camera to capture a clear **side profile** of you on the bike.
3. Wait for the **MoveNet model to load** (a loading indicator will appear).
4. Select your **riding position** (Race/Aero, Endurance, or Casual) and **bike type**.
5. Click **Start** — the app records for **20 seconds**, tracking your joint angles frame-by-frame.
6. When the session completes, review your results:
   - **Fit / Not Fit** badge with overall verdict
   - Per-joint angle measurements vs. ideal ranges
   - Specific adjustment recommendations for any out-of-range joints
   - Time-series charts showing angle variation over the session
7. Copy the raw metadata JSON for your records.

### Indoor Trainer

1. Navigate to **Settings** and click **Connect Trainer**.
2. Pair your Bluetooth smart trainer from the browser popup (the app scans for FTMS and CPS services).
3. Once connected, go to the **Training Data** tab.
4. Click **Start Session** to begin recording live telemetry.
5. Monitor power, cadence, and speed in real time with power zone indicators.
6. Click **Stop Session** to view session statistics including normalized power.

---

## 🏗 Project Structure

```
cycler/
├── public/                  # Static assets (favicon, icons)
├── src/
│   ├── components/
│   │   ├── CameraView.tsx       # Webcam feed + skeleton overlay canvas
│   │   ├── Controls.tsx         # Position/bike type selectors + record controls
│   │   ├── Dashboard.tsx        # Real-time angle metrics gauges
│   │   ├── Results.tsx          # Post-session analysis with charts & advice
│   │   ├── TrainerSettings.tsx  # Bluetooth connection + trainer configuration
│   │   └── TrainingData.tsx     # Live training telemetry + session stats
│   ├── hooks/
│   │   ├── usePoseDetection.ts  # TF.js model lifecycle, frame loop, angle calculation
│   │   └── useBluetoothTrainer.ts # Web Bluetooth connection, FTMS/CPS parsing, session management
│   ├── types/
│   │   └── web-bluetooth.d.ts   # TypeScript declarations for Web Bluetooth API
│   ├── utils/
│   │   ├── angles.ts            # Angle math, fit evaluation, ideal ranges
│   │   └── mock-mediapipe.ts    # Build shim for @mediapipe/pose dependency
│   ├── App.tsx                  # Root component with tab navigation
│   ├── App.css                  # All application styles
│   ├── index.css                # CSS reset and global design tokens
│   └── main.tsx                 # React entry point
├── Dockerfile                   # Multi-stage build (Node → Nginx)
├── docker-compose.yml           # Single-service compose config
├── vite.config.ts               # Vite config with MediaPipe alias
├── tsconfig.json                # TypeScript project references
└── package.json
```

---

## 🔧 Configuration

### Trainer Settings (persisted in localStorage)

| Setting | Default | Description |
|---|---|---|
| FTP | 200 W | Functional Threshold Power — used for power zone calculation |
| Wheel Circumference | 2105 mm | Used for speed calculation on some trainers |
| Smoothing Factor | 0.3 | Data smoothing (0 = raw, 1 = max smoothing) |
| Update Frequency | 1000 ms | How often data points are recorded to history |
| Resistance Mode | ERG | ERG, Simulation, or Manual (requires trainer control support) |

### Fit Analysis Ideal Ranges

| Joint | Race/Aero | Endurance | Casual |
|---|---|---|---|
| Elbow Angle | 150°–160° | 150°–160° | 150°–160° |
| Hip Angle | 60°–110° | 70°–115° | 80°–120° |
| Knee Angle | 65°–145° | 65°–145° | 65°–145° |
| Ankling Range* | 115°–180° | 115°–180° | 115°–180° |

\* *Ankling range requires BlazePose (foot keypoints). MoveNet Thunder does not provide this metric.*

---

## ⚠️ Browser Compatibility

| Feature | Chrome | Edge | Firefox | Safari |
|---|---|---|---|---|
| Webcam (WebRTC) | ✅ | ✅ | ✅ | ✅ |
| TensorFlow.js (WebGL) | ✅ | ✅ | ✅ | ✅ |
| Web Bluetooth | ✅ | ✅ | ❌ | ❌ |

**Recommended:** Chrome 113+ or Edge 113+ for full functionality.

---

## 📜 Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## 📄 License

This project is private. All rights reserved.
