import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LocationInputProps {
  latitude: number;
  longitude: number;
  onChangeLatitude: (val: number) => void;
  onChangeLongitude: (val: number) => void;
}

/**
 * Extracts lat/lng from various Google Maps URL formats:
 * - https://www.google.com/maps/place/.../@33.513,36.276,15z/...
 * - https://www.google.com/maps?q=33.513,36.276
 * - https://maps.google.com/?ll=33.513,36.276
 * - https://goo.gl/maps/... (short links won't work without redirect)
 * - https://maps.app.goo.gl/... (short links won't work without redirect)
 * - https://www.google.com/maps/place/33.513,36.276
 */
function extractCoordsFromGoogleMapsUrl(url: string): { lat: number; lng: number } | null {
  try {
    // Pattern 1: /@lat,lng
    const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (atMatch) {
      return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
    }

    // Pattern 2: ?q=lat,lng or &q=lat,lng
    const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (qMatch) {
      return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
    }

    // Pattern 3: ?ll=lat,lng
    const llMatch = url.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (llMatch) {
      return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };
    }

    // Pattern 4: /place/lat,lng
    const placeMatch = url.match(/\/place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (placeMatch) {
      return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };
    }

    return null;
  } catch {
    return null;
  }
}

const LocationInput = ({ latitude, longitude, onChangeLatitude, onChangeLongitude }: LocationInputProps) => {
  const [mode, setMode] = useState<"manual" | "link">("manual");
  const [mapsLink, setMapsLink] = useState("");
  const { toast } = useToast();

  const handleExtract = () => {
    const coords = extractCoordsFromGoogleMapsUrl(mapsLink);
    if (coords) {
      onChangeLatitude(coords.lat);
      onChangeLongitude(coords.lng);
      toast({ title: "Coordinates extracted", description: `${coords.lat}, ${coords.lng}` });
    } else {
      toast({ title: "Could not extract coordinates", description: "Make sure you paste a valid Google Maps link", variant: "destructive" });
    }
  };

  return (
    <div className="md:col-span-2 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Location *</span>
        <div className="flex gap-1 ml-auto">
          <Button
            type="button"
            variant={mode === "manual" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("manual")}
          >
            <MapPin className="h-3.5 w-3.5 mr-1" />
            Coordinates
          </Button>
          <Button
            type="button"
            variant={mode === "link" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("link")}
          >
            <Link2 className="h-3.5 w-3.5 mr-1" />
            Google Maps Link
          </Button>
        </div>
      </div>

      {mode === "link" && (
        <div className="flex gap-2">
          <Input
            placeholder="Paste Google Maps link here..."
            value={mapsLink}
            onChange={(e) => setMapsLink(e.target.value)}
            className="flex-1"
          />
          <Button type="button" variant="secondary" onClick={handleExtract} disabled={!mapsLink.trim()}>
            Extract
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">Latitude</label>
          <Input
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => onChangeLatitude(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">Longitude</label>
          <Input
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => onChangeLongitude(parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      {(latitude !== 0 || longitude !== 0) && (
        <p className="text-xs text-muted-foreground">
          📍 {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </p>
      )}
    </div>
  );
};

export default LocationInput;
