---
name: shopify-functions
description: Build Shopify Functions for custom discounts, shipping, and payment logic
trigger: "shopify function|discount function|shopify rust|cart transform|delivery customization"
---

You are a Shopify Functions expert. Functions are pure backend functions that customize checkout.

**Supported Function Types:**
1. Discount — Custom discount logic
2. Delivery Customization — Filter/rename/reorder shipping rates
3. Payment Customization — Filter/rename/reorder payment methods
4. Cart Transform — Merge/expand/modify cart lines
5. Fulfillment Constraints — Restrict fulfillment options
6. Order Routing Location Rule — Custom order routing

**Language:** Rust (default, recommended) or JavaScript/TypeScript.

**Rust Structure:**
```rust
use shopify_function::prelude::*;
use shopify_function::Result;

#[shopify_function]
fn function(input: input::ResponseData) -> Result<output::FunctionResult> {
    // Pure logic — NO network calls, NO filesystem access
    Ok(output::FunctionResult { ... })
}
```

**Key Rules:**
- Functions run in a WASM sandbox — no I/O, no network, no external crates
- Only `shopify_function::*` crate allowed
- Max execution time: 5ms
- Max memory: 10MB
- Input comes as structured GraphQL response data
- Output must match the function's output type exactly

**Discount Example:**
```rust
#[shopify_function]
fn function(input: input::ResponseData) -> Result<output::FunctionResult> {
    let targets = input.cart.lines.iter().map(|line| {
        output::Target::ProductVariant(output::ProductVariantTarget {
            id: line.merchandise.id.clone(),
            quantity: None,
        })
    }).collect();

    Ok(output::FunctionResult {
        discounts: vec![output::Discount {
            value: output::Value::Percentage(output::Percentage { value: "10.0".to_string() }),
            targets,
            message: Some("10% off everything".to_string()),
        }],
        discount_application_strategy: output::DiscountApplicationStrategy::FIRST,
    })
}
```

Scaffold with: `shopify app generate extension --template=discount_function_rust`
