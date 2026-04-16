import { useState, useRef, useEffect } from "react";
import { ImageUploader } from "./ImageUploader";
import { ResultCard } from "./ResultCard";
import { classifyImage } from "@/server/classify";

// Bounding box as returned by Azure Custom Vision (relative values 0–1)
interface BoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

// Each prediction arriving from the server
interface Prediction {
  label: string;
  confidence: number;
  boundingBox?: BoundingBox;
}

// ---------------------------------------------------------------------------
// drawCanvas
//
// KEY DESIGN DECISION — draw at displayed size, not at file size:
//   A phone photo can be 4000×3000 px. If we draw the canvas at that internal
//   resolution and rely on CSS to shrink it, every line width and font size
//   must also be expressed in file-pixels, which makes them nearly invisible
//   for small/distant signs. Worse, bounding boxes for small objects (e.g.
//   boundingBox.width = 0.03 × 4000 = 120 file-px) become a 5 screen-px sliver.
//
//   Instead we:
//     1. Compute the actual pixel dimensions the canvas will occupy on screen.
//     2. Set canvas.width / canvas.height to those screen dimensions.
//     3. Draw the image scaled to fill that space exactly.
//     4. Multiply every bounding box coordinate by those same dimensions.
//
//   Result: 1 canvas pixel = 1 screen pixel, line widths and fonts are readable,
//   and small boxes are drawn at their true on-screen size.
// ---------------------------------------------------------------------------
function drawCanvas(
  canvas: HTMLCanvasElement,
  imageSrc: string,
  predictions: Prediction[]
): void {
  const img = new Image();

  img.onload = () => {
    // --- 1. Compute the display size the canvas should occupy ---
    //
    // The canvas lives inside a container whose width we can read.
    // We cap the height at 380 px and maintain the image's aspect ratio.
    const containerW = canvas.parentElement?.clientWidth ?? 700;
    const MAX_H = 380;
    const aspect = img.naturalWidth / img.naturalHeight;

    let dispW = Math.min(containerW, img.naturalWidth);
    let dispH = dispW / aspect;
    if (dispH > MAX_H) {
      dispH = MAX_H;
      dispW = dispH * aspect;
    }
    const W = Math.round(dispW); // canvas width  = displayed width  (screen px)
    const H = Math.round(dispH); // canvas height = displayed height (screen px)

    // --- 2. Set canvas internal resolution to the display dimensions ---
    //    This also clears the canvas.
    canvas.width  = W;
    canvas.height = H;

    // --- 3. Obtain context AFTER setting dimensions ---
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // --- 4. Draw the image, scaled to fill the canvas exactly ---
    ctx.drawImage(img, 0, 0, W, H);

    // --- 5. Draw a bounding box for EVERY prediction ---
    //    predictions is already filtered to probability > 0.3 by the server.
    //    We loop through ALL of them — no prediction is skipped.
    predictions.forEach((pred) => {
      if (!pred.boundingBox) return; // detect model always provides a bbox; guard just in case

      // Convert relative coordinates (0–1) → screen pixels
      // Multiply by W/H (displayed size), NOT by naturalWidth/naturalHeight.
      const x = pred.boundingBox.left   * W;
      const y = pred.boundingBox.top    * H;
      const w = pred.boundingBox.width  * W;
      const h = pred.boundingBox.height * H;

      // Fixed stroke and font in screen pixels — always readable regardless of image size
      const STROKE = 2.5;
      const FONT   = 13; // px

      // Draw the bounding box rectangle
      ctx.strokeStyle = "#2dd4bf";
      ctx.lineWidth   = STROKE;
      ctx.setLineDash([]);
      ctx.strokeRect(x, y, w, h);

      // Build the label: "tagName  XX%"
      const labelText = `${pred.label}  ${Math.round(pred.confidence * 100)}%`;
      ctx.font = `bold ${FONT}px Inter, system-ui, sans-serif`;

      const padX   = 6;
      const padY   = 4;
      const labelH = FONT + padY * 2;
      const labelW = ctx.measureText(labelText).width + padX * 2;

      // Place label above the box; if the box is near the top edge, put it inside
      const labelTop = y >= labelH ? y : y + labelH;

      ctx.fillStyle = "rgba(8, 15, 25, 0.88)";
      ctx.fillRect(x, labelTop - labelH, labelW, labelH);

      ctx.fillStyle = "#2dd4bf";
      ctx.fillText(labelText, x + padX, labelTop - padY);
    });
  };

  img.src = imageSrc;
}

// ---------------------------------------------------------------------------

export function ClassifierApp() {
  const [preview,   setPreview]   = useState<string | null>(null);
  const [file,      setFile]      = useState<File | null>(null);
  const [results,   setResults]   = useState<Prediction[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Redraw the canvas whenever the image or prediction results change.
  // On image selection:  draws plain image (results = null, nothing to loop).
  // After classification: draws image + a box for every returned prediction.
  useEffect(() => {
    if (!preview || !canvasRef.current) return;
    drawCanvas(canvasRef.current, preview, results ?? []);
  }, [preview, results]);

  const handleImageSelected = (f: File, prev: string) => {
    setFile(f);
    setPreview(prev);
    setResults(null);
    setError(null);
  };

  const handleClassify = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      // Server function: POSTs image binary to Azure Custom Vision,
      // returns predictions already filtered to probability > 0.5
      const data = await classifyImage({ data: formData });
      setResults(data.predictions);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al conectar con la API de Azure"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setPreview(null);
    setFile(null);
    setResults(null);
    setError(null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {!preview ? (
        <ImageUploader onImageSelected={handleImageSelected} isLoading={isLoading} />
      ) : (
        <div className="fade-in space-y-6">

          {/* Canvas: the JS in drawCanvas already sizes this to the exact display
               dimensions, so no CSS width/height scaling is needed here.
               maxWidth: 100% is kept only as a safety net for very wide images. */}
          <div className="glass-card rounded-2xl p-4 flex justify-center overflow-hidden">
            <canvas
              ref={canvasRef}
              style={{
                display: "block",
                maxWidth: "100%",
                borderRadius: "0.75rem",
              }}
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleClassify}
              disabled={isLoading}
              className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold transition-all hover:opacity-90 disabled:opacity-50 glow-primary"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12" cy="12" r="10"
                      stroke="currentColor" strokeWidth="4" fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Analizando...
                </span>
              ) : (
                "Clasificar señal"
              )}
            </button>
            <button
              onClick={handleReset}
              disabled={isLoading}
              className="px-6 py-3 rounded-xl bg-secondary text-secondary-foreground font-medium transition-all hover:bg-secondary/80 disabled:opacity-50"
            >
              Nueva imagen
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="fade-in p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
              {error}
            </div>
          )}

          {/* No detections message */}
          {results && results.length === 0 && (
            <div className="fade-in p-4 rounded-xl bg-muted/50 border border-border text-muted-foreground text-sm text-center">
              El modelo no detectó ninguna señal con confianza superior al 30%.
            </div>
          )}

          {/* Result cards — one card per detection, same list that was drawn on canvas */}
          {results && results.length > 0 && (
            <div className="fade-in space-y-3">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" strokeWidth={2}
                >
                  <path
                    strokeLinecap="round" strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
                {results.length} señal{results.length !== 1 ? "es" : ""} detectada{results.length !== 1 ? "s" : ""}
              </h2>

              {results.map((r, i) => (
                <ResultCard
                  key={`${r.label}-${i}`}
                  label={r.label}
                  confidence={r.confidence}
                  isTop={i === 0}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
