import { useState, useRef } from "react";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { compressImage, MEDIA_SPECS, type MediaSpec } from "@/lib/image-utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, X } from "lucide-react";

interface CloudinaryUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  accept?: string;
  label?: string;
  /** Key into MEDIA_SPECS for hints, validation & auto-compression */
  mediaSpec?: string;
}

export default function CloudinaryUpload({ value, onChange, accept = "image/*", label = "Upload", mediaSpec }: CloudinaryUploadProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const isVideo = accept.includes("video");
  const spec: MediaSpec | undefined = mediaSpec ? MEDIA_SPECS[mediaSpec] : undefined;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;

    const maxMB = spec?.maxSizeMB ?? (isVideo ? 100 : 5);

    // Format validation
    if (spec?.acceptedFormats && spec.acceptedFormats.length > 0) {
      if (!spec.acceptedFormats.includes(file.type)) {
        toast({ title: "صيغة غير مدعومة", description: `الصيغ المقبولة: ${spec.acceptedFormats.map(f => f.split("/")[1].toUpperCase()).join(", ")}`, variant: "destructive" });
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
    }

    // Size validation
    if (file.size > maxMB * 1024 * 1024) {
      toast({ title: "الملف كبير جداً", description: `الحد الأقصى ${maxMB}MB`, variant: "destructive" });
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      // Auto-compress images if spec is provided and it's not a video
      if (spec && !isVideo && file.type.startsWith("image/")) {
        file = await compressImage(file, spec.width, spec.height);
      }
      const url = await uploadToCloudinary(file);
      onChange(url);
    } catch (err: any) {
      toast({ title: "فشل الرفع", description: err.message, variant: "destructive" });
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-4">
        {value ? (
          <div className="relative group">
            {isVideo ? (
              <video src={value} controls className="h-32 w-48 rounded-lg object-cover border" style={{ maxHeight: 128 }} />
            ) : (
              <img src={value} alt="Preview" className="h-32 w-48 rounded-lg object-cover border" />
            )}
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute top-1 right-1 bg-black/60 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3 text-white" />
            </button>
          </div>
        ) : (
          <div className="h-32 w-48 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
            <span className="text-muted-foreground/40 text-xs">{isVideo ? "Video" : "Image"}</span>
          </div>
        )}
        <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? "جاري الرفع..." : label}
        </Button>
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleUpload} />
      </div>
      {spec && (
        <p className="text-xs text-muted-foreground/70 leading-relaxed" dir="rtl">{spec.hint}</p>
      )}
    </div>
  );
}
