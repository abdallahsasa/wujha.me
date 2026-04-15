import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const CRAWLER_AGENTS = [
  "facebookexternalhit",
  "whatsapp",
  "twitterbot",
  "telegrambot",
  "linkedinbot",
  "slackbot",
  "discordbot",
  "googlebot",
  "bingbot",
  "applebot",
  "pinterest",
  "vkshare",
  "bot",
  "crawler",
  "spider",
];

const DEFAULT_IMAGE = "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f174a647-ed77-4ece-9448-c7b7df4ad0cf/id-preview-e38e7a4a--10fe852c-9f6d-4878-8ae3-38dbf9a42ae3.lovable.app-1774735455644.png";
const SITE_NAME = "وجهة | Wujha";

function isCrawler(ua: string): boolean {
  const lower = ua.toLowerCase();
  return CRAWLER_AGENTS.some((agent) => lower.includes(agent));
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + "...";
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildOgHtml(params: {
  title: string;
  description: string;
  image: string;
  url: string;
  redirectUrl: string;
}): string {
  const { title, description, image, url, redirectUrl } = params;
  const t = escapeHtml(title);
  const d = escapeHtml(truncate(description, 160));
  const img = escapeHtml(image);
  const u = escapeHtml(url);
  const r = escapeHtml(redirectUrl);

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t}</title>
  <meta name="description" content="${d}" />

  <meta property="og:title" content="${t}" />
  <meta property="og:description" content="${d}" />
  <meta property="og:image" content="${img}" />
  <meta property="og:url" content="${u}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${t}" />
  <meta name="twitter:description" content="${d}" />
  <meta name="twitter:image" content="${img}" />

  <meta http-equiv="refresh" content="0;url=${r}" />
</head>
<body>
  <p>Redirecting to <a href="${r}">${t}</a>...</p>
</body>
</html>`;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const ua = req.headers.get("user-agent") || "";

  // Parse the path after /og-meta/
  // Expected paths: /og-meta/events/:id, /og-meta/places/:id, /og-meta/invite/:id
  const pathParts = url.pathname.replace(/^\/og-meta\/?/, "").split("/").filter(Boolean);
  const routeType = pathParts[0]; // events | places | invite | register
  const itemId = pathParts[1];

  // Determine the app's base URL from the Referer or Origin, fallback to env
  let appBaseUrl = Deno.env.get("APP_BASE_URL") || url.origin;
  // Ensure protocol is present to avoid relative-URL loops
  if (appBaseUrl && !appBaseUrl.startsWith("http")) {
    appBaseUrl = `https://${appBaseUrl}`;
  }
  
  // Build the canonical SPA URL for this content
  let spaPath = "/";
  if (routeType && itemId) {
    if (routeType === "register") {
      spaPath = `/event/register/${itemId}`;
    } else {
      spaPath = `/${routeType}/${itemId}`;
    }
  }
  const spaUrl = `${appBaseUrl.replace(/\/functions\/v1\/og-meta.*/, "")}${spaPath}`;

  // If not a crawler, redirect to the SPA
  if (!isCrawler(ua)) {
    // For non-crawlers, redirect to the actual app
    // Use the published/preview URL
    const redirectTarget = Deno.env.get("APP_BASE_URL") 
      ? `${Deno.env.get("APP_BASE_URL")}${spaPath}`
      : spaPath;
    return new Response(null, {
      status: 302,
      headers: { Location: redirectTarget },
    });
  }

  // For crawlers, fetch data and return OG HTML
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const ogUrl = url.href;

  try {
    if (routeType === "events" && itemId) {
      const { data } = await supabase
        .from("events")
        .select("title_ar, short_description_ar, cover_image")
        .eq("id", itemId)
        .single();

      if (data) {
        return new Response(
          buildOgHtml({
            title: data.title_ar,
            description: data.short_description_ar,
            image: data.cover_image || DEFAULT_IMAGE,
            url: ogUrl,
            redirectUrl: spaUrl,
          }),
          { headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      }
    }
    
    if (routeType === "register" && itemId) {
      const { data } = await supabase
        .from("sub_organizer_allocations")
        .select(`
          unique_slug,
          events (title_ar, short_description_ar, cover_image),
          sub_organizers:admin_users (name)
        `)
        .eq("unique_slug", itemId)
        .single();

      if (data) {
        const ev = data.events as any;
        const subOrgName = (data as any).sub_organizers?.name || "";
        return new Response(
          buildOgHtml({
            title: `وجهة | wujha - فعالية ${ev.title_ar} | ${subOrgName}`,
            description: ev.short_description_ar || "سجّل الآن عبر هذا الرابط الحصري",
            image: ev.cover_image || DEFAULT_IMAGE,
            url: ogUrl,
            redirectUrl: spaUrl,
          }),
          { headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      }
    }

    if (routeType === "invite" && itemId) {
      const { data } = await supabase
        .from("events")
        .select("title_ar, short_description_ar, cover_image")
        .eq("id", itemId)
        .single();

      if (data) {
        return new Response(
          buildOgHtml({
            title: data.title_ar,
            description: `سجّل الآن في ${data.title_ar} على وجهة`,
            image: data.cover_image || DEFAULT_IMAGE,
            url: ogUrl,
            redirectUrl: spaUrl,
          }),
          { headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      }
    }

    if (routeType === "places" && itemId) {
      const { data } = await supabase
        .from("places")
        .select("name_ar, description_ar, cover_image")
        .eq("id", itemId)
        .single();

      if (data) {
        return new Response(
          buildOgHtml({
            title: data.name_ar,
            description: data.description_ar,
            image: data.cover_image || DEFAULT_IMAGE,
            url: ogUrl,
            redirectUrl: spaUrl,
          }),
          { headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      }
    }

    // Default / fallback
    return new Response(
      buildOgHtml({
        title: SITE_NAME,
        description: "اكتشف أفضل الفعاليات والأماكن في سوريا. حفلات، مهرجانات، حياة ليلية والمزيد.",
        image: DEFAULT_IMAGE,
        url: ogUrl,
        redirectUrl: spaUrl,
      }),
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (err) {
    console.error("og-meta error:", err);
    return new Response(
      buildOgHtml({
        title: SITE_NAME,
        description: "اكتشف أفضل الفعاليات والأماكن في سوريا",
        image: DEFAULT_IMAGE,
        url: ogUrl,
        redirectUrl: spaUrl,
      }),
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
});
