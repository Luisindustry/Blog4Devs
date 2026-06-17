export default function HomeLoading() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-28">
      <section className="border-b border-border pb-12 pt-8">
        <div className="skeleton mb-4 h-3 w-20" />
        <div className="skeleton mb-2 h-7 w-80 max-w-full" />
        <div className="skeleton mb-5 h-7 w-96 max-w-full" />
        <div className="skeleton h-4 w-72 max-w-full" />
      </section>

      <section className="mt-8">
        <div className="skeleton mb-6 h-3 w-40" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="border-b border-border px-1 py-4">
            <div className="skeleton mb-3 h-4 w-3/4" />
            <div className="skeleton h-3 w-44" />
          </div>
        ))}
      </section>
    </main>
  );
}
