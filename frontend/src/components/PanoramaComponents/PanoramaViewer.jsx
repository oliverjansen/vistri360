import Marzipano from "marzipano";
import panoramaMarker from "../../images/panorama-marker.png";
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { saveProject } from "../../api/hotspotService";
import { storageFormat } from "../../utils/Formats"; 
import { attachPanorama, createPanoramaGroup, deletePanoramaGroup, getPanoramas, getPanoramaGroups, updatePanoramaGroup } from "../../api/PanoramaService";
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

const PanoramaViewer = ({ projectId, clientId, clientName, backToProjects }) => {
  const normalizedProjectId = Number(projectId);
  const hasProjectId = Number.isInteger(normalizedProjectId) && normalizedProjectId > 0;
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const sceneMapRef = useRef({}); // Stores ALL created Marzipano scenes by ID
  const viewerRef = useRef(null);
  const openControlsRef = useRef(null);
  const openPickerRef = useRef(null);
  const [panoramas, setPanoramas] = useState([]);
  const [assetPanoramas, setAssetPanoramas] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [newLocationName, setNewLocationName] = useState("");
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [isDeletingLocation, setIsDeletingLocation] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState(null);
  const [editingLocationName, setEditingLocationName] = useState("");
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);
  const [selectedSceneIds, setSelectedSceneIds] = useState([]);
  const [hiddenSceneIds, setHiddenSceneIds] = useState([]);
  const [removedPanoramaIds, setRemovedPanoramaIds] = useState([]);
  const [removedDestinationIds, setRemovedDestinationIds] = useState([]);
  const [activePanorama, setActivePanorama] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [removedHotspotIds, setRemovedHotspotIds] = useState([]);
  const [isPanoramaFetchingLoading, setIsPanoramaFetchingLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const [pendingLinkConfirmation, setPendingLinkConfirmation] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportUrl, setExportUrl] = useState("");
  const [isSettingFirstScene, setIsSettingFirstScene] = useState(false);
  const [isAssetLibraryHighlighted, setIsAssetLibraryHighlighted] = useState(false);
  const clickedObjectIDRef = useRef(null);
  const panoramaRef = useRef(0)
  const panoramasRef = useRef([]); // Store panoramas in a ref for access in event handlers without stale closures
  const assetPanoramasRef = useRef([]); // All project panoramas, including panoramas in other groups.
  const locationsRef = useRef([]);
  const pendingGroupRemovalsRef = useRef({});
  const pendingNavigationPanoramaIdRef = useRef(null);
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
    setAssetPanoramas([]);
    assetPanoramasRef.current = [];
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
        const [locationResult, assetResult] = await Promise.allSettled([
          getPanoramaGroups(normalizedProjectId, clientId),
          getPanoramas({ project_id: normalizedProjectId }),
        ]);

        const locationResponse = locationResult.status === "fulfilled" ? locationResult.value : null;
        const projectPanoramas = assetResult.status === "fulfilled" ? assetResult.value?.data ?? [] : [];

        if (!cancelled && locationResponse) {
          // Use the project panorama response as a fallback source for group
          // membership. This keeps the group list populated even when the
          // group endpoint returns a group without its nested panorama rows.
          const panoramasByGroup = new Map();
          projectPanoramas.forEach((panorama) => {
            (panorama.groups ?? []).forEach((group) => {
              const groupPanoramas = panoramasByGroup.get(String(group.id)) ?? [];
              groupPanoramas.push(panorama);
              panoramasByGroup.set(String(group.id), groupPanoramas);
            });
          });

          locationsRef.current = (locationResponse.data ?? []).map((group) => {
            const nestedPanoramas = group.panoramas ?? [];
            const fallbackPanoramas = panoramasByGroup.get(String(group.id)) ?? [];
            const panoramas = Array.from(new Map(
              [...nestedPanoramas, ...fallbackPanoramas].map((panorama) => [String(panorama.id), panorama])
            ).values());
            return { ...group, panoramas, panoramas_count: panoramas.length };
          });
          setLocations(locationsRef.current);
          if (locationResponse.selected_group_id) {
            setSelectedLocationId(locationResponse.selected_group_id);
          }
        }

        if (!cancelled && assetResult.status === "fulfilled") {
          assetPanoramasRef.current = projectPanoramas;
          setAssetPanoramas(projectPanoramas);
        }

        if (locationResult.status === "rejected") {
          console.error("Unable to load panorama groups:", locationResult.reason);
        }
        if (assetResult.status === "rejected") {
          console.error("Unable to load user panoramas:", assetResult.reason);
        }

      } catch (error) {
        console.error("Initialization error:", error);
      } finally {
        if (!cancelled && !selectedLocationId) setIsPanoramaFetchingLoading(false);
      }
    };

    initializeData();

    return () => {
      cancelled = true;
      stageElement.removeEventListener('click', handleStageClick);
      viewer.destroy();
    };
  }, [hasProjectId, normalizedProjectId, clientId]);

  useEffect(() => {
    if (!selectedLocationId || !viewerRef.current) return undefined;
    let cancelled = false;

    const loadLocation = async () => {
      if (panoramaRef.current) {
        rememberSceneHotspots(panoramaRef.current, hotspotsRef.current);
      }
      sceneMapRef.current = {};
      sceneRef.current = null;
      panoramaRef.current = 0;
      activePanoramaRef.current = null;
      hotspotsRef.current = [];
      setActivePanorama(null);
      setHotspots([]);
      setSelectedSceneIds([]);
      setHiddenSceneIds([]);
      setRemovedPanoramaIds([]);
      setRemovedDestinationIds([]);
      const loadedPanoramas = await handleGetPanoramas(selectedLocationId, () => cancelled);
      if (cancelled) return;
      const pendingPanoramaId = pendingNavigationPanoramaIdRef.current;
      pendingNavigationPanoramaIdRef.current = null;
      const requestedPanorama = pendingPanoramaId
        ? loadedPanoramas?.find((panorama) => Number(panorama.id) === Number(pendingPanoramaId))
        : null;
      const defaultPanorama = requestedPanorama
        ?? loadedPanoramas?.find((panorama) => panorama.hotspot_panorama?.first_scene === true)
        ?? loadedPanoramas?.[0];
      if (defaultPanorama) await handleSelectPanorama(defaultPanorama);
    };

    loadLocation().catch((error) => console.error("Unable to load panorama group", error));
    return () => { cancelled = true; };
  }, [selectedLocationId]);

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

    const loadedGroupPanoramas = locationsRef.current.flatMap((group) => group.panoramas ?? []);
    const allPanoramas = assetPanoramasRef.current.length
      ? assetPanoramasRef.current
      : Array.from(new Map([
          ...panoramasRef.current,
          ...panoramas,
          ...loadedGroupPanoramas,
        ].map((panorama) => [String(panorama.id), panorama])).values());
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

        const selectedPanorama = allPanoramas.find((item) => String(item.id) === String(image.dataset.panoramaId));
        if (selectedPanorama) {
          const belongsToCurrentGroup = selectedPanorama.groups?.some((group) => (
            Number(group.id) === Number(selectedLocationId)
          ));
          const destinationGroup = !belongsToCurrentGroup
            ? selectedPanorama.groups?.find((group) => (
                locationsRef.current.some((location) => Number(location.id) === Number(group.id))
              )) ?? locationsRef.current.find((group) => (
                (group.panoramas ?? []).some((item) => Number(item.id) === Number(selectedPanorama.id))
              ))
            : null;
          if (destinationGroup) {
            handleSelectNextScene(selectedPanorama, unique_id);
            ImagesContainer.style.display = 'none';
            if (openPickerRef.current === ImagesContainer) openPickerRef.current = null;
            return;
          }

          imageWrapper.querySelectorAll('.panorama-scene-option').forEach((option) => {
            option.classList.toggle('selected-panorama-image', option === image);
            option.setAttribute('aria-label', option === image ? 'Selected next scene' : 'Select next scene');
          });
          // Pass the hotspot that owns this picker explicitly. The global
          // selection ref can be stale after Marzipano rebuilds a hotspot.
          handleSelectNextScene(selectedPanorama, unique_id);
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
  const dragThreshold = 0;

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

      // Begin updating on the first pointer movement so the hotspot follows
      // the cursor immediately without a perceptible drag delay.
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

const handleAddLocation = async (e) => {
  e.preventDefault();
  const name = newLocationName.trim();
  if (!name || isAddingLocation) return;
  try {
    setIsAddingLocation(true);
    const response = await createPanoramaGroup(normalizedProjectId, name);
    const location = response.data;
    locationsRef.current = [...locationsRef.current, { ...location, panoramas: [] }].sort((a, b) => a.name.localeCompare(b.name));
    setLocations(locationsRef.current);
    setSelectedLocationId(location.id);
    setNewLocationName("");
    setIsAddLocationOpen(false);
    notifySuccess(`${location.name} panorama group added.`);
  } catch (error) {
    setValidationMessage(error?.data?.message || error?.message || "Unable to add panorama group.");
  } finally {
    setIsAddingLocation(false);
  }
};

const handleDeleteLocation = async (groupId = selectedLocationId) => {
  const group = locationsRef.current.find((location) => Number(location.id) === Number(groupId));
  if (!group || locationsRef.current.length <= 1 || isDeletingLocation) return;
  if (!window.confirm(`Delete "${group.name}" and its attached panoramas? This cannot be undone.`)) return;

  try {
    setIsDeletingLocation(true);
    await deletePanoramaGroup(normalizedProjectId, group.id);
    const remainingGroups = locationsRef.current.filter((location) => Number(location.id) !== Number(group.id));
    delete pendingGroupRemovalsRef.current[String(group.id)];
    locationsRef.current = remainingGroups;
    setLocations(remainingGroups);
    if (Number(group.id) === Number(selectedLocationId)) {
      setSelectedLocationId(remainingGroups[0]?.id ?? null);
    }
    setIsLocationMenuOpen(false);
    notifySuccess(`${group.name} was deleted.`);
    setValidationMessage("");
  } catch (error) {
    console.error("Unable to delete panorama group", error);
    setValidationMessage(error?.data?.message || "Unable to delete this panorama group.");
  } finally {
    setIsDeletingLocation(false);
  }
};

const handleStartEditLocation = (groupId = selectedLocationId) => {
  const group = locationsRef.current.find((location) => Number(location.id) === Number(groupId));
  if (!group) return;
  setSelectedLocationId(group.id);
  setEditingLocationId(group.id);
  setEditingLocationName(group.name ?? "");
  setIsLocationMenuOpen(false);
  setValidationMessage("");
};

const handleUpdateLocation = async (event) => {
  event.preventDefault();
  const name = editingLocationName.trim();
  if (!editingLocationId || !name || isUpdatingLocation) return;

  try {
    setIsUpdatingLocation(true);
    const response = await updatePanoramaGroup(normalizedProjectId, editingLocationId, name);
    const updatedGroup = response.data;
    locationsRef.current = locationsRef.current.map((location) => (
      Number(location.id) === Number(updatedGroup.id)
        ? { ...location, ...updatedGroup }
        : location
    ));
    setLocations(locationsRef.current);
    setEditingLocationId(null);
    setEditingLocationName("");
    notifySuccess("Panorama group renamed.");
    setValidationMessage("");
  } catch (error) {
    console.error("Unable to rename panorama group", error);
    setValidationMessage(error?.data?.message || "Unable to rename this panorama group.");
  } finally {
    setIsUpdatingLocation(false);
  }
};

const handlePanoramasUploaded = (uploadedImages, files) => {
    const existingIds = new Set(assetPanoramasRef.current.map((item) => item.id));
    const newImages = uploadedImages.filter((image) => !existingIds.has(image.id));
    setAssetPanoramas((previous) => {
      const existingAssetIds = new Set(previous.map((item) => item.id));
      const updatedAssets = [...previous, ...newImages.filter((image) => !existingAssetIds.has(image.id))];
      assetPanoramasRef.current = updatedAssets;
      return updatedAssets;
    });

    notifySuccess(`${files.length} panorama${files.length === 1 ? "" : "s"} uploaded successfully.`);
    setValidationMessage("");

  
};

const handleSelectAssetPanorama = async (panorama) => {
  if (!panorama?.id || !selectedLocationId || isPanoramaFetchingLoading) return;

  const pendingMove = Object.entries(pendingGroupRemovalsRef.current).find(([, panoramaIds]) => (
    panoramaIds.some((panoramaId) => Number(panoramaId) === Number(panorama.id))
  ));
  const pendingMoveGroupId = pendingMove?.[0] ? Number(pendingMove[0]) : null;
  // Re-adding a scene to the same group is a normal attach. Only send a
  // move source when the destination is genuinely a different group.
  const moveFromGroupId = pendingMoveGroupId && pendingMoveGroupId !== Number(selectedLocationId)
    ? pendingMoveGroupId
    : null;
  // Use the live group lists instead of the asset's nested `groups` relation,
  // which can still contain a group after the panorama was removed locally.
  const assignedToAnotherGroup = locationsRef.current.some((location) => (
    Number(location.id) !== Number(selectedLocationId) &&
    (location.panoramas ?? []).some((item) => Number(item.id) === Number(panorama.id))
  ));
  if (assignedToAnotherGroup && !moveFromGroupId) {
    setValidationMessage("This panorama is already assigned to another group in this project.");
    return;
  }

  try {
    setIsPanoramaFetchingLoading(true);
    const existingPanorama = panoramasRef.current.find((item) => (
      Number(item.id) === Number(panorama.id)
    ));
    const selectedPanorama = existingPanorama ?? (await attachPanorama(
      panorama.id,
      normalizedProjectId,
      selectedLocationId,
      false,
      moveFromGroupId,
    )).data;
    const updatedPanoramas = mergePanoramaRecords(panoramasRef.current, [selectedPanorama]);

    panoramasRef.current = updatedPanoramas;
    setPanoramas(updatedPanoramas);
    locationsRef.current = locationsRef.current.map((location) => (
      Number(location.id) === Number(selectedLocationId)
        ? { ...location, panoramas: updatedPanoramas, panoramas_count: updatedPanoramas.length }
        : location
    ));
    setLocations(locationsRef.current);
    await handleSelectPanorama(selectedPanorama);
    setValidationMessage("");
  } catch (error) {
    console.error("Unable to select panorama asset", error);
    setValidationMessage(error?.data?.message || "Unable to select this panorama.");
  } finally {
    setIsPanoramaFetchingLoading(false);
  }
};

const handleOpenAssetPicker = () => {
  const assetPanel = document.getElementById("panorama-asset-library");
  setIsAssetLibraryHighlighted(true);
  assetPanel?.scrollIntoView({ behavior: "smooth", block: "center" });
  document.getElementById("panorama-asset-filter")?.focus();
  window.setTimeout(() => setIsAssetLibraryHighlighted(false), 2200);
};

//function
const setHotspotHook = (newHotspot) => {
  if (newHotspot?.unique_id === undefined || newHotspot?.unique_id === null) return;

  const hotspotId = String(newHotspot.unique_id);
  const normalizedHotspot = {
    ...newHotspot,
    panorama_id: newHotspot.panorama_id ?? panoramaRef.current,
  };
  const existingHotspot = hotspotsRef.current.find((hotspot) => String(hotspot.unique_id) === hotspotId);
  const nextHotspots = existingHotspot
    ? hotspotsRef.current.map((hotspot) => (
        String(hotspot.unique_id) === hotspotId
          ? { ...hotspot, ...normalizedHotspot, unique_id: hotspot.unique_id }
          : hotspot
      ))
    : [...hotspotsRef.current, normalizedHotspot];

  // Keep the ref authoritative immediately. The destination picker can be
  // clicked before React has flushed the state update for a new hotspot.
  hotspotsRef.current = nextHotspots;
  rememberSceneHotspots(normalizedHotspot.panorama_id, nextHotspots);
  setHotspots(nextHotspots);
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
   // The group switch updates this ref before React state re-renders. Use it
   // for saves so a quick save after switching groups cannot submit the
   // previous group's panorama list.
   const currentGroupPanoramas = panoramasRef.current;

   // Load persisted hotspots only from the saved scene registry. Asset
   // panoramas without a panorama_hotspots row must not contribute hotspots.
   const removedDestinationSet = new Set(removedDestinationIds.map((id) => String(id)));
   const removedPanoramaSet = new Set(removedPanoramaIds.map((id) => String(id)));
   const registryHotspots = currentGroupPanoramas.flatMap((panorama) => (
     panorama.hotspot_panorama?.hotspots ?? []
   )).filter((hotspot) => !removedPanoramaSet.has(String(hotspot.panorama_id ?? "")));
   const persistedHotspots = registryHotspots.map((hotspot) => {
     return {
       type: hotspot.type,
       yaw: hotspot.yaw,
       pitch: hotspot.pitch,
       rotation: hotspot.rotation ?? 0,
       title: hotspot.title ?? "",
       description: hotspot.description ?? "",
       unique_id: hotspot.unique_id,
       panorama_id: hotspot.panorama_id,
       image_id: hotspot.image_id,
       next_panorama_id: hotspot.next_panorama_id,
     };
   }).filter((hotspot) => (
     !removedDestinationSet.has(String(hotspot.next_panorama_id ?? "")) &&
     !removedHotspotIds.includes(String(hotspot.unique_id))
   ));

   const currentSceneId = panoramaRef.current;
   const localSceneHotspots = {
     ...sceneHotspotsRef.current,
     [String(currentSceneId)]: hotspotsRef.current,
   };
   const allRegisteredAndLocalHotspots = mergeSceneHotspots(persistedHotspots, localSceneHotspots)
     .filter((hotspot) => (
       !removedDestinationSet.has(String(hotspot.next_panorama_id ?? "")) &&
       !removedHotspotIds.includes(String(hotspot.unique_id)) &&
       !removedPanoramaSet.has(String(hotspot.panorama_id ?? ""))
     ));
   const currentById = new Map(
     hotspotsRef.current
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

   const firstSceneId = currentGroupPanoramas.find((panorama) => (
     !hiddenSceneIds.includes(String(panorama.id)) && panorama.hotspot_panorama?.first_scene === true
   ))?.id ?? null;
   const hotspotPanoramaIds = uniqueHotspots
     .map((hotspot) => hotspot.panorama_id)
     .filter((panoramaId) => panoramaId !== undefined && panoramaId !== null)
     .map((panoramaId) => String(panoramaId));
   // `selectedSceneIds` also contains navigation destinations so they can be
   // highlighted in the picker. They are not necessarily scenes in the
   // current group. Sending them as empty panorama buckets makes the API
   // interpret their hotspots as deleted, which breaks cross-group links.
   // Only submit current-group scenes and panoramas that own a hotspot.
   const currentGroupSceneIds = currentGroupPanoramas
     .filter((panorama) => !hiddenSceneIds.includes(String(panorama.id)))
     .map((panorama) => String(panorama.id));
   const savedPanoramaIds = Array.from(new Set([
     ...currentGroupSceneIds,
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

   const pendingGroupRemovals = Object.entries(pendingGroupRemovalsRef.current)
     .map(([groupId, panoramaIds]) => ({
       group_id: Number(groupId),
       panorama_ids: panoramaIds.map((id) => Number(id)),
     }))
     .filter((group) => group.panorama_ids.length > 0);
   const currentGroupRemoval = selectedLocationId && removedPanoramaIds.length > 0
     ? {
         group_id: Number(selectedLocationId),
         panorama_ids: removedPanoramaIds.map((id) => Number(id)),
       }
     : null;

   await saveProject(projectId, {
     project_id: projectId,
     group_id: selectedLocationId,
     first_scene_id: firstSceneId,
     panorama: panoramaPayload,
     remove_panorama_ids: removedPanoramaIds,
     remove_panorama_groups: [
       ...pendingGroupRemovals.filter((group) => Number(group.group_id) !== Number(selectedLocationId)),
       ...(currentGroupRemoval ? [currentGroupRemoval] : []),
     ],
     remove_next_panorama_ids: removedDestinationIds,
   });

   pendingGroupRemovalsRef.current = {};

   if ((removedPanoramaIds.length > 0 || currentGroupSceneIds.length === 0) && selectedLocationId) {
     const removedIds = currentGroupSceneIds.length === 0
       ? new Set(panoramasRef.current.map((panorama) => String(panorama.id)))
       : new Set(removedPanoramaIds.map((id) => String(id)));
     const updatedGroupPanoramas = panoramasRef.current.filter((panorama) => (
       !removedIds.has(String(panorama.id))
     ));

     panoramasRef.current = updatedGroupPanoramas;
     setPanoramas(updatedGroupPanoramas);
     locationsRef.current = locationsRef.current.map((group) => (
       Number(group.id) === Number(selectedLocationId)
         ? { ...group, panoramas: updatedGroupPanoramas, panoramas_count: updatedGroupPanoramas.length }
         : group
     ));
     setLocations(locationsRef.current);
   }

   notifySuccess("Hotspot changes saved manually.");

  } catch (error) {
    console.error(error);
    const apiMessage = error?.data?.message;
    const validationErrors = error?.data?.errors
      ? Object.values(error.data.errors).flat().join(" ")
      : "";
    setValidationMessage(apiMessage || validationErrors || "The tour could not be saved. Please try again.");
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

  async function handleGetPanoramas(locationId = selectedLocationId, isCancelled = () => false) {
  try {
    if (isCancelled()) return [];
    setIsPanoramaFetchingLoading(true);

    const panoramaImagePath = locationsRef.current.find((location) => (
      Number(location.id) === Number(locationId)
    ))?.panoramas ?? [];

    if (panoramaImagePath && panoramaImagePath.length > 0) {
      if (isCancelled()) return [];
      // 1. Ensure we have a clean array of images
      const allIncomingImages = panoramaImagePath.map(h => h || []);

      // The location response is authoritative. Replacing this list prevents
      // removed scene registrations from being restored from local state.
      const updatedFullList = Array.from(
        new Map(allIncomingImages.map((panorama) => [String(panorama.id), panorama])).values()
      );
      const pendingRemovalIds = new Set(
        pendingGroupRemovalsRef.current[String(locationId)] ?? []
      );
      const visiblePanoramas = updatedFullList.filter((panorama) => (
        !pendingRemovalIds.has(String(panorama.id))
      ));

      // 5. UPDATE THE REF IMMEDIATELY
      // This is synchronous. Any code calling panoramasRef.current after this line
      // will see the updated data instantly.
      panoramasRef.current = visiblePanoramas;

      locationsRef.current = locationsRef.current.map((group) => (
        Number(group.id) === Number(locationId)
          ? {
              ...group,
              panoramas: visiblePanoramas,
              panoramas_count: visiblePanoramas.length,
            }
          : group
      ));
      setLocations(locationsRef.current);

      const registeredSceneIds = visiblePanoramas
        .filter((panorama) => panorama.hotspot_panorama)
        .map((panorama) => String(panorama.id));
      setSelectedSceneIds(registeredSceneIds);
      setHiddenSceneIds(Array.from(pendingRemovalIds));
      setRemovedPanoramaIds(Array.from(pendingRemovalIds).map((id) => Number(id)));
      setRemovedDestinationIds(Array.from(pendingRemovalIds).map((id) => Number(id)));

      // 6. UPDATE THE STATE
      // This schedules a re-render for your Sidebar/Gallery UI.
      setPanoramas(visiblePanoramas);
      
      return visiblePanoramas; // Useful for the 'await' chain in initializeData
    }
    
    if (isCancelled()) return [];
    panoramasRef.current = [];
    setPanoramas([]);
    locationsRef.current = locationsRef.current.map((group) => (
      Number(group.id) === Number(locationId)
        ? { ...group, panoramas: [], panoramas_count: 0 }
        : group
    ));
    setLocations(locationsRef.current);
    setSelectedSceneIds([]);
    return [];
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

    const activeHotspotContainer = sceneRef.current?.hotspotContainer();
    activeHotspotContainer?.listHotspots().forEach((hotspot) => {
      activeHotspotContainer.destroyHotspot(hotspot);
    });

    const registeredPanorama = panoramasRef.current.find((panorama) => (
        Number(panorama.id) === Number(panoramaId)
      )) ?? assetPanoramasRef.current.find((panorama) => (
        Number(panorama.id) === Number(panoramaId)
      ));
      const registeredHotspots = registeredPanorama?.hotspot_panorama?.hotspots ?? [];
      const hasLocalHotspots = Object.prototype.hasOwnProperty.call(
        sceneHotspotsRef.current,
        String(panoramaId)
      );
      const response = hasLocalHotspots
        ? sceneHotspotsRef.current[String(panoramaId)]
        : (registeredPanorama?.hotspot_panorama ? registeredHotspots : []);
      const projectDestinationIds = response
        .filter((hotspot) => String(hotspot.type || '').toUpperCase() === 'LINK' && hotspot.next_panorama_id)
        .map((hotspot) => String(hotspot.next_panorama_id));
      setSelectedSceneIds((previous) => Array.from(new Set([...previous, ...projectDestinationIds])));
      const sceneHotspots = panoramaId
        ? response.filter((hotspot) => Number(hotspot.panorama_id) === Number(panoramaId))
        : response;

      hotspotsRef.current = [];
      if (!hasLocalHotspots) rememberSceneHotspots(panoramaId, []);
      setHotspots([]);

      sceneHotspots.forEach((hotspot)=> {
        if (isCancelled()) return;

        try {

          const hotspotType = String(hotspot.type || "").toUpperCase();
          if (hotspotType) {
            addHotspot({
              type: hotspotType,
              yaw: hotspot.yaw,
              pitch: hotspot.pitch,
              rotation: hotspot.rotation ?? 0,
              title: hotspot.title ?? "",
              description: hotspot.description ?? "",
              unique_id: hotspot.unique_id,
              image_id: hotspot.image_id ?? null,
              next_panorama_id: hotspot.next_panorama_id ?? null,
              panorama_id: hotspot.panorama_id ?? panoramaId,
            }, hotspotType);
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

  const handleSelectNextScene = async (panorama, hotspotId = null) => {
    const selectedId = hotspotId
      ?? selectedLinkHotspotIdRef.current
      ?? selectedLinkHotspotId
      ?? clickedObjectIDRef.current?.unique_id;
    const currentHotspots = hotspotsRef.current;
    const selectedHotspot = currentHotspots.find((hotspot) => String(hotspot.unique_id) === String(selectedId));
    if (!selectedHotspot || !panorama?.id) {
      setValidationMessage("Select a navigation hotspot before choosing a destination scene.");
      return;
    }

    if (Number(panorama.id) === Number(panoramaRef.current)) {
      setValidationMessage("A panorama cannot link to itself as the next scene.");
      return;
    }

    let selectedDestination = panorama;
    let destinationIsInCurrentGroup = panoramasRef.current.some((item) => (
      String(item.id) === String(panorama.id)
    ));

    const destinationHasGroup = locationsRef.current.some((location) => (
      (location.panoramas ?? []).some((item) => String(item.id) === String(panorama.id))
    ));
    if (!destinationIsInCurrentGroup && !destinationHasGroup && selectedLocationId) {
      try {
        selectedDestination = (await attachPanorama(
          panorama.id,
          normalizedProjectId,
          selectedLocationId,
          false,
        )).data;
        const updatedPanoramas = mergePanoramaRecords(panoramasRef.current, [selectedDestination]);
        panoramasRef.current = updatedPanoramas;
        setPanoramas(updatedPanoramas);
        locationsRef.current = locationsRef.current.map((location) => (
          Number(location.id) === Number(selectedLocationId)
            ? { ...location, panoramas: updatedPanoramas, panoramas_count: updatedPanoramas.length }
            : location
        ));
        setLocations(locationsRef.current);
        destinationIsInCurrentGroup = true;
      } catch (error) {
        console.error("Unable to add next panorama to the current group", error);
        setValidationMessage(error?.data?.message || "Unable to add this panorama to the current group.");
        return;
      }
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
            next_panorama_id: selectedDestination.id,
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
    // A destination from another group is only a temporary strip reference.
    // The original panorama remains owned by its existing group and is not
    // duplicated in group_panoramas.
    setSelectedSceneIds((previous) => Array.from(new Set([
      ...previous.filter((sceneId) => destinationStillUsed || String(sceneId) !== String(previousDestinationId ?? '')),
      String(selectedDestination.id),
    ])));
    if (destinationIsInCurrentGroup) {
      // Keep the current group's strip order stable for same-group links.
      const destinationId = String(panorama.id);
      const reorderedPanoramas = [
        ...panoramasRef.current.filter((item) => String(item.id) !== destinationId),
        panoramasRef.current.find((item) => String(item.id) === destinationId) ?? selectedDestination,
      ];
      panoramasRef.current = reorderedPanoramas;
      setPanoramas(reorderedPanoramas);
      locationsRef.current = locationsRef.current.map((group) => (
        Number(group.id) === Number(selectedLocationId)
          ? { ...group, panoramas: reorderedPanoramas }
          : group
      ));
      setLocations(locationsRef.current);
      setHiddenSceneIds((previous) => previous.filter((sceneId) => String(sceneId) !== String(selectedDestination.id)));
      setRemovedPanoramaIds((previous) => previous.filter((sceneId) => String(sceneId) !== String(selectedDestination.id)));
      setRemovedDestinationIds((previous) => previous.filter((sceneId) => String(sceneId) !== String(selectedDestination.id)));
    }
    setValidationMessage("");
  };

  const confirmCrossGroupLink = async () => {
    if (!pendingLinkConfirmation) return;
    const { panorama, hotspotId, group } = pendingLinkConfirmation;
    setPendingLinkConfirmation(null);
    await handleSelectNextScene(panorama, hotspotId);

    // Keep the panorama in its original group. Only switch the editor view;
    // no group_panoramas row is created for the current group.
    if (group && Number(group.id) !== Number(selectedLocationId)) {
      rememberSceneHotspots(panoramaRef.current, hotspotsRef.current);
      pendingNavigationPanoramaIdRef.current = panorama.id;
      setSelectedLocationId(Number(group.id));
    }
  };

  const handleHideSceneFromStrip = async (panorama) => {
    if (!panorama?.id) return;
    const destinationId = String(panorama.id);
    const nextHotspots = removeHotspotsForDestinations(hotspotsRef.current, [destinationId]);
    sceneHotspotsRef.current = Object.fromEntries(
      Object.entries(sceneHotspotsRef.current).map(([sceneId, sceneHotspots]) => (
        [sceneId, removeHotspotsForDestinations(sceneHotspots, [destinationId])]
      ))
    );
    const wasActiveScene = Number(panoramaRef.current) === Number(panorama.id);
    const updatedGroupPanoramas = panoramasRef.current.filter((item) => (
      String(item.id) !== destinationId
    ));

    document.querySelectorAll(`.panorama-scene-option[data-panorama-id="${destinationId}"]`).forEach((option) => {
      option.classList.remove("selected-panorama-image");
      option.setAttribute("aria-label", "Select next scene");
    });

    hotspotsRef.current = nextHotspots;
    rememberSceneHotspots(panoramaRef.current, nextHotspots);
    setHotspots(nextHotspots);
    // Removing a scene changes its membership in the selected group, not the
    // project asset library. Update the group state immediately so the strip,
    // active scene and group count stay in sync before the manual save.
    panoramasRef.current = updatedGroupPanoramas;
    setPanoramas(updatedGroupPanoramas);
    locationsRef.current = locationsRef.current.map((group) => (
      Number(group.id) === Number(selectedLocationId)
        ? {
            ...group,
            panoramas: updatedGroupPanoramas.map((item) => item.hotspot_panorama
              ? {
                  ...item,
                  hotspot_panorama: {
                    ...item.hotspot_panorama,
                    hotspots: removeHotspotsForDestinations(item.hotspot_panorama.hotspots, [destinationId]),
                  },
                }
              : item),
            panoramas_count: updatedGroupPanoramas.length,
          }
        : {
            ...group,
            panoramas: (group.panoramas ?? []).map((item) => item.hotspot_panorama
              ? {
                  ...item,
                  hotspot_panorama: {
                    ...item.hotspot_panorama,
                    hotspots: removeHotspotsForDestinations(item.hotspot_panorama.hotspots, [destinationId]),
                  },
                }
              : item),
          }
    ));
    setLocations(locationsRef.current);
    setAssetPanoramas((previous) => {
      const updatedAssets = previous.map((asset) => ({
        ...asset,
        ...(Number(asset.id) === Number(panorama.id)
          ? { groups: (asset.groups ?? []).filter((group) => Number(group.id) !== Number(selectedLocationId)) }
          : {}),
        hotspot_panorama: asset.hotspot_panorama
          ? {
              ...asset.hotspot_panorama,
              hotspots: removeHotspotsForDestinations(asset.hotspot_panorama.hotspots, [destinationId]),
            }
          : asset.hotspot_panorama,
      }));
      assetPanoramasRef.current = updatedAssets;
      return updatedAssets;
    });
    setSelectedSceneIds((previous) => previous.filter((sceneId) => String(sceneId) !== destinationId));
    setHiddenSceneIds((previous) => Array.from(new Set([...previous, destinationId])));
    setRemovedPanoramaIds((previous) => Array.from(new Set([...previous, Number(panorama.id)])));
    setRemovedDestinationIds((previous) => Array.from(new Set([...previous, Number(panorama.id)])));
    const currentGroupKey = String(selectedLocationId);
    pendingGroupRemovalsRef.current[currentGroupKey] = Array.from(new Set([
      ...(pendingGroupRemovalsRef.current[currentGroupKey] ?? []),
      Number(panorama.id),
    ]));

    if (!wasActiveScene && panoramaRef.current) {
      await handleGetHotspots(panoramaRef.current);
    }

    if (wasActiveScene) {
      const replacementScene = updatedGroupPanoramas[0];
      if (replacementScene) {
        handleSelectPanorama(replacementScene);
      } else {
        panoramaRef.current = 0;
        activePanoramaRef.current = null;
        sceneRef.current = null;
        setActivePanorama(null);
        setHotspots([]);
      }
    }
  };

  const handleNavigateToNextScene = async (hotspotId) => {
    const loadedHotspots = [
      ...hotspotsRef.current,
      ...Object.values(sceneHotspotsRef.current).flat(),
      ...assetPanoramasRef.current.flatMap((panorama) => panorama.hotspot_panorama?.hotspots ?? []),
      ...locationsRef.current.flatMap((group) => (
        (group.panoramas ?? []).flatMap((panorama) => panorama.hotspot_panorama?.hotspots ?? [])
      )),
    ];
    const hotspot = loadedHotspots.find((item) => (
      String(item.unique_id) === String(hotspotId) &&
      (!item.panorama_id || Number(item.panorama_id) === Number(panoramaRef.current))
    ));
    const destinationId = hotspot?.next_panorama_id ?? hotspot?.details?.next_panorama_id;
    const loadedProjectPanoramas = [
      ...assetPanoramasRef.current,
      ...panoramasRef.current,
      ...locationsRef.current.flatMap((group) => group.panoramas ?? []),
    ];
    const destination = loadedProjectPanoramas.find((panorama) => (
      destinationId && String(panorama.id) === String(destinationId)
    ));

    if (!destination) {
      setValidationMessage("Select a destination scene for this navigation hotspot first.");
      return;
    }

    const destinationGroup = destination.groups?.find((group) => (
      Number(group.id) === Number(selectedLocationId)
    )) ?? destination.groups?.find((group) => (
      locationsRef.current.some((location) => Number(location.id) === Number(group.id))
    )) ?? locationsRef.current.find((group) => (
      (group.panoramas ?? []).some((panorama) => Number(panorama.id) === Number(destination.id))
    ));
    if (destinationGroup && Number(destinationGroup.id) !== Number(selectedLocationId)) {
      rememberSceneHotspots(panoramaRef.current, hotspotsRef.current);
      pendingNavigationPanoramaIdRef.current = destination.id;
      setSelectedLocationId(Number(destinationGroup.id));
      return;
    }

    await handleSelectPanorama(destination);
  };

  const handleGroupChange = (event) => {
    const nextGroupId = Number(event.target.value);
    if (!nextGroupId || nextGroupId === Number(selectedLocationId)) return;

    if (panoramaRef.current) {
      rememberSceneHotspots(panoramaRef.current, hotspotsRef.current);
    }
    pendingNavigationPanoramaIdRef.current = null;
    setSelectedLocationId(nextGroupId);
  };

  const handleSelectStripPanorama = async (panorama) => {
    const destinationGroup = panorama?.groups?.find((group) => (
      Number(group.id) === Number(selectedLocationId)
    )) ?? panorama?.groups?.find((group) => (
      locationsRef.current.some((location) => Number(location.id) === Number(group.id))
    )) ?? locationsRef.current.find((group) => (
      (group.panoramas ?? []).some((item) => Number(item.id) === Number(panorama?.id))
    ));

    if (destinationGroup && Number(destinationGroup.id) !== Number(selectedLocationId)) {
      rememberSceneHotspots(panoramaRef.current, hotspotsRef.current);
      pendingNavigationPanoramaIdRef.current = panorama.id;
      setSelectedLocationId(Number(destinationGroup.id));
      return;
    }

    await handleSelectPanorama(panorama);
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

  const linkedPanoramaIds = hotspots
    .filter((hotspot) => String(hotspot.type || '').toUpperCase() === 'LINK' && hotspot.next_panorama_id)
    .map((hotspot) => String(hotspot.next_panorama_id));
  const linkedPanoramas = linkedPanoramaIds
    .map((panoramaId) => assetPanoramas.find((panorama) => String(panorama.id) === panoramaId)
      ?? locations.flatMap((group) => group.panoramas ?? []).find((panorama) => String(panorama.id) === panoramaId))
    .filter(Boolean);
  const activePanoramaIsInCurrentGroup = panoramas.some((panorama) => (
    Number(panorama.id) === Number(activePanorama?.id)
  ));
  const stripLinkedPanoramaIds = activePanorama?.id && !activePanoramaIsInCurrentGroup
    ? Array.from(new Set([...linkedPanoramaIds, String(activePanorama.id)]))
    : linkedPanoramaIds;
  const activeStripPanorama = activePanorama && !activePanoramaIsInCurrentGroup
    ? [activePanorama]
    : [];
  const stripPanoramas = Array.from(new Map(
    [...panoramas, ...linkedPanoramas, ...activeStripPanorama].map((panorama) => [String(panorama.id), panorama])
  ).values());

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
      {pendingLinkConfirmation && (
        <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-navy/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="cross-group-link-title">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-navy p-6 text-white shadow-2xl">
            <h2 id="cross-group-link-title" className="font-display text-lg font-bold">Panorama already belongs to another group</h2>
            <p className="mt-3 text-sm leading-6 text-surface/70">
              This panorama is already added to <span className="font-semibold text-primary">{pendingLinkConfirmation.group?.name || "another group"}</span>.
              Continuing will redirect you to that group and link this panorama as the next scene without adding a duplicate.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setPendingLinkConfirmation(null)} className="rounded-xl border border-white/15 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-surface/70 transition hover:border-white/30 hover:text-white">Cancel</button>
              <button type="button" onClick={confirmCrossGroupLink} className="rounded-xl bg-primary px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-secondary">Continue</button>
            </div>
          </div>
        </div>
      )}
      {/* CONTROL RAIL */}
      <aside className="relative z-10 flex max-h-[50vh] w-full shrink-0 flex-col border-b border-white/10 bg-navy/95 p-5 shadow-2xl backdrop-blur-xl lg:h-screen lg:max-h-screen lg:w-[19rem] lg:border-b-0 lg:border-r lg:p-6">
        {backToProjects && <Link to={backToProjects} className="mb-5 inline-flex w-fit items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white transition hover:border-primary hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary/60"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>Back to projects</Link>}
        <div className="mb-7 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-surface/50">Current tour</p>
          <p className="mt-2 truncate font-display text-lg font-semibold text-white">{clientName ? `${clientName} · ` : ""}{panoramaDescription(activePanorama)}</p>
          <p className="mt-1 text-xs text-surface/60">Modify this scene and connect it to the next panorama group.</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <label htmlFor="panorama-group" className="block text-[10px] font-bold uppercase tracking-[0.2em] text-surface/50">Panorama group</label>
            <button type="button" onClick={() => { setIsAddLocationOpen((open) => !open); setIsLocationMenuOpen(false); }} className="rounded-lg border border-primary/30 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-primary transition hover:bg-primary/10">{isAddLocationOpen ? "Cancel" : "+ Add"}</button>
          </div>
          {editingLocationId ? (
            <form onSubmit={handleUpdateLocation} className="mt-2 flex items-center gap-2">
              <input autoFocus value={editingLocationName} onChange={(event) => setEditingLocationName(event.target.value)} maxLength={120} className="min-w-0 flex-1 rounded-lg border border-primary/50 bg-navy/60 px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-primary/30" aria-label="Panorama group name" />
              <button type="submit" disabled={!editingLocationName.trim() || isUpdatingLocation} className="rounded-lg border border-primary/40 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-primary disabled:opacity-40">{isUpdatingLocation ? "..." : "Save"}</button>
              <button type="button" onClick={() => setEditingLocationId(null)} className="rounded-lg border border-white/15 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white/60">Cancel</button>
            </form>
          ) : (
            <div className="relative mt-2">
              <button type="button" onClick={() => setIsLocationMenuOpen((open) => !open)} className="flex w-full items-center justify-between rounded-lg border border-white/15 bg-navy/60 px-3 py-2.5 text-left text-sm text-white outline-none transition hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/30" aria-haspopup="listbox" aria-expanded={isLocationMenuOpen}>
                <span className="min-w-0 truncate">{locations.find((location) => Number(location.id) === Number(selectedLocationId))?.name ?? "Select a panorama group"} <span className="text-white/45">({locations.find((location) => Number(location.id) === Number(selectedLocationId))?.panoramas_count ?? 0})</span></span>
                <span className={`ml-2 text-xs text-white/60 transition-transform ${isLocationMenuOpen ? "rotate-180" : ""}`} aria-hidden="true">⌄</span>
              </button>
              {isLocationMenuOpen && <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-white/15 bg-navy shadow-2xl" role="listbox" aria-label="Panorama groups">
                {locations.map((location) => {
                  const isSelected = Number(location.id) === Number(selectedLocationId);
                  return <div key={location.id} className={`flex items-center gap-2 border-b border-white/10 p-1.5 last:border-b-0 ${isSelected ? "bg-primary/10" : ""}`}>
                    <button type="button" onClick={() => { handleGroupChange({ target: { value: location.id } }); setIsLocationMenuOpen(false); }} className="min-w-0 flex-1 truncate rounded-lg px-2 py-2 text-left text-xs text-white/80 hover:bg-white/10" role="option" aria-selected={isSelected}>{location.name} <span className="text-white/40">({location.panoramas_count ?? 0})</span></button>
                    <button type="button" onClick={() => handleStartEditLocation(location.id)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-primary/25 text-xs text-primary hover:bg-primary/15" aria-label={`Edit ${location.name}`} title="Edit group">✎</button>
                    <button type="button" onClick={() => handleDeleteLocation(location.id)} disabled={locations.length <= 1 || isDeletingLocation} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-red-400/25 text-sm text-red-300 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-30" aria-label={`Delete ${location.name}`} title={locations.length <= 1 ? "At least one group is required" : "Delete group"}>×</button>
                  </div>;
                })}
              </div>}
            </div>
          )}
          {isAddLocationOpen && <form onSubmit={handleAddLocation} className="mt-2 flex gap-2">
            <input autoFocus value={newLocationName} onChange={(event) => setNewLocationName(event.target.value)} placeholder="Add a panorama group" maxLength={120} className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-surface/40 focus:border-primary" />
            <button type="submit" disabled={!newLocationName.trim() || isAddingLocation} className="rounded-lg border border-primary/40 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-40">{isAddingLocation ? "..." : "Add"}</button>
          </form>}
        </div>

        <section className="mb-7 space-y-3">
          <PanelHeading>Add to scene</PanelHeading>
          <SceneTool onClick={spawnHotspotAtCenter} title="Information tag" description="Place a detail at center view" icon={<img src={panoramaMarker} className="h-7 w-7 object-contain transition-transform group-hover:scale-110" alt="" />} />
          <SceneTool onClick={spawnLinkHotspotAtCenter} title="Room connection" description="Link another panorama" icon={<svg className="h-5 w-5 text-white transition-transform group-hover:-translate-y-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" /></svg>} />
        </section>

        <PanoramaAssetLibrary
          id="panorama-asset-library"
          panoramas={assetPanoramas}
          hotspots={hotspots}
          activePanoramaId={activePanorama?.id}
          isFetching={false}
          uploadProjectId={hasProjectId ? normalizedProjectId : null}
          uploadGroupId={selectedLocationId}
          uploadClientId={clientId}
          currentGroupPanoramas={locations.find((group) => Number(group.id) === Number(selectedLocationId))?.panoramas ?? []}
          allGroupPanoramas={locations.flatMap((group) => group.panoramas ?? [])}
          onUploaded={handlePanoramasUploaded}
          onUploadError={setValidationMessage}
          onSelect={handleSelectAssetPanorama}
          isHighlighted={isAssetLibraryHighlighted}
        />

        <div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={handleSaveHotspot} className="w-full shrink-0 rounded-xl bg-white py-3 text-[10px] font-bold uppercase tracking-widest text-navy transition hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/60">Save manually</button><button type="button" onClick={handleExport} disabled={isExporting} className="w-full shrink-0 rounded-xl bg-primary py-3 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-secondary disabled:cursor-wait disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary/60">{isExporting ? "Exporting…" : "Export tour"}</button></div>
        {exportUrl && <div className="mt-3 rounded-xl border border-primary/30 bg-primary/10 p-3"><p className="text-[9px] font-bold uppercase tracking-widest text-primary">Public tour endpoint</p><a className="mt-1 block break-all text-[10px] text-white underline" href={exportUrl} target="_blank" rel="noreferrer">{exportUrl}</a><p className="mt-2 text-[9px] leading-4 text-surface/60">This same URL reflects future saved editor changes.</p></div>}
      </aside>

      {/* PANORAMA STAGE */}
      <section className="relative flex min-h-[70vh] flex-1 flex-col bg-surface p-3 sm:p-5 lg:min-h-screen lg:p-8">
        <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-[1.75rem] border border-white/20 bg-navy shadow-[0_30px_100px_rgba(19,41,61,0.3)]">
          <div className="pointer-events-none absolute inset-0 z-[1] bg-linear-to-t from-navy/70 via-transparent to-navy/10" />
          <div className="pointer-events-none absolute left-5 top-5 z-[2] max-w-[calc(100%-2.5rem)] truncate rounded-full border border-white/20 bg-navy/40 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.25em] text-white/80 backdrop-blur-md">{activePanorama ? panoramaDescription(activePanorama) : "Select a scene"}{activePanorama && <><span className="mx-2 text-primary">/</span> Active view</>}</div>
          <button type="button" onClick={handleSetFirstScene} disabled={!activePanorama || isSettingFirstScene} className="pointer-events-auto absolute right-5 top-5 z-[3] rounded-full border border-white/20 bg-navy/60 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/80 backdrop-blur-md transition hover:border-primary hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50" title="Set the active scene as the default first scene">{isSettingFirstScene ? "Saving..." : "Set as first scene"}</button>
          {isPanoramaFetchingLoading && <div className="absolute inset-0 z-[4] overflow-hidden bg-navy/75 backdrop-blur-sm"><div className="absolute left-5 top-5 h-8 w-44 rounded-full bg-white/10 animate-pulse" /><div className="absolute right-5 top-5 h-8 w-36 rounded-full bg-white/10 animate-pulse" /><div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4 sm:inset-x-7 sm:bottom-7"><div className="w-56"><div className="h-2.5 w-28 rounded-full bg-primary/30 animate-pulse" /><div className="mt-3 h-6 w-48 rounded-lg bg-white/15 animate-pulse" /></div><div className="hidden h-9 w-28 rounded-full bg-white/10 animate-pulse sm:block" /></div><div className="absolute bottom-20 left-1/2 flex -translate-x-1/2 gap-3"><div className="h-14 w-20 rounded-xl border border-white/10 bg-white/10 animate-pulse" /><div className="h-14 w-20 rounded-xl border border-white/10 bg-white/10 animate-pulse" /><div className="h-14 w-20 rounded-xl border border-white/10 bg-white/10 animate-pulse" /></div></div>}
          <div ref={containerRef} className="relative min-h-[62vh] w-full flex-1 bg-navy lg:min-h-0" />
          {!activePanorama && <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center bg-navy px-6 text-center"><div className="rounded-2xl border border-white/20 bg-navy/75 px-6 py-5 shadow-2xl backdrop-blur-md"><p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">First scene required</p><p className="mt-2 text-sm text-white/80">Choose a panorama asset to start this project.</p><button type="button" onClick={handleOpenAssetPicker} className="pointer-events-auto mt-3 rounded-xl bg-primary px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary/70">Select scene</button></div></div>}
          <PanoramaSceneStrip panoramas={stripPanoramas} hotspots={hotspots} selectedSceneIds={selectedSceneIds} hiddenSceneIds={hiddenSceneIds} linkedPanoramaIds={stripLinkedPanoramaIds} activePanorama={activePanorama} activePanoramaId={activePanorama?.id} onSelect={handleSelectStripPanorama} onRemove={handleHideSceneFromStrip} onOpenAssetPicker={handleOpenAssetPicker} />
          <div className="pointer-events-none absolute bottom-5 left-5 right-5 z-[2] flex items-end justify-between gap-4 sm:bottom-7 sm:left-7 sm:right-7"><div><p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Immersive preview</p><p className="mt-1 font-display text-xl font-semibold text-white sm:text-2xl">{activePanorama ? panoramaDescription(activePanorama) : "Choose a panorama to begin"}</p></div><span className="hidden rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs text-white/80 backdrop-blur-md sm:block">Scroll to zoom</span></div>
        </div>
      </section>
    </main>
  );
};

export default PanoramaViewer;
