import { Socket } from 'socket.io-client';

// Add window interface augmentation for socket instance
declare global {
  interface Window {
    __socketInstance?: Socket;
  }
}

// ... existing types ... 