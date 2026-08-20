import Loading from "../Loading";
import { storageFormat } from "../../utils/Formats";
import PanoramaUpload from "./PanoramaUpload";
import { useState } from "react";
import { updatePanoramaName } from "../../api/PanoramaService";

const isNavigationHotspot = (hotspot) => (
  ["LINK", "NAVIGATION"].includes(String(hotspot?.type || "").toUpperCase())
);

const panoramaFilename = (panorama) => (
  panorama?.image_path?.split("/").pop() || `panorama-${panorama?.id}`
);

const panoramaName = (panorama) => (
  panorama?.name || panoramaFilename(panorama).replace(/\.[^/.]+$/, "")
);

const PanoramaAssetLibrary = ({ id, panoramas, hotspots = [], activePanoramaId, isFetching, uploadProjectId, uploadGroupId, uploadClientId, currentGroupPanoramas = [], allGroupPanoramas = [], onUploaded, onPanoramaRenamed, onUploadError, onSelect, isHighlighted = false }) => {
  const [editingPanoramaId, setEditingPanoramaId] = useState(null);
  const [nameDraft, setNameDraft] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const navigationHotspots = hotspots.filter(isNavigationHotspot);
  const linkedSceneIds = new Set(
    navigationHotspots
      .map((hotspot) => String(hotspot.next_panorama_id ?? ""))
      .filter(Boolean)
  );
  const currentGroupPanoramaIds = new Set(
    currentGroupPanoramas.map((panorama) => String(panorama.id))
  );
  const allGroupPanoramaIds = new Set(
    allGroupPanoramas.map((panorama) => String(panorama.id))
  );

  const filteredPanoramas = panoramas;

  const startNameEdit = (panorama) => {
    setEditingPanoramaId(panorama.id);
    setNameDraft(panoramaName(panorama));
  };

  const saveName = async (event, panorama) => {
    event.preventDefault();
    const name = nameDraft.trim();
    if (!name) {
      onUploadError?.("Panorama name is required.");
      return;
    }

    try {
      setIsSavingName(true);
      const response = await updatePanoramaName(panorama.id, name);
      onPanoramaRenamed?.(response.data ?? { ...panorama, name });
      setEditingPanoramaId(null);
    } catch (error) {
      onUploadError?.(error?.data?.message || "Unable to rename panorama.");
    } finally {
      setIsSavingName(false);
    }
  };

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
              const isInAnyGroup = currentGroupPanoramaIds.has(String(panorama.id))
                || allGroupPanoramaIds.has(String(panorama.id))
                || (panorama.groups ?? []).length > 0;
              const isIncluded = isLinked || isInAnyGroup;

              return (
                <div key={panorama.id} className={`group relative overflow-hidden rounded-xl border bg-white/5 text-left transition ${isIncluded ? "border-primary ring-2 ring-primary/40" : "border-white/10"}`}>
                  <img src={storageFormat(panorama.image_path)} alt={`Panorama asset ${panorama.id}`} className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105" />
                  {editingPanoramaId === panorama.id ? <form onSubmit={(event) => saveName(event, panorama)} className="flex gap-1 px-2 py-2" onClick={(event) => event.stopPropagation()}>
                    <input autoFocus value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} aria-label={`Name for panorama ${panorama.id}`} className="min-w-0 flex-1 rounded border border-primary/60 bg-white/10 px-1 py-1 text-[9px] text-white outline-none" />
                    <button type="button" disabled={isSavingName} onClick={() => setEditingPanoramaId(null)} className="rounded border border-white/20 px-1.5 text-[11px] font-bold text-white/70 disabled:opacity-50" aria-label="Cancel name edit" title="Cancel">✕</button>
                    <button type="submit" disabled={isSavingName} className="rounded bg-primary px-1.5 text-[11px] font-bold text-white disabled:opacity-50" aria-label="Save panorama name" title="Save">{isSavingName ? "…" : "✓"}</button>
                  </form> : <p onDoubleClick={() => startNameEdit(panorama)} className={`truncate px-2 py-2 text-[9px] font-bold tracking-wider ${isIncluded ? "text-primary" : "text-surface/50"}`} title={`${panoramaName(panorama)} — double-click to edit`}>{panoramaName(panorama)}</p>}
                  {!activePanoramaId && !isInAnyGroup && <button type="button" onClick={() => onSelect?.(panorama)} className="mx-2 mb-2 w-[calc(100%-1rem)] rounded-lg bg-primary/90 px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider text-white transition hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary/70">Select scene</button>}
                  {isIncluded && <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow-lg" aria-hidden="true">&#10003;</span>}
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
