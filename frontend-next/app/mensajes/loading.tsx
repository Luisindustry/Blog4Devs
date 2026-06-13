export default function MessagesLoading() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-28">
      <section className="border-b border-border pb-8 pt-8">
        <div className="skeleton mb-4 h-3 w-24" />
        <div className="skeleton h-7 w-64" />
      </section>

      <section className="mt-6 grid min-h-[480px] grid-cols-1 gap-4 md:grid-cols-[240px_1fr]">
        <div className="rounded border border-border p-3">
          <div className="skeleton mb-4 h-4 w-full" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="mb-3">
              <div className="skeleton mb-1.5 h-3.5 w-24" />
              <div className="skeleton h-3 w-full" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center rounded border border-border">
          <div className="skeleton h-3 w-48" />
        </div>
      </section>
    </main>
  );
}
