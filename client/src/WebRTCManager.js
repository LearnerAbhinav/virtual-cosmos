import { socket } from './socket';
import { useStore } from './store/useStore';

const peerConnections = {}; // peerId => RTCPeerConnection

export const WebRTCManager = {
  startWebRTC: async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      useStore.getState().setLocalStream(stream);
      console.log('Got local media stream');
    } catch (e) {
      console.error('Failed to get local stream, running without camera/mic', e);
      // We don't crash, we just let the avatar load!
    }
  },

  toggleAudio: () => {
    const stream = useStore.getState().localStream;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
         audioTrack.enabled = !audioTrack.enabled;
      }
    }
  },

  toggleVideo: () => {
    const stream = useStore.getState().localStream;
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
         videoTrack.enabled = !videoTrack.enabled;
      }
    }
  },

  shareScreen: async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const currentStream = useStore.getState().localStream;
      
      const newVideoTrack = screenStream.getVideoTracks()[0];
      
      // Listen for the "stop sharing" browser button
      newVideoTrack.onended = () => {
         WebRTCManager.stopScreenShare(currentStream);
      };

      // Replace tracks in all existing peer connections
      Object.values(peerConnections).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track.kind === 'video');
        if (sender) sender.replaceTrack(newVideoTrack);
      });
      
      // Update local view
      if (currentStream) {
        currentStream.removeTrack(currentStream.getVideoTracks()[0]);
        currentStream.addTrack(newVideoTrack);
      } else {
        useStore.getState().setLocalStream(screenStream);
      }
    } catch (e) {
      console.error('Screen sharing canceled', e);
    }
  },

  stopScreenShare: async (originalStream) => {
    try {
      // Revert back to webcam
      const webcamStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const webcamTrack = webcamStream.getVideoTracks()[0];
      
      Object.values(peerConnections).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track.kind === 'video');
        if (sender) sender.replaceTrack(webcamTrack);
      });

      if (originalStream) {
        originalStream.removeTrack(originalStream.getVideoTracks()[0]);
        originalStream.addTrack(webcamTrack);
      }
    } catch (e) {
      console.error('Failed to switch back to webcam', e);
    }
  },

  createPeerConnection: (peerId) => {
    if (peerConnections[peerId]) return peerConnections[peerId];

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    peerConnections[peerId] = pc;

    // Add local stream tracks to PC
    const localStream = useStore.getState().localStream;
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc_ice', {
          target: peerId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      useStore.getState().addRemoteStream(peerId, remoteStream);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
         WebRTCManager.closeConnection(peerId);
      }
    };

    return pc;
  },

  handleProximityEnter: async (room, peers) => {
    const localId = useStore.getState().localId;
    const peerId = peers.find(id => id !== localId);
    if (!peerId) return;

    // Determine caller purely by alphabetical sorting of IDs to avoid race conditions
    const isCaller = localId > peerId;

    const pc = WebRTCManager.createPeerConnection(peerId);

    if (isCaller) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc_offer', {
        target: peerId,
        offer: offer
      });
    }
  },

  handleProximityExit: (room, peers) => {
    const localId = useStore.getState().localId;
    const peerId = peers.find(id => id !== localId);
    if (peerId) {
       WebRTCManager.closeConnection(peerId);
    }
  },

  handleOffer: async (data, senderId) => {
    const pc = WebRTCManager.createPeerConnection(senderId);
    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    socket.emit('webrtc_answer', {
      target: senderId,
      answer: answer
    });
  },

  handleAnswer: async (data, senderId) => {
    const pc = peerConnections[senderId];
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
  },

  handleICE: async (data, senderId) => {
    const pc = peerConnections[senderId];
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  },

  closeConnection: (peerId) => {
    if (peerConnections[peerId]) {
      peerConnections[peerId].close();
      delete peerConnections[peerId];
    }
    useStore.getState().removeRemoteStream(peerId);
  }
};
