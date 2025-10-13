import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Brain } from "lucide-react";
import { OnboardingTour } from "@/components/OnboardingTour";
import { Button } from "@/components/ui/button";

function FallingLinesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const grainDataUri =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="3" stitchTiles="stitch"/></filter><rect width="120" height="120" filter="url(#noise)" opacity="0.32"/></svg>`,
    );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    type Line = {
      x: number;
      initialY: number;
      length: number;
      speed: number;
      opacity: number;
      variance: number;
    };

    let width = 0;
    let height = 0;
    let devicePixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    const columnSpacingBase = 160;
    const rowSpacingBase = 180;
    let columnSpacing = columnSpacingBase;
    let currentRowSpacing = rowSpacingBase;
    const lines: Line[] = [];

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      devicePixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(width * devicePixelRatio);
      canvas.height = Math.floor(height * devicePixelRatio);
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.scale(devicePixelRatio, devicePixelRatio);

      columnSpacing = Math.max(90, Math.min(columnSpacingBase, width / 9));
      const rowSpacing = Math.max(120, Math.min(rowSpacingBase, height / 6));
      currentRowSpacing = rowSpacing;
      const columnCount = Math.ceil(width / columnSpacing) + 3;
      const startX = (width - (columnCount - 1) * columnSpacing) / 2 - columnSpacing;
      const rowCount = Math.ceil(height / rowSpacing) + 6;

      lines.length = 0;
      for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
        const x = startX + columnIndex * columnSpacing;
        for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
          const offset = Math.random() * rowSpacing;
          const length = 72 + Math.random() * 96;
          const speed = 24 + Math.random() * 26;
          const opacity = 0.3 + Math.random() * 0.38;
          const variance = Math.random();
          lines.push({
            x,
            initialY: rowIndex * rowSpacing + offset,
            length,
            speed,
            opacity,
            variance,
          });
        }
      }
    };

    resize();
    window.addEventListener("resize", resize);

    const renderFrame = (timestamp: number) => {
      const time = timestamp * 0.001;
      context.clearRect(0, 0, width, height);
      context.lineCap = "round";

      for (const line of lines) {
        const cycle = height + line.length + currentRowSpacing * 2;
        const progress = (line.initialY + time * line.speed) % cycle;
        const y = progress - line.length;
        const glow = 210 + line.variance * 40;
        const r = Math.min(255, glow);
        const g = Math.min(255, glow + 6);
        const b = Math.min(255, glow + 14);

        context.globalAlpha = Math.min(0.92, line.opacity + line.variance * 0.2);
        context.strokeStyle = `rgba(${r.toFixed(1)}, ${g.toFixed(1)}, ${b.toFixed(1)}, 0.95)`;
        context.lineWidth = 1.35 + line.variance * 0.6;
        context.beginPath();
        context.moveTo(line.x, y);
        context.lineTo(line.x, y + line.length);
        context.stroke();
      }

      context.globalAlpha = 1;
    };

    const animate = (timestamp: number) => {
      renderFrame(timestamp);
      animationRef.current = requestAnimationFrame(animate);
    };

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (mediaQuery.matches) {
      renderFrame(performance.now());
    } else {
      animationRef.current = requestAnimationFrame(animate);
    }

    const handleMotionChange = () => {
      if (mediaQuery.matches) {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        renderFrame(performance.now());
      } else if (!animationRef.current) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleMotionChange);
    } else {
      mediaQuery.addListener(handleMotionChange);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener("resize", resize);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleMotionChange);
      } else {
        mediaQuery.removeListener(handleMotionChange);
      }
    };
  }, []);

  return (
    <div className="absolute inset-0 bg-[#050505]">
      <canvas ref={canvasRef} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08)_0%,rgba(16,16,16,0.1)_40%,rgba(0,0,0,0.78)_84%,rgba(0,0,0,0.92)_100%)] mix-blend-screen opacity-90" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.85)_65%,rgba(0,0,0,0.95)_100%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-25 mix-blend-overlay"
        style={{ backgroundImage: `url(${grainDataUri})`, backgroundSize: "240px 240px" }}
      />
    </div>
  );
}

export function HomePage() {
  const [, setLocation] = useLocation();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('mono-ai-onboarding-seen');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingClose = () => {
    setShowOnboarding(false);
    localStorage.setItem('mono-ai-onboarding-seen', 'true');
  };

  const handleOnboardingNavigate = (path: string) => {
    setLocation(path);
  };

  const startOnboarding = () => {
    setShowOnboarding(true);
  };

  return (
    <>
      <OnboardingTour
        isOpen={showOnboarding}
        onClose={handleOnboardingClose}
        onNavigate={handleOnboardingNavigate}
      />

      <div className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
        <FallingLinesBackground />

        <div className="relative z-10 flex min-h-screen flex-col">
          <header className="flex items-center justify-between px-6 pt-8 md:px-12">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/8 backdrop-blur">
                <Brain className="h-6 w-6 text-[#b8ff3f]" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-[0.45em] text-white/50">
                  Mono AI
                </span>
                <span className="text-sm font-medium text-white/80">
                  Data intelligence studio
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={startOnboarding}
              className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-white/60 transition hover:border-white/35 hover:text-white"
            >
              Take the tour
            </button>
          </header>

          <div className="flex flex-1 items-center justify-center px-6 py-16 text-center md:px-10 md:py-24">
            <div className="max-w-3xl space-y-10">
              <div className="space-y-6">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/45">
                  Adaptive analytics workspace
                </p>
                <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl md:text-7xl">
                  Shape the future of your data decisions
                </h1>
                <p className="mx-auto max-w-2xl text-base text-white/70 md:text-lg">
                  Explore your datasets through AI-assisted storytelling, rapid experimentation, and living dashboards that keep teams aligned.
                </p>
              </div>
              <div className="flex justify-center">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-[#abf132] px-12 py-6 text-base font-semibold text-black shadow-[0_24px_68px_rgba(171,241,50,0.35)] transition duration-300 hover:bg-[#b8ff3f] hover:shadow-[0_20px_54px_rgba(171,241,50,0.28)] focus:ring-0"
                >
                  <Link href="/data">Get started</Link>
                </Button>
              </div>
              <div className="flex flex-wrap justify-center gap-3 pt-4 text-[0.65rem] font-medium uppercase tracking-[0.32em] text-white/40">
                <span className="rounded-full border border-white/15 px-3 py-2">
                  Live demo dataset
                </span>
                <span className="rounded-full border border-white/15 px-3 py-2">
                  Predictive models
                </span>
                <span className="rounded-full border border-white/15 px-3 py-2">
                  AI assistant
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
