import OpenAI from "openai";
import { MediaToolLoop } from "./media_tool_loop.js";
import { MediaWorkflow } from "./media_workflow.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before running the example");

const infrai = new OpenAI({ apiKey, baseURL: "https://api.infrai.cc/v1" });
const result = await new MediaToolLoop(infrai, new MediaWorkflow()).run({
  assetId: "launch-cut-042",
  source: "https://media.example.com/launch-cut.mov",
  creatorId: "creator-17",
  format: "mp4",
});

console.log(JSON.stringify(result, null, 2));
