import test from "node:test";
import assert from "node:assert/strict";
import { buildHotspotPayload, validateHotspot } from "./hotspotValidation.js";

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
  assert.equal(validateHotspot({ unique_id: 1, type: "LINK", next_scene_id: 2 }), null);
});

test("accepts an information tag with only a title", () => {
  assert.equal(validateHotspot({ unique_id: 1, type: "INFO", title: "Room details" }), null);
});

test("still requires an information tag title", () => {
  assert.equal(validateHotspot({ unique_id: 1, type: "INFO" }), "Information tag title is required.");
});

test("includes navigation rotation in the saved hotspot details", () => {
  const payload = buildHotspotPayload(
    { unique_id: 1, type: "LINK", next_scene_id: 2, rotation: 90 },
    10,
    20
  );

  assert.equal(payload.rotation, 90);
  assert.equal(payload.details.rotation, 90);
  assert.equal(payload.details.type, "LINK");
});
