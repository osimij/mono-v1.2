import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Brain } from "lucide-react";
import { Link, useLocation } from "wouter";
import { OnboardingTour } from "@/components/OnboardingTour";

function SpiralLinesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const lineCount = 220;
    const lines = Array.from({ length: lineCount }, (_, index) => ({
      index,
      phase: Math.random() * Math.PI * 2,
      jitter: Math.random() * 0.6 + 0.4,
      baseLength: 28 + Math.random() * 26,
    }));

    const pointer = { x: 0, y: 0, active: false };
    let width = 0;
    let height = 0;
    let animationFrame: number | null = null;

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      if (context.resetTransform) {
        context.resetTransform();
      } else {
        context.setTransform(1, 0, 0, 1, 0, 0);
      }
      context.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    const handlePointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
    };

    const handlePointerLeave = () => {
      pointer.active = false;
    };

    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerdown", handlePointerMove);
    canvas.addEventListener("pointerleave", handlePointerLeave);

    const renderFrame = (time: number) => {
      context.clearRect(0, 0, width, height);

      const minDimension = Math.min(width, height);
      const baseRadius = minDimension * 0.16;
      const radiusStep = minDimension * 0.012;
      const centerX = width * 0.58;
      const centerY = height * 0.45;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const spiralIndex = line.index;
        const theta = spiralIndex * 0.34 + time * 0.00018;
        const radius = baseRadius + Math.sqrt(spiralIndex) * radiusStep * 5.4;

        if (radius > Math.max(width, height) * 1.12) continue;

        const wave = Math.sin(time * 0.0012 + line.phase);
        const x = centerX + radius * Math.cos(theta);
        const yBase = centerY + radius * Math.sin(theta);
        const y = yBase + wave * 18 * line.jitter;

        const distance = pointer.active
          ? Math.hypot(x - pointer.x, y - pointer.y)
          : Infinity;
        const influence = pointer.active
          ? Math.max(0, 1 - distance / (minDimension * 0.42))
          : 0;

        const length = line.baseLength + wave * 12 + influence * (minDimension * 0.14);
        const opacity = Math.min(
          0.8,
          0.22 + wave * 0.22 + influence * 0.62 + (1 - spiralIndex / lines.length) * 0.12,
        );
        const lineWidth = 1.2 + influence * 0.9;

        context.strokeStyle = `rgba(214, 225, 255, ${opacity})`;
        context.lineWidth = lineWidth;
        context.beginPath();
        context.moveTo(x, y - length / 2);
        context.lineTo(x, y + length / 2);
        context.stroke();
      }
    };

    const animate = (time: number) => {
      renderFrame(time);
      animationFrame = requestAnimationFrame(animate);
    };

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (mediaQuery.matches) {
      renderFrame(0);
    } else {
      animationFrame = requestAnimationFrame(animate);
    }

    const handleMotionChange = () => {
      if (mediaQuery.matches) {
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
          animationFrame = null;
        }
        renderFrame(0);
      } else if (!animationFrame) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleMotionChange);
    } else {
      mediaQuery.addListener(handleMotionChange);
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerdown", handlePointerMove);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleMotionChange);
      } else {
        mediaQuery.removeListener(handleMotionChange);
      }
    };
  }, []);

  return (
    <div className="absolute inset-0">
      <canvas ref={canvasRef} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(100,120,255,0.28),rgba(5,5,8,0.95)62%,rgba(5,5,8,1)90%)] mix-blend-screen opacity-80" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(5,5,8,0.82)0%,rgba(5,5,8,0.08)45%,rgba(5,5,8,0.88)100%)]" />
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
        <SpiralLinesBackground />

        <div className="relative z-10 flex min-h-screen flex-col">
          <header className="flex items-center justify-between px-6 pt-8 md:px-12">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 backdrop-blur">
                <Brain className="h-6 w-6 text-lime-300" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-[0.45em] text-white/50">
                  Mono AI
                </span>
                <span className="text-sm font-medium text-white/80">
                  Intelligence studio
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

          <div className="flex flex-1 items-end">
            <div className="px-6 pb-14 md:px-12 md:pb-20 lg:px-24 lg:pb-24">
              <div className="max-w-xl space-y-6">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/45">
                  Real-time portfolio intelligence
                </p>
                <h1 className="text-4xl font-semibold leading-[1.08] text-white md:text-6xl">
                  Join a new generation of investors
                </h1>
                <p className="text-base text-white/70 md:text-lg">
                  Build conviction with AI-assisted analysis, live market signals, and collaborative
                  storytelling designed for bold investment teams.
                </p>
                <div>
                  <Button
                    asChild
                    size="lg"
                    className="w-fit rounded-full bg-lime-400 px-10 py-6 text-base font-semibold text-black shadow-[0_28px_80px_rgba(186,255,120,0.35)] transition duration-300 hover:bg-lime-300 hover:shadow-[0_22px_60px_rgba(186,255,120,0.28)]"
                  >
                    <Link href="/data">Get started</Link>
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-4 text-[0.65rem] font-medium uppercase tracking-[0.32em] text-white/40">
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
      </div>
    </>
  );
}
