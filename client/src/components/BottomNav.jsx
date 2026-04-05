import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { WebRTCManager } from '../WebRTCManager';
import { socket } from '../socket';

const TimerDisplay = ({ timerEnd }) => {
  const [timeLeft, setTimeLeft] = useState(timerEnd - Date.now());
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = timerEnd - Date.now();
      setTimeLeft(remaining > 0 ? remaining : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerEnd]);

  const mins = Math.floor(timeLeft / 60000);
  const secs = Math.floor((timeLeft % 60000) / 1000).toString().padStart(2, '0');
  return (
    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-indigo-600 px-4 py-2 rounded-xl text-white font-mono font-bold shadow-lg border border-indigo-400">
       ⏳ {mins}:{secs}
    </div>
  );
};

export const BottomNav = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    WebRTCManager.toggleAudio();
  };

  const toggleVideo = () => {
    setIsVideoOff(!isVideoOff);
    WebRTCManager.toggleVideo();
  };

  const handleShare = () => {
    WebRTCManager.shareScreen();
  };

  const isLocked = useStore(state => state.isLocked);
  const toggleLock = useStore(state => state.toggleLock);
  const addToast = useStore(state => state.addToast);
  const setActiveSidebarTab = useStore(state => state.setActiveSidebarTab);
  const localId = useStore(state => state.localId);
  const handRaised = useStore(state => state.players[localId]?.handRaised);
  const timerEnd = useStore(state => state.timerEnd);
  const setTimer = useStore(state => state.setTimer);

  const handleInvite = () => {
     let url = window.location.href;
     navigator.clipboard.writeText(url).then(() => {
        addToast('Invite Link Copied!');
     });
  };

  const toggleHand = () => {
     socket.emit('toggle_hand');
  }

  const toggleTimer = () => {
     if (timerEnd) setTimer(null);
     else setTimer(5 * 60 * 1000); // 5 mins
  }

  const p = useStore(state => state.players[localId])

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#17171d] rounded-2xl shadow-2xl flex items-center p-2 z-50 text-white">
       
       {/* Timer UI (if active) */}
       {timerEnd && <TimerDisplay timerEnd={timerEnd} />}

       {/* User Profile Popout */}
       <div className="flex items-center gap-2 px-4 border-r border-zinc-700 cursor-pointer hover:bg-zinc-800 p-2 rounded-lg transition">
          <div className="relative">
             <div className="w-8 h-8 rounded-full border border-zinc-600 bg-indigo-500 flex items-center justify-center font-bold text-xs">
                {p && p.name ? p.name.substring(0,2).toUpperCase() : 'ME'}
             </div>
             <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#17171d]"></div>
          </div>
          <div className="flex flex-col">
             <span className="text-xs font-semibold">{p && p.name ? p.name : 'Guest User'}</span>
             <span className="text-[10px] text-zinc-400">Available</span>
          </div>
       </div>

       {/* Controls */}
       <div className="flex items-center gap-1 px-4 border-r border-zinc-700">
          <NavButton icon={isMuted ? 'Muted' : 'Mic'} label={isMuted ? "Unmute" : "Mute"} onClick={toggleMute} active={isMuted} />
          <NavButton icon={isVideoOff ? 'VideoOff' : 'Camera'} label={isVideoOff ? "Start" : "Stop"} onClick={toggleVideo} active={isVideoOff} />
          <NavButton icon="Share" label="Share" onClick={handleShare} />
       </div>

       <div className="flex items-center gap-1 px-4 border-r border-zinc-700">
          <NavButton icon="Lock" label={isLocked ? "Unlock" : "Lock"} active={isLocked} onClick={toggleLock} />
          <NavButton icon="Invite" label="Invite" onClick={handleInvite} />
       </div>

       <div className="flex items-center gap-1 px-4 border-r border-zinc-700">
          <NavButton icon="Move" label="Move" onClick={() => addToast('Cursor movement is active')} />
          <NavButton icon="Hand" label="Hand" active={handRaised} onClick={toggleHand} />
          <NavButton icon="React" label="React" onClick={() => addToast('Reactions coming in Phase 3!')} />
          <NavButton icon="Timer" label="Timer" active={!!timerEnd} onClick={toggleTimer} />
       </div>

       <div className="flex items-center gap-1 px-4">
          <NavButton icon="Chat" label="Chat" onClick={() => setActiveSidebarTab('chat')} />
          <NavButton icon="Apps" label="Apps" onClick={() => addToast('Apps Marketplace coming soon.')} />
       </div>

       <button className="ml-4 mr-2 !bg-red-500/20 hover:!bg-red-500/40 text-red-500 px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex flex-col items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Leave
       </button>
    </div>
  );
};

const NavButton = ({ icon, label, onClick, active }) => {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 w-14 rounded-xl transition-colors ${active ? 'bg-red-500/20 text-red-400' : 'hover:bg-zinc-800 text-zinc-300 hover:text-white'}`}>
       <Icon name={icon} />
       <span className="text-[10px]">{label}</span>
    </button>
  );
};

// Generic Icon Renderer
const Icon = ({ name }) => {
  switch(name) {
    case 'Mic': return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>;
    case 'Muted': return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>;
    case 'Camera': return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
    case 'VideoOff': return <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>;
    case 'Share': return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
    case 'Lock': return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>;
    case 'Invite': return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>;
    case 'Move': return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>;
    case 'Hand': return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" /></svg>;
    case 'React': return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    case 'Timer': return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    case 'Chat': return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
    case 'Apps': return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
    default: return null;
  }
}
