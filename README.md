# 🚀 Virtual Cosmos <br> A High-Performance Spatial Interaction Platform

**Virtual Cosmos** is a modern, 2D proximity-based digital environment designed to simulate real-world office interactions. Inspired by platforms like Gather.town, participants can walk their virtual avatars across a global dashboard and organically communicate via P2P Video, Audio, and Text naturally as they approach one another. 

![Virtual Cosmos Preview](https://img.shields.io/badge/Status-Production_Ready-emerald?style=for-the-badge)
![WebRTC Enabled](https://img.shields.io/badge/WebRTC-P2P_Mesh-purple?style=for-the-badge)

---

## ✨ Features

- **Spatial Proximity WebRTC:** Your microphone and webcam are explicitly tied to your spatial coordinates (200px discovery bounds). The system natively scales peer volume and negotiates explicit `RTCPeerConnection` meshes only to people wandering in your specific local area.
- **Dynamic Meeting Zones:** Boardrooms and specific geographic nodes bypass mathematical bounds! Stepping into the `design_zone` or `meeting_room_a` implicitly connects you to a global Mesh-Network allowing presentation style broadcasting logic across distances.
- **Hardware Agnostic (Mobile & Desktop):** 
  - Desktop clients natively experience 60fps local Linear Interpolation (LERP) rendering utilizing physical WASD controls and mouse-wheel zoom capabilities.
  - Mobile clients natively detect Touch-to-Move spatial coordinates, fluid multi-axis panning, scaling floating interfaces, and specific graphical Chat Overrides mapped dynamically utilizing responsive boundaries.
- **Algorithmic Socket Topologies:** Socket payloads are conditionally distributed via physical bounding boxes (Spatial Hashing) optimizing network throughput for high user-counts.
- **Transient Live Reactions:** Emote in real-time triggering `animate-ping` WebSockets directly atop your Player Avatar node across the globe.

## 🛠 Tech Stack

**Front-End Engine:**
*   `React.js` (Vite Environment)
*   `Tailwind CSS` (Component Styling & Breakpoints)
*   `Zustand` (Global Component State)
*   `RTCPeerConnection` P2P Network API + Google STUN 

**Back-End Infrastructure:**
*   `Node.js` + `Express`
*   `Socket.IO` (Client Event Handling & Proximity Computations)
*   `Linear Interpolation Physics` (Custom React Native Matrix Calculations)

---

## 💻 Installation & Usage

**1. Clone the repository:**
```bash
git clone https://github.com/LearnerAbhinav/virtual-cosmos.git
cd virtual-cosmos
```

**2. Local Development (Requires Two Terminals):**

_Terminal A (Production Socket Engine):_
```bash
cd server
npm install
npm start
```
_Terminal B (Vite Frontend):_
```bash
cd client
npm install
npm run dev
```

**3. Production Rendering (Monorepo Deployment):**
The codebase is structured to organically compile and deliver exact node-dependent static files through standard Express pipelines.
Simply push to cloud providers (Render.com / Heroku) configuring your Build & Start parameters to:
*   **Build Command:** `cd client && npm install && npm run build && cd ../server && npm install`
*   **Start Command:** `cd server && node index.js`

---

## 📐 Architecture Note

The client natively detects the HTTP `window.location.protocol` on initialization to dynamically map either `http://localhost:3000` during isolated environments or direct `wss://` origin strings seamlessly transitioning from sandbox development to live internet topology.
