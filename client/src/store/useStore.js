import { create } from 'zustand';

export const useStore = create((set) => ({
  localId: null,
  players: {}, // [id]: { x, y, color, targetX, targetY, seatId, name, handRaised }
  seats: [],
  zones: [],
  activeRooms: new Set(),
  chatMessages: [],

  activeSidebarTab: 'rooms',
  toasts: [],
  isLocked: false,
  timerEnd: null,

  setZonesAndSeats: (zones, seats) => set({ zones, seats }),
  setLocalId: (id) => set({ localId: id }),

  setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab }),
  addToast: (msg) => set(state => {
     const id = Date.now();
     setTimeout(() => state.removeToast(id), 4000);
     return { toasts: [...state.toasts, { id, msg }] };
  }),
  removeToast: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
  
  toggleLock: () => set(state => ({ isLocked: !state.isLocked })),
  setTimer: (ms) => set({ timerEnd: ms ? Date.now() + ms : null }),
  
  updatePlayerHand: (id, isRaised) => set(state => {
     if (!state.players[id]) return state;
     return { players: { ...state.players, [id]: { ...state.players[id], handRaised: isRaised } } }
  }),

  addChatMessage: (msg) => set(state => ({
     chatMessages: [...state.chatMessages, msg]
  })),

  updatePlayerName: (id, name) => set(state => {
     if (!state.players[id]) return state;
     return {
        players: { ...state.players, [id]: { ...state.players[id], name } }
     }
  }),

  initPlayers: (playersArray) => set((state) => {
    const playersObj = {};
    playersArray.forEach(p => {
      playersObj[p.id] = { ...p, targetX: p.x, targetY: p.y };
    });
    return { players: playersObj };
  }),

  addPlayer: (p) => set((state) => ({
    players: { ...state.players, [p.id]: { ...p, targetX: p.x, targetY: p.y } }
  })),

  removePlayer: (id) => set((state) => {
    const newPlayers = { ...state.players };
    delete newPlayers[id];
    return { players: newPlayers };
  }),

  // Used for network updates – we set targets for LERPing
  updatePlayerTarget: (id, x, y, seatId = undefined) => set(state => {
    if (!state.players[id]) return state;
    return {
      players: {
         ...state.players,
         [id]: { ...state.players[id], targetX: x, targetY: y, seatId: seatId !== undefined ? seatId : state.players[id].seatId }
      }
    };
  }),

  // Used by the local animation loop to actually apply LERP coordinates
  setPlayerPos: (id, x, y, seatId = undefined) => set(state => {
    if (!state.players[id]) return state;
    return {
      players: {
         ...state.players,
         [id]: { ...state.players[id], x, y, seatId: seatId !== undefined ? seatId : state.players[id].seatId }
      }
    };
  }),
  
  localStream: null,
  remoteStreams: {}, // id => MediaStream
  
  setLocalStream: (stream) => set({ localStream: stream }),
  
  addRemoteStream: (id, stream) => set((state) => ({
    remoteStreams: { ...state.remoteStreams, [id]: stream }
  })),

  removeRemoteStream: (id) => set((state) => {
    const newStreams = { ...state.remoteStreams };
    delete newStreams[id];
    return { remoteStreams: newStreams };
  }),

  addActiveRoom: (room) => set((state) => ({
    activeRooms: [...state.activeRooms, room]
  })),

  removeActiveRoom: (room) => set((state) => ({
    activeRooms: state.activeRooms.filter(r => r !== room)
  }))
}));
