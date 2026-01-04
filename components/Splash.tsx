
import React, { useEffect, useState } from 'react';

interface SplashProps {
  onComplete: () => void;
}

const Splash: React.FC<SplashProps> = ({ onComplete }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 500); // Allow fade out
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gray-900 transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      <div className="text-center">
        <h1 className="text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-green-500 to-brand-blue animate-hue-cycle select-none">
          Fotag
        </h1>
        <p className="mt-4 text-gray-400 font-light tracking-widest text-lg uppercase animate-pulse">
          Microstock Metadata AI
        </p>
      </div>
    </div>
  );
};

export default Splash;
