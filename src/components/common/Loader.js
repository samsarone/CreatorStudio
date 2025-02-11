import React from 'react';
import './Loader.css'; // Import the custom CSS styles

const Loader = () => {
  return (
    <div className="loader-background flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="muted-loader mb-8"></div>
        <div className="muted-text">Loading...</div>
      </div>
    </div>
  );
};

export default Loader;
