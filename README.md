# 🚨 ResQAI – AI-Powered Disaster Management & Emergency Response Platform

[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20Ready-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8%20Realtime-010101?logo=socket.io&logoColor=white)](https://socket.io/)
[![Vite](https://img.shields.io/badge/Vite-6.1-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

ResQAI is an enterprise-grade, mission-critical Disaster Management and Emergency Response platform built on the **MERN** stack (MongoDB, Express, React 19, Node.js) with **real-time bi-directional WebSockets (Socket.IO)**, **interactive GIS mapping (Leaflet)**, and **native AI engines**.

Designed for disaster response teams, hospital networks, civil defense authorities, and citizens, ResQAI automates emergency triage, dynamic rescue team dispatch, hazard-avoiding evacuation routing, and missing persons reunification under severe crisis scenarios.

---

## 🌟 Key Features

### 1. 🚨 One-Tap GPS-Verified SOS & Smart Dispatch
- Instant SOS alert generation with verified GPS coordinates and reverse geocoding.
- 9-stage idempotent incident state machine (`REPORTED` → `VERIFIED` → `DISPATCHED` → `IN_PROGRESS` → `CONTAINED` → `RESOLVED`).
- Automatic real-time notification broadcast via WebSockets, SMS (Twilio), and Emergency SMTP alerts.

### 2. 🗺️ Live GIS Tactical Map & Smart Evacuation Routing
- Interactive GIS map visualization of active disaster zones, hazard perimeters, relief camps, and hospitals.
- OSRM-powered intelligent evacuation routing that automatically recalculates paths to avoid flooded roads, collapsed infrastructure, and fire zones.
- Turn-by-turn navigation instructions for both driving and walking emergency evacuations.

### 3. 🧠 AI Disaster Risk Prediction & Weather Telemetry
- Integration with Open-Meteo meteorological telemetry (precipitation, wind velocity, barometric pressure, temperature).
- Transparent, deterministic disaster risk engine calculating real-time flood, cyclone, heatwave, and landslide hazards.
- Geofenced 100-meter proximity warning system notifying citizens in harm's way.

### 4. 🚑 Intelligent Rescue & Hospital Allocation
- Real-time tracking of rescue teams (Ambulance, Fire Squad, NDRF, Water Rescue).
- Automated distance and capability-matching algorithms dispatching the most suitable responder to critical incidents.
- Live hospital ICU bed, blood unit, and oxygen capacity tracking.

### 5. 🔍 Missing Persons & Reunification AI
- Face matching simulation and metadata correlation (name phonetics, age, last seen location, clothing descriptors).
- Suggests candidate matches between reported missing persons and found individuals in relief camps.

### 6. 🤖 Multilingual Emergency AI Chatbot
- Offline-resilient knowledge engine offering first-aid instructions, shelter locations, and emergency contacts.
- Supports regional languages with auto-detection and optional Google Gemini / OpenAI integrations.

### 7. 🛡️ Role-Based Access Dashboards
- Dedicated interfaces for:
  - **Citizen Portal**: One-tap SOS, family safety check, route finder, missing person reporting.
  - **Emergency Operator / Dispatcher**: Incident verification, team allocation, live feeds, SMS audit.
  - **Rescue Team Unit**: Mission acceptance, GPS navigation, casualty status logging.
  - **Hospital Admin**: Bed availability, patient transport tracking, triage intake.

---

## 🏗️ System Architecture

```text
  ┌──────────────────────────────────────────────────────────────┐
  │                    CLIENTS & DASHBOARDS                      │
  │  Citizen Web App  │  Operator Command  │  Rescue Team Mobile │
  └──────────────────────────────┬───────────────────────────────┘
                                 │ HTTPS / WSS
                                 ▼
  ┌──────────────────────────────────────────────────────────────┐
  │                   FRONTEND (Vite + React 19)                 │
  │  Leaflet GIS Maps │ Socket.IO Client │ Tailwind Design System│
  │  (Hosted on Vercel: https://<your-app>.vercel.app)           │
  └──────────────────────────────┬───────────────────────────────┘
                                 │ REST API & WebSocket Handshake
                                 ▼
  ┌──────────────────────────────────────────────────────────────┐
  │                 BACKEND ENGINE (Node.js + Express)           │
  │  (Hosted on Render: https://<your-backend>.onrender.com)     │
  │                                                              │
  │  ┌───────────────┐  ┌───────────────┐  ┌──────────────────┐  │
  │  │ Socket Manager│  │ SOS Lifecycle │  │ Rescue Allocation│  │
  │  └───────────────┘  └───────────────┘  └──────────────────┘  │
  │  ┌───────────────┐  ┌───────────────┐  ┌──────────────────┐  │
  │  │ Evacuation GIS│  │ Risk Predictor│  │ Face Reunify AI  │  │
  │  └───────────────┘  └───────────────┘  └──────────────────┘  │
  └──────────────┬───────────────────────────────┬───────────────┘
                 │                               │
                 ▼                               ▼
  ┌──────────────────────────────┐ ┌─────────────────────────────┐
  │     DATABASE (MongoDB Atlas) │ │     EXTERNAL INTEGRATIONS   │
  │  M0/Dedicated Cloud Cluster  │ │  • Twilio SMS Gateway       │
  │  Collections: Incidents,     │ │  • Nodemailer SMTP Alerts   │
  │  Hospitals, Rescue Teams,    │ │  • Open-Meteo Telemetry     │
  │  Evacuation, Missing Persons │ │  • OSRM Routing Engine      │
  └──────────────────────────────┘ └─────────────────────────────┘
```

---

## 💻 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 6, Tailwind CSS, Lucide React, Framer Motion, Recharts |
| **Maps & GIS** | Leaflet, React-Leaflet, OpenStreetMap tiles, OSRM routing |
| **Backend** | Node.js (v20+), Express.js 4.21, Socket.IO 4.8, Mongoose 8 |
| **Database** | MongoDB Atlas (Cloud) / MongoDB Community Server (Local) |
| **Realtime** | WebSocket & HTTP Long-Polling with auto-reconnect fallback |
| **Third-Party APIs** | Twilio SMS API, Open-Meteo Weather API, OSRM Routing, Nodemailer |
| **Testing** | Node.js Native Test Runner (`node --test`), 27 Automated Test Specs |

---

## 📁 Repository Structure

```text
├── package.json              # Root frontend scripts & dev dependencies
├── vite.config.ts            # Vite build & local proxy configuration
├── vercel.json               # Vercel SPA routing & cache control
├── tsconfig.json             # TypeScript compiler settings
├── tailwind.config.js        # Tailwind CSS theme configuration
├── .gitignore                # Production git exclusion rules
├── .env.example              # Sanitized environment variable template
│
├── src/                      # Frontend Application
│   ├── components/           # Reusable UI components & widgets
│   ├── config/               # Multilingual & regional configurations
│   ├── context/              # AuthContext & SocketContext
│   ├── pages/                # Dashboards (Citizen, Operator, Rescue, Hospital)
│   ├── services/             # Centralized API service & mock fallbacks
│   └── types/                # TypeScript interface definitions
│
├── server/                   # Backend Application
│   ├── package.json          # Backend dependencies & test scripts
│   ├── server.js             # Main Express server, health probes & Socket.IO
│   ├── .env.example          # Backend environment variable template
│   ├── config/               # Database & language connectors
│   ├── models/               # Mongoose schemas (Incident, Hospital, SOS, User)
│   ├── services/             # Core domain logic & AI algorithms
│   ├── sockets/              # Socket.IO room manager & event handlers
│   └── tests/                # 27 automated unit & integration test suites
│
└── ai_microservice/          # Auxiliary Python AI Engine (FastAPI)
    ├── main.py               # XGBoost & NLP simulation service
    └── requirements.txt      # Python dependencies
```

---

## 🚀 Local Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) v20 or higher
- [MongoDB](https://www.mongodb.com/try/download/community) running locally (port 27017) or a MongoDB Atlas URI

### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/resqai.git
cd resqai
```

### 2. Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 3. Configure Environment Variables
Copy `.env.example` in both the root and `server` directory:
```bash
cp .env.example .env
cp server/.env.example server/.env
```
*(In local development, the default values in `.env.example` work out of the box).*

### 4. Run Locally
To run both backend (port 5000) and frontend (port 3000) concurrently:
```bash
npm start
```
- Frontend UI: `http://localhost:3000`
- Backend API: `http://localhost:5000`
- API Health Status: `http://localhost:5000/health`

### 5. Run Automated Tests
```bash
cd server
npm test
```

---

## 🌐 Cloud Deployment Guide

### Step 1: MongoDB Atlas (Database)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign in.
2. Create a free **M0 Sandbox** cluster.
3. Under **Security → Database Access**, create a user (e.g. `resqai_admin`) with a secure password.
4. Under **Security → Network Access**, add IP `0.0.0.0/0` (Allow Access from Anywhere) so Render can connect dynamically.
5. Under **Clusters → Connect → Drivers**, copy the connection string:
   ```text
   mongodb+srv://resqai_admin:<password>@cluster0.xxxxx.mongodb.net/disaster_management?retryWrites=true&w=majority
   ```

### Step 2: Render (Backend)
1. Sign up / Log in to [Render](https://render.com/).
2. Click **New + → Web Service**.
3. Connect your GitHub repository.
4. Configure the service:
   - **Name**: `resqai-backend`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: Free
5. Under **Environment Variables**, add:
   - `PORT`: `10000` (or leave default, Render sets PORT automatically)
   - `NODE_ENV`: `production`
   - `MONGO_URI`: *(Your MongoDB Atlas URI from Step 1)*
   - `JWT_SECRET`: *(A random 64-character secret)*
   - `FRONTEND_URL`: `https://<your-app>.vercel.app` *(update after Step 3)*
   - *(Optional: `TWILIO_*`, `SMTP_*`, `AI_API_KEY`)*
6. Click **Deploy Web Service**.
7. Once deployed, note your live backend URL: `https://resqai-backend.onrender.com`.
8. Verify it by visiting `https://resqai-backend.onrender.com/health` in your browser.

### Step 3: Vercel (Frontend)
1. Sign up / Log in to [Vercel](https://vercel.com/).
2. Click **Add New… → Project** and import your GitHub repository.
3. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Expand **Environment Variables** and add:
   - `VITE_API_URL`: `https://resqai-backend.onrender.com`
   - `VITE_SOCKET_URL`: `https://resqai-backend.onrender.com`
5. Click **Deploy**.
6. When deployment finishes, copy your live frontend URL (e.g., `https://resqai.vercel.app`).
7. Return to Render and update `FRONTEND_URL` to your live Vercel URL.

---

## 🔒 Security & Privacy

- **Zero Credentials in Git**: All sensitive tokens (Twilio, SMTP passwords, JWT secrets, MongoDB credentials) are strictly kept in ignored environment files.
- **CORS Protection**: Access to REST and Socket.IO endpoints is restricted to authorized origins in production.
- **Idempotency**: Prevents denial-of-service / duplicate SOS spamming via unique transaction fingerprinting.
- **Fail-Safe Operation**: If external weather or SMS APIs are temporarily unavailable, the system transparently degrades to local heuristic algorithms without dropping emergency requests.

---

## 📄 License

This project is licensed under the MIT License.
