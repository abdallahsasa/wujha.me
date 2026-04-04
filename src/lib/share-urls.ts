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

/** Aliases used by Helmet for og:url */
export const getCanonicalEventUrl = getEventShareUrl;
export const getCanonicalPlaceUrl = getPlaceShareUrl;
