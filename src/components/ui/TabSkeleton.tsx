export const TabSkeleton = () => (
  <div className="animate-pulse space-y-4" aria-busy="true">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="h-24 rounded-xl bg-muted" />
      <div className="h-24 rounded-xl bg-muted" />
      <div className="h-24 rounded-xl bg-muted" />
    </div>
    <div className="h-64 rounded-xl bg-muted" />
    <div className="h-40 rounded-xl bg-muted" />
  </div>
);

export default TabSkeleton;
