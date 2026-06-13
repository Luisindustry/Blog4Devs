export default function MyQuestionsLoading() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-28">
      <section className="border-b border-border pb-8 pt-8">
        <div className="skeleton mb-4 h-3 w-24" />
        <div className="skeleton mb-3 h-7 w-56" />
        <div className="skeleton h-3 w-64" />
      </section>

      <section className="mt-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-start justify-between gap-4 border-b border-border px-1 py-4"
          >
            <div className="min-w-0 flex-1">
              <div className="skeleton mb-2.5 h-4 w-2/3" />
              <div className="skeleton h-3 w-40" />
            </div>
            <div className="skeleton h-5 w-20" />
          </div>
        ))}
      </section>
    </main>
  );
}
