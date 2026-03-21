import Marzipano from "marzipano";
import redIcon from "../images/red.jpg";
import React, { useEffect, useRef, useState } from "react";
import type from "marzipano/src/util/type";
import { fetchHotSpot , saveHotspots} from "../api/hotspotService";
import {fetchProject} from "../api/ProjectService";
import { request } from "../api/apiConfig";
import { useUploadPanoramas } from "../hooks/useUploadPanorama";
import Loading from "./Loading";
import { storageFormat } from "../utils/Formats"; 


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
  const [isProjectFetchingLoading, setIsProjectFetchingLoading] = useState(false);
  const clickedObjectIDRef = useRef(null);


 const { uploadPanoramas, isLoading, errorMessage } = useUploadPanoramas();
  
  useEffect(() => {
    if (!containerRef.current) return;

    //fetch data
    handleFetchProjectData();
    
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

  // This is the absolute center of where the camera is pointing
  addHotspot(centerCoords,'hotspot');
  
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
  addHotspot(centerCoords, 'link');
};


const addHotspot = (coords, hotspotType = 'hotspot') => {

  const activeScene = sceneRef.current;
  const viewer = viewerRef.current;
  let newHotspot = { ...coords, unique_id: Date.now()};

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
  if (hotspotType === 'hotspot') {

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

  } else if (hotspotType === 'link') {// --- TYPE: LINK HOTSPOT ---
    
   newHotspot = { ...newHotspot, type: 'LINK' };

    const controlsWrapper  = document.createElement('div');
    controlsWrapper.className = 'hotspot-toolbar';
    controlsWrapper.style.display = 'none';

    const linkNavigation = document.createElement('button');
    linkNavigation.className = "group relative flex items-center justify-center w-10 h-10 rounded-full bg-white/80 border-2 border-gray-400 transition-transform duration-300 hover:scale-110 shadow-sm";
    linkNavigation.style.outline = '2px solid white';
    linkNavigation.style.outlineOffset = '-4px';
    
    linkNavigation.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3.5" stroke="black" class="w-5 h-5 transition-transform duration-500">
        <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
      </svg>
    `;

    let currentRotation = 0;

    linkNavigation.addEventListener('click', (e) => {
      e.stopPropagation();

      if (openControlsRef.current && openControlsRef.current !== controlsWrapper) {
          openControlsRef.current.style.display = 'none';
      }
      
      if(!didMove){
        const isHidden = controlsWrapper.style.display === 'none';
        controlsWrapper.style.display = isHidden ? 'flex' : 'none';
        openControlsRef.current = isHidden ? controlsWrapper : null;
      }

      //ref for current selected object
      clickedObjectIDRef.current = hotspotObject.position();
    });

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

    //next scene
    const nextSceneBtn = document.createElement('button');
    nextSceneBtn.className = 'hotspot-btn next-scene-btn';
    nextSceneBtn.innerHTML = '➜]';

    rotateLeftBtn.onclick = (e) => {
      e.stopPropagation();
      currentRotation = (currentRotation - 60);
      linkNavigation.style.transform = `rotate(${currentRotation}deg)`;
    };

    rotateRightBtn.onclick = (e) => {
      e.stopPropagation();
      currentRotation = (currentRotation + 60);
      linkNavigation.style.transform = `rotate(${currentRotation}deg)`;
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

    //create image wrapper
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'hotspot-image-wrapper';

    
    const images = panoramas.map((panorama) => {
        const image = document.createElement('img');
        image.className = 'hover:scale-105 transition cursor-pointer';
        image.key = panorama.id;
        image.src = storageFormat(panorama.image_path);

        //image
        image.addEventListener('click',(e)=>{
          e.stopPropagation();
          if (panorama.sceneInstance) {
            panorama.sceneInstance.switchTo();
          }
        });
    
        return image;
    });

    images.forEach(image => {
      imageWrapper.appendChild(image);
    });
    
    ImagesContainer.appendChild(imageWrapper);

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

  const newHotspotss = hotspotObject;

  setHotspotHook(newHotspotss.position());

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

const handleSaveHotspot = async() => {

  try {

   if(hotspots.length <= 0 ) return;

    const payload = {
      hotspots : hotspots.map(function (hotspot) {
            return {
              project_id: 1,
              image_Id : hotspot.image_id ?? null,
              unique_id: hotspot.unique_id,
              details: hotspot
            }
        })
    }

    //save
    await saveHotspots(payload);
    
  } catch (error) {
    console.log(error);
    throw error;
  } 

}

  const handleFetchProjectData = async (id = 1) => {
      try {
        setIsProjectFetchingLoading(true);
        const projectData = await fetchProject(id);
        const projectImages = projectData?.data?.project_images;

        if (projectImages && projectImages.length > 0) {
          // 1. Flatten all images from all hotspots into one single array first
          // We use .flatMap to handle the nested arrays
          const allIncomingImages = projectImages.map(h => h || []);

          setPanoramas((prev) => {
            // 2. Get existing IDs for comparison
            const existingIds = new Set(prev.map(item => item.id));

            // 3. Filter the incoming images to find only the new ones
            const uniqueNewImages = allIncomingImages.filter(
              (img) => !existingIds.has(img.id)
            );

            // 4. Return the merged array
            return [...prev, ...uniqueNewImages];

          });
        }
      } catch (error) {
        console.error('Error fetching the ProjectData', error);
      } finally{
        setIsProjectFetchingLoading(true);
      }
  };

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
                      <Loading isLoading={isProjectFetchingLoading} />                     
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