export function PageHeader({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="border-b border-border">
      <div className="mx-auto max-w-[1320px] px-6 py-16 lg:py-20">
        <p className="label-caps">{eyebrow}</p>
        <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:items-end">
          <h1 className="text-[clamp(2.1rem,4.4vw,3.6rem)] leading-[1.02]">{title}</h1>
          <p className="max-w-[58ch] text-[15px] leading-relaxed text-muted-foreground">{lead}</p>
        </div>
        {children && <div className="mt-9">{children}</div>}
      </div>
    </header>
  );
}

export function Section({
  title,
  lead,
  children,
  tint,
}: {
  title?: string;
  lead?: string;
  children: React.ReactNode;
  tint?: boolean;
}) {
  return (
    <section className={`border-b border-border ${tint ? "bg-card/60" : ""}`}>
      <div className="mx-auto max-w-[1320px] px-6 py-16">
        {(title || lead) && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:items-end">
            {title && <h2 className="text-[clamp(1.7rem,3vw,2.4rem)] leading-[1.08]">{title}</h2>}
            {lead && (
              <p className="max-w-[58ch] text-[14px] leading-relaxed text-muted-foreground">
                {lead}
              </p>
            )}
          </div>
        )}
        <div className={title || lead ? "mt-10" : ""}>{children}</div>
      </div>
    </section>
  );
}
