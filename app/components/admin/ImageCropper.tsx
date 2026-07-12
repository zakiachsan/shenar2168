'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, Crop, X, RotateCcw } from 'lucide-react';

interface ImageCropperProps {
  file: File;
  aspectRatio: number;
  targetWidth: number;
  targetHeight: number;
  onCrop: (blob: Blob, dataUrl: string) => void;
  onCancel: () => void;
}

export default function ImageCropper({
  file,
  aspectRatio,
  targetWidth,
  targetHeight,
  onCrop,
  onCancel,
}: ImageCropperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cropBoxRef = useRef<HTMLDivElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);

  // Crop box — stored in ref for smooth drag, synced to DOM directly
  const cropBoxData = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const [cropBoxState, setCropBoxState] = useState({ x: 0, y: 0, w: 0, h: 0 });

  // Drag state — all in refs for zero re-renders during drag
  const drag = useRef<{
    active: boolean;
    handle: string;
    startX: number;
    startY: number;
    startBoxX: number;
    startBoxY: number;
    startBoxW: number;
    startBoxH: number;
  }>({ active: false, handle: 'move', startX: 0, startY: 0, startBoxX: 0, startBoxY: 0, startBoxW: 0, startBoxH: 0 });

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const MIN_CROP = 30;

  // Load image & compute initial layout — fixed 3:1 crop area
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setImg(image);
      if (containerRef.current) {
        const cw = containerRef.current.clientWidth;
        const ch = containerRef.current.clientHeight;
        setContainerSize({ width: cw, height: ch });

        // Crop box: fill width, height = width / 3
        let boxW = cw;
        let boxH = cw / aspectRatio;
        if (boxH > ch * 0.85) {
          boxH = ch * 0.85;
          boxW = boxH * aspectRatio;
        }

        // Zoom: image COVERS crop area (no black bars) — user can zoom out to see more
        const scale = Math.max(boxW / image.width, boxH / image.height);
        setZoom(scale);

        const box = { x: (cw - boxW) / 2, y: (ch - boxH) / 2, w: boxW, h: boxH };
        cropBoxData.current = box;
        setCropBoxState(box);
        updateCropBoxDOM(box);
      }
    };
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, aspectRatio]);

  // Update crop box DOM directly — no React re-render
  const updateCropBoxDOM = useCallback((box: { x: number; y: number; w: number; h: number }) => {
    const el = cropBoxRef.current;
    if (!el) return;
    el.style.left = `${box.x}px`;
    el.style.top = `${box.y}px`;
    el.style.width = `${box.w}px`;
    el.style.height = `${box.h}px`;

    // Update dimension label
    const label = el.querySelector('.crop-dimensions') as HTMLElement;
    if (label) label.textContent = `${Math.round(box.w)} × ${Math.round(box.h)}`;

    // Update overlay holes
    const container = containerRef.current;
    if (!container) return;
    const overlayTop = container.querySelector('.overlay-top') as HTMLElement;
    const overlayBottom = container.querySelector('.overlay-bottom') as HTMLElement;
    const overlayLeft = container.querySelector('.overlay-left') as HTMLElement;
    const overlayRight = container.querySelector('.overlay-right') as HTMLElement;
    if (overlayTop) overlayTop.style.height = `${box.y}px`;
    if (overlayBottom) overlayBottom.style.top = `${box.y + box.h}px`;
    if (overlayLeft) { overlayLeft.style.top = `${box.y}px`; overlayLeft.style.height = `${box.h}px`; overlayLeft.style.width = `${box.x}px`; }
    if (overlayRight) { overlayRight.style.top = `${box.y}px`; overlayRight.style.height = `${box.h}px`; overlayRight.style.left = `${box.x + box.w}px`; }
  }, []);

  // Clamp box to container (always maintain aspect ratio)
  const clampBox = useCallback((box: { x: number; y: number; w: number; h: number }) => {
    let { x, y, w, h } = box;
    if (containerSize.width === 0) return box;

    w = Math.max(MIN_CROP * aspectRatio, Math.min(w, containerSize.width));
    h = w / aspectRatio;
    if (h > containerSize.height) { h = containerSize.height; w = h * aspectRatio; }
    x = Math.max(0, Math.min(x, containerSize.width - w));
    y = Math.max(0, Math.min(y, containerSize.height - h));
    return { x, y, w, h };
  }, [containerSize, aspectRatio]);

  // Pointer down — start drag
  const handlePointerDown = useCallback((e: React.PointerEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const rect = containerRef.current!.getBoundingClientRect();
    drag.current = {
      active: true,
      handle,
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      startBoxX: cropBoxData.current.x,
      startBoxY: cropBoxData.current.y,
      startBoxW: cropBoxData.current.w,
      startBoxH: cropBoxData.current.h,
    };
  }, []);

  // Pointer move — update DOM directly, no state update
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.active) return;

    const rect = containerRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const dx = cx - d.startX;
    const dy = cy - d.startY;

    let newX = d.startBoxX;
    let newY = d.startBoxY;
    let newW = d.startBoxW;
    let newH = d.startBoxH;

    if (d.handle === 'move') {
      newX = d.startBoxX + dx;
      newY = d.startBoxY + dy;
    } else if (d.handle === 'se' || d.handle === 'e' || d.handle === 's') {
      // Resize: width changes, height follows aspect ratio
      newW = d.startBoxW + dx;
    } else if (d.handle === 'nw' || d.handle === 'w' || d.handle === 'n') {
      // Resize from top-left: width shrinks from right
      newW = d.startBoxW - dx;
    } else if (d.handle === 'ne') {
      newW = d.startBoxW + dx;
    } else if (d.handle === 'sw') {
      newW = d.startBoxW - dx;
    }

    // Always maintain aspect ratio
    newH = newW / aspectRatio;

    // Recalculate position for handles that move the origin
    if (d.handle === 'nw' || d.handle === 'w' || d.handle === 'n') {
      newX = d.startBoxX + d.startBoxW - newW;
    }
    if (d.handle === 'nw' || d.handle === 'n' || d.handle === 'ne') {
      newY = d.startBoxY + d.startBoxH - newH;
    }

    const clamped = clampBox({ x: newX, y: newY, w: newW, h: newH });
    cropBoxData.current = clamped;
    updateCropBoxDOM(clamped);
  }, [aspectRatio, clampBox, updateCropBoxDOM]);

  // Pointer up — commit to state
  const handlePointerUp = useCallback(() => {
    if (!drag.current.active) return;
    drag.current.active = false;
    setCropBoxState({ ...cropBoxData.current });
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setZoom((prev) => Math.max(0.1, Math.min(prev + delta, 5)));
  }, []);

  const handleZoomSlider = (val: number) => setZoom(val / 100);
  const handleZoomButton = (delta: number) => setZoom((prev) => Math.max(0.1, Math.min(prev + delta, 5)));

  const handleReset = () => {
    if (!containerRef.current || !img) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    let boxW = cw;
    let boxH = cw / aspectRatio;
    if (boxH > ch * 0.85) { boxH = ch * 0.85; boxW = boxH * aspectRatio; }
    const scale = Math.max(boxW / img.width, boxH / img.height);
    setZoom(scale);
    const box = { x: (cw - boxW) / 2, y: (ch - boxH) / 2, w: boxW, h: boxH };
    cropBoxData.current = box;
    setCropBoxState(box);
    updateCropBoxDOM(box);
  };

  const doCrop = () => {
    if (!img || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const box = cropBoxData.current;
    const sx = box.x / zoom;
    const sy = box.y / zoom;
    const sw = box.w / zoom;
    const sh = box.h / zoom;

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
          onCrop(blob, dataUrl);
        }
      },
      'image/jpeg',
      0.92
    );
  };

  return (
    <div className="space-y-3">
      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 flex items-center gap-2">
        <Crop className="w-3.5 h-3.5 flex-shrink-0" />
        <span>
          Rasio <strong>3:1</strong> &middot; Target <strong>{targetWidth} &times; {targetHeight}px</strong> &middot;
          Drag untuk geser, scroll untuk zoom
        </span>
      </div>

      {/* Cropper viewport — fixed 3:1 */}
      <div
        ref={containerRef}
        className="relative w-full bg-gray-900 rounded-lg overflow-hidden touch-none"
        style={{ aspectRatio: '3/1', maxHeight: 250 }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
      >
        {/* Image */}
        {img && (
          <img
            src={img.src}
            alt="Crop preview"
            draggable={false}
            className="absolute top-0 left-0 max-w-none pointer-events-none"
            style={{ width: img.width * zoom, height: img.height * zoom }}
          />
        )}

        {/* Dark overlays */}
        {img && (
          <>
            <div className="overlay-top absolute top-0 left-0 right-0 bg-black/50 pointer-events-none" />
            <div className="overlay-bottom absolute left-0 right-0 bg-black/50 pointer-events-none" style={{ bottom: 0 }} />
            <div className="overlay-left absolute bg-black/50 pointer-events-none" />
            <div className="overlay-right absolute bg-black/50 pointer-events-none" style={{ right: 0 }} />
          </>
        )}

        {/* Crop box */}
        {img && (
          <div
            ref={cropBoxRef}
            className="absolute touch-none"
            style={{
              left: cropBoxState.x,
              top: cropBoxState.y,
              width: cropBoxState.w,
              height: cropBoxState.h,
              cursor: 'grab',
              willChange: 'transform',
            }}
            onPointerDown={(e) => handlePointerDown(e, 'move')}
          >
            {/* Border */}
            <div className="absolute inset-0 border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.3)] pointer-events-none" />

            {/* Grid */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border border-white/30" />
              ))}
            </div>

            {/* Corner handles */}
            {(['nw', 'ne', 'sw', 'se'] as const).map((pos) => (
              <div
                key={pos}
                className="absolute w-5 h-5 bg-white border-2 border-gray-800 shadow-md z-10 touch-none"
                style={{
                  top: pos.includes('n') ? -10 : undefined,
                  bottom: pos.includes('s') ? -10 : undefined,
                  left: pos.includes('w') ? -10 : undefined,
                  right: pos.includes('e') ? -10 : undefined,
                  cursor: pos === 'nw' || pos === 'se' ? 'nwse-resize' : 'nesw-resize',
                }}
                onPointerDown={(e) => handlePointerDown(e, pos)}
              />
            ))}

            {/* Dimensions label */}
            <div className="crop-dimensions absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap pointer-events-none">
              {Math.round(cropBoxState.w)} &times; {Math.round(cropBoxState.h)}
            </div>
          </div>
        )}

        {!img && (
          <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm">
            Memuat gambar...
          </div>
        )}
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => handleZoomButton(-0.1)}
          className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
          <ZoomOut className="w-4 h-4" />
        </button>
        <input type="range" min={10} max={500} value={zoom * 100}
          onChange={(e) => handleZoomSlider(Number(e.target.value))}
          className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
        <button type="button" onClick={() => handleZoomButton(0.1)}
          className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="text-xs text-gray-500 w-12 text-right">{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={handleReset} title="Reset"
          className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Actions */}
      <div className="flex gap-3">
        <button type="button" onClick={onCancel}
          className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors inline-flex items-center justify-center gap-1.5">
          <X className="w-4 h-4" />Batal
        </button>
        <button type="button" onClick={doCrop} disabled={!img}
          className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center justify-center gap-1.5">
          <Crop className="w-4 h-4" />Crop &amp; Gunakan
        </button>
      </div>
    </div>
  );
}
