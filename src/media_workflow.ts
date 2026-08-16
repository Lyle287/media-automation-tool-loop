import { z } from "zod";

export const automationRequestSchema = z.object({
  assetId: z.string().min(1),
  source: z.string().url(),
  creatorId: z.string().min(1),
  format: z.enum(["mp4", "webm"]),
});

export type AutomationRequest = z.infer<typeof automationRequestSchema>;
export type AssetState = "ingested" | "processing" | "ready" | "delivered";

export interface MediaAsset extends AutomationRequest {
  state: AssetState;
  deliveryReceipt?: string;
}

export class MediaWorkflow {
  private readonly assets = new Map<string, MediaAsset>();

  ingest(input: AutomationRequest): MediaAsset {
    const current = this.assets.get(input.assetId);
    if (current) return current;
    const asset: MediaAsset = { ...input, state: "ingested" };
    this.assets.set(input.assetId, asset);
    return asset;
  }

  process(assetId: string): MediaAsset {
    const asset = this.requireAsset(assetId);
    if (asset.state === "delivered" || asset.state === "ready") return asset;
    asset.state = "processing";
    asset.state = "ready";
    return asset;
  }

  deliver(assetId: string): MediaAsset {
    const asset = this.requireAsset(assetId);
    if (asset.state !== "ready" && asset.state !== "delivered") {
      throw new WorkflowDecisionError("Asset must be ready before creator delivery");
    }
    if (asset.state === "ready") {
      asset.state = "delivered";
      asset.deliveryReceipt = `delivery:${asset.assetId}:${asset.creatorId}`;
    }
    return asset;
  }

  get(assetId: string): MediaAsset | undefined {
    return this.assets.get(assetId);
  }

  private requireAsset(assetId: string): MediaAsset {
    const asset = this.assets.get(assetId);
    if (!asset) throw new WorkflowDecisionError(`Unknown asset: ${assetId}`);
    return asset;
  }
}

export class WorkflowDecisionError extends Error {}
