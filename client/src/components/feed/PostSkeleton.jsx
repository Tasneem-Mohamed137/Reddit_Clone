export default function PostSkeleton() {
  return (
    <div className="border-b border-line p-3">
      <div className="skeleton h-4 w-40" />
      <div className="skeleton mt-3 h-6 w-3/4" />
      <div className="skeleton mt-3 h-40 w-full" />
      <div className="skeleton mt-3 h-8 w-48 !rounded-full" />
    </div>
  );
}