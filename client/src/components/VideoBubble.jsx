import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export const VideoBubble = ({ stream, isLocal, x, y, id, distanceScale = 1 }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Framer motion variants for smooth pop-in
  const variants = {
    hidden: { scale: 0, opacity: 0 },
    visible: { scale: distanceScale, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } },
  };

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      className={`absolute w-32 h-32 rounded-full overflow-hidden border-4 shadow-xl z-10 transition-transform ${isLocal ? 'border-purple-500' : 'border-blue-400'}`}
      style={{
        left: x,
        top: y,
        transform: `translate(-50%, -100%)`, // position above the avatar
        marginTop: '-30px',
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal} // always mute local video feedback
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-1 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full left-1/2 transform -translate-x-1/2">
        {isLocal ? 'You' : id.substring(0, 4)}
      </div>
    </motion.div>
  );
};
