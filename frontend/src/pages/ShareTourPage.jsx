import Marzipano from "marzipano";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getShareSnapshot } from "../api/shareService";
import { storageFormat } from "../utils/Formats";

const normalizeShareSnapshot = (payload) => {
  const normalizePanorama = (panorama) => ({
    ...panorama,
    first_scene: panorama.first_scene ?? Boolean(panorama.hotspot_panorama?.first_scene),
  });
  const groups = (payload.groups ?? payload.locations ?? []).map((group) => ({
    ...group,
    panoramas: (group.panoramas ?? []).map(normalizePanorama),
  }));
  const panoramas = payload.panoramas
    ? payload.panoramas.map(normalizePanorama)
    : groups.flatMap((group) => group.panoramas ?? []);
  const hotspots = payload.hotspots ?? panoramas.flatMap((panorama) => (
    panorama.hotspot_panorama?.hotspots ?? []
  )).map((hotspot) => ({
    panorama_id: hotspot.panorama_id,
    next_panorama_id: hotspot.next_panorama_id,
    type: hotspot.type,
    yaw: hotspot.yaw,
    pitch: hotspot.pitch,
    rotation: hotspot.rotation ?? 0,
    title: hotspot.title ?? "",
    description: hotspot.description ?? "",
  }));

  return { ...payload, groups, panoramas, hotspots };
};

