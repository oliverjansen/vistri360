import { Link } from "react-router-dom";

const NotFoundPage = () => {
  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-navy px-5 py-16 font-body text-white sm:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(56,189,248,0.18),transparent_32%),radial-gradient(circle_at_85%_80%,rgba(14,165,233,0.14),transparent_30%)]" />
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10 bg-white/[0.03] blur-sm" />
      <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full border border-primary/20 bg-primary/[0.06]" />

      <section className="relative z-10 w-full max-w-3xl text-center">
        <div className="mx-auto mb-8 inline-flex items-center gap-3 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_16px_rgba(56,189,248,0.9)]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary sm:text-xs">
            Vistri 360
          </span>
        </div>

        <p className="font-display text-[clamp(6rem,22vw,13rem)] font-black leading-none tracking-[-0.08em] text-white/10">
          404
        </p>
        <h1 className="-mt-12 font-display text-4xl font-black tracking-tight sm:-mt-20 sm:text-6xl">
          This space is <span className="text-primary">unmapped.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-surface/70 sm:text-lg">
          The page you are looking for may have moved, or the link may no longer be available.
          Let&apos;s get you back to a familiar view.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to="/"
            className="inline-flex w-full items-center justify-center rounded-md bg-primary px-8 py-4 text-xs font-bold uppercase tracking-widest text-white transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/70 sm:w-auto"
          >
            Back to home
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex w-full items-center justify-center rounded-md border border-white/20 bg-white/5 px-8 py-4 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary/70 sm:w-auto"
          >
            Go back
          </button>
        </div>
      </section>
    </main>
  );
};

export default NotFoundPage
