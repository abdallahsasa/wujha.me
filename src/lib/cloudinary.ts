const CLOUD_NAME = "dvwgmj04i";
const UPLOAD_PRESET = "wujha_unsigned";
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

export async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(UPLOAD_URL, { method: "POST", body: formData });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Upload failed: ${err}`);
  }
  const data = await res.json();
  return data.secure_url as string;
}

/** Insert transformation params after /upload/ in a Cloudinary URL */
function insertTransform(url: string, transform: string): string {
  if (!url || !url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/${transform}/`);
}

/** Auto format + quality optimization */
export function optimizeUrl(url: string): string {
  if (!url) return url;
  return insertTransform(url, "f_auto,q_auto");
}

/** Card thumbnails — 600px width, smart crop */
export function thumbnailUrl(url: string): string {
  if (!url) return url;
  return insertTransform(url, "f_auto,q_auto,w_600,c_fill");
}

/** Gallery images — capped at 1200px width */
export function galleryUrl(url: string): string {
  if (!url) return url;
  return insertTransform(url, "f_auto,q_auto,w_1200,c_limit");
}
