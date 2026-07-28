import { prisma } from "@/lib/db"
import { PhotoUploader } from "@/components/admin/photo-uploader"
import { SafeImage } from "@/components/safe-image"

export default async function PhotosPage() {
  const [events, photos, photographers] = await Promise.all([
    prisma.event.findMany({ orderBy:{date:"desc"},select:{id:true,name:true} }),
    prisma.photo.findMany({ take:30,orderBy:{createdAt:"desc"},include:{event:{select:{name:true}}} }),
    prisma.photo.findMany({where:{photographer:{not:null}},select:{photographer:true},distinct:["photographer"],orderBy:{photographer:"asc"}}),
  ])
  return <div className="space-y-8"><div><h1 className="text-2xl font-semibold">Photos</h1><p className="text-sm text-muted-foreground">Originals stay private; customer previews are compressed and watermarked in your browser.</p></div>
    {events.length ? <PhotoUploader events={events} photographers={photographers.flatMap(p=>p.photographer?[p.photographer]:[])} /> : <p className="rounded-xl border p-8 text-center text-muted-foreground">Create an event before uploading photos.</p>}
    <div><h2 className="mb-4 font-semibold">Recent uploads</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">{photos.map(photo=><div className="overflow-hidden rounded-xl border bg-card" key={photo.id}><div className="relative aspect-square"><SafeImage src={photo.previewUrl||"/placeholder.svg"} alt={photo.filename} fill className="object-cover"/></div><div className="p-3"><p className="truncate text-sm">{photo.filename}</p><p className="truncate text-xs text-muted-foreground">{photo.event.name} · {photo.photographer||"Unknown"}</p></div></div>)}</div></div>
  </div>
}
