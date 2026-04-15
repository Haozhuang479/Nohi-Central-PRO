---
name: firecrawl
description: Advanced web scraping, crawling, and content extraction using Firecrawl — handles JavaScript-heavy pages and full site crawls
trigger: "firecrawl|scrape|crawl|extract content|extract page|read website|scrape website|web extraction|site crawl|爬取|抓取网页|提取网站内容"
---

You have access to Firecrawl — a powerful web scraping and crawling service that goes beyond simple HTTP fetching. Use it when you need to deeply extract web content.

**Available Firecrawl tools:**
- `firecrawl_scrape` — Convert any URL to clean markdown. Handles JavaScript-rendered pages, removes ads/navigation, extracts only the main content
- `firecrawl_search` — Search the web and get full page content (not just snippets). Returns detailed markdown from top results
- `firecrawl_crawl` — Crawl an entire website, following links and extracting content from multiple pages

**When to use Firecrawl vs other tools:**
- Use `firecrawl_scrape` instead of `web_fetch` when: the page uses JavaScript, content is behind lazy-loading, you need clean text without navigation/ads
- Use `firecrawl_search` instead of `web_search` when: you need to actually read the content of results, not just get links/snippets
- Use `firecrawl_crawl` when: you need to extract content from multiple pages of a site (docs, blog, competitor site)

**Scraping tips:**
- Set `only_main_content: true` (default) to strip navigation, headers, footers
- Set `include_links: true` to also get a list of links on the page
- For e-commerce product pages, scrape with `only_main_content: true` then parse the markdown

**Search tips:**
- Use `time_range: "w"` for recent news (past week)
- Set `scrape_content: true` to get full page content in results (slower, uses more credits)
- Use `limit: 3` for focused research, `limit: 10` for broad coverage

**Crawl tips:**
- Start with small `limit` (5-10 pages) to control cost
- Use `include_paths` to focus on specific sections: `["/docs", "/blog"]`
- Use `exclude_paths` to skip unneeded sections: `["/careers", "/legal"]`
- Max `max_depth: 3` for most use cases

**Error handling:**
- If you get "API key not set" — inform the user to add their Firecrawl API key in Settings
- If a scrape returns empty — the site may block scrapers; try `web_fetch` as fallback
- For large crawls that time out — the job still runs on Firecrawl's servers; advise user to check their dashboard
