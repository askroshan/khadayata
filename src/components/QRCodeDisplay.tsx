import { useEffect, useRef } from "react";

interface QRCodeDisplayProps {
  data: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
}

export function QRCodeDisplay({ data, size = 100, fgColor = "#1a1a1a", bgColor = "#ffffff" }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const moduleSize = 4;
    const padding = 10;
    const modules = Math.floor((size - 2 * padding) / moduleSize);

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = fgColor;

    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data.charCodeAt(i);
      hash |= 0;
    }

    const drawFinder = (x: number, y: number) => {
      ctx.fillStyle = fgColor;
      ctx.fillRect(x, y, 7 * moduleSize, 7 * moduleSize);
      ctx.fillStyle = bgColor;
      ctx.fillRect(x + moduleSize, y + moduleSize, 5 * moduleSize, 5 * moduleSize);
      ctx.fillStyle = fgColor;
      ctx.fillRect(x + 2 * moduleSize, y + 2 * moduleSize, 3 * moduleSize, 3 * moduleSize);
    };

    drawFinder(padding, padding);
    drawFinder(size - padding - 7 * moduleSize, padding);
    drawFinder(padding, size - padding - 7 * moduleSize);

    for (let row = 0; row < modules; row++) {
      for (let col = 0; col < modules; col++) {
        if ((row < 8 && col < 8) || (row < 8 && col > modules - 9) || (row > modules - 9 && col < 8)) continue;
        const bitIndex = row * modules + col;
        const bit = (hash ^ (bitIndex * 31)) & (1 << (bitIndex % 31));
        if (bit) {
          ctx.fillStyle = fgColor;
          ctx.fillRect(padding + col * moduleSize, padding + row * moduleSize, moduleSize - 1, moduleSize - 1);
        }
      }
    }
  }, [data, size, fgColor, bgColor]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded-lg"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
