export const validateHotspot = (hotspot) => {
  if (!hotspot?.type) return "Hotspot type is missing.";
  const type = String(hotspot.type).toUpperCase();

  if (type === "INFO") {
    const title = hotspot.title ?? hotspot.details?.title ?? "";
    if (!title.trim()) return "Information tag title is required.";
  }

  if (type === "LINK" && !hotspot.next_panorama_id) {
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

export const removeHotspotsForDestinations = (hotspots, destinationIds) => {
  const removedIds = new Set((destinationIds ?? []).map((id) => String(id)));

  return (hotspots ?? []).filter(
    (hotspot) => !removedIds.has(String(hotspot?.next_panorama_id ?? ""))
  );
};

export const removeHotspotById = (hotspots, hotspotId) => (
  (hotspots ?? []).filter(
    (hotspot) => String(hotspot?.unique_id ?? "") !== String(hotspotId ?? "")
  )
);

export const mergePanoramaRecords = (existing, incoming) => {
  const incomingById = new Map((incoming ?? []).map((panorama) => [String(panorama.id), panorama]));
  const incomingIds = new Set(incomingById.keys());

  return [
    ...(existing ?? []).filter((panorama) => !incomingIds.has(String(panorama.id))),
    ...(incoming ?? []),
  ];
};

export const mergeSceneHotspots = (registryHotspots, localSceneHotspots) => {
  const merged = new Map((registryHotspots ?? []).map((hotspot) => [
    `${hotspot?.panorama_id ?? ""}|${hotspot?.unique_id ?? ""}`,
    hotspot,
  ]));

  Object.entries(localSceneHotspots ?? {}).forEach(([panoramaId, sceneHotspots]) => {
    (sceneHotspots ?? []).forEach((hotspot) => {
      const normalized = { ...hotspot, panorama_id: hotspot?.panorama_id ?? panoramaId };
      merged.set(`${normalized.panorama_id}|${normalized.unique_id}`, normalized);
    });
  });

  return Array.from(merged.values());
};

export const buildHotspotPayload = (hotspot, projectId, panoramaId) => {
  const {
    project_id: _legacyProjectId,
    next_scene_path: _legacyPath,
    next_scene_id: _legacyId,
    first_scene: _legacyFirstScene,
    next_panorama_id: nextPanoramaId,
    details: nestedDetails,
    ...hotspotDetails
  } = hotspot;
  const {
    next_scene_path: _nestedLegacyPath,
    next_scene_id: _nestedLegacyId,
    first_scene: _nestedFirstScene,
    next_panorama_id: _nestedNextPanoramaId,
    ...cleanNestedDetails
  } = nestedDetails && typeof nestedDetails === "object" ? nestedDetails : {};
  const title = hotspot.title ?? cleanNestedDetails.title ?? "";
  const description = hotspot.description ?? cleanNestedDetails.description ?? "";
  const type = String(hotspot.type || cleanNestedDetails.type || "").toUpperCase();

  return {
    panorama_id: panoramaId,
    unique_id: hotspot.unique_id,
    type,
    yaw: hotspot.yaw,
    pitch: hotspot.pitch,
    rotation: hotspot.rotation ?? 0,
    next_panorama_id: nextPanoramaId ?? null,
    details: {
      ...cleanNestedDetails,
      ...hotspotDetails,
      type,
      rotation: hotspot.rotation ?? 0,
      title,
      description,
    },
  };
};
