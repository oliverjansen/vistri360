import { storageFormat } from "../../utils/Formats";

const sceneLabel = (panorama, index) => (
  panorama?.description || panorama?.title || panorama?.name ||
  panorama?.image_path?.split("/").pop()?.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim() ||
  `Scene ${index + 1}`
);

const isNavigationHotspot = (hotspot) => (
  hotspot?.type === "LINK" || hotspot?.type === "NAVIGATION"
);

const PanoramaSceneStrip = ({ panoramas = [], hotspots = [], selectedSceneIds = [], hiddenSceneIds = [], linkedPanoramaIds = [], activePanorama, activePanoramaId, onSelect, onRemove, onOpenAssetPicker }) => {
  const navigationHotspots = hotspots.filter(isNavigationHotspot);
  const linkedSceneIds = new Set(
    navigationHotspots
      .map((hotspot) => String(hotspot.next_panorama_id ?? ""))
      .filter(Boolean)
  );
  // Keep one card per panorama. Duplicate records can otherwise reuse the
  // same React key and make a newly linked scene render over the first card.
  const linkedIds = new Set(linkedPanoramaIds.map((id) => String(id)));
  const visiblePanoramas = Array.from(
    new Map(
      [...panoramas, ...(activePanorama ? [activePanorama] : [])]
        .filter((panorama) => (
          !hiddenSceneIds.includes(String(panorama.id)) && (
            Number(activePanoramaId) === Number(panorama.id) ||
            selectedSceneIds.includes(String(panorama.id)) ||
            linkedSceneIds.has(String(panorama.id)) ||
            linkedIds.has(String(panorama.id))
          )
        ))
        .map((panorama) => [String(panorama.id), panorama])
    ).values()
  );

  if (visiblePanoramas.length === 0) {
    return null;
  }

  return (
  <div className="pointer-events-auto absolute bottom-3 left-1/2 z-[4] w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2 sm:bottom-5 sm:w-[calc(100%-3rem)]">
    <div className="rounded-2xl border border-white/20 bg-navy/85 p-2 shadow-2xl backdrop-blur-xl">
      <div className="panorama-scene-strip flex gap-2 overflow-x-auto pb-1">
        {visiblePanoramas.map((panorama, index) => {
          const isActive = Number(activePanoramaId) === Number(panorama.id);

          return (
            <div key={panorama.id} className={`group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border text-left transition ${isActive ? "border-primary ring-2 ring-primary/40" : "border-white/10 hover:border-primary/70"}`}>
              <button type="button" onClick={() => onSelect(panorama)} className="h-full w-full text-left focus:outline-none focus:ring-2 focus:ring-primary/70" aria-current={isActive ? "scene" : undefined} aria-label={`${isActive ? "Active scene" : "Open scene"}: ${sceneLabel(panorama, index)}`}>
                <img src={storageFormat(panorama.image_path)} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                <span className="absolute inset-x-0 bottom-0 bg-navy/75 px-1.5 py-1 backdrop-blur-sm">
                  <span className="block truncate text-[8px] font-bold uppercase tracking-wider text-white">{sceneLabel(panorama, index)}</span>
                  <span className={`block text-[8px] ${isActive ? "text-primary" : "text-surface/60"}`}>{isActive ? "Active" : "Open"}</span>
                </span>
              </button>
              {!linkedIds.has(String(panorama.id)) && <button type="button" onClick={(event) => { event.stopPropagation(); onRemove?.(panorama); }} className="absolute right-1 top-1 z-[1] flex h-5 w-5 items-center justify-center rounded-full bg-navy/80 text-xs font-bold text-white/80 transition hover:bg-red-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-primary/80" aria-label={`Remove ${sceneLabel(panorama, index)} from scene strip`}>×</button>}
            </div>
          );
        })}
      </div>
    </div>
  </div>
  );
};

export default PanoramaSceneStrip;
