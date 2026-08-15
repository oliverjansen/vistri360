import Marzipano from "marzipano";
import panoramaMarker from "../images/panorama-marker.png";
import React, { useEffect, useRef, useState } from "react";
import { getHotSpot, saveHotspots } from "../api/hotspotService";
import { useUploadPanoramas } from "../hooks/useUploadPanorama";
import Loading from "./Loading";
import { storageFormat } from "../utils/Formats"; 
import { getPanoramas } from "../api/PanoramaService";
import { buildHotspotPayload, validateHotspots } from "../utils/hotspotValidation";

const PanelHeading = ({ children, count }) => (
  <div className="mb-3 flex items-center justify-between">
    <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-surface/50">{children}</h2>
    {count !== undefined && <span className="text-xs text-primary">{count}</span>}
  </div>
);

const SceneTool = ({ icon, title, description, onClick }) => (
  <button type="button" onClick={onClick} className="group flex w-full items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-3 text-left transition duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/60">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">{icon}</span>
    <span><span className="block text-sm font-semibold text-white">{title}</span><span className="block text-[11px] text-surface/50">{description}</span></span>
  </button>
);

const panoramaSource = (panorama, fallback) => panorama?.image_path ? storageFormat(panorama.image_path) : fallback;

const panoramaDescription = (panorama, index = 0) => {
  if (panorama?.description) return panorama.description;
  if (panorama?.title) return panorama.title;
  if (panorama?.name) return panorama.name;

  const filename = panorama?.image_path?.split('/').pop()?.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();
  return filename || `Scene ${index + 1}`;
};

