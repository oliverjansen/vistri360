import React, { useEffect, useRef } from "react";
import Marzipano from "marzipano";


const PanoramaViewer = ({ imageUrl }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Viewer options
 const viewerOpts = {
  controls: {
    mouseViewMode: "drag",
    dragSpeed: 0.6,   // smoother, lighter dragging
    zoomSpeed: 0.6,   // less processing per zoom frame
  },
  stageType: "webgl", // use WebGL rendering instead of CSS3D for better GPU performance
};
    const viewer = new Marzipano.Viewer(containerRef.current, viewerOpts);

    // Image source with optional preview (low-res placeholder)
    const source = Marzipano.ImageUrlSource.fromString(imageUrl);

const levels = [
  { tileSize: 256, size: 256, fallbackOnly: true }, // low-res first
  { tileSize: 512, size: 512 },
  { tileSize: 512, size: 1024 },
  { tileSize: 512, size: 2048 },
  // { tileSize: 512, size: 4096 }, // highest-res
];

    //   const geometry = new Marzipano.EquirectGeometry([{ tileSize: 512, size: 4096 }]);

      const geometry = new Marzipano.EquirectGeometry(levels);


    // Initial view
    const initialView = {
      yaw: 90 * Math.PI / 180,   // starting horizontal rotation
      pitch: -30 * Math.PI / 180, // starting vertical rotation
      fov: 90 * Math.PI / 180,    // field-of-view
    };

    // Limiter ensures smooth zoom & prevents over-zoom
    const limiter = Marzipano.RectilinearView.limit.traditional(
      2048,                 // max resolution matches highest tile
      (120 * Math.PI) / 180 // max FOV in radians
    );

    const view = new Marzipano.RectilinearView(initialView, limiter);

    // Create scene with pinned first level for smooth progressive loading
    const scene = viewer.createScene({
      source,
      geometry,
      view,
      pinFirstLevel: true,
    });

    scene.switchTo({
        transitionDuration: 400
    });

    // Cleanup on unmount
    return () => {
      try {
      if (containerRef.current) {
            scene.destroy();
            viewer.destroy();
        }
        
      } catch (err) {
        console.warn("Marzipano cleanup failed", err);
      }
    };
  }, [imageUrl]);

  return (
        <div ref={containerRef}  style={{
        width: "100%",
        height: "100vh",   // fixed height prevents layout recalculation
        overflow: "hidden",
        background: "#000"
      }}/>
  );
};

export default PanoramaViewer;