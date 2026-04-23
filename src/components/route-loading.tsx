function SkeletonBlock({
  className,
}: {
  className: string;
}) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/80 ${className}`} />;
}

export function OverviewLoading() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[28px] border border-white/70 bg-white/75 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
          >
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="mt-4 h-10 w-20" />
            <SkeletonBlock className="mt-4 h-3 w-full" />
            <SkeletonBlock className="mt-2 h-3 w-2/3" />
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[28px] border border-white/70 bg-white/75 p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <SkeletonBlock className="h-4 w-36" />
          <SkeletonBlock className="mt-4 h-10 w-72" />
          <SkeletonBlock className="mt-4 h-3 w-full" />
          <SkeletonBlock className="mt-2 h-3 w-5/6" />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-[24px] border border-slate-200/70 p-5">
                <SkeletonBlock className="h-3 w-28" />
                <SkeletonBlock className="mt-4 h-7 w-40" />
                <SkeletonBlock className="mt-4 h-3 w-full" />
                <SkeletonBlock className="mt-2 h-3 w-4/5" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/70 bg-white/75 p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <SkeletonBlock className="h-4 w-36" />
          <SkeletonBlock className="mt-4 h-8 w-52" />
          <div className="mt-6 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3">
                <SkeletonBlock className="h-4 w-28" />
                <SkeletonBlock className="h-6 w-10 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export function SplitPageLoading() {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      {Array.from({ length: 2 }).map((_, index) => (
        <div
          key={index}
          className="rounded-[28px] border border-white/70 bg-white/75 p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
        >
          <SkeletonBlock className="h-4 w-36" />
          <SkeletonBlock className="mt-4 h-10 w-64" />
          <SkeletonBlock className="mt-4 h-3 w-full" />
          <SkeletonBlock className="mt-2 h-3 w-5/6" />
          <div className="mt-8 space-y-4">
            {Array.from({ length: 3 }).map((_, itemIndex) => (
              <div
                key={itemIndex}
                className="rounded-[24px] border border-slate-200/70 bg-white/70 p-5"
              >
                <SkeletonBlock className="h-6 w-48" />
                <SkeletonBlock className="mt-3 h-3 w-full" />
                <SkeletonBlock className="mt-2 h-3 w-4/5" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function BoardLoading() {
  return (
    <div className="rounded-[28px] border border-white/70 bg-white/75 p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
      <SkeletonBlock className="h-4 w-40" />
      <SkeletonBlock className="mt-4 h-10 w-64" />
      <SkeletonBlock className="mt-4 h-3 w-full" />
      <div className="mt-8 grid gap-4 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[26px] border border-slate-200/70 bg-white/70 p-5"
          >
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-5 w-24" />
              <SkeletonBlock className="h-6 w-8 rounded-full" />
            </div>
            <div className="mt-4 space-y-3">
              {Array.from({ length: 2 }).map((_, cardIndex) => (
                <div
                  key={cardIndex}
                  className="rounded-[22px] border border-slate-200/70 bg-white/85 p-4"
                >
                  <SkeletonBlock className="h-5 w-28" />
                  <SkeletonBlock className="mt-3 h-3 w-3/4" />
                  <SkeletonBlock className="mt-4 h-9 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetailLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/70 bg-white/75 p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="mt-4 h-12 w-80" />
        <SkeletonBlock className="mt-4 h-3 w-full" />
        <SkeletonBlock className="mt-2 h-3 w-5/6" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[28px] border border-white/70 bg-white/75 p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
          >
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="mt-4 h-9 w-56" />
            <div className="mt-6 space-y-4">
              {Array.from({ length: 3 }).map((_, itemIndex) => (
                <div
                  key={itemIndex}
                  className="rounded-[24px] border border-slate-200/70 bg-white/70 p-5"
                >
                  <SkeletonBlock className="h-6 w-40" />
                  <SkeletonBlock className="mt-3 h-3 w-full" />
                  <SkeletonBlock className="mt-2 h-3 w-4/5" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
