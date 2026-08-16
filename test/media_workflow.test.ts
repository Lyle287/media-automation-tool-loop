import assert from "node:assert/strict";
import test from "node:test";
import { MediaWorkflow, WorkflowDecisionError } from "../src/media_workflow.js";

test("creator delivery is allowed only after processing", () => {
  const workflow = new MediaWorkflow();
  workflow.ingest({
    assetId: "asset-7",
    source: "https://media.example.com/asset-7.mov",
    creatorId: "creator-3",
    format: "mp4",
  });

  assert.throws(() => workflow.deliver("asset-7"), WorkflowDecisionError);
  assert.equal(workflow.process("asset-7").state, "ready");
  assert.deepEqual(workflow.deliver("asset-7"), {
    assetId: "asset-7",
    source: "https://media.example.com/asset-7.mov",
    creatorId: "creator-3",
    format: "mp4",
    state: "delivered",
    deliveryReceipt: "delivery:asset-7:creator-3",
  });
});
