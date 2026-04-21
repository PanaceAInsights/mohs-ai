import Link from "next/link";
import { Activity, Home } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 text-center sm:px-6">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
        <Activity className="h-6 w-6" strokeWidth={2.5} />
      </span>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        The address you tried doesn't exist in MOHS AI. Have another go from the
        home page, or use the navigation up top.
      </p>
      <Link
        href="/"
        className={cn(buttonVariants(), "mt-8 h-10 px-5 text-sm")}
      >
        <Home className="mr-1.5 h-4 w-4" /> Back home
      </Link>
    </div>
  );
}
