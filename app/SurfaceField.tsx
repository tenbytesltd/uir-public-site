"use client";

import { useEffect, useRef } from "react";

export type SurfaceFieldConfig = {
  backgroundColor: string;
  cycleMs: number;
  dotColor: string;
  dotOpacity: number;
  motionlessAllowed: boolean;
};

const POINTER_TWIST_PX = 8;
const PHASE_WAVE_PX = 2;
const RADIAL_WAVE_PX = 2;

export function SurfaceField({ config }: { config: SurfaceFieldConfig }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    backgroundColor,
    cycleMs,
    dotColor,
    dotOpacity,
    motionlessAllowed,
  } = config;

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const context = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !host || !context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 1;
    let height = 1;
    let pixelRatio = 1;
    let targetX = 0;
    let targetY = 0;
    let fieldX = 0;
    let fieldY = 0;
    let animationFrame = 0;
    const startedAt = performance.now();

    const resize = () => {
      const bounds = host.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      if (targetX === 0 && targetY === 0) {
        targetX = fieldX = width / 2;
        targetY = fieldY = height / 2;
      }
    };

    const draw = (now: number, animate: boolean) => {
      if (animate) {
        fieldX += (targetX - fieldX) * 0.075;
        fieldY += (targetY - fieldY) * 0.075;
      } else {
        fieldX = width / 2;
        fieldY = height / 2;
      }

      context.globalAlpha = 1;
      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, width, height);

      const gap = width < 480 ? 22 : 26;
      const influence = Math.min(width, height) * 0.5;
      const phase = animate
        ? ((now - startedAt) / cycleMs) * Math.PI * 2
        : 0;
      context.fillStyle = dotColor;

      for (let y = -gap; y < height + gap; y += gap) {
        for (let x = -gap; x < width + gap; x += gap) {
          const dx = x - fieldX;
          const dy = y - fieldY;
          const radius = Math.max(1, Math.hypot(dx, dy));
          const falloff = Math.max(0, 1 - radius / influence);
          const gravity = animate ? falloff * falloff : 0;
          const tangentX = -dy / radius;
          const tangentY = dx / radius;
          const radialX = dx / radius;
          const radialY = dy / radius;
          const twist = gravity * (
            POINTER_TWIST_PX + Math.sin(radius * 0.05 - phase) * PHASE_WAVE_PX
          );
          const lens = gravity * Math.sin(radius * 0.07 - phase * 1.4) * RADIAL_WAVE_PX;
          const pointX = x + tangentX * twist + radialX * lens;
          const pointY = y + tangentY * twist + radialY * lens;

          context.globalAlpha = dotOpacity * (0.7 + gravity * 0.3);
          context.beginPath();
          context.arc(pointX, pointY, 1 + gravity * 0.18, 0, Math.PI * 2);
          context.fill();
        }
      }
      context.globalAlpha = 1;
    };

    const frame = (now: number) => {
      draw(now, true);
      animationFrame = requestAnimationFrame(frame);
    };

    const start = () => {
      cancelAnimationFrame(animationFrame);
      if (motionlessAllowed && reducedMotion.matches) {
        draw(performance.now(), false);
        return;
      }
      animationFrame = requestAnimationFrame(frame);
    };

    const steer = (event: PointerEvent) => {
      const bounds = host.getBoundingClientRect();
      targetX = Math.max(0, Math.min(width, event.clientX - bounds.left));
      targetY = Math.max(0, Math.min(height, event.clientY - bounds.top));
    };

    const reset = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      targetX = width / 2;
      targetY = height / 2;
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (motionlessAllowed && reducedMotion.matches) {
        draw(performance.now(), false);
      }
    });
    resizeObserver.observe(host);
    host.addEventListener("pointermove", steer, { passive: true });
    host.addEventListener("pointerleave", reset, { passive: true });
    reducedMotion.addEventListener("change", start);
    resize();
    start();

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      host.removeEventListener("pointermove", steer);
      host.removeEventListener("pointerleave", reset);
      reducedMotion.removeEventListener("change", start);
    };
  }, [backgroundColor, cycleMs, dotColor, dotOpacity, motionlessAllowed]);

  return <canvas ref={canvasRef} className="uir-surface-field" aria-hidden="true" />;
}
