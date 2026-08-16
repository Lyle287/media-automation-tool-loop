import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import { z } from "zod";
import { MediaWorkflow, type AutomationRequest, type MediaAsset } from "./media_workflow.js";

const assetIdArguments = z.object({ assetId: z.string().min(1) });

const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "ingest_asset",
      description: "Register a source media asset for processing",
      parameters: {
        type: "object",
        properties: {
          assetId: { type: "string" },
          source: { type: "string" },
          creatorId: { type: "string" },
          format: { type: "string", enum: ["mp4", "webm"] },
        },
        required: ["assetId", "source", "creatorId", "format"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "process_asset",
      description: "Run the media processing job",
      parameters: {
        type: "object",
        properties: { assetId: { type: "string" } },
        required: ["assetId"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "deliver_to_creator",
      description: "Deliver a ready asset and return its receipt",
      parameters: {
        type: "object",
        properties: { assetId: { type: "string" } },
        required: ["assetId"],
        additionalProperties: false,
      },
    },
  },
];

export class MediaToolLoop {
  private readonly infrai: OpenAI;
  private readonly workflow: MediaWorkflow;
  private readonly maxTurns: number;

  constructor(infrai: OpenAI, workflow: MediaWorkflow, maxTurns = 8) {
    this.infrai = infrai;
    this.workflow = workflow;
    this.maxTurns = maxTurns;
  }

  async run(input: AutomationRequest): Promise<MediaAsset> {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: "Automate the media workflow. Ingest, process, then deliver. Use tools for every transition.",
      },
      { role: "user", content: JSON.stringify(input) },
    ];

    for (let turn = 0; turn < this.maxTurns; turn += 1) {
      const response = await this.infrai.chat.completions.create({
        model: "auto",
        messages,
        tools,
        tool_choice: "auto",
      });
      const message = response.choices[0]?.message;
      if (!message) throw new Error("Completion returned no message");
      messages.push(message);

      if (!message.tool_calls?.length) {
        const asset = this.workflow.get(input.assetId);
        if (asset?.state === "delivered") return asset;
        throw new Error("Tool loop ended before delivery");
      }

      for (const call of message.tool_calls) {
        if (call.type !== "function") continue;
        const result = this.execute(call.function.name, call.function.arguments);
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
    }
    throw new Error(`Tool loop exceeded ${this.maxTurns} turns`);
  }

  private execute(name: string, rawArguments: string): MediaAsset {
    const parsed: unknown = JSON.parse(rawArguments);
    if (name === "ingest_asset") return this.workflow.ingest(parsed as AutomationRequest);
    const { assetId } = assetIdArguments.parse(parsed);
    if (name === "process_asset") return this.workflow.process(assetId);
    if (name === "deliver_to_creator") return this.workflow.deliver(assetId);
    throw new Error(`Unknown tool: ${name}`);
  }
}
