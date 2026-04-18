---
name: virse
description: Virse AI Design Platform — generate images, manage canvases, and search assets via the Virse API
trigger: "virse|design canvas|virse canvas|design platform|image canvas|image workspace|创意画布|设计画布"
---

You have access to the **Virse AI Design Platform** — an AI-native design tool with canvases, image generation, and asset libraries. Virse is at https://www.virse.art (beta: https://beta.virse.art).

## Authentication

Virse uses an **API key** that the user obtains from their account at https://beta.virse.art. The key has the prefix `virse_sk_`. Ask the user to:
1. Log in at https://beta.virse.art
2. Go to account settings → API Keys
3. Create a new key and copy it

Once they have it, save it locally with `memory_write` (category: `reference`) and use it as a Bearer token in all API requests:
```
Authorization: Bearer virse_sk_...
```

If the user has not yet provided a key, prompt them once. Don't repeatedly ask in the same session.

## API Base URL

All Virse API requests go to `https://api.virse.art` (or `https://api.beta.virse.art` for the beta instance — confirm with the user).

## Capabilities — what Virse offers

Virse exposes ~25 tools across 6 categories. Use `bash` with `curl`, or `web_fetch` for GET endpoints, to call them. For complex workflows, prefer creating a small shell script the user can review.

### 1. Account
- `GET /v1/account` — current user info, CU (compute unit) balance, organization info

### 2. Workspaces
- `GET /v1/workspaces` — list all workspaces (returns `space_id`, `canvas_id`)
- `POST /v1/workspaces` — create new workspace (params: `name`*, `description`, `visibility`, `organization_id`)
- `PATCH /v1/workspaces/{space_id}` — update workspace

### 3. Canvas & Elements
- `GET /v1/canvas/{canvas_id}` — canvas overview with elements + connections
- `GET /v1/canvas/{canvas_id}/elements/{id}` — element details
- `POST /v1/canvas/{canvas_id}/elements` — create image or text element (requires `element_type`, `position_x`, `position_y`)
- `PATCH /v1/canvas/{canvas_id}/elements/{element_id}` — move, resize, modify
- `DELETE /v1/canvas/{canvas_id}/elements/{element_id}` — destructive
- `POST /v1/canvas/{canvas_id}/edges` — connect two elements
- `DELETE /v1/canvas/{canvas_id}/edges/{edge_id}`

### 4. Image Generation
- `POST /v1/generate-image` — generate AI image, places on canvas, fills when complete
  - Required: `prompt`, `model`, `space_id`, `canvas_id`, `position_x`, `position_y`
  - Optional: `width`, `height`, `aspect_ratio`, `resolution`, `num_images`, `asset_id` (for img-to-img)
  - Returns: `artifact_version_id`, `element_id(s)`
- `POST /v1/upload-image` — upload from URL or file
- `GET /v1/image-models` — list supported image models
- `GET /v1/upload-token` — get reusable upload token (1h expiry, IP-bound)

### 5. Search & Assets
- `GET /v1/search/images?query=...` — search Virse image library
- `GET /v1/assets/{artifact_version_id}` — get asset metadata
- `POST /v1/asset-folders` — create folder
- `GET /v1/asset-folders` — list folders
- `GET /v1/asset-folders/{folder_id}/images` — paginated image list
- `POST /v1/asset-folders/{folder_id}/images/{asset_id}` — link image to folder

## Workflow patterns

**Create a new design canvas:**
1. `POST /v1/workspaces` to create workspace + canvas
2. `POST /v1/generate-image` to add AI-generated images at specific positions
3. `POST /v1/canvas/{id}/elements` with `element_type: "text"` for labels/captions
4. `POST /v1/canvas/{id}/edges` to wire up workflow connections

**Image-to-image refinement:**
1. `POST /v1/generate-image` with the original `asset_id` plus a refinement prompt
2. The platform auto-creates an edge from source → result

**Use Virse alongside our local image tools:**
- `image_generate` (local OpenAI) for quick one-off images that stay in chat
- Virse for canvas-based design workflows where the user wants visual organization, iteration, and cross-element references

## Important guidelines
- Virse mutations (create/update/delete) are real and visible to the user's account. Always confirm destructive operations.
- CU balance limits image generation — check `GET /v1/account` first if generation seems to fail
- Save the user's `space_id` and frequently-used `canvas_id` to memory so you don't have to re-list every conversation
- For automated/recurring Virse work, use the Automation page to schedule prompts