const PanoramaLibrary = ({ panoramas, activePanoramaId, isLoading, isFetching, onUpload, onSelect }) => (
  <section className="flex min-h-0 flex-1 flex-col border-t border-white/10 pt-6">
    <PanelHeading count={panoramas.length}>Panorama library</PanelHeading>
    <label className="relative flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-4 text-[11px] font-bold uppercase tracking-widest text-white transition duration-300 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 focus-within:ring-2 focus-within:ring-primary/60">
      <Loading isLoading={isLoading} />
      <span>{isLoading ? "Uploading..." : "Upload 360 view"}</span>
      <input type="file" multiple disabled={isLoading} accept="image/*" className="hidden" onChange={onUpload} />
    </label>
    <div className="panorama-scrollbar mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
      {panoramas.length === 0 ? (
        <div className="relative flex min-h-20 items-center justify-center rounded-xl border border-dashed border-white/10 px-4 text-center text-xs text-surface/40">
          <Loading isLoading={isFetching} />
          {!isFetching && "No scenes uploaded yet"}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
          {panoramas.map((panorama, index) => (
            <button type="button" key={panorama.id} onClick={() => onSelect(panorama)} className={`group overflow-hidden rounded-xl border bg-white/5 text-left transition focus:outline-none focus:ring-2 focus:ring-primary/60 ${activePanoramaId === panorama.id ? "border-primary ring-2 ring-primary/30" : "border-white/10 hover:border-primary/50"}`}>
              <img src={storageFormat(panorama.image_path)} alt={`Panorama scene ${panorama.id}`} className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105" />
              <p className="truncate px-2 pt-2 text-[9px] font-bold uppercase tracking-wider text-surface/50">{panoramaDescription(panorama, index)}</p>
              <p className={`px-2 pb-2 pt-1 text-[9px] ${activePanoramaId === panorama.id ? "text-primary" : "text-surface/40"}`}>{activePanoramaId === panorama.id ? "Active scene" : "Open scene"}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  </section>
);


const PanoramaViewer = ({ imageUrl, projectId, clientName }) => {
  const normalizedProjectId = Number(projectId);
  const hasProjectId = Number.isInteger(normalizedProjectId) && normalizedProjectId > 0;
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const sceneMapRef = useRef({}); // Stores ALL created Marzipano scenes by ID
  const viewerRef = useRef(null);
  const openControlsRef = useRef(null);
  const [panoramas, setPanoramas] = useState([]);
  const [activePanorama, setActivePanorama] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [isPanoramaFetchingLoading, setIsPanoramaFetchingLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const clickedObjectIDRef = useRef(null);
  const panoramaRef = useRef(0)
  const openHotspotPanoramaControls = useRef(null); // Store controls for each hotspot by unique_id
  const panoramasRef = useRef([]); // Store panoramas in a ref for access in event handlers without stale closures
  const activePanoramaRef = useRef(null);
  const linkHotspotRegistry = useRef({});


 const { uploadPanoramas, isLoading } = useUploadPanoramas();

  const notifySuccess = (message) => {
    setSuccessMessage(message);
    window.setTimeout(() => setSuccessMessage(""), 3500);
  };

  const createMarzipanoScene = (sceneId, imageSource) => {
    const viewer = viewerRef.current;
    if (!viewer) return null;

    if (sceneMapRef.current[sceneId]) {
      return sceneMapRef.current[sceneId];
    }

    const source = Marzipano.ImageUrlSource.fromString(imageSource);
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

    sceneMapRef.current[sceneId] = sceneInstance;
    return sceneInstance;
  };
  
  useEffect(() => {
    if (!containerRef.current || !hasProjectId) return;
    let cancelled = false;

    const viewerOpts = {
      controls: { mouseViewMode: "drag", dragSpeed: 0.6, zoomSpeed: 0.6 },
      stageType: "webgl",
    };

    const viewer = new Marzipano.Viewer(containerRef.current, viewerOpts);
    viewerRef.current = viewer;

    sceneMapRef.current = {};

    const handleStageClick = () => {
      if (openControlsRef.current) {
        openControlsRef.current.style.display = 'none';
        openControlsRef.current = null;
      }

      if(openHotspotPanoramaControls.current){
        openHotspotPanoramaControls.current.style.display = 'none';
        const openImageWrapper = openHotspotPanoramaControls.current.querySelector('.hotspot-image-wrapper');
        if (openImageWrapper) openImageWrapper.style.display = 'none';
        openHotspotPanoramaControls.current = null;
      }
    };

    const stageElement = viewer.domElement();
    stageElement.addEventListener('click', handleStageClick);

    const initializeData = async () => {
      try {
        const loadedPanoramas = await handleGetPanoramas();
        if (cancelled) return;
        const firstPanorama = loadedPanoramas?.[0] ?? null;
        const firstSceneId = firstPanorama ? `panorama-${firstPanorama.id}` : 'fallback-scene';
        const firstScene = createMarzipanoScene(firstSceneId, panoramaSource(firstPanorama, imageUrl));

        if (!firstScene) return;

        firstScene.switchTo({ transitionDuration: 400 });
        sceneRef.current = firstScene;
        panoramaRef.current = firstPanorama?.id ?? 1;
        activePanoramaRef.current = firstPanorama;
        setActivePanorama(firstPanorama);

        await handleGetHotspots(firstPanorama?.id, () => cancelled);
      } catch (error) {
        console.error("Initialization error:", error);
      }
    };

    initializeData();

    return () => {
      cancelled = true;
      stageElement.removeEventListener('click', handleStageClick);
      viewer.destroy();
    };
  }, [imageUrl, hasProjectId, normalizedProjectId]);

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

  // This is the absolute center of where the camera is pointing
  addHotspot(centerCoords,'INFO');
  
};

const spawnLinkHotspotAtCenter = () => {
  const activeScene = sceneRef.current;
  if (!activeScene) return;

  // INSTEAD of calculating pixels, just ask the VIEW where it is looking right now
  const view = activeScene.view();
  const centerCoords = {
    yaw: view.yaw(),
    pitch: view.pitch()
  };

  // This is the absolute center of where the camera is pointing
  addHotspot(centerCoords, 'LINK');
};


const addHotspot = (coords, hotspotType = 'INFO') => {

  
  const activeScene = sceneRef.current;
  const viewer = viewerRef.current;
  const unique_id = coords.unique_id ?? Date.now();

  let newHotspot = { ...coords, unique_id};

  if (!activeScene || !viewer) return;

  const container = activeScene.hotspotContainer();
  const anchor = document.createElement('div');
  anchor.className = 'hotspot-anchor';

  const visual = document.createElement('div');
  visual.className = 'hotspot-visual';

  // These need to be accessible to the dragging logic later
  let hotspotObject;
  let interactionElement; // The thing the user clicks to drag (img or button)
  // --- TYPE: STANDARD HOTSPOT ---
  if (hotspotType === 'INFO') {

    newHotspot = { ...newHotspot, type: 'INFO' };

    const controlsWrapper = document.createElement('div');
    controlsWrapper.className = 'hotspot-toolbar';
    controlsWrapper.style.display = 'none';

    const editBtn = document.createElement('button');
    editBtn.className = 'hotspot-btn edit-btn';
    editBtn.innerHTML = '✎';

    editBtn.type = 'button';
    editBtn.title = 'Edit hotspot';
    editBtn.setAttribute('aria-label', 'Edit hotspot');
    editBtn.innerHTML = '&#9998;';

    const delBtn = document.createElement('button');
    delBtn.className = 'hotspot-btn del-btn';
    delBtn.type = 'button';
    delBtn.title = 'Delete hotspot';
    delBtn.setAttribute('aria-label', 'Delete hotspot');
    delBtn.innerHTML = '&times;';

    controlsWrapper.appendChild(editBtn);
    controlsWrapper.appendChild(delBtn);

    const labelWrapper = document.createElement('div');
    labelWrapper.className = 'hotspot-label-wrapper';

    const title = document.createElement('input');
    title.type = 'text';
    title.className = 'hotspot-field hotspot-title';
    title.placeholder = 'Enter title...';
    title.value = newHotspot.title ?? '';
    labelWrapper.appendChild(title);

    const shortDescription = document.createElement('input');
    shortDescription.type = 'text';
    shortDescription.className = 'hotspot-field';
    shortDescription.placeholder = 'Enter description...';
    shortDescription.value = newHotspot.description ?? '';
    labelWrapper.appendChild(shortDescription);

    const img = document.createElement('img');
    img.src = panoramaMarker;
    img.className = 'hotspot-img';

    visual.appendChild(controlsWrapper);
    visual.appendChild(labelWrapper);
    visual.appendChild(img);

    // Interaction Logic for Standard Hotspot
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!didMove) {
        if (openControlsRef.current && openControlsRef.current !== controlsWrapper) {
          openControlsRef.current.style.display = 'none';
        }
        const isHidden = controlsWrapper.style.display === 'none';
        controlsWrapper.style.display = isHidden ? 'flex' : 'none';
        openControlsRef.current = isHidden ? controlsWrapper : null;
        
        //ref for current selected object
        clickedObjectIDRef.current = { ...hotspotObject.position(), unique_id };
      }
    });

    delBtn.onclick = (e) => {
      e.stopPropagation();
      removeHotspotHook(hotspotObject);
      container.destroyHotspot(hotspotObject);
      if (openControlsRef.current === controlsWrapper) openControlsRef.current = null;
    };

    [title, controlsWrapper].forEach(el => {
      el.addEventListener('click', (e) => e.stopPropagation());
      el.addEventListener('mousedown', (e) => e.stopPropagation());
    });

    title.addEventListener('input', (event) => {
      updateInfoHotspot(newHotspot.unique_id, 'title', event.target.value);
    });

    shortDescription.addEventListener('input', (event) => {
      updateInfoHotspot(newHotspot.unique_id, 'description', event.target.value);
    });

    interactionElement = img; // We drag by the image

  } else if (hotspotType === 'LINK') {// --- TYPE: LINK HOTSPOT ---
    
   newHotspot = { ...newHotspot, type: 'LINK' };
    let currentRotation = newHotspot.rotation  ?? 0; // Default rotation is 0 if not set

    const controlsWrapper  = document.createElement('div');
    controlsWrapper.className = 'hotspot-toolbar';
    controlsWrapper.style.display = 'none';

    const linkNavigation = document.createElement('button');
    linkNavigation.className = 'hotspot-link-navigation';
    linkNavigation.type = 'button';
    linkNavigation.title = 'Open room connection';
    linkNavigation.setAttribute('aria-label', 'Open room connection');
    linkNavigation.style.transform = `rotate(${currentRotation}deg)`;

    linkNavigation.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3.5" stroke="currentColor" class="hotspot-link-icon">
        <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
      </svg>
    `;

    const editBtn = document.createElement('button');
    editBtn.className = 'hotspot-btn edit-btn';
    editBtn.innerHTML = '✎';

    editBtn.type = 'button';
    editBtn.title = 'Edit connection';
    editBtn.setAttribute('aria-label', 'Edit connection');
    editBtn.innerHTML = '&#9998;';

    const delBtn = document.createElement('button');
    delBtn.className = 'hotspot-btn del-btn';
    delBtn.type = 'button';
    delBtn.title = 'Delete connection';
    delBtn.setAttribute('aria-label', 'Delete connection');
    delBtn.innerHTML = '&times;';
    const rotateLeftBtn = document.createElement('button');
    rotateLeftBtn.className = 'hotspot-btn rotate-btn';
    rotateLeftBtn.innerHTML = '⤾';

    const rotateRightBtn = document.createElement('button');
    rotateRightBtn.className = 'hotspot-btn rotate-btn';
    rotateRightBtn.innerHTML = '⤿';

    rotateLeftBtn.type = 'button';
    rotateLeftBtn.title = 'Rotate left';
    rotateLeftBtn.setAttribute('aria-label', 'Rotate left');
    rotateLeftBtn.innerHTML = '&#8634;';
    rotateRightBtn.type = 'button';
    rotateRightBtn.title = 'Rotate right';
    rotateRightBtn.setAttribute('aria-label', 'Rotate right');
    rotateRightBtn.innerHTML = '&#8635;';

    let selectedNextSceneId = newHotspot.next_scene_id ?? null;
    let selectedNextScenePath = newHotspot.next_scene_path ?? null;

    //next scene
    const nextSceneBtn = document.createElement('button');
    nextSceneBtn.className = 'hotspot-btn next-scene-btn';
    nextSceneBtn.title = 'Go to selected scene';
    nextSceneBtn.disabled = !selectedNextScenePath;
    nextSceneBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" width="18" height="18">
        <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
      </svg>
    `;

    nextSceneBtn.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();

      if (!selectedNextScenePath) {
        console.warn('Select an image before going to the next scene.');
        return;
      }

      const selectedPanorama = panoramasRef.current.find((panorama) =>
        (selectedNextSceneId && String(panorama.id) === String(selectedNextSceneId)) ||
        storageFormat(panorama.image_path) === selectedNextScenePath
      );

      if (selectedPanorama) {
        handleSelectPanorama(selectedPanorama);
      } else {
        const nextScene = createMarzipanoScene(`linked-scene-${unique_id}-${selectedNextScenePath}`, selectedNextScenePath);
        if (!nextScene) return;
        nextScene.switchTo({ transitionDuration: 700 });
        sceneRef.current = nextScene;
      }

      controlsWrapper.style.display = 'none';
      ImagesContainer.style.display = 'none';
      imageWrapper.style.display = 'none';
      openControlsRef.current = null;
      openHotspotPanoramaControls.current = null;
    };

    rotateLeftBtn.onclick = (e) => {
      e.stopPropagation();
      currentRotation = (currentRotation - 30);
      linkNavigation.style.transform = `rotate(${currentRotation}deg)`;
      handleLinkHotspotRotation(clickedObjectIDRef.current.unique_id, currentRotation);
    };

    rotateRightBtn.onclick = (e) => {
      e.stopPropagation();
      currentRotation = (currentRotation + 30);
      linkNavigation.style.transform = `rotate(${currentRotation}deg)`;
      handleLinkHotspotRotation(clickedObjectIDRef.current.unique_id, currentRotation);
    }

    delBtn.onclick = (e) => {
      e.stopPropagation();
      removeHotspotHook(hotspotObject);
      container.destroyHotspot(hotspotObject);
      if (openControlsRef.current === controlsWrapper) openControlsRef.current = null;
    };

    //images 
    const ImagesContainer  = document.createElement('div');
    ImagesContainer.className = 'hotspot-toolbar-images';
    ImagesContainer.style.display = 'none';

      //create image wrapper
      const imageWrapper = document.createElement('div');
      imageWrapper.className = 'hotspot-image-wrapper';
      imageWrapper.style.display = 'none'; // Start hidden until the user clicks the link hotspot

      linkHotspotRegistry.current[unique_id] = imageWrapper;

     const allPanoramas = panoramas.length > 0 ? panoramas : panoramasRef.current; // Use the ref as the source of truth for panoramas
 
      const images = allPanoramas.map((panorama) => {
          const image = document.createElement('img');
          const imagePath = storageFormat(panorama.image_path);

          image.className = 'hover:scale-105 transition cursor-pointer';
          image.key = panorama.id;
          image.src = imagePath;
          image.dataset.imagePath = imagePath;
          image.dataset.panoramaId = String(panorama.id);

          if ((selectedNextSceneId && String(panorama.id) === String(selectedNextSceneId)) || imagePath === selectedNextScenePath) {
            image.classList.add('selected-panorama-image');
          }
      
          return image;
      });

      images.forEach(image => {        
        imageWrapper.appendChild(image);
      });
      
      ImagesContainer.appendChild(imageWrapper);

      ImagesContainer.addEventListener('click', (e) => {
        const clickedImage = e.target.closest('img');
        if (!clickedImage || !ImagesContainer.contains(clickedImage)) return;

        e.stopPropagation();
        selectedNextScenePath = clickedImage.dataset.imagePath || clickedImage.src;
        selectedNextSceneId = clickedImage.dataset.panoramaId || null;
        nextSceneBtn.disabled = false;
        nextSceneBtn.dataset.selectedImagePath = selectedNextScenePath;
        nextSceneBtn.dataset.selectedPanoramaId = selectedNextSceneId || '';

        imageWrapper.querySelectorAll('img').forEach((image) => {
          image.classList.toggle('selected-panorama-image', image === clickedImage);
        });

        setHotspots((prev) => {
          return prev.map((hotspot) => {
            if (hotspot.unique_id === unique_id) {
              return {
                ...hotspot,
                next_scene_id: selectedNextSceneId,
                next_scene_path: selectedNextScenePath,
              };
            }

            return hotspot;
          });
        });

        console.log('Selected panorama image path:', selectedNextScenePath);
      });

    
    linkNavigation.addEventListener('click', (e) => {
      e.stopPropagation();

      if (openControlsRef.current && openControlsRef.current !== controlsWrapper) {
          openControlsRef.current.style.display = 'none';
      }

      if(openHotspotPanoramaControls.current && openHotspotPanoramaControls.current !== ImagesContainer){
        openHotspotPanoramaControls.current.style.display = 'none';
        const openImageWrapper = openHotspotPanoramaControls.current.querySelector('.hotspot-image-wrapper');
        if (openImageWrapper) openImageWrapper.style.display = 'none';
      }
      
      if(!didMove){
        const isHidden = controlsWrapper.style.display === 'none';
        controlsWrapper.style.display = isHidden ? 'flex' : 'none';
        openControlsRef.current = isHidden ? controlsWrapper : null;

        const isPanoramaHidden = ImagesContainer.style.display === 'none';
        imageWrapper.style.display = isPanoramaHidden ? 'grid' : 'none'; // Track this specific hotspot's controls
        ImagesContainer.style.display = isPanoramaHidden ? 'block' : 'none';
        openHotspotPanoramaControls.current = isPanoramaHidden ? ImagesContainer : null; // Store reference to this hotspot's panorama controls
      }

      //ref for current selected object
      clickedObjectIDRef.current = { ...hotspotObject.position(), unique_id };
    });

    
    controlsWrapper.appendChild(editBtn);
    controlsWrapper.appendChild(delBtn);
    controlsWrapper.appendChild(rotateLeftBtn);
    controlsWrapper.appendChild(rotateRightBtn);
    controlsWrapper.appendChild(nextSceneBtn);

    visual.appendChild(linkNavigation);
    visual.appendChild(controlsWrapper);
    visual.appendChild(ImagesContainer);

    interactionElement = linkNavigation; // We drag by the button

  }

  anchor.appendChild(visual);
  hotspotObject = container.createHotspot(anchor, newHotspot);

  setHotspotHook({ ...newHotspot, ...hotspotObject.position(), unique_id });

  // The floating editors are controls, not part of the drag surface. Keep
  // their events away from Marzipano and away from the hotspot drag loop so
  // clicking a toolbar button can never change the saved coordinates.
  const hotspotControlSelector = '.hotspot-toolbar, .hotspot-toolbar-images, .hotspot-label-wrapper, .hotspot-field';
  const stopHotspotControlEvent = (event) => {
    if (event.target.closest(hotspotControlSelector)) {
      event.stopPropagation();
    }
  };

  ['pointerdown', 'mousedown', 'pointermove', 'mousemove', 'click', 'wheel'].forEach((eventName) => {
    visual.addEventListener(eventName, stopHotspotControlEvent);
  });

  // --- UNIVERSAL DRAGGING LOGIC ---
  let isDragging = false;
  let didMove = false;
  let dragStartPoint = null;
  const dragThreshold = 5;

  // Controls and empty space inside the visual should never move the hotspot.
  // Only the marker/link button is an intentional drag handle.
  visual.addEventListener('mousedown', (e) => {
    if (e.target !== interactionElement && !interactionElement.contains(e.target)) {
      e.stopPropagation();
    }
  });

  const onMouseMove = (e) => {
    if (!isDragging) return;
    if (e.target.closest(hotspotControlSelector)) return;

    if (!didMove && dragStartPoint) {
      const distance = Math.hypot(
        e.clientX - dragStartPoint.x,
        e.clientY - dragStartPoint.y
      );

      // A click is not a drag. Wait for a deliberate movement before
      // changing the hotspot coordinates.
      if (distance < dragThreshold) return;
      didMove = true;
      visual.classList.add('dragging');
    }

    const rect = containerRef.current.getBoundingClientRect();
    const newCoords = activeScene.view().screenToCoordinates({ 
      x: e.clientX - rect.left, 
      y: e.clientY - rect.top 
    });

    if (newCoords) hotspotObject.setPosition(newCoords);
  };

  const onMouseUp = () => {
    isDragging = false;
    dragStartPoint = null;
    visual.classList.remove('dragging');
    viewer.controls().enable();
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    setTimeout(() => { didMove = false; }, 50);
    
    //get final position after moved
    if (didMove) {
      const finalPositionafterMoved = hotspotObject.position();
      setHotspotHook({ ...finalPositionafterMoved, unique_id });
    }

  };

  interactionElement.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    isDragging = true;
    didMove = false;
    dragStartPoint = { x: e.clientX, y: e.clientY };
    viewer.controls().disable();
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  });
};

