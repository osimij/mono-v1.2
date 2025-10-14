import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Brain } from "lucide-react";
import { OnboardingTour } from "@/components/OnboardingTour";
import { Button } from "@/components/ui/button";

function CircleAnimationBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    // Watch for theme changes
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let width = 0;
    let height = 0;
    let devicePixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    const circleSize = 20;
    const spacing = 48;
    let gridCols = 0;
    let gridRows = 0;
    let offsetX = 0;
    let offsetY = 0;

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      devicePixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(width * devicePixelRatio);
      canvas.height = Math.floor(height * devicePixelRatio);
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.scale(devicePixelRatio, devicePixelRatio);

      gridCols = Math.ceil(width / spacing) + 2;
      gridRows = Math.ceil(height / spacing) + 2;
      offsetX = (width - (gridCols - 1) * spacing) / 2;
      offsetY = (height - (gridRows - 1) * spacing) / 2;
    };

    resize();
    window.addEventListener("resize", resize);

    const renderFrame = (timestamp: number) => {
      const time = timestamp * 0.001;
      context.clearRect(0, 0, width, height);

      // Animated diagonal wave that cycles continuously
      const waveSpeed = 0.18; // Speed of the wave traveling
      const waveFrequency = 1.5; // How many complete cycles across the screen
      
      for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
          const x = offsetX + col * spacing;
          const y = offsetY + row * spacing;
          
          // Calculate diagonal position (0 to 1 from top-left to bottom-right)
          const diagonalPosition = (row + col) / (gridRows + gridCols - 2);
          
          // Create a cycling wave that travels diagonally across the grid
          // This uses sin to create a smooth cycle: filled -> thin -> filled -> thin
          const wave = Math.sin((diagonalPosition * waveFrequency - time * waveSpeed) * Math.PI * 2);
          
          // Map wave from [-1, 1] to [0, 1]
          // 0 = fully filled (thick stroke), 1 = thin stroke
          let progress = (wave + 1) / 2;
          
          // Subtle size variation
          const sizeVariation = Math.sin(time * 1.2 + row * 0.2 + col * 0.2) * 0.8;
          const size = circleSize + sizeVariation;
          const radius = size / 2;
          
          // Opacity variation for depth
          const baseOpacity = 0.75 + Math.sin(time * 0.8 + row * 0.25 + col * 0.25) * 0.15;
          context.globalAlpha = Math.max(0.5, Math.min(0.9, baseOpacity));
          
          // Use smoothstep for smooth interpolation
          const smoothProgress = progress * progress * (3 - 2 * progress);
          
          // Stroke width grows from thin to almost filling the circle (70%), then back to thin
          // Leave a small gap in the center at maximum thickness
          const minStroke = 0.8;
          const maxStroke = radius * 1.4; // 70% filled
          
          // Map progress: 0 = max (filled), 1 = min (thin)
          const strokeWidth = maxStroke - (smoothProgress * (maxStroke - minStroke));
          
          // Opacity based on how filled the circle is
          const strokeOpacity = isDark
            ? 0.85 - smoothProgress * 0.35
            : 0.8 - smoothProgress * 0.3;
          
          if (isDark) {
            context.strokeStyle = `rgba(255, 255, 255, ${strokeOpacity})`;
          } else {
            context.strokeStyle = `rgba(0, 0, 0, ${strokeOpacity})`;
          }
          
          context.lineWidth = strokeWidth;
          context.beginPath();
          context.arc(x, y, radius, 0, Math.PI * 2);
          context.stroke();
        }
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
  }, [isDark]);

  return (
    <div className={isDark ? "absolute inset-0 bg-[#000000]" : "absolute inset-0 bg-[#F5F5F7]"}>
      <canvas ref={canvasRef} className="h-full w-full" />
      {isDark ? (
        <>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,rgba(0,0,0,0.3)_50%,rgba(0,0,0,0.85)_100%)]" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#000000]/80" />
        </>
      ) : (
        <>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.4)_0%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0)_100%)]" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#F5F5F7]/60" />
        </>
      )}
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

      <div className="relative min-h-screen overflow-hidden bg-[#F5F5F7] text-foreground dark:bg-[#000000] dark:text-white">
        <CircleAnimationBackground />

        <div className="relative z-10 flex min-h-screen flex-col">
          {/* Header with tour button in top right */}
          <header className="absolute top-0 right-0 px-6 pt-8 md:px-12">
            <button
              type="button"
              onClick={startOnboarding}
              className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-black/50 transition hover:border-black/25 hover:text-black hover:bg-black/5 dark:border-white/15 dark:text-white/60 dark:hover:border-white/35 dark:hover:text-white dark:hover:bg-white/5"
            >
              Take the tour
            </button>
          </header>

          {/* Content in bottom left */}
          <div className="flex flex-1 items-end pb-12 pl-8 md:pb-16 md:pl-16 lg:pb-20 lg:pl-24">
            <div className="max-w-3xl space-y-8">
              {/* Logo and branding */}
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/5 backdrop-blur dark:bg-white/8">
                  <Brain className="h-6 w-6 text-[#b8ff3f]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold uppercase tracking-[0.45em] text-black/45 dark:text-white/50">
                    Mono AI
                  </span>
                  <span className="text-sm font-medium text-black/75 dark:text-white/80">
                    Data intelligence studio
                  </span>
                </div>
              </div>

              {/* Main content */}
              <div className="space-y-6">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-black/40 dark:text-white/45">
                  Adaptive analytics workspace
                </p>
                <h1 className="text-4xl font-semibold leading-tight text-black sm:text-5xl md:text-6xl lg:text-7xl dark:text-white">
                  Shape the future of your data decisions
                </h1>
                <p className="max-w-2xl text-base text-black/65 md:text-lg dark:text-white/70">
                  Explore your datasets through AI-assisted storytelling, rapid experimentation, and living dashboards that keep teams aligned.
                </p>
              </div>

              {/* Call to action */}
              <div className="flex flex-col gap-6">
                <Button
                  asChild
                  size="lg"
                  className="w-fit rounded-full bg-[#abf132] px-12 py-6 text-base font-semibold text-black shadow-[0_24px_68px_rgba(171,241,50,0.35)] transition duration-300 hover:bg-[#b8ff3f] hover:shadow-[0_20px_54px_rgba(171,241,50,0.28)] focus:ring-0"
                >
                  <Link href="/data">Get started</Link>
                </Button>
                
                <div className="flex flex-wrap gap-3 text-[0.65rem] font-medium uppercase tracking-[0.32em] text-black/35 dark:text-white/40">
                  <span className="rounded-full border border-black/10 px-3 py-2 dark:border-white/15">
                    Live demo dataset
                  </span>
                  <span className="rounded-full border border-black/10 px-3 py-2 dark:border-white/15">
                    Predictive models
                  </span>
                  <span className="rounded-full border border-black/10 px-3 py-2 dark:border-white/15">
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
