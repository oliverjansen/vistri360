import Marzipano from "marzipano";
import redIcon from "../images/red.jpg";
import React, { useEffect, useRef } from "react";

const PanoramaViewer = ({ imageUrl }) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const viewerRef = useRef(null);
  const openControlsRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const viewerOpts = {
      controls: { mouseViewMode: "drag", dragSpeed: 0.6, zoomSpeed: 0.6 },
      stageType: "webgl",
    };

    const viewer = new Marzipano.Viewer(containerRef.current, viewerOpts);
    viewerRef.current = viewer;

    const source = Marzipano.ImageUrlSource.fromString(imageUrl);
    const levels = [
      { tileSize: 256, size: 256, fallbackOnly: true },
      { tileSize: 512, size: 512 },
      { tileSize: 512, size: 1024 },
      { tileSize: 512, size: 2048 },
      { tileSize: 512, size: 4096 },
    ];

    const geometry = new Marzipano.EquirectGeometry(levels);
    const initialView = { yaw: 90 * Math.PI / 180, pitch: -30 * Math.PI / 180, fov: 90 * Math.PI / 180 };
    const limiter = Marzipano.RectilinearView.limit.traditional(2048, (120 * Math.PI) / 180);
    const view = new Marzipano.RectilinearView(initialView, limiter);

    const sceneInstance = viewer.createScene({ source, geometry, view, pinFirstLevel: true });
    sceneInstance.switchTo({ transitionDuration: 400 });
    sceneRef.current = sceneInstance;

    const handleStageClick = () => {
      if (openControlsRef.current) {
        openControlsRef.current.style.display = 'none';
        openControlsRef.current = null;
      }
    };

    const stageElement = viewer.domElement();
    stageElement.addEventListener('click', handleStageClick);

    return () => {
      stageElement.removeEventListener('click', handleStageClick);
      viewer.destroy();
    };
  }, [imageUrl]);

  // --- NEW FUNCTION: Spawn Hotspot at Center ---
const spawnHotspotAtCenter = () => {
  const activeScene = sceneRef.current;
  if (!activeScene) return;

  // INSTEAD of calculating pixels, just ask the VIEW where it is looking right now
  const view = activeScene.view();
  const centerCoords = {
    yaw: view.yaw(),
    pitch: view.pitch()
  };

  console.log(centerCoords);
  

  // This is the absolute center of where the camera is pointing
  addHotspot(centerCoords);
};

  const addHotspot = (coords) => {
    const activeScene = sceneRef.current;
    const viewer = viewerRef.current;
    if (!activeScene || !viewer) return;

    const container = activeScene.hotspotContainer();
    const anchor = document.createElement('div');
    anchor.className = 'hotspot-anchor';

    const visual = document.createElement('div');
    visual.className = 'hotspot-visual';

    const controlsWrapper = document.createElement('div');
    controlsWrapper.className = 'hotspot-toolbar';
    controlsWrapper.style.display = 'none';

    const editBtn = document.createElement('button');
    editBtn.className = 'hotspot-btn edit-btn';
    editBtn.innerHTML = '✎';

    const delBtn = document.createElement('button');
    delBtn.className = 'hotspot-btn del-btn';
    delBtn.innerHTML = '✖';

    controlsWrapper.appendChild(editBtn);
    controlsWrapper.appendChild(delBtn);

    const labelWrapper = document.createElement('div');
    labelWrapper.className = 'hotspot-label-wrapper';
    const title = document.createElement('input');
    title.type = 'text';
    title.className = 'hotspot-field hotspot-title';
    title.placeholder = 'Enter title...';
    labelWrapper.appendChild(title);

    const img = document.createElement('img');
    img.src = redIcon;
    img.className = 'hotspot-img';

    visual.appendChild(controlsWrapper);
    visual.appendChild(labelWrapper);
    visual.appendChild(img);
    anchor.appendChild(visual);

    const hotspotObject = container.createHotspot(anchor, { yaw: coords.yaw, pitch: coords.pitch });

    // Keep dragging logic so they can move it AFTER it spawns
    let isDragging = false;
    let didMove = false;

    const onMouseMove = (e) => {
      if (!isDragging) return;
      didMove = true;
      const rect = containerRef.current.getBoundingClientRect();
      const newCoords = activeScene.view().screenToCoordinates({ 
        x: e.clientX - rect.left, 
        y: e.clientY - rect.top 
      });
      if (newCoords) hotspotObject.setPosition(newCoords);
    };

    const onMouseUp = () => {
      isDragging = false;
      visual.classList.remove('dragging');
      viewer.controls().enable();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setTimeout(() => { didMove = false; }, 50);
    };

    img.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      isDragging = true;
      visual.classList.add('dragging');
      viewer.controls().disable();
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });

    img.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!didMove) {
        if (openControlsRef.current && openControlsRef.current !== controlsWrapper) {
          openControlsRef.current.style.display = 'none';
        }
        const isHidden = controlsWrapper.style.display === 'none';
        controlsWrapper.style.display = isHidden ? 'flex' : 'none';
        openControlsRef.current = isHidden ? controlsWrapper : null;
      }
    });

    [title, controlsWrapper].forEach(el => {
      el.addEventListener('click', (e) => e.stopPropagation());
      el.addEventListener('mousedown', (e) => e.stopPropagation());
    });

    delBtn.onclick = (e) => {
      e.stopPropagation();
      container.destroyHotspot(hotspotObject);
      if (openControlsRef.current === controlsWrapper) openControlsRef.current = null;
    };
  };

  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh" }}>
      {/* SIDEBAR */}
      <div style={{ width: "180px", background: "#222", color: "white", padding: "15px", zIndex: 99999 }}>
        <p className="mb-4 text-sm font-bold">Add Hotspot:</p>
        <div 
          onClick={spawnHotspotAtCenter} // REPLACED: Drag with Click
          style={{ width: "60px", cursor: "pointer", border: "2px solid #3b82f6", borderRadius: "8px", padding: "5px", background: "#333" }}
          title="Click to add hotspot to center"
        >
          <img src={redIcon} style={{ width: '100%' }} alt="Red Icon" />
        </div>
        <p className="mt-2 text-xs opacity-50">Click icon to spawn at center of view</p>
      </div>

      {/* VIEWER AREA */}
      <div 
        ref={containerRef} 
        style={{ flex: 1, position: "relative", background: "#000" }}
      />
    </div>
  );
};

export default PanoramaViewer;