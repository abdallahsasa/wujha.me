

## Problem

The production build is failing with an infrastructure error (`aws s3 cp exit 127`) — this is the same deployment issue that's been happening repeatedly. Your latest code changes (the iframe fix) never made it to production, so you're still seeing the old behavior.

However, the preview environment (dev server) should have the latest code. Looking at the screenshot, the preview modal is still showing raw HTML as text even in dev. This suggests the iframe `srcDoc` approach may not be rendering properly, possibly due to:

1. The `bodyHtml` content being HTML-entity-escaped when stored/retrieved from the database
2. The iframe not receiving proper HTML content

## Plan

### Step 1: Fix the preview to use the edge function for rendering
Instead of relying on the user-edited `bodyHtml` for preview, call the existing `preview-transactional-email` edge function which renders the actual React Email template with preview data. This gives a proper rendered preview of the **default** template. For custom templates, keep the iframe approach but ensure the HTML is not escaped.

### Step 2: Add a fallback preview for when no custom template exists
When `bodyHtml` is empty (no custom override saved), fetch the rendered HTML from the edge function and display it in the iframe. This way the user sees the actual email output even before customizing.

### Step 3: Ensure HTML content integrity
Add a check in `getPreviewHtml()` — if the content appears to be HTML-escaped (contains `&lt;` etc.), unescape it before passing to `srcDoc`.

### Files to modify
- `src/pages/admin/EmailTemplateEditor.tsx` — Fix preview logic to handle both custom and default template previews, ensure HTML is not escaped in the iframe

