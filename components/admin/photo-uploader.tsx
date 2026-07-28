"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

type Upload = { id: string; file: File; progress: number; status: "pending"|"uploading"|"complete"|"failed"|"cancelled"; error?: string }
const TYPES = ["image/jpeg","image/png","image/webp"]
const MAX = 30 * 1024 * 1024
const MAX_BATCH_FILES = 100
const UPLOAD_CONCURRENCY = 3
const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve,reject) => { const image=new Image(); const url=URL.createObjectURL(file); image.onload=()=>{URL.revokeObjectURL(url);resolve(image)}; image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Image could not be read"))}; image.src=url })
}
async function preview(file: File) {
  const image=await loadImage(file); const scale=Math.min(1,1600/image.width); const canvas=document.createElement("canvas")
  canvas.width=Math.round(image.width*scale); canvas.height=Math.round(image.height*scale); const context=canvas.getContext("2d")
  if(!context) throw new Error("Preview generation is unavailable")
  context.drawImage(image,0,0,canvas.width,canvas.height)
  context.save()
  context.translate(canvas.width/2,canvas.height/2)
  context.rotate(-Math.PI/7)
  context.font=`900 ${Math.max(42,canvas.width/8)}px sans-serif`
  context.textAlign="center"
  context.textBaseline="middle"
  context.lineWidth=Math.max(3,canvas.width/300)
  context.strokeStyle="rgba(255,255,255,.8)"
  context.fillStyle="rgba(220,0,0,.72)"
  context.strokeText("PREVIEW",0,0)
  context.fillText("PREVIEW",0,0)
  context.restore()
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",.78)); if(!blob) throw new Error("Preview generation failed")
  return { blob,width:image.naturalWidth,height:image.naturalHeight }
}
function put(url:string, body:Blob, contentType:string, onProgress:(n:number)=>void, signal:AbortSignal) {
  return new Promise<void>((resolve,reject)=>{ const xhr=new XMLHttpRequest(); xhr.open("PUT",url); xhr.setRequestHeader("Content-Type",contentType); xhr.upload.onprogress=e=>e.lengthComputable&&onProgress(e.loaded/e.total); xhr.onload=()=>xhr.status>=200&&xhr.status<300?resolve():reject(new Error(`Storage upload failed (${xhr.status})`)); xhr.onerror=()=>reject(new Error("Storage upload failed")); signal.addEventListener("abort",()=>{xhr.abort();reject(new Error("Cancelled"))}); xhr.send(body) })
}

export function PhotoUploader({ events, photographers }: { events:{id:string;name:string}[]; photographers:string[] }) {
  const [eventId,setEventId]=useState(events[0]?.id??""); const [photographer,setPhotographer]=useState(photographers[0]??"")
  const [dayOfWeek,setDayOfWeek]=useState(1)
  const [uploads,setUploads]=useState<Upload[]>([]); const controllers=useRef(new Map<string,AbortController>())
  const update=(id:string,patch:Partial<Upload>)=>setUploads(items=>items.map(item=>item.id===id?{...item,...patch}:item))
  async function run(item:Upload) {
    const controller=new AbortController(); controllers.current.set(item.id,controller); update(item.id,{status:"uploading",progress:1})
    try {
      const generated=await preview(item.file)
      const response=await fetch("/api/admin/uploads/presign",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({eventId,filename:item.file.name,contentType:item.file.type,previewContentType:"image/jpeg",fileSize:item.file.size}),signal:controller.signal})
      const signed=await response.json(); if(!response.ok) throw new Error(signed.error??"Could not prepare upload")
      let originalProgress=0
      let previewProgress=0
      const reportProgress=()=>update(item.id,{progress:Math.round(5+originalProgress*45+previewProgress*45)})
      await Promise.all([
        put(signed.originalUrl,item.file,item.file.type,n=>{originalProgress=n;reportProgress()},controller.signal),
        put(signed.previewUrl,generated.blob,"image/jpeg",n=>{previewProgress=n;reportProgress()},controller.signal),
      ])
      const complete=await fetch("/api/admin/uploads/complete",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({eventId,photographer,dayOfWeek,filename:item.file.name,originalKey:signed.originalKey,previewKey:signed.previewKey,width:generated.width,height:generated.height,fileSize:item.file.size}),signal:controller.signal})
      const result=await complete.json(); if(!complete.ok) throw new Error(result.error??"Could not save upload")
      update(item.id,{status:"complete",progress:100})
    } catch(error) {
      if(controller.signal.aborted) update(item.id,{status:"cancelled",error:"Cancelled"})
      else update(item.id,{status:"failed",error:error instanceof Error?error.message:"Upload failed"})
    } finally { controllers.current.delete(item.id) }
  }
  function add(files:FileList|File[]) {
    if(!eventId||!photographer.trim()){toast.error("Select an event and enter a photographer first");return}
    const selected=Array.from(files).slice(0,MAX_BATCH_FILES)
    if(files.length>MAX_BATCH_FILES) toast.error(`Upload batches are limited to ${MAX_BATCH_FILES} files`)
    const valid:Array<Upload>=[]; for(const file of selected){if(!TYPES.includes(file.type)){toast.error(`${file.name}: unsupported file type`);continue}if(file.size>MAX){toast.error(`${file.name}: exceeds 30 MB`);continue}valid.push({id:crypto.randomUUID(),file,progress:0,status:"pending"})}
    setUploads(items=>[...valid,...items])
    let next=0
    async function worker(){while(next<valid.length){const item=valid[next++];await run(item)}}
    void Promise.all(Array.from({length:Math.min(UPLOAD_CONCURRENCY,valid.length)},worker))
  }
  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-3"><label className="text-sm">Event<select value={eventId} onChange={e=>setEventId(e.target.value)} className="mt-1 h-10 w-full rounded-lg border bg-card px-3">{events.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></label><label className="text-sm">Day<select value={dayOfWeek} onChange={e=>setDayOfWeek(Number(e.target.value))} className="mt-1 h-10 w-full rounded-lg border bg-card px-3">{DAYS.map((day,index)=><option key={day} value={index+1}>{day}</option>)}</select></label><label className="text-sm">Photographer<input list="photographers" value={photographer} onChange={e=>setPhotographer(e.target.value)} className="mt-1 h-10 w-full rounded-lg border bg-card px-3"/><datalist id="photographers">{photographers.map(p=><option key={p}>{p}</option>)}</datalist></label></div>
    <label onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();add(e.dataTransfer.files)}} className="block cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center text-sm text-muted-foreground"><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>e.target.files&&add(e.target.files)}/>Drop JPEG, PNG or WebP files here, or click to select<br/><span className="text-xs">Maximum 30 MB per file</span></label>
    <div className="space-y-2">{uploads.map(item=><div key={item.id} className="rounded-lg border bg-card p-3"><div className="flex items-center gap-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.file.name}</p><p className="text-xs text-muted-foreground">{item.status}{item.error?` · ${item.error}`:""}</p><div className="mt-2 h-1.5 overflow-hidden rounded bg-muted"><div className="h-full bg-primary" style={{width:`${item.progress}%`}}/></div></div>{item.status==="uploading"&&<Button size="sm" variant="ghost" onClick={()=>controllers.current.get(item.id)?.abort()}>Cancel</Button>}{(item.status==="failed"||item.status==="cancelled")&&<Button size="sm" variant="outline" onClick={()=>run({...item,status:"pending",progress:0})}>Retry</Button>}</div></div>)}</div>
  </div>
}