const handleFileChange = async (e) => {
  const files = Array.from(e.target.files);

  if (files.length === 0) return;

  try {

    if (!hasProjectId) {
      throw new Error("A valid project is required before uploading panoramas.");
    }

    const response = await uploadPanoramas(files, normalizedProjectId);

    setPanoramas((prev) => {
      const existingIdsArray = prev.map(item => item.id);
      const uniquenewImages = response.data.filter((image) => 
        !existingIdsArray.includes(image.id)
      );

      const updatedPanoramas = [...prev, ...uniquenewImages];
      panoramasRef.current = updatedPanoramas;
      return updatedPanoramas;
    });

    notifySuccess(`${files.length} panorama${files.length === 1 ? "" : "s"} uploaded successfully.`);

  
  } catch (error) {
    console.error(error);
  }

};

//function
const setHotspotHook = (newHotspot) => {
  if (newHotspot?.unique_id === undefined || newHotspot?.unique_id === null) return;

  setHotspots((prev) => {
    const hotspotId = String(newHotspot.unique_id);
    const exists = prev.some((hotspot) => String(hotspot.unique_id) === hotspotId);
    
    if (exists) {
      // MERGE instead of REPLACE to keep metadata (titles, links, etc.)
      return prev.map((hotspot) => (
        String(hotspot.unique_id) === hotspotId
          ? { ...hotspot, ...newHotspot, unique_id: hotspot.unique_id }
          : hotspot
      )
      );
    } 
  
    // INSERT brand new hotspot
    return [...prev, newHotspot];
  });
};

