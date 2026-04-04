import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Film, Image as ImageIcon } from "lucide-react";
import CloudinaryUpload from "./CloudinaryUpload";
import CloudinaryGallery from "./CloudinaryGallery";

interface EventMediaTabProps {
  eventId: string;
  coverImage: string | null;
  heroVideo: string | null;
  heroThumbnail: string | null;
  images: string[];
  onUpdate: () => void;
}

export default function EventMediaTab({ eventId, coverImage, heroVideo, heroThumbnail, images, onUpdate }: EventMediaTabProps) {
  const { toast } = useToast();

  const updateField = async (field: string, value: any) => {
    const { error } = await supabase.from("events").update({ [field]: value }).eq("id", eventId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    onUpdate();
  };

  return (
    <div className="space-y-6">
      {/* Cover Image (card thumbnail) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Cover Image (Card Thumbnail)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Main image shown on homepage cards and social sharing.
          </p>
          <CloudinaryUpload
            value={coverImage}
            onChange={(url) => updateField("cover_image", url)}
            label="Upload Cover"
            mediaSpec="event-cover"
          />
        </CardContent>
      </Card>

      {/* Hero Section: Video + Thumbnail */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            Hero Video & Thumbnail
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <label className="text-base font-semibold">Hero Thumbnail</label>
            <p className="text-sm text-muted-foreground">
              Static image shown while hero video loads, or as the hero if no video.
            </p>
            <CloudinaryUpload
              value={heroThumbnail}
              onChange={(url) => updateField("hero_thumbnail", url)}
              label="Upload Hero Thumbnail"
              mediaSpec="event-hero-thumbnail"
            />
          </div>

          <div className="space-y-3">
            <label className="text-base font-semibold">Hero Video</label>
            <p className="text-sm text-muted-foreground">
              Optional hero video that plays on the event detail page. If no video, the hero thumbnail is shown.
            </p>
            <CloudinaryUpload
              value={heroVideo}
              onChange={(url) => updateField("hero_video", url)}
              accept="video/*"
              label="Upload Hero Video"
              mediaSpec="event-hero-video"
            />
          </div>
        </CardContent>
      </Card>

      {/* Gallery */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Event Gallery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Additional photos for the event. Drag to reorder.
          </p>
          <CloudinaryGallery
            images={images}
            onChange={(urls) => updateField("images", urls)}
            mediaSpec="event-gallery"
          />
        </CardContent>
      </Card>
    </div>
  );
}
