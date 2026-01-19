import { Skeleton } from "@/components/ui/skeleton";

export default function ProposalSkeleton() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 md:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-1 w-32 md:w-48 rounded-full" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      </header>
      
      {/* Content */}
      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <div className="space-y-3 mt-8">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <div className="space-y-3 mt-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-border px-4 md:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Skeleton className="h-12 w-28 md:w-32 rounded-lg" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-12 w-28 md:w-32 rounded-lg" />
        </div>
      </footer>
    </div>
  );
}