const ShareTourPage = () => {
  const params = useParams();
  const token = params.token || params["*"];
  const containerRef = useRef(null);
  const [snapshot, setSnapshot] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [expandedLocations, setExpandedLocations] = useState({});
  const [shareError, setShareError] = useState(null);
  const contactEmail = import.meta.env.VITE_SUPPORT_EMAIL || "sample.gmail.com";

  useEffect(() => {
    let cancelled = false;

    getShareSnapshot(token)
      .then((response) => {
        if (!cancelled) setSnapshot(normalizeShareSnapshot(response.data));
      })
      .catch((requestError) => {
        if (!cancelled) setShareError({ expired: requestError.status === 410 });
      });

    return () => { cancelled = true; };
  }, [token]);

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
            if (destination) {
              const destinationGroup = snapshot.groups?.find((group) => (
                (group.panoramas ?? []).some((item) => String(item.id) === String(destination.id))
              ));
              setExpandedLocations(destinationGroup ? { [String(destinationGroup.id)]: true } : {});
              setActiveId(destination.id);
              select(destination);
            }
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

  if (shareError) return <main className="flex min-h-screen items-center justify-center bg-navy p-6 font-body text-white"><section role="dialog" aria-modal="true" aria-labelledby="share-access-title" className="w-full max-w-md rounded-3xl border border-white/15 bg-white p-7 text-navy shadow-2xl"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-xl text-primary">{shareError.expired ? "!" : "×"}</div><p className="mt-6 text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Public tour access</p><h1 id="share-access-title" className="mt-2 font-display text-2xl font-black">{shareError.expired ? "This link has expired" : "This link is unavailable"}</h1>{shareError.expired ? <><p className="mt-3 text-sm leading-6 text-navy/60">Please contact us to renew access to this public tour.</p><a href={`mailto:${contactEmail}`} className="mt-6 block rounded-xl bg-navy px-4 py-3 text-center text-xs font-bold uppercase tracking-widest text-white transition hover:bg-primary">Contact {contactEmail}</a></> : <p className="mt-3 text-sm leading-6 text-navy/60">This public tour link is invalid or no longer available.</p>}</section></main>;
  if (!snapshot) return <main className="flex min-h-screen items-center justify-center bg-navy p-6 text-white"><p>Loading tour…</p></main>;
  const currentId = activeId ?? snapshot.panoramas.find((item) => item.first_scene)?.id ?? snapshot.panoramas[0]?.id;
  const activeIndex = snapshot.panoramas.findIndex((item) => String(item.id) === String(currentId));
  const groups = snapshot.groups?.length ? snapshot.groups : [{ id: "all", name: "Panoramas", panoramas: snapshot.panoramas }];
  const activeGroupKey = String(groups.find((group) => (
    (group.panoramas ?? []).some((panorama) => String(panorama.id) === String(currentId))
  ))?.id ?? "");
  return <main className="relative h-screen w-screen overflow-hidden bg-black font-body text-white">
    <div ref={containerRef} className={`absolute inset-y-0 right-0 bg-black transition-[left] duration-300 ease-out ${panelOpen ? "left-72" : "left-0"}`} />
    <div className={`pointer-events-none absolute right-0 top-0 z-10 flex items-start justify-between bg-linear-to-b from-black/75 to-transparent px-5 pb-16 pt-5 transition-[left] duration-300 ease-out sm:px-8 ${panelOpen ? "left-72" : "left-0"}`}>
      <div><p className="text-[10px] uppercase tracking-[0.3em] text-primary">Vistri 360</p><h1 className="mt-1 font-display text-xl font-black sm:text-2xl">{snapshot.project.name}</h1></div>
      <span className="rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-xs text-white/70 backdrop-blur-md">Scene {activeIndex + 1} / {snapshot.panoramas.length}</span>
    </div>
    <button type="button" onClick={() => setPanelOpen((open) => !open)} className={`absolute top-1/2 z-30 -translate-y-1/2 rounded-r-xl border border-white/20 bg-navy/90 px-2 py-4 text-xs text-white shadow-xl backdrop-blur-md transition-[left] ${panelOpen ? "left-72" : "left-4"}`} aria-label={panelOpen ? "Hide panorama locations" : "Show panorama locations"}>{panelOpen ? "›" : "‹"}</button>
    <aside className={`absolute inset-y-0 left-0 z-20 flex w-72 max-w-[85vw] flex-col border-r border-white/10 bg-navy/95 p-5 shadow-2xl backdrop-blur-xl transition-transform duration-300 ${panelOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="mb-6 pr-5"><p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Panorama groups</p><h2 className="mt-2 font-display text-xl font-black">Explore the tour</h2><p className="mt-1 text-xs text-white/50">Choose a panorama to view.</p></div>
      <div className="panorama-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
        {groups.map((group, groupIndex) => {
          const groupKey = String(group.id);
          const hasExplicitState = Object.prototype.hasOwnProperty.call(expandedLocations, groupKey);
          const isExpanded = hasExplicitState
            ? expandedLocations[groupKey]
            : (activeGroupKey ? groupKey === activeGroupKey : groupIndex === 0);

          return <section key={group.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-2">
            <button type="button" onClick={() => setExpandedLocations((previous) => ({ ...previous, [groupKey]: !isExpanded }))} className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-white/5">
              <span><span className="block text-[10px] font-bold uppercase tracking-[0.25em] text-white/70">{group.name}</span><span className="mt-1 block text-[10px] text-white/35">{group.panoramas?.length ?? 0} panorama{group.panoramas?.length === 1 ? "" : "s"}</span></span>
              <span className={`text-lg leading-none text-primary transition-transform ${isExpanded ? "rotate-180" : ""}`} aria-hidden="true">⌄</span>
            </button>
            {isExpanded && <div className="mt-2 space-y-2 border-t border-white/10 pt-2">
              {(group.panoramas ?? []).map((panorama, index) => <button key={panorama.id} type="button" onClick={() => { setActiveId(panorama.id); setExpandedLocations({ [groupKey]: true }); }} className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition ${String(currentId) === String(panorama.id) ? "border-primary bg-primary/15 ring-1 ring-primary/50" : "border-white/10 bg-white/5 hover:border-white/30"}`}>
                <img src={storageFormat(panorama.image_path)} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
                <span className="min-w-0"><span className="block truncate text-xs font-semibold text-white">Panorama {index + 1}</span><span className="block text-[10px] text-white/45">{panorama.first_scene ? "Starting panorama" : "Explore view"}</span></span>
              </button>)}
            </div>}
          </section>;
        })}
      </div>
    </aside>
  </main>;
};

export default ShareTourPage;
