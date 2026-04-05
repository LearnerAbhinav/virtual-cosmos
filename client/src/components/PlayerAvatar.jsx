import React, { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

export const PlayerAvatar = ({ id }) => {
  const playerRef = useRef(null);
  
  useEffect(() => {
    let frameId;
    let currentX = useStore.getState().players[id]?.x || 0;
    let currentY = useStore.getState().players[id]?.y || 0;

    const tick = () => {
      const state = useStore.getState();
      const p = state.players[id];
      const isLocal = state.localId === id;
      
      if (p && playerRef.current) {
         // Smoothly interpolate towards absolute target coordinates over frames (20% of remaining distance per frame -> nice Gather.town slide)
         currentX += ((p.targetX ?? p.x) - currentX) * 0.2;
         currentY += ((p.targetY ?? p.y) - currentY) * 0.2;
         
         if (isLocal) {
            useStore.getState().setPlayerPos(id, currentX, currentY);
         } else {
            // Spatial Audio Distance (Only computed against remote players)
            if (videoRef.current) {
               const localPlayer = state.players[state.localId];
               if (localPlayer) {
                 const dx = localPlayer.x - currentX;
                 const dy = localPlayer.y - currentY;
                 const dist = Math.sqrt(dx*dx + dy*dy);
                 const scale = Math.max(0, 1 - (dist / 300));
                 videoRef.current.volume = scale;
               }
            }
         }
         
         playerRef.current.style.transform = `translate(${currentX}px, ${currentY}px)`;
      }
      frameId = requestAnimationFrame(tick);
    };
    
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [id]);

  const p = useStore(state => state.players[id]);
  const isLocal = useStore(state => state.localId === id);
  const stream = useStore(state => isLocal ? state.localStream : state.remoteStreams[id]);
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!p) return null;

  return (
    <div 
      ref={playerRef} 
      className="absolute top-0 left-0 z-10"
      style={{ width: '0', height: '0' }}
    >
      <div className="absolute flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2" style={{ width: '100px', height: '140px' }}>
        {/* Video Bubble directly above avatar! */}
        {stream && (
          <div className="absolute -top-16 w-20 h-20 rounded-full overflow-hidden border-2 shadow-lg border-indigo-400 bg-zinc-800">
             <video ref={videoRef} autoPlay playsInline muted={isLocal} className="w-full h-full object-cover" />
          </div>
        )}
        
        {/* Raised Hand Indicator */}
        {p.handRaised && (
           <div className="absolute -top-6 text-2xl animate-bounce drop-shadow-md z-20">
              ✋
           </div>
        )}

        {/* Live Reaction Particles */}
        {p.reaction && (
           <div className="absolute -top-12 text-4xl animate-ping drop-shadow-lg z-30 opacity-75">
              {p.reaction}
           </div>
        )}

        {/* Avatar Graphic */}
        <div 
           className="w-8 h-8 rounded-full border border-white shadow-md flex items-center justify-center font-bold text-xs text-white"
           style={{ backgroundColor: isLocal ? '#4f46e5' : `#${p.color || '555'}` }}
        ></div>
        
        {/* Name Label */}
        <div className="mt-1 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap">
          {p.seatId ? `${p.id.substring(0, 4)} (Sitting)` : (isLocal ? 'You' : p.id.substring(0, 4))}
        </div>
      </div>
    </div>
  );
};
