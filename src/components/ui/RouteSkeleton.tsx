export const RouteSkeleton = () => (
  <div className="container max-w-7xl mx-auto px-4 pt-6 pb-12 animate-pulse" aria-busy="true">
    <div className="h-8 w-48 rounded-md bg-muted mb-6" />
    <div className="space-y-4">
      <div className="h-32 rounded-xl bg-muted" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-40 rounded-xl bg-muted" />
        <div className="h-40 rounded-xl bg-muted" />
        <div className="h-40 rounded-xl bg-muted" />
      </div>
    </div>
  </div>
);

export default RouteSkeleton;
