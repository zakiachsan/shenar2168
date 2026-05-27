'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, Move, Crop, X } from 'lucide-react';

interface ImageCropperProps {
  file: File;
  aspectRatio: number; // width / height, e.g. 3 for 3:1
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
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Load image
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setImg(image);
      // Initial zoom to cover crop area
      if (containerRef.current) {
        const cw = containerRef.current.clientWidth;
        const ch = containerRef.current.clientHeight;
        setContainerSize({ width: cw, height: ch });
        const cropH = ch;
        const cropW = cropH * aspectRatio;
        const scale = Math.max(cropW / image.width, cropH / image.height);
        setZoom(scale);
        setOffset({ x: (cropW - image.width * scale) / 2, y: (cropH - image.height * scale) / 2 });
      }
    };
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, aspectRatio]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cropW = containerSize.height * aspectRatio;
  const cropH = containerSize.height;
  const cropX = (containerSize.width - cropW) / 2;
  const cropY = 0;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    },
    [offset]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !img) return;
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      // Clamp
      const maxX = 0;
      const maxY = 0;
      const minX = cropW - img.width * zoom;
      const minY = cropH - img.height * zoom;
      setOffset({
        x: Math.max(minX, Math.min(maxX, newX)),
        y: Math.max(minY, Math.min(maxY, newY)),
      });
    },
    [dragging, dragStart, img, zoom, cropW, cropH]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      setDragging(true);
      setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
    },
    [offset]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragging || !img) return;
      const touch = e.touches[0];
      const newX = touch.clientX - dragStart.x;
      const newY = touch.clientY - dragStart.y;
      const minX = cropW - img.width * zoom;
      const minY = cropH - img.height * zoom;
      setOffset({
        x: Math.max(minX, Math.min(0, newX)),
        y: Math.max(minY, Math.min(0, newY)),
      });
    },
    [dragging, dragStart, img, zoom, cropW, cropH]
  );

  const handleTouchEnd = useCallback(() => {
    setDragging(false);
  }, []);

  const handleZoom = (delta: number) => {
    setZoom((prev) => {
      const newZoom = Math.max(0.1, Math.min(prev + delta, 5));
      // Re-clamp offset after zoom
      if (img) {
        const minX = cropW - img.width * newZoom;
        const minY = cropH - img.height * newZoom;
        setOffset((o) => ({
          x: Math.max(minX, Math.min(0, o.x)),
          y: Math.max(minY, Math.min(0, o.y)),
        }));
      }
      return newZoom;
    });
  };

  const doCrop = () => {
    if (!img || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate source rectangle from the visible crop area
    const scaleFactor = targetHeight / cropH;
    const sx = -offset.x * scaleFactor;
    const sy = -offset.y * scaleFactor;
    const sWidth = cropW * scaleFactor;
    const sHeight = cropH * scaleFactor;

    ctx.drawImage(
      img,
      sx,
      sy,
      sWidth,
      sHeight,
      0,
      0,
      targetWidth,
      targetHeight
    );

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
    <div className="space-y-4">
      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 flex items-center gap-2">
        <Crop className="w-3.5 h-3.5 flex-shrink-0" />
        <span>
          Rasio banner: <strong>{aspectRatio}:1</strong> &middot; Target:{' '}
          <strong>{targetWidth} &times; {targetHeight}px</strong> &middot; Drag untuk geser, zoom untuk perbesar
        </span>
      </div>

      {/* Cropper */}
      <div
        ref={containerRef}
        className="relative w-full bg-gray-900 rounded-lg overflow-hidden select-none"
        style={{ aspectRatio: `${aspectRatio}/1`, maxHeight: 300 }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {img && (
          <img
            src={img.src}
            alt="Preview"
            draggable={false}
            className="absolute top-0 left-0 max-w-none"
            style={{
              width: img.width * zoom,
              height: img.height * zoom,
              transform: `translate(${offset.x}px, ${offset.y}px)`,
              cursor: dragging ? 'grabbing' : 'grab',
            }}
          />
        )}

        {/* Center crop overlay */}
        <div
          className="absolute border-2 border-white/80 shadow-lg pointer-events-none"
          style={{
            left: cropX,
            top: cropY,
            width: cropW,
            height: cropH,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
          }}
        />

        {!img && (
          <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm">
            Memuat gambar...
          </div>
        )}
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => handleZoom(-0.1)}
          className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <input
          type="range"
          min={10}
          max={500}
          value={zoom * 100}
          onChange={(e) => {
            const newZoom = Number(e.target.value) / 100;
            setZoom(newZoom);
            if (img) {
              const minX = cropW - img.width * newZoom;
              const minY = cropH - img.height * newZoom;
              setOffset((o) => ({
                x: Math.max(minX, Math.min(0, o.x)),
                y: Math.max(minY, Math.min(0, o.y)),
              }));
            }
          }}
          className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <button
          type="button"
          onClick={() => handleZoom(0.1)}
          className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="text-xs text-gray-500 w-12 text-right">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Hidden canvas for export */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors inline-flex items-center justify-center gap-1.5"
        >
          <X className="w-4 h-4" />
          Batal
        </button>
        <button
          type="button"
          onClick={doCrop}
          disabled={!img}
          className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center justify-center gap-1.5"
        >
          <Crop className="w-4 h-4" />
          Crop & Gunakan
        </button>
      </div>
    </div>
  );
}
