import Loading from "../Loading";
import { storageFormat } from "../../utils/Formats";
import PanoramaUpload from "./PanoramaUpload";

const isNavigationHotspot = (hotspot) => (
  ["LINK", "NAVIGATION"].includes(String(hotspot?.type || "").toUpperCase())
);

const panoramaFilename = (panorama) => (
  panorama?.image_path?.split("/").pop() || `panorama-${panorama?.id}`
);

const PanoramaAssetLibrary = ({ id, panoramas, hotspots = [], activePanoramaId, isFetching, uploadProjectId, uploadGroupId, uploadClientId, onUploaded, onUploadError, onSelect, isHighlighted = false }) => {
  const navigationHotspots = hotspots.filter(isNavigationHotspot);
  const linkedSceneIds = new Set(
    navigationHotspots
      .map((hotspot) => String(hotspot.next_panorama_id ?? ""))
      .filter(Boolean)
  );

  const filteredPanoramas = panoramas;

  return (
    <section id={id} className={`flex min-h-0 flex-1 flex-col border-t border-white/10 pt-6 transition ${isHighlighted ? "rounded-xl border-primary/70 ring-2 ring-primary/60 animate-pulse" : ""}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-surface/50">Panorama assets</h2>
        <span className="text-xs text-primary">{filteredPanoramas.length}</span>
      </div>
      <PanoramaUpload
        projectId={uploadProjectId}
        groupId={uploadGroupId}
        clientId={uploadClientId}
        existingPanoramas={panoramas}
        onUploaded={onUploaded}
        onError={onUploadError}
      />
      <div className="panorama-scrollbar mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
        {filteredPanoramas.length === 0 ? (
          <div className="relative flex min-h-20 items-center justify-center rounded-xl border border-dashed border-white/10 px-4 text-center text-xs text-surface/40">
            <Loading isLoading={isFetching} />
            {!isFetching && "No panorama assets uploaded yet"}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
            {filteredPanoramas.map((panorama) => {
            const isLinked = linkedSceneIds.has(String(panorama.id));
              const isInOtherGroup = (panorama.groups ?? []).some((group) => (
                Number(group.id) !== Number(uploadGroupId)
              ));

              return (
                <div key={panorama.id} className={`group relative overflow-hidden rounded-xl border bg-white/5 text-left transition ${isLinked ? "border-primary ring-2 ring-primary/40" : "border-white/10"}`}>
                  <img src={storageFormat(panorama.image_path)} alt={`Panorama asset ${panorama.id}`} className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105" />
                  <p className={`truncate px-2 py-2 text-[9px] font-bold tracking-wider ${isLinked ? "text-primary" : "text-surface/50"}`} title={panoramaFilename(panorama)}>{panoramaFilename(panorama)}</p>
                  {!activePanoramaId && !isInOtherGroup && <button type="button" onClick={() => onSelect?.(panorama)} className="mx-2 mb-2 w-[calc(100%-1rem)] rounded-lg bg-primary/90 px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider text-white transition hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary/70">Select scene</button>}
                  {isLinked && <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow-lg" aria-hidden="true">&#10003;</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default PanoramaAssetLibrary;
