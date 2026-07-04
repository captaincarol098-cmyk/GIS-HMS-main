'use client';

import React, { useEffect, useRef } from 'react';

interface Hotspot {
  name: string;
  latitude?: number;
  longitude?: number;
  intensity: number;
  caseCount: number;
  radius?: number;
  description?: string;
}

interface HeatmapComponentProps {
  hotspots: Hotspot[];
}

export default function HeatmapComponent({ hotspots }: HeatmapComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || hotspots.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    // Geographic bounds (Cabadbaran City area)
    const minLat = 9.0;
    const maxLat = 9.3;
    const minLng = 125.4;
    const maxLng = 125.7;

    // Function to convert lat/lng to canvas coordinates
    const getCanvasCoords = (lat: number, lng: number) => {
      const x = ((lng - minLng) / (maxLng - minLng)) * width;
      const y = ((maxLat - lat) / (maxLat - minLat)) * height;
      return { x, y };
    };

    // Draw heatmap gradient circles for each hotspot
    hotspots.forEach((hotspot) => {
      const lat = hotspot.latitude || 9.15;
      const lng = hotspot.longitude || 125.55;
      const { x, y } = getCanvasCoords(lat, lng);

      // Draw multiple circles with decreasing intensity for gradient effect
      const maxRadius = 80;
      const steps = 5;

      for (let i = steps; i >= 1; i--) {
        const radius = (maxRadius / steps) * i;
        const alpha = ((hotspot.intensity / 100) * (1 - i / steps)) * 0.6;

        // Determine color based on intensity
        let color = 'rgba(34, 197, 94,'; // green
        if (hotspot.intensity >= 80) {
          color = 'rgba(220, 38, 38,'; // red
        } else if (hotspot.intensity >= 60) {
          color = 'rgba(234, 88, 12,'; // orange
        } else if (hotspot.intensity >= 40) {
          color = 'rgba(234, 179, 8,'; // yellow
        }

        ctx.fillStyle = `${color} ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw markers for each hotspot
    hotspots.forEach((hotspot) => {
      const lat = hotspot.latitude || 9.15;
      const lng = hotspot.longitude || 125.55;
      const { x, y } = getCanvasCoords(lat, lng);

      // Determine marker color
      let color = '#22c55e'; // green
      if (hotspot.intensity >= 80) {
        color = '#dc2626'; // red
      } else if (hotspot.intensity >= 60) {
        color = '#ea580c'; // orange
      } else if (hotspot.intensity >= 40) {
        color = '#eab308'; // yellow
      }

      // Draw marker circle
      ctx.fillStyle = color;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Draw intensity number
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hotspot.intensity.toString(), x, y);
    });

    // Draw border
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);

  }, [hotspots]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={400}
      style={{
        width: '100%',
        height: 'auto',
        display: 'block',
        borderRadius: '0.5rem',
      }}
    />
  );
}
