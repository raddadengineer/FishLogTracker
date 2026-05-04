import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function GoogleSignInBlock() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    fetch("/api/auth/google/status", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { enabled?: boolean }) => setEnabled(!!d.enabled))
      .catch(() => setEnabled(false));
  }, []);

  if (!enabled) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground shrink-0">or continue with</span>
        <Separator className="flex-1" />
      </div>
      <Button variant="outline" className="w-full" asChild>
        <a href="/api/auth/google">Continue with Google</a>
      </Button>
    </div>
  );
}
