export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <p>© {new Date().getFullYear()} Flooy Photos. All rights reserved.</p>
        <p className="text-center sm:text-right">
          Pay at the Flooy Photo Desk · Instant downloads once confirmed
        </p>
      </div>
    </footer>
  )
}
