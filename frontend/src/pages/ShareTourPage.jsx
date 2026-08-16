import Marzipano from "marzipano";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getShareSnapshot } from "../api/shareService";
import { storageFormat } from "../utils/Formats";

const ShareTourPage = () => {
  const params = useParams();
  const token = params.token || params["*"];
  const containerRef = useRef(null);
  const [snapshot, setSnapshot] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => { getShareSnapshot(token).then((response) => setSnapshot(response.data)).catch(() => setError("This share link has expired or is invalid.")); }, [token]);

  useEffect(() => {
    if (!snapshot || !containerRef.current) return undefined;
    const viewer = new Marzipano.Viewer(containerRef.current, { controls: { mouseViewMode: "drag" }, stageType: "webgl" });
    const scenes = {};
    const panoramas = snapshot.panoramas ?? [];
    const currentId = activeId ?? panoramas.find((item) => item.first_scene)?.id ?? panoramas[0]?.id;
    const hotspots = snapshot.hotspots ?? [];
    const getScene = (panorama) => {
      if (scenes[panorama.id]) return scenes[panorama.id];
      const source = Marzipano.ImageUrlSource.fromString(storageFormat(panorama.image_path));
      const geometry = new Marzipano.EquirectGeometry([{ tileSize: 256, size: 256, fallbackOnly: true }, { tileSize: 512, size: 2048 }]);
      const view = new Marzipano.RectilinearView({ yaw: Math.PI / 2, pitch: -Math.PI / 6, fov: Math.PI / 2 }, Marzipano.RectilinearView.limit.traditional(2048, 2 * Math.PI / 3));
      scenes[panorama.id] = viewer.createScene({ source, geometry, view, pinFirstLevel: true });
      return scenes[panorama.id];
    };
    const select = (panorama) => {
      const scene = getScene(panorama);
      const hotspotContainer = scene.hotspotContainer();
      hotspotContainer.listHotspots().forEach((hotspot) => hotspotContainer.destroyHotspot(hotspot));
      hotspots.filter((hotspot) => String(hotspot.panorama_id) === String(panorama.id)).forEach((hotspot) => {
        const isLink = ["LINK", "NAVIGATION"].includes(String(hotspot.type).toUpperCase());
        const rotation = Number(hotspot.rotation ?? 0);
        const element = document.createElement("button");
        element.type = "button";
        element.className = `share-hotspot share-hotspot-${isLink ? "link" : "info"}`;
        element.style.setProperty("--hotspot-rotation", `${rotation}deg`);
        element.setAttribute("aria-label", isLink ? "Open linked scene" : `${hotspot.title || "Information"}: ${hotspot.description || "View information"}`);
        element.innerHTML = isLink
          ? '<span class="share-hotspot-arrow-row" aria-hidden="true"><i>⌃</i><i>⌃</i><i>⌃</i></span>'
          : '<span class="share-hotspot-info-mark" aria-hidden="true">i</span>';
        if (!isLink) {
          const detail = document.createElement("span");
          detail.className = "share-hotspot-detail";
          const title = document.createElement("strong");
          title.textContent = hotspot.title || "Information";
          const description = document.createElement("span");
          description.textContent = hotspot.description || "";
          detail.append(title);
          if (hotspot.description) detail.append(description);
          element.appendChild(detail);
        } else {
          element.addEventListener("click", () => {
            const destination = panoramas.find((item) => String(item.id) === String(hotspot.next_panorama_id));
            if (destination) { setActiveId(destination.id); select(destination); }
          });
        }
        hotspotContainer.createHotspot(element, { yaw: Number(hotspot.yaw ?? 0), pitch: Number(hotspot.pitch ?? 0) });
      });
      scene.switchTo({ transitionDuration: 400 });
    };
    const activePanorama = panoramas.find((item) => String(item.id) === String(currentId)) ?? panoramas[0];
    if (activePanorama) select(activePanorama);
    return () => viewer.destroy();
  }, [snapshot, activeId]);

  if (error) return <main className="flex min-h-screen items-center justify-center bg-navy p-6 text-white"><p>{error}</p></main>;
  if (!snapshot) return <main className="flex min-h-screen items-center justify-center bg-navy p-6 text-white"><p>Loading tour…</p></main>;
  const currentId = activeId ?? snapshot.panoramas.find((item) => item.first_scene)?.id ?? snapshot.panoramas[0]?.id;
  const activeIndex = snapshot.panoramas.findIndex((item) => String(item.id) === String(currentId));
  return <main className="relative h-screen w-screen overflow-hidden bg-black font-body text-white">
    <div ref={containerRef} className="absolute inset-0 bg-black" />
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between bg-linear-to-b from-black/75 to-transparent px-5 pb-16 pt-5 sm:px-8">
      <div><p className="text-[10px] uppercase tracking-[0.3em] text-primary">Vistri 360</p><h1 className="mt-1 font-display text-xl font-black sm:text-2xl">{snapshot.project.name}</h1></div>
      <span className="rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-xs text-white/70 backdrop-blur-md">Scene {activeIndex + 1} / {snapshot.panoramas.length}</span>
    </div>
    <div className="absolute inset-x-0 bottom-0 z-10 bg-linear-to-t from-black/90 via-black/65 to-transparent px-4 pb-4 pt-16 sm:px-8 sm:pb-7">
      <div className="mb-3 flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/60">Scenes</p><p className="text-[10px] text-white/40">Select a scene to explore</p></div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {snapshot.panoramas.map((panorama, index) => <button key={panorama.id} type="button" onClick={() => setActiveId(panorama.id)} className={`group relative w-32 shrink-0 overflow-hidden rounded-xl border text-left transition sm:w-40 ${String(currentId) === String(panorama.id) ? "border-primary ring-2 ring-primary/50" : "border-white/20 hover:border-white/70"}`} aria-label={`View scene ${index + 1}`}>
          <img src={storageFormat(panorama.image_path)} alt="" className="h-16 w-full object-cover transition group-hover:scale-105 sm:h-20" /><span className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1.5 text-[10px] font-bold text-white">Scene {index + 1}</span>
        </button>)}
      </div>
    </div>
  </main>;
};

export default ShareTourPage;
