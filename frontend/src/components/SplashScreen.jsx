import React from 'react';
import logo from '../assets/logos/Vistri Logo_Square.png';

const SplashScreen = () => {
  return (
    <div className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-white transition-opacity duration-500">
      <div className="animate-pulse">
        <img src={logo} alt="Vistri 360" className="h-70 w-auto object-contain drop-shadow-md" />
      </div>
    </div>
  );
};

export default SplashScreen;