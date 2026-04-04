/**
 * Client-side image compression / resize utility.
 * Resizes an image to fit within maxWidth × maxHeight while maintaining aspect ratio.
 * Returns a new File (JPEG at given quality, or PNG if transparent).
 */
export async function compressImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality = 0.85
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Only downscale, never upscale
      if (width <= maxWidth && height <= maxHeight) {
        resolve(file);
        return;
      }

      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas context unavailable")); return; }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("Compression failed")); return; }
          const ext = blob.type === "image/png" ? ".png" : ".jpg";
          const name = file.name.replace(/\.[^.]+$/, "") + "_compressed" + ext;
          resolve(new File([blob], name, { type: blob.type }));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for compression"));
    };
    img.src = url;
  });
}

/** Media specification for an upload field */
export interface MediaSpec {
  /** Recommended width in pixels */
  width: number;
  /** Recommended height in pixels */
  height: number;
  /** Aspect ratio label e.g. "16:9" */
  aspectRatio: string;
  /** Max file size in MB */
  maxSizeMB: number;
  /** Accepted MIME types */
  acceptedFormats: string[];
  /** Arabic helper text */
  hint: string;
}

const IMG_FORMATS = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_FORMATS = ["video/mp4", "video/webm", "video/quicktime"];

export const MEDIA_SPECS: Record<string, MediaSpec> = {
  // Event
  "event-cover": {
    width: 1200, height: 675, aspectRatio: "16:9", maxSizeMB: 5,
    acceptedFormats: IMG_FORMATS,
    hint: "الأبعاد المُوصى بها: 1200×675 بكسل (16:9) · أقصى حجم: 5MB · JPG, PNG, WebP",
  },
  "event-hero-thumbnail": {
    width: 1920, height: 600, aspectRatio: "16:5", maxSizeMB: 5,
    acceptedFormats: IMG_FORMATS,
    hint: "الأبعاد المُوصى بها: 1920×600 بكسل (16:5) · أقصى حجم: 5MB · JPG, PNG, WebP",
  },
  "event-hero-video": {
    width: 1920, height: 1080, aspectRatio: "16:9", maxSizeMB: 100,
    acceptedFormats: VIDEO_FORMATS,
    hint: "الأبعاد المُوصى بها: 1920×1080 بكسل (16:9) · أقصى حجم: 100MB · MP4, WebM",
  },
  "event-gallery": {
    width: 1200, height: 900, aspectRatio: "4:3", maxSizeMB: 5,
    acceptedFormats: IMG_FORMATS,
    hint: "الأبعاد المُوصى بها: 1200×900 بكسل (4:3) · أقصى حجم: 5MB · JPG, PNG, WebP",
  },
  // Place
  "place-cover": {
    width: 800, height: 600, aspectRatio: "4:3", maxSizeMB: 5,
    acceptedFormats: IMG_FORMATS,
    hint: "الأبعاد المُوصى بها: 800×600 بكسل (4:3) · أقصى حجم: 5MB · JPG, PNG, WebP",
  },
  "place-gallery": {
    width: 1200, height: 900, aspectRatio: "4:3", maxSizeMB: 5,
    acceptedFormats: IMG_FORMATS,
    hint: "الأبعاد المُوصى بها: 1200×900 بكسل (4:3) · أقصى حجم: 5MB · JPG, PNG, WebP",
  },
  // Venue
  "venue-cover": {
    width: 800, height: 600, aspectRatio: "4:3", maxSizeMB: 5,
    acceptedFormats: IMG_FORMATS,
    hint: "الأبعاد المُوصى بها: 800×600 بكسل (4:3) · أقصى حجم: 5MB · JPG, PNG, WebP",
  },
  "venue-gallery": {
    width: 1200, height: 900, aspectRatio: "4:3", maxSizeMB: 5,
    acceptedFormats: IMG_FORMATS,
    hint: "الأبعاد المُوصى بها: 1200×900 بكسل (4:3) · أقصى حجم: 5MB · JPG, PNG, WebP",
  },
  // Organizer
  "organizer-logo": {
    width: 400, height: 400, aspectRatio: "1:1", maxSizeMB: 2,
    acceptedFormats: IMG_FORMATS,
    hint: "الأبعاد المُوصى بها: 400×400 بكسل (1:1) · أقصى حجم: 2MB · JPG, PNG, WebP",
  },
  // Page content
  "page-image": {
    width: 1200, height: 675, aspectRatio: "16:9", maxSizeMB: 5,
    acceptedFormats: IMG_FORMATS,
    hint: "الأبعاد المُوصى بها: 1200×675 بكسل (16:9) · أقصى حجم: 5MB · JPG, PNG, WebP",
  },
};
