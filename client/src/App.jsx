import { useEffect, useState } from 'react'
import { socket } from './socket'
import { useStore } from './store/useStore'
import { MapEngine } from './components/MapEngine'
import { Sidebar } from './components/Sidebar'
import { BottomNav } from './components/BottomNav'
import { WebRTCManager } from './WebRTCManager'

function App() {
  const initPlayers = useStore(state => state.initPlayers)
  const addPlayer = useStore(state => state.addPlayer)
  const removePlayer = useStore(state => state.removePlayer)
  const setLocalId = useStore(state => state.setLocalId)
  const updatePlayerTarget = useStore(state => state.updatePlayerTarget)
  
  const [hasJoined, setHasJoined] = useState(false)

  useEffect(() => {
    // Make sure we fetch the state in case we missed the immediate 'init' event on socket load
    socket.emit('request_init')

    function onConnect() {
      console.log('Connected to server', socket.id)
      setLocalId(socket.id)
    }

    function onInit(data) {
      setLocalId(data.id)
      initPlayers(data.players)
      useStore.getState().setZonesAndSeats(data.zones, data.seats)
    }

    function onPlayerSat(data) {
      useStore.getState().setPlayerPos(data.id, data.x, data.y, data.seatId)
    }

    function onPlayerStood(data) {
      useStore.getState().setPlayerPos(data.id, undefined, undefined, null)
    }

    function onPlayerJoined(player) {
      addPlayer(player)
    }

    function onPlayerMoved(data) {
      updatePlayerTarget(data.id, data.x, data.y)
    }

    function onPlayerLeft(id) {
      removePlayer(id)
    }

    function onPlayerNameUpdated(data) {
      useStore.getState().updatePlayerName(data.id, data.name)
    }

    function onChatMessage(msg) {
      useStore.getState().addChatMessage(msg)
    }

    function onPlayerHand(data) {
      useStore.getState().updatePlayerHand(data.id, data.isRaised);
    }

    function onReaction(data) {
      useStore.getState().setPlayerReaction(data.id, data.emoji);
    }

    // WebRTC Signaling
    function onProximityEnter(data) {
      WebRTCManager.handleProximityEnter(data.room, data.peers)
      
      const newPeerId = data.peers.find(id => id !== socket.id);
      if (newPeerId) {
         const p = useStore.getState().players[newPeerId];
         useStore.getState().addToast(`Connected to ${p?.name || 'User'}`);
         useStore.getState().setActiveSidebarTab('chat');
      }
    }

    function onProximityExit(data) {
      WebRTCManager.handleProximityExit(data.room, data.peers)
    }

    function onWebRTCOffer(data) {
      WebRTCManager.handleOffer(data, data.sender)
    }

    function onWebRTCAnswer(data) {
      WebRTCManager.handleAnswer(data, data.sender)
    }

    function onWebRTCICE(data) {
      WebRTCManager.handleICE(data, data.sender)
    }

    socket.on('connect', onConnect)
    socket.on('init', onInit)
    socket.on('player_joined', onPlayerJoined)
    socket.on('player_moved', onPlayerMoved)
    socket.on('player_left', onPlayerLeft)
    
    socket.on('player_sat', onPlayerSat)
    socket.on('player_stood', onPlayerStood)
    socket.on('player_name_updated', onPlayerNameUpdated)
    socket.on('chat_message', onChatMessage)
    socket.on('player_hand', onPlayerHand)
    socket.on('reaction', onReaction)
    socket.on('proximity_enter', onProximityEnter)
    socket.on('proximity_exit', onProximityExit)
    socket.on('webrtc_offer', onWebRTCOffer)
    socket.on('webrtc_answer', onWebRTCAnswer)
    socket.on('webrtc_ice', onWebRTCICE)

    return () => {
      socket.off('connect', onConnect)
      socket.off('init', onInit)
      socket.off('player_joined', onPlayerJoined)
      socket.off('player_moved', onPlayerMoved)
      socket.off('player_left', onPlayerLeft)
      socket.off('player_sat', onPlayerSat)
      socket.off('player_stood', onPlayerStood)
      socket.off('player_name_updated', onPlayerNameUpdated)
      socket.off('chat_message', onChatMessage)
      socket.off('player_hand', onPlayerHand)
      socket.off('reaction', onReaction)
      socket.off('proximity_enter', onProximityEnter)
      socket.off('proximity_exit', onProximityExit)
      socket.off('webrtc_offer', onWebRTCOffer)
      socket.off('webrtc_answer', onWebRTCAnswer)
      socket.off('webrtc_ice', onWebRTCICE)
    }
  }, [])

  const [name, setName] = useState('')
  const toasts = useStore(state => state.toasts);
  const isSidebarOpen = useStore(state => state.isSidebarOpen);

  const startMedia = async () => {
    if (!name.trim()) return alert('Please enter your name');
    socket.emit('set_name', name.trim())
    await WebRTCManager.startWebRTC()
    setHasJoined(true)
  }

  if (!hasJoined) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-zinc-50 font-sans p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center border border-zinc-100">
           <div className="w-16 h-16 bg-gradient-to-tr from-purple-600 to-indigo-500 rounded-2xl mx-auto mb-6 shadow-lg shadow-purple-500/30 flex items-center justify-center text-white font-bold text-2xl">
              🚀
           </div>
           <h1 className="text-2xl font-bold text-zinc-800 mb-2">Virtual Cosmos</h1>
           <p className="text-zinc-500 text-sm mb-6">Enter your name to join the virtual office.</p>
           
           <input 
              type="text" 
              placeholder="Your Name (e.g. John Doe)" 
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && startMedia()}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 mb-6 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
           />

           <button 
              onClick={startMedia}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition-all shadow-md focus:ring-4 focus:ring-indigo-500/20"
           >
             Join Space
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[100dvh] flex font-sans overflow-hidden bg-zinc-900 relative">
      <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 absolute md:static z-40 h-full shadow-2xl md:shadow-none md:translate-x-0`}>
         <Sidebar />
      </div>
      <div className="flex-1 relative w-full h-full">
         <MapEngine />
         <BottomNav />
      </div>

      {/* Floating Toasts */}
      <div className="absolute top-6 right-6 flex flex-col gap-2 z-50 pointer-events-none">
         {toasts.map(t => (
            <div key={t.id} className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl border border-emerald-500 text-sm font-semibold tracking-wide">
               ✨ {t.msg}
            </div>
         ))}
      </div>
    </div>
  )
}

export default App
