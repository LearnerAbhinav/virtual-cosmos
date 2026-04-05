import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { socket } from '../socket';

export const Sidebar = () => {
  const activeTab = useStore(state => state.activeSidebarTab);
  const setActiveTab = useStore(state => state.setActiveSidebarTab);
  
  const [msg, setMsg] = useState('');
  const chatMessages = useStore(state => state.chatMessages);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendMsg = (e) => {
    e.preventDefault();
    if (msg.trim()) {
       socket.emit('chat_message', msg.trim());
       setMsg('');
    }
  };

  return (
    <div className="w-64 bg-white h-screen border-r border-zinc-200 flex flex-col z-20 shadow-sm relative">
      <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500"></div>
            <h1 className="font-bold text-sm text-zinc-800">Virtual Cosmos</h1>
         </div>
         <button onClick={() => useStore.getState().setIsSidebarOpen(false)} className="md:hidden text-zinc-400 hover:text-zinc-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
         </button>
      </div>

      <div className="flex border-b border-zinc-200">
         <button onClick={() => setActiveTab('rooms')} className={`flex-1 py-2 text-xs font-semibold ${activeTab === 'rooms' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-zinc-500 hover:bg-zinc-50'}`}>Spaces</button>
         <button onClick={() => setActiveTab('chat')} className={`flex-1 py-2 text-xs font-semibold ${activeTab === 'chat' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-zinc-500 hover:bg-zinc-50'}`}>Global Chat</button>
      </div>

      {activeTab === 'rooms' ? (
        <div className="flex-1 overflow-y-auto overflow-x-hidden pt-2">
          {/* Rooms Group */}
          <div className="mt-2">
             <div className="px-4 py-1 flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-700 cursor-pointer">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                Zones
             </div>
             <div className="px-2 mt-1 space-y-0.5">
                <RoomItem icon="GreenLine" label="Meeting Room A" active />
                <RoomItem icon="GreenLine" label="Main Lobby" />
             </div>
          </div>

          {/* Channels Group */}
          <div className="mt-4">
             <div className="px-4 py-1 flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-700 cursor-pointer">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                Channels
             </div>
             <div className="px-2 mt-1 space-y-0.5">
                <RoomItem icon="Hash" label="general-chat" />
                <RoomItem icon="Hash" label="doubts" />
             </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
             {chatMessages.length === 0 && <p className="text-xs text-zinc-400 text-center mt-4">Empty chat history</p>}
             {chatMessages.map(m => (
               <div key={m.id} className="flex flex-col">
                  <span className="text-[10px] font-bold text-zinc-500 mb-0.5">{m.senderName}</span>
                  <div className="bg-white px-3 py-2 rounded-xl rounded-tl-none shadow-sm text-xs text-zinc-800 border border-zinc-100 self-start max-w-[90%] break-words">
                     {m.text}
                  </div>
               </div>
             ))}
             <div ref={endRef} />
          </div>
          <form onSubmit={sendMsg} className="p-3 bg-white border-t border-zinc-200 flex gap-2">
             <input 
               type="text" 
               className="flex-1 bg-zinc-100 border-none rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none" 
               placeholder="Message everyone..." 
               value={msg}
               onChange={e => setMsg(e.target.value)}
             />
             <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 rounded-lg flex items-center justify-center transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
             </button>
          </form>
        </div>
      )}
    </div>
  );
};

// --- Subcomponents for Sidebar ---
const NavItem = ({ icon: Icon, label }) => (
  <button className="w-full flex items-center gap-3 px-2 py-1.5 rounded-md text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors">
     <Icon />
     <span className="truncate">{label}</span>
  </button>
);

const RoomItem = ({ icon, label, active }) => {
  return (
    <button className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-md text-sm transition-colors ${active ? 'bg-indigo-50 text-indigo-700' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}`}>
       {icon === 'Plus' && <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
       {icon === 'GreenLine' && <div className="w-1 h-3 bg-emerald-500 rounded-full ml-1"></div>}
       {icon === 'Hash' && <span className="text-zinc-400 ml-1 font-mono text-xs">#</span>}
       <span className="truncate flex-1 text-left">{label}</span>
    </button>
  );
};

// --- Icons ---
const ActivitiesIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
const HistoryIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const CalendarIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
