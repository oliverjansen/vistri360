import Marzipano from "marzipano";
import panoramaMarker from "../../images/panorama-marker.png";
import React, { useEffect, useRef, useState } from "react";
import { saveHotspots } from "../../api/hotspotService";
import { useUploadPanoramas } from "../../hooks/useUploadPanorama";
import { storageFormat } from "../../utils/Formats"; 
import { getPanoramas } from "../../api/PanoramaService";
import { buildHotspotPayload, mergePanoramaRecords, mergeSceneHotspots, removeHotspotById, removeHotspotsForDestinations, validateHotspots } from "../../utils/hotspotValidation";
import PanoramaAssetLibrary from "./PanoramaAssetLibrary";
import PanoramaSceneStrip from "./PanoramaSceneStrip";
import { createShareLink } from "../../api/shareService";

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

const panoramaSource = (panorama) => panorama?.image_path ? storageFormat(panorama.image_path) : null;

const panoramaDescription = (panorama, index = 0) => {
  if (panorama?.description) return panorama.description;
  if (panorama?.title) return panorama.title;
  if (panorama?.name) return panorama.name;

  const filename = panorama?.image_path?.split('/').pop()?.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();
  return filename || `Scene ${index + 1}`;
};

const MAX_PANORAMA_FILE_SIZE = 50 * 1024 * 1024;
const SUPPORTED_PANORAMA_TYPES = new Set(["image/jpeg", "image/png"]);

