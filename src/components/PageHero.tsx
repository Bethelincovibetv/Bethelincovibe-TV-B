interface PageHeroProps {
  image: string;
  title: string;
  subtitle?: string;
  eyebrow?: string;
}

export default function PageHero({ image, title, subtitle, eyebrow }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img src={image} alt="" className="w-full h-full object-cover" width={1600} height={900} />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>
      <div className="relative container mx-auto px-4 py-10 md:py-20">
        <div className="max-w-2xl">
          {eyebrow && (
            <p className="text-xs md:text-sm font-semibold uppercase tracking-wider text-primary mb-2">
              {eyebrow}
            </p>
          )}
          <h1 className="text-3xl md:text-5xl font-bold leading-tight text-foreground">{title}</h1>
          {subtitle && (
            <p className="mt-3 text-base md:text-lg text-muted-foreground max-w-xl">{subtitle}</p>
          )}
        </div>
      </div>
    </section>
  );
}
