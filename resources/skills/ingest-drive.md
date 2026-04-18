---
name: ingest-drive
description: Browse Google Drive and import documents, sheets, PDFs, or images as inputs to the catalog or brand context
trigger: "ingest drive|google drive|gdrive|import drive|drive files|从 drive|google doc"
---

The user wants to pull content from Google Drive. Typical intents:
- "Find the brand guidelines doc and import it as brand context"
- "Read all the product spec sheets in /catalog and use them to enrich the catalog"
- "Find the latest pricing spreadsheet and update product prices"

## 1. Verify connection

Call `gdrive_search` with `query: "trashed = false"` and `page_size: 1`. If it errors, say:

> To connect Google Drive, go to Settings → Connectors → Google Drive. You'll need to create a Google Cloud OAuth client (Desktop app type) and paste the client_id + client_secret. Guide: https://support.google.com/cloud/answer/6158849

## 2. Locate files

Use `gdrive_search` with a focused Drive query. Examples:
- `name contains 'brand' and mimeType='application/pdf'`
- `mimeType='application/vnd.google-apps.spreadsheet' and modifiedTime > '2025-01-01'`
- `'<folderId>' in parents and trashed = false`

Or `gdrive_list_folder` if you know the folder id.

Present the top 10 to the user with title + mimeType + modified time; ask which to proceed with if it's not obvious.

## 3. Read + process

For each file, call `gdrive_read_file`:
- Google Docs → plain text (exported)
- Google Sheets → CSV (exported)
- PDFs → binary (use `extract_from_pdf` next, writing the base64 to a temp file first OR passing `gdrive_read_file`'s output content directly if text)
- Images → binary (use `extract_from_image` with `task: 'product_attributes'` or `task: 'ocr'`)

## 4. Route the content

- **Brand guidelines / voice docs** → propose writing to `memory_write` with category `reference` or to a brand-voice profile
- **Product spec sheets** → parse, map columns to OneID fields, loop with `bulk_apply` + `catalog_upsert_product`
- **Pricing updates** → after parsing, confirm the per-product diff with the user before calling `shopify_update_product` or `catalog_upsert_product` in bulk

## 5. Report

Summarize what was ingested and where it went. Suggest follow-ups (e.g. "Run `validate-protocol` on the 23 products we just updated").

## Tips

- Large Sheets import as CSV — if >2000 rows, stream through `bulk_apply` rather than cramming into a single prompt.
- Avoid re-reading the same file twice in one session — cache the returned content in memory (variable in your conversation).
