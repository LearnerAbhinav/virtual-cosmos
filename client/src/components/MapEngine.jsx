import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { socket } from '../socket';
import { PlayerAvatar } from './PlayerAvatar';

const SPEED = 5;

export const MapEngine = () => {
  const mapRef = useRef(null);
  const keys = useRef({});
  const lastEmitTime = useRef(0);
  
  // React to player list changing (to render avatars)
  const players = useStore(state => state.players);
  const localId = useStore(state => state.localId);
  const seats = useStore(state => state.seats);

  const [camera, setCamera] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const onKeyDown = (e) => { keys.current[e.key.toLowerCase()] = true; };
    const onKeyUp = (e) => { keys.current[e.key.toLowerCase()] = false; };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    let frameId;
    const loop = () => {
      const state = useStore.getState();
      const localPlayer = state.players[state.localId];

      if (localPlayer) {
        let dx = 0;
        let dy = 0;
        
        // Block WASD if actively sitting
        if (!localPlayer.seatId) {
          if (keys.current['w'] || keys.current['arrowup']) dy -= SPEED;
          if (keys.current['s'] || keys.current['arrowdown']) dy += SPEED;
          if (keys.current['a'] || keys.current['arrowleft']) dx -= SPEED;
          if (keys.current['d'] || keys.current['arrowright']) dx += SPEED;
        }

        if (keys.current['x'] || keys.current['e']) {
           const now = Date.now();
           if (!keys.current['lastInteract'] || now - keys.current['lastInteract'] > 500) {
              keys.current['lastInteract'] = now;
              socket.emit('interact');
           }
        }

        // Apply movement natively updating target instead of direct teleport
        if (dx !== 0 || dy !== 0) {
          const pTargetX = localPlayer.targetX || localPlayer.x;
          const pTargetY = localPlayer.targetY || localPlayer.y;
          // When holding WASD, push the target coordinate ahead of you block by block
          const newX = Math.max(20, Math.min(2000 - 20, pTargetX + dx));
          const newY = Math.max(20, Math.min(2000 - 20, pTargetY + dy));
          
          const now = Date.now();
          if (now - lastEmitTime.current > 50) {
            lastEmitTime.current = now;
            useStore.getState().updatePlayerTarget(state.localId, newX, newY);
            socket.emit('move', { x: newX, y: newY });
          }
        }

        // Camera follow logic
        setCamera({
          x: window.innerWidth / 2 - localPlayer.x,
          y: window.innerHeight / 2 - localPlayer.y
        });
      }
      
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      cancelAnimationFrame(frameId);
    };
  }, []);

  const handleWheel = (e) => {
    // Zoom in or out based on scroll wheel
    setScale(s => Math.max(0.4, Math.min(3, s - e.deltaY * 0.002)));
  }

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = (e) => {
    // Only drag with left click or touch
    if (e.button !== 0 && e.type !== 'touchstart') return;
    setIsDragging(true);
    e.target.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (isDragging) {
      setPan(p => ({ x: p.x + e.movementX, y: p.y + e.movementY }));
    }
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    e.target.releasePointerCapture?.(e.pointerId);
  };

  const state = useStore.getState();
  const localPlayer = state.players[state.localId];

  return (
    <div 
       className="absolute inset-0 bg-[#e5e7eb] overflow-hidden" 
       style={{ zIndex: 0 }}
       onWheel={handleWheel}
       onPointerDown={handlePointerDown}
       onPointerMove={handlePointerMove}
       onPointerUp={handlePointerUp}
       onPointerCancel={handlePointerUp}
    >
      <div 
        className="absolute w-full h-full"
        style={{ 
           transform: `scale(${scale})`, 
           transformOrigin: localPlayer ? `${localPlayer.x + camera.x + pan.x}px ${localPlayer.y + camera.y + pan.y}px` : 'center center',
           transition: 'transform 0.1s ease-out'
        }}
      >
        {/* Container that pans based on Camera */}
        <div 
          ref={mapRef}
          className="absolute top-0 left-0"
          onClick={(e) => {
            // Prevent Tap-to-move if we were heavily dragging the map!
            if (isDragging) return;
            
            const rect = mapRef.current.getBoundingClientRect();
            const worldX = (e.clientX - rect.left) / scale;
            const worldY = (e.clientY - rect.top) / scale;
            const newX = Math.max(20, Math.min(2000 - 20, worldX));
            const newY = Math.max(20, Math.min(2000 - 20, worldY));
            
            useStore.getState().updatePlayerTarget(localId, newX, newY);
            socket.emit('move', { x: newX, y: newY });
            
            // Re-center camera on tap!
            setPan({ x: 0, y: 0 });
          }}
          style={{ 
            width: '2000px', height: '2000px', 
            transform: `translate(${camera.x + pan.x}px, ${camera.y + pan.y}px)`,
            willChange: 'transform',
            backgroundImage: 'url(/office_map.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            cursor: isDragging ? 'grabbing' : 'crosshair'
          }}
        >
        {/* Render interactive seats (Chairs) */}
        {seats.map(s => (
           <div 
             key={s.id} 
             className="absolute bg-zinc-400 border border-zinc-500 rounded-md shadow-sm flex items-center justify-center text-[8px] text-white font-bold"
             style={{ 
               left: s.x - 15, top: s.y - 15, width: '30px', height: '30px'
             }}
           >
             X
           </div>
        ))}

        {/* Render Players */}
        {Object.keys(players).map(id => (
          <PlayerAvatar key={id} id={id} />
        ))}
      </div>
     </div>
    </div>
  );
};
