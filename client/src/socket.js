import { io } from 'socket.io-client';

// In production (Render), the frontend and backend are hosted on the same origin.
const URL = import.meta.env.PROD ? '/' : 'http://localhost:3000'; 

export const socket = io(URL, {
  autoConnect: true,
});
