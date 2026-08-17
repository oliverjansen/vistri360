import test from "node:test";
import assert from "node:assert/strict";
import { buildHotspotPayload, mergePanoramaRecords, mergeSceneHotspots, removeHotspotById, removeHotspotsForDestinations, validateHotspot } from "./hotspotValidation.js";

test("requires a hotspot type", () => {
  assert.equal(validateHotspot({ unique_id: 1 }), "Hotspot type is missing.");
});

test("requires a destination for navigation hotspots", () => {
  assert.equal(
    validateHotspot({ unique_id: 1, type: "LINK" }),
    "Select a destination scene for the navigation hotspot."
  );
});

test("accepts a navigation hotspot with a destination", () => {
  assert.equal(validateHotspot({ unique_id: 1, type: "LINK", next_panorama_id: 2 }), null);
});

test("accepts an information tag with only a title", () => {
  assert.equal(validateHotspot({ unique_id: 1, type: "INFO", title: "Room details" }), null);
});

test("accepts and preserves an information title stored in details", () => {
  const hotspot = { unique_id: 2, type: "INFO", details: { title: "Room details" } };

  assert.equal(validateHotspot(hotspot), null);
  assert.equal(buildHotspotPayload(hotspot, 10, 20).details.title, "Room details");
});

test("does not require a title when there are no information hotspots", () => {
  assert.equal(validateHotspot({ unique_id: 3, type: "LINK", next_panorama_id: 4 }), null);
});

test("still requires an information tag title", () => {
  assert.equal(validateHotspot({ unique_id: 1, type: "INFO" }), "Information tag title is required.");
});

test("includes navigation rotation in the saved hotspot details", () => {
  const payload = buildHotspotPayload(
    { unique_id: 1, type: "LINK", next_panorama_id: 2, rotation: 90 },
    10,
    20
  );

  assert.equal(payload.rotation, 90);
  assert.equal(payload.details.rotation, 90);
  assert.equal(payload.details.type, "LINK");
});

test("removes every navigation hotspot targeting a removed scene", () => {
  const remaining = removeHotspotsForDestinations([
    { unique_id: 1, type: "LINK", next_panorama_id: 20 },
    { unique_id: 2, type: "INFO", panorama_id: 20 },
    { unique_id: 3, type: "LINK", next_panorama_id: 30 },
  ], [20]);

  assert.deepEqual(remaining, [
    { unique_id: 2, type: "INFO", panorama_id: 20 },
    { unique_id: 3, type: "LINK", next_panorama_id: 30 },
  ]);
});

test("removes an information hotspot from the canvas hotspot collection", () => {
  const remaining = removeHotspotById([
    { unique_id: "101", type: "INFO", title: "Remove me" },
    { unique_id: 102, type: "INFO", title: "Keep me" },
  ], 101);

  assert.deepEqual(remaining, [
    { unique_id: 102, type: "INFO", title: "Keep me" },
  ]);
});

test("replaces cached panorama records with fresh nested hotspot data", () => {
  const merged = mergePanoramaRecords(
    [{ id: 24, hotspot_panorama: null }],
    [{ id: 24, hotspot_panorama: { hotspots: [{ unique_id: 7 }] } }]
  );

  assert.deepEqual(merged, [
    { id: 24, hotspot_panorama: { hotspots: [{ unique_id: 7 }] } },
  ]);
});

test("includes unsaved hotspots from scenes that are no longer active", () => {
  const merged = mergeSceneHotspots(
    [{ panorama_id: 1, unique_id: 10, type: "INFO", title: "Old" }],
    {
      1: [{ panorama_id: 1, unique_id: 10, type: "INFO", title: "Edited" }],
      2: [{ panorama_id: 2, unique_id: 20, type: "INFO", title: "Inactive scene" }],
    }
  );

  assert.deepEqual(merged, [
    { panorama_id: 1, unique_id: 10, type: "INFO", title: "Edited" },
    { panorama_id: 2, unique_id: 20, type: "INFO", title: "Inactive scene" },
  ]);
});
