import { useEffect, useMemo, useState } from "react";

export default function ConfettiBurst({ durationMs = 1400 }: { durationMs?: number }) {
  const [alive, setAlive] = useState(true);

  useEffect(() => {
    const id = window.setTimeout(() => setAlive(false), durationMs);
    return () => window.clearTimeout(id);
  }, [durationMs]);

  const pieces = useMemo(() => Array.from({ length: 28 }, (_, i) => i), []);

  if (!alive) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {pieces.map((i) => {
        const left = (i * 100) / pieces.length;
        const delay = (i % 7) * 20;
        const hue = (i * 37) % 360;
        const size = 8 + (i % 5) * 3;
        return (
          <span
            key={i}
            style={
              {
                left: `${left}%`,
                animationDelay: `${delay}ms`,
                backgroundColor: `hsl(${hue} 90% 55%)`,
                width: `${size}px`,
                height: `${size * 0.45}px`,
              } as any
            }
            className="absolute top-[-20px] rounded-sm opacity-90 animate-[confetti-fall_1.4s_ease-in_forwards]"
          />
        );
      })}

      <style>{`
@keyframes confetti-fall {
  0% { transform: translateY(0) rotate(0deg); opacity: 0; }
  10% { opacity: 1; }
  100% { transform: translateY(110vh) rotate(540deg); opacity: 0; }
}
`}</style>
    </div>
  );
}

