import { Camera, CreditCard, Download } from "lucide-react"

type GalleryHeroProps = {
  eventCount: number
  photoCount: number
}

export function GalleryHero({ eventCount, photoCount }: GalleryHeroProps) {
  return (
    <section className="border-b border-border/60">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="max-w-2xl">
          <p className="mb-3 text-sm font-medium text-primary">Flooy Photos</p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Find your moment from the event.
          </h1>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Browse every shot from the day, add your favourites to your cart, then pay at the Flooy
            Photo Desk to unlock instant high-resolution downloads.
          </p>

          <dl className="mt-6 flex gap-8">
            <div>
              <dt className="text-sm text-muted-foreground">Photos</dt>
              <dd className="text-2xl font-semibold tabular-nums">{photoCount.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Events</dt>
              <dd className="text-2xl font-semibold tabular-nums">{eventCount.toLocaleString()}</dd>
            </div>
          </dl>
        </div>

        <ol className="mt-10 grid gap-4 sm:grid-cols-3">
          <Step icon={<Camera className="h-5 w-5" />} title="1 · Browse & select" desc="Search the gallery and add photos to your cart." />
          <Step icon={<CreditCard className="h-5 w-5" />} title="2 · Pay at the desk" desc="Show your order number to staff to pay in person." />
          <Step icon={<Download className="h-5 w-5" />} title="3 · Download instantly" desc="Get secure high-res downloads once payment is confirmed." />
        </ol>
      </div>
    </section>
  )
}

function Step({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
        {icon}
      </span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
      </div>
    </li>
  )
}
