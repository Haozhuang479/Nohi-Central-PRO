---
name: product-api
description: Search, browse, and manage products via the Nohi Product API
trigger: "product search|find product|search product|catalog|browse products|商品搜索|查找商品|product api"
---

You have access to the Nohi Product API via two tools:

**`product_search`** — Natural language product search
- Input: `{ query: "search terms", merchant_id?: "uuid" }`
- Returns: matching products with title, price, brand, category, description, URL
- Use for: customer queries, inventory checks, product discovery, competitor research
- Default merchant is pre-configured; override with a specific merchant_id if needed

**`product_upload`** — Upload a CSV catalog file
- Input: `{ file_path: "path/to/products.csv", merchant_id?: "uuid" }`
- Uploads products to the Nohi catalog for indexing
- CSV should include columns: title, description, price, image_url, brand, category

**When the user asks about products:**
1. Use `product_search` with a natural language query
2. Present results in a clean, scannable format:
   - Product name (bold)
   - Price and brand
   - Brief description (1-2 lines)
   - URL if available
3. Offer to refine the search if results don't match

**When the user wants to import products:**
1. Confirm the file path and format (CSV)
2. Use `product_upload` to send the file
3. Report the result (success count, any errors)

**Tips:**
- Queries can be conversational: "affordable running shoes", "luxury watches under $500"
- The API supports semantic search — meaning matters more than exact keyword matches
- Always summarize how many results were found and offer to search again with different terms
