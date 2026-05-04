import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CatchCard from "@/components/catches/CatchCard";

export default function CatchDetailPage() {
  const params = useParams<{ id: string }>();
  const idNum = params.id ? parseInt(params.id, 10) : NaN;

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/catches", idNum],
    enabled: Number.isFinite(idNum),
  });

  if (!Number.isFinite(idNum)) {
    return (
      <div className="container max-w-lg mx-auto py-8 px-4">
        <p className="text-muted-foreground">Invalid catch link.</p>
        <Button variant="link" asChild className="mt-2 px-0">
          <Link href="/">Back home</Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data || typeof data !== "object") {
    return (
      <div className="container max-w-lg mx-auto py-8 px-4">
        <p className="text-muted-foreground">Catch not found.</p>
        <Button variant="link" asChild className="mt-2 px-0">
          <Link href="/map">Explore map</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-xl mx-auto py-6 px-4">
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
        <Link href="/map">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to map
        </Link>
      </Button>
      {/* API shape matches list/detail join from storage */}
      <CatchCard
        catchData={{
          ...(data as Record<string, unknown>),
          id: Number((data as { id: number }).id),
          size: Number((data as { size: number | string }).size),
        }}
      />
    </div>
  );
}
