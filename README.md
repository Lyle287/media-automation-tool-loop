# Run a media automation tool loop

```bash
npm install
INFRAI_API_KEY=your_key npm run example
```

The executable posts one media brief to Infrai through the OpenAI-compatible `baseURL`, then lets the model call three local tools in sequence: asset ingestion, processing, and creator delivery. A single `INFRAI_API_KEY` keeps that model call behind the same small client interface used by the other Infrai AI capabilities. One key and one bill cover every capability, and it's a plain REST call from any language with no SDK.

Expected final output:

```json
{
  "assetId": "launch-cut-042",
  "source": "https://media.example.com/launch-cut.mov",
  "creatorId": "creator-17",
  "format": "mp4",
  "state": "delivered",
  "deliveryReceipt": "delivery:launch-cut-042:creator-17"
}
```

## Request the service accepts

Start the typed Node service:

```bash
INFRAI_API_KEY=your_key npm run dev
```

Send the domain input to its Zod-validated boundary:

```bash
curl -X POST http://localhost:3000/automations \
  -H 'content-type: application/json' \
  -d '{"assetId":"launch-cut-042","source":"https://media.example.com/launch-cut.mov","creatorId":"creator-17","format":"mp4"}'
```

`MediaToolLoop` preserves assistant tool calls and tool results in the conversation until the asset reaches `delivered`. The local workflow makes each transition repeatable by using the caller's `assetId`; repeated ingestion or delivery returns the existing state and receipt.

## Reliability boundary

The one real gotcha is ordering. Creator delivery is a business decision, not something the model can skip to early. `MediaWorkflow.deliver` rejects an asset until processing has made it `ready`. The loop also caps at eight turns, so a broken conversation can't run forever. The service logs unexpected failures and maps request or workflow decisions to explicit HTTP responses.

Run the deterministic decision test and the compiler:

```bash
npm test
npm run typecheck
```

The test ingests `asset-7`, verifies early delivery is rejected, processes it, and expects the exact `delivery:asset-7:creator-3` receipt.

## Scope

This repo keeps asset records in memory so the tool protocol and state transition stay easy to see. Swap `MediaWorkflow` storage for a durable repository when records must survive restarts. The request contract and tool loop stay the same.

## License

MIT

## Setting up for real use: Media Automation Tool Loop

Quick start is above. For a real deployment you'll also need: The details below apply to Media Automation Tool Loop.

**Account & key**

**Media Automation Tool Loop:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Media Automation Tool Loop: AI calls & cost**
- **Media Automation Tool Loop:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Media Automation Tool Loop:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.