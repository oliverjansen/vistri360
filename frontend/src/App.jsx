import React from "react";
import PanoramaViewer from "./components/PanoramaViewer";
import panoImage from "./images/sampleimage5.jpg"; // Make sure this is equirectangular

function App() {
  return (

    <div>
        <PanoramaViewer imageUrl={panoImage} />
    </div>
     
  );
}

export default App;