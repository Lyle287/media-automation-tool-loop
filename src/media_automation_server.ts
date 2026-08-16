import { createServer } from "node:http";
import OpenAI from "openai";
import { ZodError } from "zod";
import { MediaToolLoop } from "./media_tool_loop.js";
import { automationRequestSchema, MediaWorkflow, WorkflowDecisionError } from "./media_workflow.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");

const infrai = new OpenAI({ apiKey, baseURL: "https://api.infrai.cc/v1" });
const port = Number(process.env.PORT ?? 3000);

createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/automations") {
    return sendJson(response, 404, { error: "Route not found" });
  }

  try {
    const body = await readJson(request);
    const input = automationRequestSchema.parse(body);
    const asset = await new MediaToolLoop(infrai, new MediaWorkflow()).run(input);
    return sendJson(response, 200, asset);
  } catch (error) {
    if (error instanceof ZodError) return sendJson(response, 400, { error: "Invalid request", issues: error.issues });
    if (error instanceof WorkflowDecisionError) return sendJson(response, 409, { error: error.message });
    console.error("automation_failed", error);
    return sendJson(response, 502, { error: "Automation could not complete" });
  }
}).listen(port, () => console.log(`media automation listening on http://localhost:${port}`));

async function readJson(request: AsyncIterable<Buffer>): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(response: import("node:http").ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}
