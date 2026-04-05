import React, { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { useStore } from '../store/useStore';
import { socket } from '../socket';

const SPEED = 5;
const LERP_FACTOR = 0.2; // interpolation factor

export const PixiCanvas = () => {
  const containerRef = useRef(null);
  const appRef = useRef(null);
  const viewportRef = useRef(null);
  const playerSprites = useRef({});
  const keys = useRef({});
  const lastEmitTime = useRef(0);

  useEffect(() => {
    let isDestroyed = false;

    // Track keyboard input
    const onKeyDown = (e) => { keys.current[e.key.toLowerCase()] = true; };
    const onKeyUp = (e) => { keys.current[e.key.toLowerCase()] = false; };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    const initPixi = async () => {
      const app = new PIXI.Application();
      await app.init({
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0x16171d,
        resizeTo: window,
      });

      if (isDestroyed) {
        app.destroy(true);
        return;
      }
      
      appRef.current = app;
      if (containerRef.current) {
        containerRef.current.appendChild(app.canvas);
      }

      // Create viewport
      const viewport = new Viewport({
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        worldWidth: 2000,
        worldHeight: 2000,
        events: app.renderer.events 
      });
      viewportRef.current = viewport;
      app.stage.addChild(viewport);

      // activate viewport plugins
      viewport.drag().pinch().wheel().decelerate();

      // Draw Map Background
      try {
        const texture = await PIXI.Assets.load('/office_map.png');
        const mapSprite = new PIXI.Sprite(texture);
        mapSprite.width = 2000;
        mapSprite.height = 2000;
        viewport.addChild(mapSprite);
      } catch (e) {
        console.error("Map load failed", e);
        const grid = new PIXI.Graphics();
        for (let i = 0; i <= 2000; i += 100) {
          grid.moveTo(i, 0).lineTo(i, 2000);
          grid.moveTo(0, i).lineTo(2000, i);
        }
        grid.stroke({ width: 1, color: 0x2e303a });
        viewport.addChild(grid);
      }

      // The game loop
      app.ticker.add((ticker) => {
        const state = useStore.getState();
        const localId = state.localId;
        const players = state.players;

        // Sync player sprites from state
        Object.values(players).forEach(p => {
          let sprite = playerSprites.current[p.id];
          if (!sprite) {
             sprite = new PIXI.Container();
             
             const circle = new PIXI.Graphics();
             circle.circle(0, 0, 20);
             circle.fill({ color: p.id === localId ? 0xaa3bff : 0x00aaff });
             circle.stroke({ width: 2, color: 0xffffff });
             sprite.addChild(circle);
             
             // Setup text label
             const label = new PIXI.Text({ text: p.id.substring(0, 4), style: { fill: 0xffffff, fontSize: 12 } });
             label.anchor.set(0.5, 2.5);
             sprite.addChild(label);

             sprite.x = p.x;
             sprite.y = p.y;
             
             viewport.addChild(sprite);
             playerSprites.current[p.id] = sprite;
             
             if(p.id === localId) {
                viewport.follow(sprite);
             }
          }

          if (p.id === localId) {
            // Local player logic: Move using keys immediately, send to server
            let dx = 0;
            let dy = 0;
            if (keys.current['w'] || keys.current['arrowup']) dy -= Math.round(SPEED);
            if (keys.current['s'] || keys.current['arrowdown']) dy += Math.round(SPEED);
            if (keys.current['a'] || keys.current['arrowleft']) dx -= Math.round(SPEED);
            if (keys.current['d'] || keys.current['arrowright']) dx += Math.round(SPEED);

            if (dx !== 0 || dy !== 0) {
              const newX = Math.max(20, Math.min(2000 - 20, sprite.x + dx));
              const newY = Math.max(20, Math.min(2000 - 20, sprite.y + dy));
              
              sprite.x = newX;
              sprite.y = newY;
              
              const now = Date.now();
              if (now - lastEmitTime.current > 50) {
                lastEmitTime.current = now;
                useStore.getState().updatePlayerTarget(localId, newX, newY);
                useStore.getState().setPlayerPos(localId, newX, newY);
                socket.emit('move', { x: newX, y: newY });
              }
            }
            
            // Interaction logic
            if (keys.current['x'] || keys.current['e']) {
               const now = Date.now();
               if (!keys.current['lastInteract'] || now - keys.current['lastInteract'] > 500) {
                  keys.current['lastInteract'] = now;
                  socket.emit('interact');
               }
            }
          } else {
             // Remote player logic: LERP towards targetX, targetY
             const currentX = sprite.x;
             const currentY = sprite.y;
             
             const newX = currentX + ((p.targetX || p.x) - currentX) * LERP_FACTOR;
             const newY = currentY + ((p.targetY || p.y) - currentY) * LERP_FACTOR;
             
             sprite.x = newX;
             sprite.y = newY;
             
             // dynamically update text to show (Sitting)
             const label = sprite.getChildAt(1);
             if (label) {
                label.text = p.seatId ? `${p.id.substring(0, 4)} (Sitting)` : p.id.substring(0, 4);
             }
          }
        });

        // Sync seats graphics
        const seats = useStore.getState().seats;
        if (seats && seats.length > 0 && !app.stage.__seatsDrawn) {
           app.stage.__seatsDrawn = true;
           seats.forEach(s => {
              const seatGfx = new PIXI.Graphics();
              seatGfx.roundRect(-15, -15, 30, 30, 5);
              seatGfx.fill(0x3f3f46); // zinc-700
              seatGfx.stroke({ width: 2, color: 0xa855f7 }); // purple-500
              seatGfx.x = s.x;
              seatGfx.y = s.y;
              viewport.addChild(seatGfx);
              
              // Text "Press X"
              const lbl = new PIXI.Text({ text: 'Chair', style: { fill: 0xffffff, fontSize: 10 } });
              lbl.anchor.set(0.5, 2.5);
              seatGfx.addChild(lbl);
           });
        }

        // Cleanup disconnected players from stage
        Object.keys(playerSprites.current).forEach(id => {
          if (!players[id]) {
            const sprite = playerSprites.current[id];
            viewport.removeChild(sprite);
            sprite.destroy({ children: true });
            delete playerSprites.current[id];
          }
        });
      });
    };

    initPixi();

    return () => {
      isDestroyed = true;
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
      }
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0" />;
};
