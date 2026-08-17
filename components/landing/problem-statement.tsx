/** The problem statement is editorial copy, so it is visible on first paint. */
export function ProblemStatement() {
  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      <div className="via-primary/[0.02] pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-transparent" />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <p className="text-foreground/90 font-serif text-2xl leading-[1.3] sm:text-3xl md:text-4xl lg:text-5xl">
          <span className="text-muted-foreground">Work is easy to forget. </span>
          <span className="text-foreground">The details disappear first.</span>
          <span className="text-muted-foreground">
            {' '}
            A fix in Slack, a decision in a meeting, or a launch that took a month can be hard to
            remember by review time.
          </span>
          <br />
          <span className="text-primary">Write it down once. Find it when you need it.</span>
        </p>

        <div className="bg-primary/50 mx-auto mt-12 h-px w-24" />

        <p className="text-muted-foreground mt-8 text-lg">
          Jobmark keeps those notes in one place.
        </p>
      </div>
    </section>
  );
}
