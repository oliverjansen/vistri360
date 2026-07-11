import Marzipano from "marzipano";
import redIcon from "../images/red.jpg";
import React, { useEffect, useRef, useState } from "react";
import type from "marzipano/src/util/type";
import { getHotSpot , saveHotspots , deleteHotspot} from "../api/hotspotService";
import {fetchProject} from "../api/ProjectService";
import { request } from "../api/apiConfig";
import { useUploadPanoramas } from "../hooks/useUploadPanorama";
import Loading from "./Loading";
import { storageFormat } from "../utils/Formats"; 
import { showPanorama, getPanoramas } from "../api/PanoramaService";


const PanoramaViewer = ({ imageUrl }) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const sceneMapRef = useRef({}); // Stores ALL created Marzipano scenes by ID
  const viewerRef = useRef(null);
  const openControlsRef = useRef(null);
  const openControlImageRef = useRef(null);
  const [panoramas, setPanoramas] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [rotation, setRotation] = useState(0);
  const [isPanoramaFetchingLoading, setIsPanoramaFetchingLoading] = useState(false);
  const clickedObjectIDRef = useRef(null);
  const count = useRef(0);
  const panoramaRef = useRef(0)
  const openHotspotPanoramaControls = useRef(null); // Store controls for each hotspot by unique_id
  const panoramasRef = useRef([]); // Store panoramas in a ref for access in event handlers without stale closures
  const linkHotspotRegistry = useRef({});


 const { uploadPanoramas, isLoading, errorMessage } = useUploadPanoramas();

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
    if (!containerRef.current) return;

    const initializeData = async () => {
    try {
      // 1. Wait for Panoramas to finish and update state
      await handleGetPanoramas();
      
    } catch (error) {
      console.error("Initialization error:", error);
    }finally{
         // 2. Wait for Hotspots to finish
      await handleGetHotspots();
    }
  };

  initializeData();
    
    const viewerOpts = {
      controls: { mouseViewMode: "drag", dragSpeed: 0.6, zoomSpeed: 0.6 },
      stageType: "webgl",
    };

    const viewer = new Marzipano.Viewer(containerRef.current, viewerOpts);
    viewerRef.current = viewer;

    sceneMapRef.current = {};
    const sceneInstance = createMarzipanoScene("main-scene", imageUrl);
    sceneInstance.switchTo({ transitionDuration: 400 });
    sceneRef.current = sceneInstance;

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
  let clickedObjectID = null;

  // --- TYPE: STANDARD HOTSPOT ---
  if (hotspotType === 'INFO') {

    newHotspot = { ...newHotspot, type: 'INFO' };

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

    const shortDescription = document.createElement('input');
    shortDescription.type = 'text';
    shortDescription.className = 'hotspot-field';
    shortDescription.placeholder = 'Enter short description...';
    labelWrapper.appendChild(shortDescription);

    const img = document.createElement('img');
    img.src = redIcon;
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
        clickedObjectIDRef.current = hotspotObject.position();
      }
    });

    delBtn.onclick = (e) => {
      e.stopPropagation();

      removeHotspotHook();

      container.destroyHotspot(hotspotObject);
      if (openControlsRef.current === controlsWrapper) openControlsRef.current = null;

    };

    [title, controlsWrapper].forEach(el => {
      el.addEventListener('click', (e) => e.stopPropagation());
      el.addEventListener('mousedown', (e) => e.stopPropagation());
    });

    interactionElement = img; // We drag by the image

  } else if (hotspotType === 'LINK') {// --- TYPE: LINK HOTSPOT ---
    
   newHotspot = { ...newHotspot, type: 'LINK' };
    let currentRotation = newHotspot.rotation  ?? 0; // Default rotation is 0 if not set

    const controlsWrapper  = document.createElement('div');
    controlsWrapper.className = 'hotspot-toolbar';
    controlsWrapper.style.display = 'none';

    const linkNavigation = document.createElement('button');
    linkNavigation.className = "group relative flex items-center justify-center w-10 h-10 rounded-full bg-white/80 border-2 border-gray-400 transition-transform duration-300 hover:scale-110 shadow-sm";
    linkNavigation.style.outline = '2px solid white';
    linkNavigation.style.outlineOffset = '-4px';
    linkNavigation.style.transform = `rotate(${currentRotation}deg)`;

    linkNavigation.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3.5" stroke="black" class="w-5 h-5 transition-transform duration-500">
        <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
      </svg>
    `;

    const editBtn = document.createElement('button');
    editBtn.className = 'hotspot-btn edit-btn';
    editBtn.innerHTML = '✎';

    const delBtn = document.createElement('button');
    delBtn.className = 'hotspot-btn del-btn';
    delBtn.innerHTML = '✖';

    const rotateLeftBtn = document.createElement('button');
    rotateLeftBtn.className = 'hotspot-btn rotate-btn';
    rotateLeftBtn.innerHTML = '⤾';

    const rotateRightBtn = document.createElement('button');
    rotateRightBtn.className = 'hotspot-btn rotate-btn';
    rotateRightBtn.innerHTML = '⤿';

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

      const nextScene = createMarzipanoScene(`linked-scene-${unique_id}-${selectedNextScenePath}`, selectedNextScenePath);
      if (!nextScene) return;

      nextScene.switchTo({ transitionDuration: 700 });
      sceneRef.current = nextScene;

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
      container.destroyHotspot(hotspotObject);
      if (openControlsRef.current === controlsWrapper) openControlsRef.current = null;

      removeHotspotHook();
    }
  
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

          if (imagePath === selectedNextScenePath) {
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
        nextSceneBtn.disabled = false;
        nextSceneBtn.dataset.selectedImagePath = selectedNextScenePath;

        imageWrapper.querySelectorAll('img').forEach((image) => {
          image.classList.toggle('selected-panorama-image', image === clickedImage);
        });

        setHotspots((prev) => {
          return prev.map((hotspot) => {
            if (hotspot.unique_id === unique_id) {
              return { ...hotspot, next_scene_path: selectedNextScenePath };
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
        imageWrapper.style.display = isPanoramaHidden ? 'block' : 'none'; // Track this specific hotspot's controls
        ImagesContainer.style.display = isPanoramaHidden ? 'block' : 'none';
        openHotspotPanoramaControls.current = isPanoramaHidden ? ImagesContainer : null; // Store reference to this hotspot's panorama controls
      }

      //ref for current selected object
      clickedObjectIDRef.current = hotspotObject.position();
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

  const newHotspots = hotspotObject;

  setHotspotHook(newHotspots.position());

  // --- UNIVERSAL DRAGGING LOGIC ---
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
    
    //get final position after moved
    const finalPositionafterMoved = hotspotObject.position();

    setHotspotHook(finalPositionafterMoved);

  };

  interactionElement.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    isDragging = true;
    visual.classList.add('dragging');
    viewer.controls().disable();
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  });
};

const handleFileChange = async (e) => {
  const files = Array.from(e.target.files);

  if (files.length === 0) return;

  try {

    const response = await uploadPanoramas(files, 1);

    setPanoramas((prev) => {
      const existingIdsArray = prev.map(item => item.id);
      const uniquenewImages = response.data.filter((image) => 
        !existingIdsArray.includes(image.id)
      );

      return [...prev, ...uniquenewImages];
    });

  
  } catch (error) {
    console.error(error);
  }

};

//function
const setHotspotHook = (newHotspot) => {

  setHotspots((prev) => {
    const exists = prev.some(h => h.unique_id === newHotspot.unique_id);
    
    if (exists) {
      // MERGE instead of REPLACE to keep metadata (titles, links, etc.)
      return prev.map(h => 
        h.unique_id === newHotspot.unique_id ? { ...h, ...newHotspot } : h
      );
    } 
  
    // INSERT brand new hotspot
    return [...prev, newHotspot];
  });
};

const removeHotspotHook = () => {
  setHotspots((prev) => prev.filter((loopHotspot) => loopHotspot.unique_id !== clickedObjectIDRef.current.unique_id));
}

const handleLinkHotspotRotation = (unique_id, newRotation) => {
  setHotspots((prev) => {
      return prev.map((hotspot) => {
          if(hotspot.unique_id === unique_id){
            return {...hotspot, rotation: newRotation}
          }else {
            return hotspot;
          }
    })
  })
}

const handleSaveHotspot = async() => {

  try { 

  //if not delete hotspot, then delete records in the database
   if(hotspots.length <= 0 ) {

    const payload = {
      hotspotId : null,
      panoramaId : panoramaRef
    }

    await deleteHotspot(payload);

   }else {
      const payload = {
        hotspots : hotspots.map(function (hotspot) {
              return {
                project_id: 1,
                panorama_id: 1,
                image_Id : hotspot.image_id ?? null,
                unique_id: hotspot.unique_id,
                details: hotspot,
                rotation: hotspot.rotation ?? 0
              }
          })
      }

      //save
      await saveHotspots(payload);
   }

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

  const handleGetPanoramas = async () => {
  try {
    const payload = { user_id: 1 };
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
};

  const handleGetHotspots = async() => {

    try {

      const payload = {
        project_id : 1
      };

      const hotspotsResponse = await getHotSpot(payload);

      const response = hotspotsResponse?.data;

      response.map((response)=> {

        try {

          if(response.details && response.details !== ""){
        
            const parseDetails = JSON.parse(response.details);
            setHotspotHook(parseDetails);
            if(count.current == 0){
              panoramaRef.current = response.panorama_id;
              addHotspot(parseDetails, parseDetails.type)
            }
          
          }
          
        } catch (error) {
            console.error(error);
            throw error; 
        }
       
      });  
      
      count.current++;
      
    } catch (error) {
      console.error(error);
      throw error;
    }    
  }

  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh" }}>
      {/* SIDEBAR */}
      <div 
    style={{ width: "220px", background: "#1a1a1a", color: "white", padding: "20px", zIndex: 99999 }} 
    className="flex flex-col gap-6 shadow-2xl rounded-l-lg border-l border-gray-800 min-h-screen overflow-y-auto"
  >
    {/* SECTION: HOTSPOTS */}
    <section>
      <h3 className="mb-3 text-[10px] tracking-widest text-gray-500 font-bold uppercase">Add Hotspot</h3>
      <div 
        onClick={spawnHotspotAtCenter}
        className="group relative flex flex-col items-center justify-center p-4 rounded-xl bg-zinc-800 border-2 border-dashed border-zinc-700 hover:border-red-500 transition-all cursor-pointer"
      >
        <img src={redIcon} className="w-10 h-10 transition-transform group-hover:scale-110" alt="Hotspot" />
      </div>
    </section>

     <section>
      <h3 className="mb-3 text-[10px] tracking-widest text-gray-500 font-bold uppercase">Add Link Hotspot</h3>
      <div 
        onClick={spawnLinkHotspotAtCenter}
        className="group relative flex flex-col items-center justify-center p-4 rounded-xl bg-zinc-800 border-2 border-dashed border-zinc-700 hover:border-red-500 transition-all cursor-pointer"
      >
          <button
          // onClick={spawnHotspotAtCenter}
          className="group relative flex items-center justify-center w-10 h-10 rounded-full bg-white/80 border-2 border-gray-400 transition-transform duration-300 hover:scale-110 shadow-sm"
          style={{ outline: '2px solid white', outlineOffset: '-4px' }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={3.5}
            stroke="currentColor"
            className="w-5 h-5 text-gray-900 transition-transform duration-500"
            // style={{ transform: `rotate(${rotation}deg)` }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
          </svg>
        </button>
      </div>
    </section>

    <hr className="border-zinc-800" />

    {/* SECTION: UPLOAD & GALLERY */}
    <section>
      <h3 className="mb-3 text-[10px] tracking-widest text-gray-500 font-bold uppercase">Panorama Library</h3>
      
      {/* Upload Button */}
     <label className="relative flex items-center justify-center gap-2 w-full h-[35px] py-2 px-4 bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold rounded-lg cursor-pointer transition-all duration-300 mb-4 overflow-hidden">
              {/* 1. THE SPINNER LAYER */}
              <Loading isLoading={isLoading} />
              <span>+ UPLOAD 360 VIEWS</span>
              <input 
                type="file" 
                multiple 
                disabled={isLoading} // Professional touch: disable while uploading
                accept="image/*"
                className="hidden" 
                onChange={handleFileChange}
              />
            </label>
         

                {panoramas.length === 0 ? (
                    <div className="relative items-center justify-center">
                      <Loading isLoading={isPanoramaFetchingLoading} />                     
                    </div>
                    ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {panoramas.map((panorama) => {

                        return (
                            <div key={panorama.id} className="p-2 border border-zinc-700 rounded">
                              <img 
                                src={storageFormat(panorama.image_path)} 
                                alt="Panorama View"
                                className="w-full h-auto rounded"
                                // Troubleshooting tip: log if the specific image fails to load
                                onError={() => console.error(`Failed to load image at: ${fullImagePath}`)}
                              />
                              <p className="text-[10px] mt-1 text-center">ID: {panorama.id}</p>
                            </div>
                          );

                        })}
                    </div>
              )}
    </section>

    <section>
      <button 
        onClick={handleSaveHotspot} 
        className="bg-indigo-600 hover:bg-indigo-700 text-white "
          >
        Sync Changes
      </button>
    </section>
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
