import { useState, useRef } from "react";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { compressImage, MEDIA_SPECS, type MediaSpec } from "@/lib/image-utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, GripVertical } from "lucide-react";

interface CloudinaryGalleryProps {
  images: string[];
  onChange: (urls: string[]) => void;
  /** Key into MEDIA_SPECS for hints, validation & auto-compression */
  mediaSpec?: string;
}

export default function CloudinaryGallery({ images, onChange, mediaSpec }: CloudinaryGalleryProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const spec: MediaSpec | undefined = mediaSpec ? MEDIA_SPECS[mediaSpec] : undefined;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxMB = spec?.maxSizeMB ?? 5;

    setUploading(true);
    const newUrls: string[] = [];
    for (let file of Array.from(files)) {
      // Format validation
      if (spec?.acceptedFormats && !spec.acceptedFormats.includes(file.type)) {
        toast({ title: "صيغة غير مدعومة", description: `${file.name} — الصيغ المقبولة: ${spec.acceptedFormats.map(f => f.split("/")[1].toUpperCase()).join(", ")}`, variant: "destructive" });
        continue;
      }
      // Size validation
      if (file.size > maxMB * 1024 * 1024) {
        toast({ title: "الملف كبير جداً", description: `${file.name} — الحد الأقصى ${maxMB}MB`, variant: "destructive" });
        continue;
      }
      try {
        // Auto-compress
        if (spec && file.type.startsWith("image/")) {
          file = await compressImage(file, spec.width, spec.height);
        }
        const url = await uploadToCloudinary(file);
        newUrls.push(url);
      } catch (err: any) {
        toast({ title: "فشل الرفع", description: err.message, variant: "destructive" });
      }
    }
    if (newUrls.length > 0) {
      onChange([...images, ...newUrls]);
      toast({ title: `تم إضافة ${newUrls.length} صورة` });
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRemove = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const reordered = [...images];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, moved);
    onChange(reordered);
    setDragIndex(index);
  };
  const handleDragEnd = () => setDragIndex(null);

  return (
    <div className="space-y-4">
      <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
        <Upload className="mr-2 h-4 w-4" />
        {uploading ? "جاري الرفع..." : "إضافة صور"}
      </Button>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />

      {spec && (
        <p className="text-xs text-muted-foreground/70 leading-relaxed" dir="rtl">{spec.hint}</p>
      )}

      {images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((url, i) => (
            <div
              key={`${url}-${i}`}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDragEnd={handleDragEnd}
              className={`relative group aspect-video rounded-lg overflow-hidden border cursor-grab ${dragIndex === i ? "opacity-50" : ""}`}
            >
              <img src={url} alt={`Gallery ${i + 1}`} className="h-full w-full object-cover" />
              <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="h-4 w-4 text-white drop-shadow" />
              </div>
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="absolute top-1 right-1 bg-black/60 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-muted-foreground text-sm">
          لا توجد صور في المعرض. اسحب وأفلت لإعادة الترتيب بعد الرفع.
        </div>
      )}
    </div>
  );
}
