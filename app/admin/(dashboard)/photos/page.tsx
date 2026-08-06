import { prisma } from "@/lib/db"
import { PhotoUploader } from "@/components/admin/photo-uploader"
import { PhotoManager } from "@/components/admin/photo-manager"
import { resolveStoredPreviewUrl } from "@/lib/storage/r2"

export default async function PhotosPage() {
  const [events, photos, photographers] = await Promise.all([
    prisma.event.findMany({ orderBy:{date:"desc"},select:{id:true,name:true} }),
    prisma.photo.findMany({ take:100,orderBy:{createdAt:"desc"},include:{event:{select:{name:true}},_count:{select:{orderItems:true}}} }),
    prisma.photo.findMany({where:{photographer:{not:null}},select:{photographer:true},distinct:["photographer"],orderBy:{photographer:"asc"}}),
  ])
  return <div className="space-y-8"><div><h1 className="text-2xl font-semibold">Photos</h1><p className="text-sm text-muted-foreground">Originals stay private; customer previews are compressed and watermarked in your browser.</p></div>
    {events.length ? <PhotoUploader events={events} photographers={photographers.flatMap(p=>p.photographer?[p.photographer]:[])} /> : <p className="rounded-xl border p-8 text-center text-muted-foreground">Create an event before uploading photos.</p>}
    <div><h2 className="mb-4 font-semibold">Manage uploads</h2><PhotoManager photos={photos.map(photo=>({id:photo.id,filename:photo.filename,previewUrl:resolveStoredPreviewUrl(photo.previewKey,photo.previewUrl),photographer:photo.photographer,event:photo.event,ordered:photo._count.orderItems>0}))} /></div>
  </div>
}