const updateInfoHotspot = (uniqueId, field, value) => {
  setHotspots((prev) => prev.map((hotspot) => (
    String(hotspot.unique_id) === String(uniqueId)
      ? { ...hotspot, [field]: value }
      : hotspot
  )));
};

const removeHotspotHook = (hotspotObject) => {
  const hotspotId = hotspotObject?.userData?.unique_id ?? clickedObjectIDRef.current?.unique_id;
  setHotspots((prev) => prev.filter((hotspot) => hotspot.unique_id !== hotspotId));
};

const handleLinkHotspotRotation = (unique_id, newRotation) => {
  setHotspots((prev) => {
      return prev.map((hotspot) => {
          if(String(hotspot.unique_id) === String(unique_id)){
            return {...hotspot, rotation: newRotation}
          }else {
            return hotspot;
          }
    })
  })
}

const handleSaveHotspot = async() => {

  try { 
   setValidationMessage("");

   if(hotspots.length > 0) {
      const uniqueHotspots = Array.from(
        new Map(
          hotspots
            .filter((hotspot) => hotspot?.unique_id !== undefined && hotspot?.unique_id !== null)
            .map((hotspot) => [String(hotspot.unique_id), hotspot])
        ).values()
      );

      const validationError = validateHotspots(uniqueHotspots);
      if (validationError) {
        setValidationMessage(validationError);
        return;
      }

      const payload = {
        hotspots: uniqueHotspots.map((hotspot) => buildHotspotPayload(
          hotspot,
          projectId,
          panoramaRef.current,
        ))
      }

      //save
      await saveHotspots(payload);
   }

   notifySuccess("Hotspot changes saved manually.");

  } catch (error) {
    console.error(error);
    throw error;
  } 

}

  // const handleGetPanoramas = async () => {
  //     try {

  //       //create payload
  //       const payload = {
  //         user_id: 1
  //       }

  //       setIsPanoramaFetchingLoading(true);
  //       const panoramaData = await getPanoramas(payload);
  //       const PanoramaImagePath = panoramaData?.data;
  //       if (PanoramaImagePath && PanoramaImagePath.length > 0) {
  //         // 1. Flatten all images from all hotspots into one single array first
  //         // We use .flatMap to handle the nested arrays
  //         const allIncomingImages = PanoramaImagePath.map(h => h || []);

  //         setPanoramas((prev) => {
  //           // 2. Get existing IDs for comparison
  //           const existingIds = new Set(prev.map(item => item.id));

  //           // 3. Filter the incoming images to find only the new ones
  //           const uniqueNewImages = allIncomingImages.filter(
  //             (img) => !existingIds.has(img.id)
  //           );

  //           // 4. Return the merged array
  //           return [...prev, ...uniqueNewImages];

  //         });

          
  //       panoramasRef.current = ; // Store in ref for access in event handlers 
  //       // without stale closures
 
  //       }

  //     } catch (error) {
  //       console.error('Error fetching the ProjectData', error);
  //     } finally{
  //       setIsPanoramaFetchingLoading(true);
  //     }
  // };

  async function handleGetPanoramas() {
  try {
    const payload = { user_id: 1, project_id: normalizedProjectId };
    setIsPanoramaFetchingLoading(true);

    const panoramaData = await getPanoramas(payload);
    const panoramaImagePath = panoramaData?.data;

    if (panoramaImagePath && panoramaImagePath.length > 0) {
      // 1. Ensure we have a clean array of images
      const allIncomingImages = panoramaImagePath.map(h => h || []);

      // 2. Use the REF as the source of truth for comparison 
      // (State might be stale, but the Ref is always current)
      const existingIds = new Set(panoramasRef.current.map(item => item.id));

      // 3. Filter for truly new images
      const uniqueNewImages = allIncomingImages.filter(
        (img) => !existingIds.has(img.id)
      );

      // 4. Create the final merged array
      const updatedFullList = [...panoramasRef.current, ...uniqueNewImages];

      // 5. UPDATE THE REF IMMEDIATELY
      // This is synchronous. Any code calling panoramasRef.current after this line
      // will see the updated data instantly.
      panoramasRef.current = updatedFullList;

      // 6. UPDATE THE STATE
      // This schedules a re-render for your Sidebar/Gallery UI.
      setPanoramas(updatedFullList);
      
      return updatedFullList; // Useful for the 'await' chain in initializeData
    }
    
    return panoramasRef.current;
  } catch (error) {
    console.error('Error fetching the ProjectData', error);
    return [];
  } finally {
    // FIX: Set to false so the loading spinner actually hides
    setIsPanoramaFetchingLoading(false); 
  }
}

  async function handleGetHotspots(panoramaId = panoramaRef.current, isCancelled = () => false) {

    try {

      const payload = {
        project_id : projectId
      };

      const hotspotsResponse = await getHotSpot(payload);
      if (isCancelled()) return;

      const response = hotspotsResponse?.data ?? [];
      const sceneHotspots = panoramaId
        ? response.filter((hotspot) => Number(hotspot.panorama_id) === Number(panoramaId))
        : response;

      setHotspots([]);

      sceneHotspots.forEach((hotspot)=> {
        if (isCancelled()) return;

        try {

          if(hotspot.details && hotspot.details !== ""){
        
            const parseDetails = typeof hotspot.details === 'string'
              ? JSON.parse(hotspot.details)
              : hotspot.details;
            addHotspot(parseDetails, parseDetails.type);
          
          }
          
        } catch (error) {
            console.error(error);
            throw error; 
        }
       
      });  
      
    } catch (error) {
      console.error(error);
      throw error;
    }    
  }

  const handleSelectPanorama = async (panorama) => {
    if (!panorama?.id || Number(activePanoramaRef.current?.id) === Number(panorama.id)) return;

    const nextScene = createMarzipanoScene(`panorama-${panorama.id}`, panoramaSource(panorama, imageUrl));
    if (!nextScene) return;

    nextScene.switchTo({ transitionDuration: 500 });
    sceneRef.current = nextScene;
    panoramaRef.current = panorama.id;
    activePanoramaRef.current = panorama;
    setActivePanorama(panorama);

    await handleGetHotspots(panorama.id);
    notifySuccess(`${panoramaDescription(panorama)} is now the active scene.`);
  };

  if (!hasProjectId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-navy p-6 text-center font-body text-white">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl">
          <h1 className="font-display text-2xl font-black">Project unavailable</h1>
          <p className="mt-2 text-sm text-surface/60">Open the scene editor from a valid project.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen w-full flex-col overflow-hidden bg-navy font-body text-surface lg:flex-row">
      {successMessage && (
        <div role="status" aria-live="polite" className="panorama-toast fixed right-4 top-4 z-[100000] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl border border-primary/40 bg-navy/95 px-4 py-3 text-sm text-white shadow-2xl shadow-navy/30 backdrop-blur-xl sm:right-6 sm:top-6">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-white">✓</span>
          <span>{successMessage}</span>
          <button type="button" aria-label="Dismiss notification" onClick={() => setSuccessMessage("")} className="ml-2 text-lg leading-none text-surface/50 transition hover:text-white">×</button>
        </div>
      )}
      {validationMessage && (
        <div role="alert" aria-live="assertive" className="panorama-toast fixed right-4 top-20 z-[100000] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl border border-red-400/40 bg-red-950/95 px-4 py-3 text-sm text-white shadow-2xl shadow-navy/30 backdrop-blur-xl sm:right-6 sm:top-20">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-xs font-black text-white">!</span>
          <span>{validationMessage}</span>
          <button type="button" aria-label="Dismiss validation message" onClick={() => setValidationMessage("")} className="ml-2 text-lg leading-none text-surface/50 transition hover:text-white">×</button>
        </div>
      )}
      {/* CONTROL RAIL */}
      <aside className="relative z-10 flex max-h-[50vh] w-full shrink-0 flex-col border-b border-white/10 bg-navy/95 p-5 shadow-2xl backdrop-blur-xl lg:h-screen lg:max-h-screen lg:w-[19rem] lg:border-b-0 lg:border-r lg:p-6">
        <div className="mb-8 flex items-center justify-between lg:block">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Vistri 360</p>
            <h1 className="font-display text-2xl font-black tracking-tight text-white">Tour studio</h1>
          </div>
          <span className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> Live
          </span>
        </div>

        <div className="mb-7 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-surface/50">Current tour</p>
          <p className="mt-2 truncate font-display text-lg font-semibold text-white">{clientName ? `${clientName} · ` : ""}{panoramaDescription(activePanorama)}</p>
          <p className="mt-1 text-xs text-surface/60">Modify this scene and connect it to the next location.</p>
        </div>

        <section className="mb-7 space-y-3">
          <PanelHeading>Add to scene</PanelHeading>
          <SceneTool onClick={spawnHotspotAtCenter} title="Information tag" description="Place a detail at center view" icon={<img src={panoramaMarker} className="h-7 w-7 object-contain transition-transform group-hover:scale-110" alt="" />} />
          <SceneTool onClick={spawnLinkHotspotAtCenter} title="Room connection" description="Link another panorama" icon={<svg className="h-5 w-5 text-white transition-transform group-hover:-translate-y-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" /></svg>} />
        </section>

        <PanoramaLibrary panoramas={panoramas} activePanoramaId={activePanorama?.id} isLoading={isLoading} isFetching={isPanoramaFetchingLoading} onUpload={handleFileChange} onSelect={handleSelectPanorama} />

        <button type="button" onClick={handleSaveHotspot} className="mt-5 w-full shrink-0 rounded-xl bg-white py-3 text-xs font-bold uppercase tracking-widest text-navy transition hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/60">Save manually</button>
      </aside>

      {/* PANORAMA STAGE */}
      <section className="relative flex min-h-[70vh] flex-1 flex-col bg-surface p-3 sm:p-5 lg:min-h-screen lg:p-8">
        <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-[1.75rem] border border-white/20 bg-navy shadow-[0_30px_100px_rgba(19,41,61,0.3)]">
          <div className="pointer-events-none absolute inset-0 z-[1] bg-linear-to-t from-navy/70 via-transparent to-navy/10" />
          <div className="pointer-events-none absolute left-5 top-5 z-[2] max-w-[calc(100%-2.5rem)] truncate rounded-full border border-white/20 bg-navy/40 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.25em] text-white/80 backdrop-blur-md">{panoramaDescription(activePanorama)} <span className="mx-2 text-primary">/</span> Active view</div>
          <div ref={containerRef} className="relative min-h-[62vh] w-full flex-1 bg-navy lg:min-h-0" />
          <div className="pointer-events-none absolute bottom-5 left-5 right-5 z-[2] flex items-end justify-between gap-4 sm:bottom-7 sm:left-7 sm:right-7"><div><p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Immersive preview</p><p className="mt-1 font-display text-xl font-semibold text-white sm:text-2xl">{panoramaDescription(activePanorama)}</p></div><span className="hidden rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs text-white/80 backdrop-blur-md sm:block">Scroll to zoom</span></div>
        </div>
        <div className="flex items-center justify-between px-1 pt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-navy/50 sm:px-2"><span>360° scene editor</span><span className="text-primary">Changes are saved manually</span></div>
      </section>
    </main>
  );
};

export default PanoramaViewer;
