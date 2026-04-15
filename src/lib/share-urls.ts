/**
 * Share URLs — always use the public wujha.me domain.
 * OG meta tags are handled client-side via react-helmet-async.
 */

const PUBLIC_DOMAIN = "https://wujha.me";

export function getEventShareUrl(eventId: string): string {
  return `${PUBLIC_DOMAIN}/events/${eventId}`;
}

export function getInviteShareUrl(eventId: string): string {
  return `${PUBLIC_DOMAIN}/invite/${eventId}`;
}

export function getPlaceShareUrl(placeId: string): string {
  return `${PUBLIC_DOMAIN}/places/${placeId}`;
}

const SUPABASE_PROJECT_URL = "https://pvukxnglbickupnjwphf.supabase.co";

export function getRegisterShareUrl(subSlug: string): string {
  // Use the og-meta edge function to provide a rich social preview
  return `${SUPABASE_PROJECT_URL}/functions/v1/og-meta/register/${subSlug}`;
}

/** Aliases used by Helmet for og:url */
export const getCanonicalEventUrl = getEventShareUrl;
export const getCanonicalPlaceUrl = getPlaceShareUrl;
