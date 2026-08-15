import Loading from "../Loading";
import { storageFormat } from "../../utils/Formats";

const isNavigationHotspot = (hotspot) => (
  ["LINK", "NAVIGATION"].includes(String(hotspot?.type || "").toUpperCase())
);

const panoramaFilename = (panorama) => (
  panorama?.image_path?.split("/").pop() || `panorama-${panorama?.id}`
);

const PanoramaAssetLibrary = ({ panoramas, hotspots = [], isLoading, isFetching, onUpload }) => {
  const navigationHotspots = hotspots.filter(isNavigationHotspot);
  const linkedSceneIds = new Set(
    navigationHotspots
      .map((hotspot) => String(hotspot.next_panorama_id ?? ""))
      .filter(Boolean)
  );

  return (
    <section className="flex min-h-0 flex-1 flex-col border-t border-white/10 pt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-surface/50">Panorama assets</h2>
        <span className="text-xs text-primary">{panoramas.length}</span>
      </div>
      <label className="relative flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-4 text-[11px] font-bold uppercase tracking-widest text-white transition duration-300 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 focus-within:ring-2 focus-within:ring-primary/60">
        <Loading isLoading={isLoading} />
        <span>{isLoading ? "Uploading..." : "Upload 360 view"}</span>
        <input type="file" multiple disabled={isLoading} accept="image/*" className="hidden" onChange={onUpload} />
      </label>
      <div className="panorama-scrollbar mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
        {panoramas.length === 0 ? (
          <div className="relative flex min-h-20 items-center justify-center rounded-xl border border-dashed border-white/10 px-4 text-center text-xs text-surface/40">
            <Loading isLoading={isFetching} />
            {!isFetching && "No panorama assets uploaded yet"}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
            {panoramas.map((panorama) => {
            const isLinked = linkedSceneIds.has(String(panorama.id));

              return (
                <div key={panorama.id} className={`group relative overflow-hidden rounded-xl border bg-white/5 text-left transition ${isLinked ? "border-primary ring-2 ring-primary/40" : "border-white/10"}`}>
                  <img src={storageFormat(panorama.image_path)} alt={`Panorama asset ${panorama.id}`} className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105" />
                  <p className={`truncate px-2 py-2 text-[9px] font-bold tracking-wider ${isLinked ? "text-primary" : "text-surface/50"}`} title={panoramaFilename(panorama)}>{panoramaFilename(panorama)}</p>
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
