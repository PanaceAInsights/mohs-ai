import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ComingSoon({
  title,
  phase,
  description,
}: {
  title: string;
  phase: string;
  description: string;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-4 py-16 sm:px-6">
      <Badge variant="outline" className="mb-5 w-fit border-accent/40 bg-accent/5 text-accent">
        {phase}
      </Badge>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-4 max-w-xl text-lg text-muted-foreground">{description}</p>
      <div className="mt-8">
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "outline" }), "h-9 px-4")}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to overview
        </Link>
      </div>
    </div>
  );
}
