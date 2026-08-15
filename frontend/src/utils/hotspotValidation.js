export const validateHotspot = (hotspot) => {
  if (!hotspot?.type) return "Hotspot type is missing.";

  if (hotspot.type === "INFO") {
    if (!hotspot.title?.trim()) return "Information tag title is required.";
  }

  if (hotspot.type === "LINK" && !hotspot.next_scene_id && !hotspot.next_scene_path) {
    return "Select a destination scene for the navigation hotspot.";
  }

  return null;
};

export const validateHotspots = (hotspots) => {
  for (const hotspot of hotspots) {
    const message = validateHotspot(hotspot);
    if (message) return message;
  }

  return null;
};

export const buildHotspotPayload = (hotspot, projectId, panoramaId) => ({
  project_id: projectId,
  panorama_id: panoramaId,
  unique_id: hotspot.unique_id,
  type: hotspot.type,
  yaw: hotspot.yaw,
  pitch: hotspot.pitch,
  rotation: hotspot.rotation ?? 0,
  details: {
    ...hotspot,
    type: hotspot.type,
    rotation: hotspot.rotation ?? 0,
    title: hotspot.title ?? "",
    description: hotspot.description ?? "",
  },
});