const PanoramaViewer = ({ projectId, clientName }) => {
  const normalizedProjectId = Number(projectId);
  const hasProjectId = Number.isInteger(normalizedProjectId) && normalizedProjectId > 0;
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const sceneMapRef = useRef({}); // Stores ALL created Marzipano scenes by ID
  const viewerRef = useRef(null);
  const openControlsRef = useRef(null);
  const openPickerRef = useRef(null);
  const [panoramas, setPanoramas] = useState([]);
  const [selectedSceneIds, setSelectedSceneIds] = useState([]);
  const [hiddenSceneIds, setHiddenSceneIds] = useState([]);
  const [removedPanoramaIds, setRemovedPanoramaIds] = useState([]);
  const [removedDestinationIds, setRemovedDestinationIds] = useState([]);
  const [activePanorama, setActivePanorama] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [removedHotspotIds, setRemovedHotspotIds] = useState([]);
  const [isPanoramaFetchingLoading, setIsPanoramaFetchingLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportUrl, setExportUrl] = useState("");
  const [isSettingFirstScene, setIsSettingFirstScene] = useState(false);
  const clickedObjectIDRef = useRef(null);
  const panoramaRef = useRef(0)
  const panoramasRef = useRef([]); // Store panoramas in a ref for access in event handlers without stale closures
  const activePanoramaRef = useRef(null);
  const [selectedLinkHotspotId, setSelectedLinkHotspotId] = useState(null);
  const selectedLinkHotspotIdRef = useRef(null);
  const hotspotsRef = useRef([]);
  const sceneHotspotsRef = useRef({});

  const rememberSceneHotspots = (panoramaId, sceneHotspots) => {
    if (panoramaId === undefined || panoramaId === null) return;
    sceneHotspotsRef.current[String(panoramaId)] = sceneHotspots ?? [];
  };

  useEffect(() => {
    hotspotsRef.current = hotspots;
  }, [hotspots]);


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
    activePanoramaRef.current = null;
    panoramaRef.current = 0;
    hotspotsRef.current = [];
    setActivePanorama(null);
    setHotspots([]);
    setRemovedHotspotIds([]);
    setSelectedSceneIds([]);
    setHiddenSceneIds([]);
    setRemovedPanoramaIds([]);
    setRemovedDestinationIds([]);

    const handleStageClick = () => {
      if (openControlsRef.current) {
        openControlsRef.current.style.display = 'none';
        openControlsRef.current = null;
      }

    };

    const stageElement = viewer.domElement();
    stageElement.addEventListener('click', handleStageClick);

    const initializeData = async () => {
      try {
        const loadedPanoramas = await handleGetPanoramas();
        if (cancelled) return;

        const defaultPanoramaFromDatabase = loadedPanoramas?.find((panorama) => panorama.hotspot_panorama?.first_scene === true);
        if (defaultPanoramaFromDatabase) {
          await handleSelectPanorama(defaultPanoramaFromDatabase);
          return;
        }

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
  }, [hasProjectId, normalizedProjectId]);

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
      removeHotspotHook(hotspotObject, unique_id);
      if (selectedLinkHotspotIdRef.current === unique_id) {
        selectedLinkHotspotIdRef.current = null;
        setSelectedLinkHotspotId(null);
      }
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

    const ImagesContainer = document.createElement('div');
    ImagesContainer.className = 'hotspot-toolbar-images';
    ImagesContainer.style.display = 'none';

    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'hotspot-image-wrapper';
    imageWrapper.style.display = 'grid';

    const allPanoramas = panoramasRef.current.length ? panoramasRef.current : panoramas;
    allPanoramas.forEach((panorama) => {
      const image = document.createElement('img');
      const isSelected = String(newHotspot.next_panorama_id) === String(panorama.id);
      const isCurrent = Number(activePanoramaRef.current?.id) === Number(panorama.id);

      image.src = storageFormat(panorama.image_path);
      image.alt = `Select ${panoramaDescription(panorama)}`;
      image.dataset.panoramaId = String(panorama.id);
      image.className = 'panorama-scene-option';
      if (isSelected) image.classList.add('selected-panorama-image');
      if (isCurrent) image.classList.add('current-panorama-image');
      image.setAttribute('aria-label', isSelected ? 'Selected next scene' : 'Select next scene');

      image.addEventListener('click', (event) => {
        event.stopPropagation();
        if (isCurrent) return;

        const selectedPanorama = panoramasRef.current.find((item) => String(item.id) === String(image.dataset.panoramaId));
        if (selectedPanorama) {
          imageWrapper.querySelectorAll('.panorama-scene-option').forEach((option) => {
            option.classList.toggle('selected-panorama-image', option === image);
            option.setAttribute('aria-label', option === image ? 'Selected next scene' : 'Select next scene');
          });
          handleSelectNextScene(selectedPanorama);
          // A link hotspot has one destination. Close the picker after the
          // single selection; reopening it allows the destination to be replaced.
          ImagesContainer.style.display = 'none';
          if (openPickerRef.current === ImagesContainer) openPickerRef.current = null;
        }
      });

      imageWrapper.appendChild(image);
    });

    ImagesContainer.appendChild(imageWrapper);

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

    const nextSceneBtn = document.createElement('button');
    nextSceneBtn.className = 'hotspot-btn next-scene-btn';
    nextSceneBtn.type = 'button';
    nextSceneBtn.title = 'Go to selected scene';
    nextSceneBtn.setAttribute('aria-label', 'Go to selected scene');
    nextSceneBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" width="18" height="18">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
      </svg>
    `;

    nextSceneBtn.onclick = (e) => {
      e.stopPropagation();
      handleNavigateToNextScene(unique_id);
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
      removeHotspotHook(hotspotObject, unique_id);
      container.destroyHotspot(hotspotObject);
      if (openControlsRef.current === controlsWrapper) openControlsRef.current = null;
    };

    linkNavigation.addEventListener('click', (e) => {
      e.stopPropagation();

      if (openControlsRef.current && openControlsRef.current !== controlsWrapper) {
          openControlsRef.current.style.display = 'none';
      }
      if (openPickerRef.current && openPickerRef.current !== ImagesContainer) {
          openPickerRef.current.style.display = 'none';
      }

      if(!didMove){
        const isHidden = controlsWrapper.style.display === 'none';
        controlsWrapper.style.display = isHidden ? 'flex' : 'none';
        openControlsRef.current = isHidden ? controlsWrapper : null;
        const isScenePickerHidden = ImagesContainer.style.display === 'none';
        ImagesContainer.style.display = isScenePickerHidden ? 'block' : 'none';
        openPickerRef.current = isScenePickerHidden ? ImagesContainer : null;
        selectedLinkHotspotIdRef.current = unique_id;
        setSelectedLinkHotspotId(unique_id);
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
  const hotspotControlSelector = '.hotspot-toolbar, .hotspot-toolbar-images, .hotspot-image-wrapper, .panorama-scene-option, .hotspot-label-wrapper, .hotspot-field';
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

  if (files.length > 20) {
    setValidationMessage("You can upload a maximum of 20 panoramas at a time.");
    e.target.value = "";
    return;
  }

  const unsupportedFile = files.find((file) => !SUPPORTED_PANORAMA_TYPES.has(file.type));
  if (unsupportedFile) {
    setValidationMessage(`${unsupportedFile.name} is not supported. Use a JPG or PNG panorama.`);
    e.target.value = "";
    return;
  }

  const oversizedFile = files.find((file) => file.size > MAX_PANORAMA_FILE_SIZE);
  if (oversizedFile) {
    setValidationMessage(`${oversizedFile.name} is too large. Each panorama must be 50 MB or smaller.`);
    e.target.value = "";
    return;
  }

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
    setValidationMessage("");

  
  } catch (error) {
    console.error(error);
    setValidationMessage(error?.response?.data?.message || error?.message || "Panorama upload failed. Check the file type and size.");
  } finally {
    e.target.value = "";
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
      const nextHotspots = prev.map((hotspot) => (
        String(hotspot.unique_id) === hotspotId
          ? { ...hotspot, ...newHotspot, unique_id: hotspot.unique_id }
          : hotspot
      ));
      hotspotsRef.current = nextHotspots;
      rememberSceneHotspots(newHotspot.panorama_id ?? panoramaRef.current, nextHotspots);
      return nextHotspots;
    } 
  
    // INSERT brand new hotspot
    const nextHotspots = [...prev, { ...newHotspot, panorama_id: newHotspot.panorama_id ?? panoramaRef.current }];
    hotspotsRef.current = nextHotspots;
    rememberSceneHotspots(newHotspot.panorama_id ?? panoramaRef.current, nextHotspots);
    return nextHotspots;
  });
};

const updateInfoHotspot = (uniqueId, field, value) => {
  setHotspots((prev) => {
    const nextHotspots = prev.map((hotspot) => (
      String(hotspot.unique_id) === String(uniqueId)
        ? { ...hotspot, [field]: value }
        : hotspot
    ));
    hotspotsRef.current = nextHotspots;
    rememberSceneHotspots(panoramaRef.current, nextHotspots);
    return nextHotspots;
  });
};

const removeHotspotHook = (hotspotObject, fallbackId = null) => {
  const hotspotId = fallbackId
    ?? hotspotObject?.userData?.unique_id
    ?? clickedObjectIDRef.current?.unique_id;
  const remainingHotspots = removeHotspotById(hotspotsRef.current, hotspotId);

  hotspotsRef.current = remainingHotspots;
  rememberSceneHotspots(panoramaRef.current, remainingHotspots);
  setHotspots(remainingHotspots);
  setRemovedHotspotIds((previous) => Array.from(new Set([
    ...previous,
    String(hotspotId),
  ])));
};

const handleLinkHotspotRotation = (unique_id, newRotation) => {
  setHotspots((prev) => {
      const nextHotspots = prev.map((hotspot) => {
          if(String(hotspot.unique_id) === String(unique_id)){
            return {...hotspot, rotation: newRotation}
          }else {
            return hotspot;
          }
    });
    hotspotsRef.current = nextHotspots;
    rememberSceneHotspots(panoramaRef.current, nextHotspots);
    return nextHotspots;
  })
}

const handleSaveHotspot = async() => {

  try { 
   setValidationMessage("");
   setSuccessMessage("");

   // Load persisted hotspots only from the saved scene registry. Asset
   // panoramas without a hotspot_panoramas row must not contribute hotspots.
   const removedDestinationSet = new Set(removedDestinationIds.map((id) => String(id)));
   const removedPanoramaSet = new Set(removedPanoramaIds.map((id) => String(id)));
   const registryHotspots = panoramas.flatMap((panorama) => (
     panorama.hotspot_panorama?.hotspots ?? []
   )).filter((hotspot) => !removedPanoramaSet.has(String(hotspot.panorama_id ?? "")));
   const persistedHotspots = registryHotspots.map((hotspot) => {
     const details = typeof hotspot.details === "string"
       ? JSON.parse(hotspot.details || "{}")
       : (hotspot.details || {});

     return {
       ...details,
       unique_id: hotspot.unique_id,
       panorama_id: hotspot.panorama_id,
       image_id: hotspot.image_id,
       next_panorama_id: hotspot.next_panorama_id,
       type: details.type || hotspot.type,
     };
   }).filter((hotspot) => (
     !removedDestinationSet.has(String(hotspot.next_panorama_id ?? "")) &&
     !removedHotspotIds.includes(String(hotspot.unique_id))
   ));

   const currentSceneId = panoramaRef.current;
   const localSceneHotspots = {
     ...sceneHotspotsRef.current,
     [String(currentSceneId)]: hotspots,
   };
   const allRegisteredAndLocalHotspots = mergeSceneHotspots(persistedHotspots, localSceneHotspots)
     .filter((hotspot) => (
       !removedDestinationSet.has(String(hotspot.next_panorama_id ?? "")) &&
       !removedHotspotIds.includes(String(hotspot.unique_id)) &&
       !removedPanoramaSet.has(String(hotspot.panorama_id ?? ""))
     ));
   const currentById = new Map(
     hotspots
       .filter((hotspot) => hotspot?.unique_id !== undefined && hotspot?.unique_id !== null)
       .filter((hotspot) => !removedPanoramaSet.has(String(hotspot.panorama_id ?? currentSceneId)))
       .map((hotspot) => [String(hotspot.unique_id), {
         ...hotspot,
         panorama_id: hotspot.panorama_id ?? currentSceneId,
       }])
   );
   const persistedIds = new Set(allRegisteredAndLocalHotspots.map((hotspot) => String(hotspot.unique_id)));

   const allHotspots = allRegisteredAndLocalHotspots
     // The current scene is authoritative, including deletions made locally.
     .filter((hotspot) => Number(hotspot.panorama_id) !== Number(currentSceneId) || currentById.has(String(hotspot.unique_id)))
     .map((hotspot) => currentById.get(String(hotspot.unique_id)) || hotspot);

   currentById.forEach((hotspot, uniqueId) => {
     if (!persistedIds.has(uniqueId)) allHotspots.push(hotspot);
   });

   const uniqueHotspots = Array.from(
     new Map(allHotspots.map((hotspot) => [
       `${hotspot.panorama_id}|${hotspot.unique_id}`,
       hotspot,
     ])).values()
   );
   const validationError = validateHotspots(uniqueHotspots);
   if (validationError) {
     setValidationMessage(validationError);
     return;
   }

   const allScenesRemoved = panoramas.length > 0 && panoramas.every((panorama) => (
     hiddenSceneIds.includes(String(panorama.id))
   ));
   const firstSceneId = allScenesRemoved
     ? null
     : panoramas.find((panorama) => panorama.hotspot_panorama?.first_scene === true)?.id ?? null;
   const hotspotPanoramaIds = uniqueHotspots
     .map((hotspot) => hotspot.panorama_id)
     .filter((panoramaId) => panoramaId !== undefined && panoramaId !== null)
     .map((panoramaId) => String(panoramaId));
   const savedPanoramaIds = allScenesRemoved
     ? []
     : Array.from(new Set([
       ...selectedSceneIds,
       ...hotspotPanoramaIds,
       ...(firstSceneId ? [String(firstSceneId)] : []),
     ])).filter((sceneId) => !hiddenSceneIds.includes(String(sceneId)));
   const hotspotPayloads = uniqueHotspots.map((hotspot) => buildHotspotPayload(
     hotspot,
     projectId,
     hotspot.panorama_id ?? currentSceneId,
   ));
   const panoramaPayload = Object.fromEntries(savedPanoramaIds.map((panoramaId) => [
     String(panoramaId),
     hotspotPayloads
       .filter((hotspot) => String(hotspot.panorama_id) === String(panoramaId))
       .map((hotspot) => ({ hotspot })),
   ]));

   await saveHotspots({
     project_id: projectId,
     first_scene_id: firstSceneId,
     panorama: panoramaPayload,
     remove_panorama_ids: removedPanoramaIds,
     remove_next_panorama_ids: removedDestinationIds,
   });

   notifySuccess("Hotspot changes saved manually.");

  } catch (error) {
    console.error(error);
    throw error;
  } 

}

  const handleExport = async () => {
    if (!window.confirm("Export this tour and create a temporary public URL? The link will expire in 24 hours.")) return;
    try {
      setIsExporting(true);
      await handleSaveHotspot();
      const response = await createShareLink(normalizedProjectId);
      const frontendOrigin = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
      const url = `${frontendOrigin.replace(/\/$/, '')}/share/${response.data.token}`;
      setExportUrl(url);
      await navigator.clipboard?.writeText(url);
      notifySuccess("Tour endpoint ready. The URL was copied and will update with future saves.");
    } catch (error) {
      console.error(error);
      setValidationMessage("The tour could not be exported. Save your changes and try again.");
    } finally { setIsExporting(false); }
  };

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

      // Replace cached records with the latest API records so nested
      // hotspot_panorama/hotspots data cannot remain stale after retrieval.
      const updatedFullList = mergePanoramaRecords(panoramasRef.current, allIncomingImages);

      // 5. UPDATE THE REF IMMEDIATELY
      // This is synchronous. Any code calling panoramasRef.current after this line
      // will see the updated data instantly.
      panoramasRef.current = updatedFullList;

      const registeredSceneIds = updatedFullList
        .filter((panorama) => panorama.hotspot_panorama)
        .map((panorama) => String(panorama.id));
      setSelectedSceneIds(registeredSceneIds);

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

      if (isCancelled()) return;

      const registeredPanorama = panoramasRef.current.find((panorama) => (
        Number(panorama.id) === Number(panoramaId)
      ));
      const registeredHotspots = registeredPanorama?.hotspot_panorama?.hotspots ?? [];
      const response = registeredPanorama?.hotspot_panorama
        ? registeredHotspots
        : [];
      const projectDestinationIds = response
        .filter((hotspot) => String(hotspot.type || hotspot.details?.type || '').toUpperCase() === 'LINK' && hotspot.next_panorama_id)
        .map((hotspot) => String(hotspot.next_panorama_id));
      setSelectedSceneIds((previous) => Array.from(new Set([...previous, ...projectDestinationIds])));
      const sceneHotspots = panoramaId
        ? response.filter((hotspot) => Number(hotspot.panorama_id) === Number(panoramaId))
        : response;

      hotspotsRef.current = [];
      rememberSceneHotspots(panoramaId, []);
      setHotspots([]);

      sceneHotspots.forEach((hotspot)=> {
        if (isCancelled()) return;

        try {

          if(hotspot.details && hotspot.details !== ""){
        
            const parseDetails = typeof hotspot.details === 'string'
              ? JSON.parse(hotspot.details)
              : hotspot.details;
            addHotspot({
              ...parseDetails,
              unique_id: hotspot.unique_id,
              image_id: hotspot.image_id ?? null,
              next_panorama_id: hotspot.next_panorama_id ?? null,
              panorama_id: hotspot.panorama_id ?? panoramaId,
            }, parseDetails.type);
          
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

  const handleSelectNextScene = (panorama) => {
    const selectedId = selectedLinkHotspotIdRef.current
      ?? selectedLinkHotspotId
      ?? clickedObjectIDRef.current?.unique_id;
    const currentHotspots = hotspotsRef.current;
    const selectedHotspot = currentHotspots.find((hotspot) => String(hotspot.unique_id) === String(selectedId));
    if (!selectedHotspot || !panorama?.id) {
      setValidationMessage("Select a navigation hotspot before choosing a destination scene.");
      return;
    }

    const previousDestinationId = selectedHotspot.next_panorama_id;
    const destinationStillUsed = currentHotspots.some((hotspot) => (
      String(hotspot.unique_id) !== String(selectedId) &&
      String(hotspot.next_panorama_id ?? '') === String(previousDestinationId ?? '')
    ));

    const updatedHotspots = currentHotspots.map((hotspot) => (
      String(hotspot.unique_id) === String(selectedId)
        ? {
            ...hotspot,
            next_panorama_id: panorama.id,
          }
        : hotspot
    ));
    const validationError = validateHotspots(updatedHotspots);
    if (validationError) {
      setValidationMessage(validationError);
      return;
    }

    const uniqueHotspots = Array.from(
      new Map(updatedHotspots.map((hotspot) => [String(hotspot.unique_id), hotspot])).values()
    );

    // Keep the change local until the user presses Save manually. The strip
    // receives the updated hotspot state and displays the destination instantly.
    hotspotsRef.current = uniqueHotspots;
    rememberSceneHotspots(panoramaRef.current, uniqueHotspots);
    setHotspots(uniqueHotspots);
    setSelectedSceneIds((previous) => Array.from(new Set([
      ...previous.filter((sceneId) => destinationStillUsed || String(sceneId) !== String(previousDestinationId ?? '')),
      String(panorama.id),
    ])));
    setHiddenSceneIds((previous) => previous.filter((sceneId) => String(sceneId) !== String(panorama.id)));
    setRemovedPanoramaIds((previous) => previous.filter((sceneId) => String(sceneId) !== String(panorama.id)));
    setRemovedDestinationIds((previous) => previous.filter((sceneId) => String(sceneId) !== String(panorama.id)));
    setValidationMessage("");
  };

  const handleHideSceneFromStrip = (panorama) => {
    if (!panorama?.id) return;
    const destinationId = String(panorama.id);
    const nextHotspots = removeHotspotsForDestinations(hotspotsRef.current, [destinationId]);

    hotspotsRef.current = nextHotspots;
    rememberSceneHotspots(panoramaRef.current, nextHotspots);
    setHotspots(nextHotspots);
    setSelectedSceneIds((previous) => previous.filter((sceneId) => String(sceneId) !== destinationId));
    setHiddenSceneIds((previous) => Array.from(new Set([...previous, destinationId])));
    setRemovedPanoramaIds((previous) => Array.from(new Set([...previous, Number(panorama.id)])));
    setRemovedDestinationIds((previous) => Array.from(new Set([...previous, Number(panorama.id)])));
  };

  const handleNavigateToNextScene = async (hotspotId) => {
    const hotspot = hotspotsRef.current.find((item) => String(item.unique_id) === String(hotspotId));
    const destinationId = hotspot?.next_panorama_id;
    const destination = panoramasRef.current.find((panorama) => (
      destinationId && String(panorama.id) === String(destinationId)
    ));

    if (!destination) {
      setValidationMessage("Select a destination scene for this navigation hotspot first.");
      return;
    }

    await handleSelectPanorama(destination);
  };

  const handleSetFirstScene = () => {
    if (!activePanorama?.id) {
      setValidationMessage("Select a scene before setting it as the first scene.");
      return;
    }

    try {
      setIsSettingFirstScene(true);
      setPanoramas((previous) => previous.map((panorama) => ({
        ...panorama,
        hotspot_panorama: {
          ...(panorama.hotspot_panorama ?? {}),
          panorama_id: panorama.id,
          project_id: panorama.project_id ?? normalizedProjectId,
          first_scene: Number(panorama.id) === Number(activePanorama.id),
        },
      })));
      notifySuccess(`${panoramaDescription(activePanorama)} will be saved as the first scene.`);
    } catch (error) {
      console.error("Unable to set first scene", error);
      setValidationMessage("The first scene could not be updated. Please try again.");
    } finally { setIsSettingFirstScene(false); }
  };

  const handleSelectPanorama = async (panorama) => {
    if (!panorama?.id || Number(activePanoramaRef.current?.id) === Number(panorama.id)) return;

    if (panoramaRef.current) {
      rememberSceneHotspots(panoramaRef.current, hotspotsRef.current);
    }

    const nextScene = createMarzipanoScene(`panorama-${panorama.id}`, panoramaSource(panorama));
    if (!nextScene) return;

    nextScene.switchTo({ transitionDuration: 500 });
    sceneRef.current = nextScene;
    panoramaRef.current = panorama.id;
    activePanoramaRef.current = panorama;
    selectedLinkHotspotIdRef.current = null;
    openPickerRef.current = null;
    setActivePanorama(panorama);
    setSelectedSceneIds((previous) => Array.from(new Set([...previous, String(panorama.id)])));
    setSelectedLinkHotspotId(null);

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

        <PanoramaAssetLibrary panoramas={panoramas} hotspots={hotspots} isLoading={isLoading} isFetching={isPanoramaFetchingLoading} onUpload={handleFileChange} />

        <div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={handleSaveHotspot} className="w-full shrink-0 rounded-xl bg-white py-3 text-[10px] font-bold uppercase tracking-widest text-navy transition hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/60">Save manually</button><button type="button" onClick={handleExport} disabled={isExporting} className="w-full shrink-0 rounded-xl bg-primary py-3 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-secondary disabled:cursor-wait disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary/60">{isExporting ? "Exporting…" : "Export tour"}</button></div>
        {exportUrl && <div className="mt-3 rounded-xl border border-primary/30 bg-primary/10 p-3"><p className="text-[9px] font-bold uppercase tracking-widest text-primary">Public tour endpoint</p><a className="mt-1 block break-all text-[10px] text-white underline" href={exportUrl} target="_blank" rel="noreferrer">{exportUrl}</a><p className="mt-2 text-[9px] leading-4 text-surface/60">This same URL reflects future saved editor changes.</p></div>}
      </aside>

      {/* PANORAMA STAGE */}
      <section className="relative flex min-h-[70vh] flex-1 flex-col bg-surface p-3 sm:p-5 lg:min-h-screen lg:p-8">
        <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-[1.75rem] border border-white/20 bg-navy shadow-[0_30px_100px_rgba(19,41,61,0.3)]">
          <div className="pointer-events-none absolute inset-0 z-[1] bg-linear-to-t from-navy/70 via-transparent to-navy/10" />
          <div className="pointer-events-none absolute left-5 top-5 z-[2] max-w-[calc(100%-2.5rem)] truncate rounded-full border border-white/20 bg-navy/40 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.25em] text-white/80 backdrop-blur-md">{activePanorama ? panoramaDescription(activePanorama) : "Select a scene"}{activePanorama && <><span className="mx-2 text-primary">/</span> Active view</>}</div>
          <button type="button" onClick={handleSetFirstScene} disabled={!activePanorama || isSettingFirstScene} className="pointer-events-auto absolute right-5 top-5 z-[3] rounded-full border border-white/20 bg-navy/60 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/80 backdrop-blur-md transition hover:border-primary hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50" title="Set the active scene as the default first scene">{isSettingFirstScene ? "Saving..." : "Set as first scene"}</button>
          <div ref={containerRef} className="relative min-h-[62vh] w-full flex-1 bg-navy lg:min-h-0" />
          {!activePanorama && <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center px-6 text-center"><div className="rounded-2xl border border-white/20 bg-navy/75 px-6 py-5 shadow-2xl backdrop-blur-md"><p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">First scene required</p><p className="mt-2 text-sm text-white/80">Select your first scene from the scene strip below.</p></div></div>}
          <PanoramaSceneStrip panoramas={panoramas} hotspots={hotspots} selectedSceneIds={selectedSceneIds} hiddenSceneIds={hiddenSceneIds} activePanoramaId={activePanorama?.id} onSelect={handleSelectPanorama} onRemove={handleHideSceneFromStrip} />
          <div className="pointer-events-none absolute bottom-5 left-5 right-5 z-[2] flex items-end justify-between gap-4 sm:bottom-7 sm:left-7 sm:right-7"><div><p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Immersive preview</p><p className="mt-1 font-display text-xl font-semibold text-white sm:text-2xl">{activePanorama ? panoramaDescription(activePanorama) : "Choose a panorama to begin"}</p></div><span className="hidden rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs text-white/80 backdrop-blur-md sm:block">Scroll to zoom</span></div>
        </div>
      </section>
    </main>
  );
};

export default PanoramaViewer;
