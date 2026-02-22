import React from "react";
import PanoramaViewer from "./components/PanoramaViewer";
import panoImage from "./images/sample3.jpg"; // Make sure this is equirectangular

function App() {
  return (
    <>
 <div className="min-h-screen w-full flex items-center justify-center bg-gray-200">
      <div className="relative w-[1500px] h-[800px] rounded-lg overflow-hidden bg-black">
        <PanoramaViewer imageUrl={panoImage} />
      </div>
    </div>
     
    </>
 
  );
}

export default App;