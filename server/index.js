require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const SpatialHashGrid = require('./SpatialHashGrid');

const app = express();
app.use(cors());

// Serve React static build files in production
app.use(express.static(path.join(__dirname, '../client/dist')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Game State
const players = new Map();
const grid = new SpatialHashGrid(100); // 100x100 grid cells
const PROXIMITY_RADIUS = 200;

const ZONES = [
  { id: 'dev_zone', x: 200, y: 150, w: 400, h: 300 },
  { id: 'design_zone', x: 1200, y: 150, w: 400, h: 300 },
  { id: 'meeting_room_a', x: 200, y: 800, w: 600, h: 400 },
  { id: 'boardroom', x: 1200, y: 800, w: 600, h: 400 },
  { id: 'cafe', x: 700, y: 1400, w: 600, h: 400 }
];

const SEATS = [];
let seatCounter = 1;
function generateSeatCluster(startX, startY, rows, cols, spacingX, spacingY) {
  for(let r=0; r<rows; r++) {
    for(let c=0; c<cols; c++) {
      SEATS.push({ id: `seat_${seatCounter++}`, x: startX + c * spacingX, y: startY + r * spacingY });
    }
  }
}
// Automatically populate 80+ functional seats
generateSeatCluster(250, 200, 2, 4, 80, 80);
generateSeatCluster(1250, 200, 2, 4, 80, 80);
generateSeatCluster(300, 850, 3, 5, 80, 80);
generateSeatCluster(1300, 850, 3, 5, 80, 80);
generateSeatCluster(750, 1450, 4, 4, 100, 100);
const seatsOccupied = {};

io.on('connection', (socket) => {
  console.log(`[+] Player connected: ${socket.id}`);

  // Initialize player
  const player = {
    id: socket.id,
    x: Math.random() * 800,
    y: Math.random() * 600,
    color: Math.floor(Math.random()*16777215).toString(16),
    rooms: new Set(),
    seatId: null
  };
  
  players.set(socket.id, player);
  grid.insertClient(socket.id, player.x, player.y);

  socket.emit('init', {
    id: socket.id,
    players: Array.from(players.values()).map(p => ({
      id: p.id, x: p.x, y: p.y, color: p.color, seatId: p.seatId
    })),
    seats: SEATS,
    zones: ZONES
  });

  socket.on('request_init', () => {
    socket.emit('init', {
      id: socket.id,
      players: Array.from(players.values()).map(p => ({
        id: p.id, x: p.x, y: p.y, color: p.color, seatId: p.seatId
      })),
      seats: SEATS,
      zones: ZONES
    });
  });

  socket.broadcast.emit('player_joined', { id: player.id, x: player.x, y: player.y, color: player.color });

  socket.on('interact', () => {
    const p = players.get(socket.id);
    if (!p) return;
    
    // If sitting, stand up
    if (p.seatId) {
       delete seatsOccupied[p.seatId];
       p.seatId = null;
       io.emit('player_stood', { id: p.id });
       return;
    }
    
    // Find closest seat
    let closestSeat = null;
    let minDist = 50; // Interaction radius
    SEATS.forEach(seat => {
       if (seatsOccupied[seat.id]) return; // Taken
       const dist = Math.hypot(p.x - seat.x, p.y - seat.y);
       if (dist < minDist) {
          minDist = dist;
          closestSeat = seat;
       }
    });
    
    if (closestSeat) {
       p.x = closestSeat.x;
       p.y = closestSeat.y;
       p.seatId = closestSeat.id;
       seatsOccupied[closestSeat.id] = p.id;
       grid.updateClient(p.id, p.x, p.y);
       io.emit('player_sat', { id: p.id, x: p.x, y: p.y, seatId: p.seatId });
    }
  });

  socket.on('move', (data) => {
    const { x, y } = data;
    const p = players.get(socket.id);
    if(p) {
      if (p.seatId) {
        // Break out of seat
        delete seatsOccupied[p.seatId];
        p.seatId = null;
        io.emit('player_stood', { id: p.id });
      }
      p.x = x;
      p.y = y;
      grid.updateClient(socket.id, x, y);
      socket.broadcast.emit('player_moved', { id: socket.id, x, y });
    }
  });

  socket.on('webrtc_offer', (data) => {
    io.to(data.target).emit('webrtc_offer', { sender: socket.id, offer: data.offer });
  });

  socket.on('webrtc_answer', (data) => {
    io.to(data.target).emit('webrtc_answer', { sender: socket.id, answer: data.answer });
  });

  socket.on('webrtc_ice', (data) => {
    io.to(data.target).emit('webrtc_ice', { sender: socket.id, candidate: data.candidate });
  });

  socket.on('set_name', (name) => {
    const p = players.get(socket.id);
    if (p) {
       p.name = name;
       io.emit('player_name_updated', { id: socket.id, name });
    }
  });

  socket.on('chat_message', (text) => {
    const p = players.get(socket.id);
    if (!p) return;
    
    const packet = { 
        id: Date.now().toString(), 
        senderId: socket.id, 
        senderName: p.name || 'Anonymous', 
        text, 
        timestamp: new Date().toISOString() 
    };

    // Calculate proximity constraints for packet delivery
    const currentZone = getZone(p.x, p.y);
    const CHAT_RADIUS = 300;
    
    players.forEach(otherPlayer => {
       const otherZone = getZone(otherPlayer.x, otherPlayer.y);
       let shouldReceive = false;
       
       if (currentZone && currentZone === otherZone) {
          shouldReceive = true; // Bypass mathematical constraint if inside Meeting Room
       } else {
          // Validate physical distance theorem
          const dist = Math.hypot(p.x - otherPlayer.x, p.y - otherPlayer.y);
          if (dist <= CHAT_RADIUS) {
              shouldReceive = true;
          }
       }
       
       if (shouldReceive) {
          io.to(otherPlayer.id).emit('chat_message', packet);
       }
    });
  });

  socket.on('toggle_hand', () => {
    const p = players.get(socket.id);
    if (p) {
       p.handRaised = !p.handRaised;
       io.emit('player_hand', { id: socket.id, isRaised: p.handRaised });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[-] Player disconnected: ${socket.id}`);
    const p = players.get(socket.id);
    if (p && p.seatId) delete seatsOccupied[p.seatId];
    players.delete(socket.id);
    grid.removeClient(socket.id);
    io.emit('player_left', socket.id);
  });
});

function getZone(x, y) {
  for (const z of ZONES) {
    if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) return z.id;
  }
  return null;
}

// Update Tick for Proximity (WebRTC signaling rooms)
setInterval(() => {
  const currentPlayers = Array.from(players.values());
  // Precompute zones
  const playerZones = {};
  currentPlayers.forEach(p => playerZones[p.id] = getZone(p.x, p.y));

  for(let i=0; i<currentPlayers.length; i++) {
    const p1 = currentPlayers[i];
    const neighbors = grid.findNear(p1.x, p1.y, PROXIMITY_RADIUS * 2); // Broaden search
    
    // Check connections (everyone must check against everyone if zones map)
    const candidates = new Set([...neighbors]);
    
    // Auto-add anyone in the same zone
    const p1Zone = playerZones[p1.id];
    if (p1Zone) {
       currentPlayers.forEach(p => {
          if (playerZones[p.id] === p1Zone) candidates.add(p.id);
       });
    }

    for(const nId of candidates) {
      if(nId === p1.id) continue;
      if(p1.id > nId) continue;

      const p2 = players.get(nId);
      if(!p2) continue;
      
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      const p2Zone = playerZones[p2.id];
      const inSameZone = p1Zone && p1Zone === p2Zone;
      const shouldConnect = inSameZone || dist <= PROXIMITY_RADIUS;
      
      const roomName = `spatial_room_${p1.id}_${nId}`;
      
      if(shouldConnect) {
        if(!p1.rooms.has(roomName)) {
           p1.rooms.add(roomName);
           p2.rooms.add(roomName);
           io.to(p1.id).to(p2.id).emit('proximity_enter', { room: roomName, peers: [p1.id, p2.id] });
           io.in(p1.id).socketsJoin(roomName);
           io.in(p2.id).socketsJoin(roomName);
        }
      } else {
        if(p1.rooms.has(roomName)) {
           p1.rooms.delete(roomName);
           p2.rooms.delete(roomName);
           io.to(p1.id).to(p2.id).emit('proximity_exit', { room: roomName, peers: [p1.id, p2.id] });
           io.in(p1.id).socketsLeave(roomName);
           io.in(p2.id).socketsLeave(roomName);
        }
      }
    }
  }
}, 100);

// React Router physical path fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
