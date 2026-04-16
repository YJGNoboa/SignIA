import { useState, useRef, useCallback } from "react";

interface ImageUploaderProps {
  onImageSelected: (file: File, preview: string) => void;
  isLoading: boolean;
}

export function ImageUploader({ onImageSelected, isLoading }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [fileError, setFileError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setFileError(null);
      if (!file.type.startsWith("image/")) {
        setFileError("El archivo debe ser una imagen (PNG, JPG, WEBP).");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setFileError("La imagen no debe superar los 10MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        onImageSelected(file, e.target?.result as string);
      };
      reader.readAsDataURL(file);
    },
    [onImageSelected]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      className={`upload-zone rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
        isDragging ? "upload-zone-active" : ""
      } ${isLoading ? "pointer-events-none opacity-50" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>
        <div>
          <p className="text-foreground font-medium text-lg">
            Arrastra tu imagen aquí
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            o haz clic para seleccionar un archivo
          </p>
        </div>
        <p className="text-muted-foreground/60 text-xs">
          PNG, JPG, WEBP • Máx 10MB
        </p>
        {fileError && (
          <p className="text-destructive text-sm font-medium mt-2">{fileError}</p>
        )}
      </div>
    </div>
  );
}
