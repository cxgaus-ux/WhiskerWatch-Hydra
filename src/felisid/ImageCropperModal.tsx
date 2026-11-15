import React, { useState, useRef } from 'react';
import { Crop, RotateCw, Check, X, Move } from 'lucide-react';

interface Props {
  imageUrl: string;
  onClose: () => void;
  onApplyCrop: (
    croppedDataUrl: string,
    cropBoxPct?: { xPct: number; yPct: number; widthPct: number; heightPct: number }
  ) => void;
}

export const ImageCropperModal: React.FC<Props> = ({ imageUrl, onClose, onApplyCrop }) => {
  const [rotation, setRotation] = useState<number>(0);
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 12,
    y: 10,
    width: 76,
    height: 78,
  });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{
    clientX: number;
    clientY: number;
    boxX: number;
    boxY: number;
    boxW: number;
    boxH: number;
  } | null>(null);
  const [activeHandle, setActiveHandle] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const setPreset = (type: 'full' | 'head' | 'body' | 'paws') => {
    switch (type) {
      case 'full':
        setCropBox({ x: 2, y: 2, width: 96, height: 96 });
        break;
      case 'head':
        setCropBox({ x: 20, y: 5, width: 60, height: 50 });
        break;
      case 'body':
        setCropBox({ x: 10, y: 20, width: 80, height: 60 });
        break;
      case 'paws':
        setCropBox({ x: 15, y: 50, width: 70, height: 45 });
        break;
    }
  };

  const startDrag = (clientX: number, clientY: number, handle: string | null = null) => {
    setIsDragging(true);
    setActiveHandle(handle);
    setDragStart({
      clientX,
      clientY,
      boxX: cropBox.x,
      boxY: cropBox.y,
      boxW: cropBox.width,
      boxH: cropBox.height,
    });
  };

  const moveDrag = (clientX: number, clientY: number) => {
    if (!isDragging || !containerRef.current || !dragStart) return;

    const rect = containerRef.current.getBoundingClientRect();
    const deltaXPercent = ((clientX - dragStart.clientX) / rect.width) * 100;
    const deltaYPercent = ((clientY - dragStart.clientY) / rect.height) * 100;

    if (!activeHandle) {
      setCropBox((prev) => {
        const newX = Math.max(0, Math.min(100 - prev.width, dragStart.boxX + deltaXPercent));
        const newY = Math.max(0, Math.min(100 - prev.height, dragStart.boxY + deltaYPercent));
        return { ...prev, x: newX, y: newY };
      });
    } else {
      setCropBox(() => {
        let { boxX: x, boxY: y, boxW: w, boxH: h } = dragStart;

        if (activeHandle.includes('e')) {
          w = Math.max(10, Math.min(100 - x, w + deltaXPercent));
        } else if (activeHandle.includes('w')) {
          const maxShift = w - 10;
          const shift = Math.max(-x, Math.min(maxShift, deltaXPercent));
          x = x + shift;
          w = w - shift;
        }

        if (activeHandle.includes('s')) {
          h = Math.max(10, Math.min(100 - y, h + deltaYPercent));
        } else if (activeHandle.includes('n')) {
          const maxShift = h - 10;
          const shift = Math.max(-y, Math.min(maxShift, deltaYPercent));
          y = y + shift;
          h = h - shift;
        }

        return { x, y, width: w, height: h };
      });
    }
  };

  const endDrag = () => {
    setIsDragging(false);
    setActiveHandle(null);
    setDragStart(null);
  };

  const handleMouseDown = (e: React.MouseEvent, handle: string | null = null) => {
    e.preventDefault();
    e.stopPropagation();
    startDrag(e.clientX, e.clientY, handle);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    moveDrag(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent, handle: string | null = null) => {
    e.stopPropagation();
    if (e.touches.length > 0) {
      startDrag(e.touches[0].clientX, e.touches[0].clientY, handle);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      moveDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const applyCrop = () => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const sourceWidth = img.naturalWidth || img.width;
      const sourceHeight = img.naturalHeight || img.height;

      const rotCanvas = document.createElement('canvas');
      const rotCtx = rotCanvas.getContext('2d');
      if (!rotCtx) return;

      if (rotation === 90 || rotation === 270) {
        rotCanvas.width = sourceHeight;
        rotCanvas.height = sourceWidth;
      } else {
        rotCanvas.width = sourceWidth;
        rotCanvas.height = sourceHeight;
      }

      rotCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
      rotCtx.rotate((rotation * Math.PI) / 180);
      rotCtx.drawImage(img, -sourceWidth / 2, -sourceHeight / 2);

      const cropPxX = Math.max(0, Math.round((cropBox.x / 100) * rotCanvas.width));
      const cropPxY = Math.max(0, Math.round((cropBox.y / 100) * rotCanvas.height));
      const cropPxW = Math.max(1, Math.min(rotCanvas.width - cropPxX, Math.round((cropBox.width / 100) * rotCanvas.width)));
      const cropPxH = Math.max(1, Math.min(rotCanvas.height - cropPxY, Math.round((cropBox.height / 100) * rotCanvas.height)));

      const maxDim = 1024;
      const longestSide = Math.max(cropPxW, cropPxH);
      const scale = longestSide > maxDim ? maxDim / longestSide : 1;
      const targetW = Math.max(1, Math.round(cropPxW * scale));
      const targetH = Math.max(1, Math.round(cropPxH * scale));

      canvas.width = targetW;
      canvas.height = targetH;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(
        rotCanvas,
        cropPxX,
        cropPxY,
        cropPxW,
        cropPxH,
        0,
        0,
        targetW,
        targetH
      );

      const croppedUrl = canvas.toDataURL('image/jpeg', 0.85);
      onApplyCrop(croppedUrl, {
        xPct: Math.round(cropBox.x),
        yPct: Math.round(cropBox.y),
        widthPct: Math.round(cropBox.width),
        heightPct: Math.round(cropBox.height),
      });
    };
    img.src = imageUrl;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-150"
      onMouseMove={handleMouseMove}
      onMouseUp={endDrag}
      onTouchMove={handleTouchMove}
      onTouchEnd={endDrag}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-3.5 sm:p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Crop & Rotate Photo</h3>
              <p className="text-[11px] text-slate-400">Frame head, ear-tips, or paws for maximum clarity</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleRotate}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
              title="Rotate 90 degrees"
            >
              <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Rotate 90°</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Framing Presets Bar */}
        <div className="px-4 py-2 bg-slate-950/70 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto text-[11px]">
          <span className="text-slate-400 font-medium shrink-0">Focus Presets:</span>
          <button
            onClick={() => setPreset('full')}
            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
          >
            Full Photo
          </button>
          <button
            onClick={() => setPreset('head')}
            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-white transition cursor-pointer"
          >
            Head & Ear-Tips
          </button>
          <button
            onClick={() => setPreset('body')}
            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-white transition cursor-pointer"
          >
            Body & Saddle
          </button>
          <button
            onClick={() => setPreset('paws')}
            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white transition cursor-pointer"
          >
            Paws & Legs
          </button>
        </div>

        {/* Cropping Stage */}
        <div className="p-4 flex-1 flex items-center justify-center bg-black/70 overflow-hidden min-h-[300px]">
          <div
            ref={containerRef}
            className="relative inline-block max-h-[50vh] max-w-full overflow-hidden rounded-lg shadow-2xl cursor-move"
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt="To crop"
              style={{
                transform: `rotate(${rotation}deg)`,
                transformOrigin: 'center center',
              }}
              className="max-h-[50vh] max-w-full object-contain pointer-events-none transition-transform duration-100"
            />

            <div
              className="absolute inset-0 pointer-events-none bg-black/55"
              style={{
                clipPath: `polygon(
                  0% 0%, 100% 0%, 100% 100%, 0% 100%,
                  0% 0%,
                  ${cropBox.x}% ${cropBox.y}%,
                  ${cropBox.x}% ${cropBox.y + cropBox.height}%,
                  ${cropBox.x + cropBox.width}% ${cropBox.y + cropBox.height}%,
                  ${cropBox.x + cropBox.width}% ${cropBox.y}%,
                  ${cropBox.x}% ${cropBox.y}%
                )`,
              }}
            />

            <div
              onMouseDown={(e) => handleMouseDown(e, null)}
              onTouchStart={(e) => handleTouchStart(e, null)}
              className="absolute border-2 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-move"
              style={{
                left: `${cropBox.x}%`,
                top: `${cropBox.y}%`,
                width: `${cropBox.width}%`,
                height: `${cropBox.height}%`,
              }}
            >
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                <div className="border-r border-b border-emerald-400/30" />
                <div className="border-r border-b border-emerald-400/30" />
                <div className="border-b border-emerald-400/30" />
                <div className="border-r border-b border-emerald-400/30" />
                <div className="border-r border-b border-emerald-400/30" />
                <div className="border-b border-emerald-400/30" />
                <div className="border-r border-emerald-400/30" />
                <div className="border-r border-emerald-400/30" />
                <div />
              </div>

              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-75 transition pointer-events-none">
                <div className="p-1 rounded-full bg-slate-950/60 text-emerald-400">
                  <Move className="w-4 h-4" />
                </div>
              </div>

              <div
                onMouseDown={(e) => handleMouseDown(e, 'nw')}
                onTouchStart={(e) => handleTouchStart(e, 'nw')}
                className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-emerald-500 rounded-sm cursor-nwse-resize shadow-sm"
              />
              <div
                onMouseDown={(e) => handleMouseDown(e, 'ne')}
                onTouchStart={(e) => handleTouchStart(e, 'ne')}
                className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-emerald-500 rounded-sm cursor-nesw-resize shadow-sm"
              />
              <div
                onMouseDown={(e) => handleMouseDown(e, 'sw')}
                onTouchStart={(e) => handleTouchStart(e, 'sw')}
                className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-emerald-500 rounded-sm cursor-nesw-resize shadow-sm"
              />
              <div
                onMouseDown={(e) => handleMouseDown(e, 'se')}
                onTouchStart={(e) => handleTouchStart(e, 'se')}
                className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-emerald-500 rounded-sm cursor-nwse-resize shadow-sm"
              />

              <div
                onMouseDown={(e) => handleMouseDown(e, 'n')}
                onTouchStart={(e) => handleTouchStart(e, 'n')}
                className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-5 h-2.5 bg-emerald-400 border border-slate-900 rounded-sm cursor-ns-resize shadow-sm"
              />
              <div
                onMouseDown={(e) => handleMouseDown(e, 's')}
                onTouchStart={(e) => handleTouchStart(e, 's')}
                className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-2.5 bg-emerald-400 border border-slate-900 rounded-sm cursor-ns-resize shadow-sm"
              />
              <div
                onMouseDown={(e) => handleMouseDown(e, 'w')}
                onTouchStart={(e) => handleTouchStart(e, 'w')}
                className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-2.5 h-5 bg-emerald-400 border border-slate-900 rounded-sm cursor-ew-resize shadow-sm"
              />
              <div
                onMouseDown={(e) => handleMouseDown(e, 'e')}
                onTouchStart={(e) => handleTouchStart(e, 'e')}
                className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2.5 h-5 bg-emerald-400 border border-slate-900 rounded-sm cursor-ew-resize shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400 hidden sm:inline">
            Drag frame or corner handles to resize. Tap Apply Crop when ready.
          </span>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={applyCrop}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Apply Crop</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
