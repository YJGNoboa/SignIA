import { createServerFn } from "@tanstack/react-start";

// Azure Custom Vision prediction endpoint (object detection model)
const PREDICTION_URL =
  "https://customvisionsenales-prediction.cognitiveservices.azure.com/customvision/v3.0/Prediction/edcbfa32-76e1-470f-bc86-d473e83242da/detect/iterations/model1/image";

// Bounding box coordinates are relative values between 0 and 1
interface AzureBoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface AzurePrediction {
  tagName: string;
  probability: number;
  boundingBox?: AzureBoundingBox;
}

export const classifyImage = createServerFn({ method: "POST" })
  .inputValidator((d: FormData) => d)
  .handler(async ({ data }) => {
    const predictionKey = process.env.AZURE_CUSTOM_VISION_PREDICTION_KEY;
    if (!predictionKey) {
      throw new Error("AZURE_CUSTOM_VISION_PREDICTION_KEY is not configured");
    }

    const imageFile = data.get("image") as File;
    if (!imageFile) {
      throw new Error("Missing image file");
    }

    // Send the image as raw binary (octet-stream) as required by the API
    const buffer = await imageFile.arrayBuffer();

    let response: Response;
    try {
      response = await fetch(PREDICTION_URL, {
        method: "POST",
        headers: {
          "Prediction-Key": predictionKey,
          "Content-Type": "application/octet-stream",
        },
        body: buffer,
      });
    } catch {
      throw new Error(
        "No se pudo conectar con Azure Custom Vision. Verifica tu conexión."
      );
    }

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(
        `Azure Custom Vision error [${response.status}]: ${responseText || "Sin detalles"}`
      );
    }

    if (!responseText) {
      throw new Error(
        "Azure Custom Vision devolvió una respuesta vacía. Verifica la Prediction Key."
      );
    }

    let result: Record<string, unknown>;
    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error(
        `Respuesta no válida de Azure: ${responseText.slice(0, 200)}`
      );
    }

    // Azure Custom Vision detect returns individual detections, each with a
    // tagName, probability, and boundingBox (relative coordinates 0–1).
    const rawPredictions =
      (result.predictions as AzurePrediction[]) ?? [];

    // Azure detect models return 100-200 raw predictions (one per anchor box).
    // We filter to those above 30% probability to include small/distant signs
    // while still excluding pure noise.
    const predictions = rawPredictions
      .filter((p) => p.probability > 0.3)
      .sort((a, b) => b.probability - a.probability)
      .map((p) => ({
        label: p.tagName,
        confidence: p.probability,
        boundingBox: p.boundingBox, // relative coords (0–1), forwarded to canvas
      }));

    return { predictions };
  });
