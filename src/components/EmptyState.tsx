export default function EmptyState({ q }: { q?: string }) {
  return (
    <div className="px-4 py-16 text-center">
      <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-neutral-200/60" />
      <h3 className="text-base font-semibold">No results found</h3>
      <p className="text-sm text-neutral-500 mt-1">
        {q ? (
          <>Try different keywords or remove some filters for “{q}”.</>
        ) : (
          "Try removing some filters."
        )}
      </p>
    </div>
  );
}
