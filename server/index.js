import 'dotenv/config';
import express from 'express';
import cors from 'cors';
const app=express();
app.use(cors());
app.use(express.json({limit:'20mb'}));
const PORT=process.env.PORT||8787;
const KEY=process.env.FAL_KEY;
const jobs=new Map();
app.get('/health',(_,res)=>res.json({ok:true,configured:Boolean(KEY)}));
app.post('/api/generate',async(req,res)=>{
 try{
  if(!KEY)return res.status(503).json({error:'Falta FAL_KEY en el archivo .env del servidor.'});
  const {prompt,mode='text',aspectRatio='16:9',duration=5,imageData}=req.body||{};
  if(!prompt?.trim())return res.status(400).json({error:'El prompt es obligatorio.'});
  if(mode==='image'&&!imageData)return res.status(400).json({error:'Falta la imagen de referencia.'});
  let image_url;
  if(mode==='image'){
   const upload=await fetch('https://fal.run/fal-ai/storage/upload',{method:'POST',headers:{Authorization:`Key ${KEY}`,'Content-Type':imageData.match(/^data:(image\/[^;]+);base64,/)[1]},body:Buffer.from(imageData.split(',')[1],'base64')});
   if(!upload.ok)throw new Error('No se pudo subir la imagen al proveedor.');
   image_url=(await upload.json()).url;
  }
  const model=mode==='image'?(process.env.FAL_IMAGE_MODEL||'fal-ai/wan-i2v'):(process.env.FAL_TEXT_MODEL||'fal-ai/wan-t2v');
  const input={prompt,aspect_ratio:aspectRatio,duration:String(duration)};
  if(image_url)input.image_url=image_url;
  const response=await fetch(`https://queue.fal.run/${model}`,{method:'POST',headers:{Authorization:`Key ${KEY}`,'Content-Type':'application/json'},body:JSON.stringify(input)});
  const data=await response.json();
  if(!response.ok)throw new Error(data.detail||data.error||'El proveedor rechazó la solicitud.');
  jobs.set(data.request_id,{model,status_url:data.status_url,response_url:data.response_url});
  res.json({requestId:data.request_id});
 }catch(e){res.status(500).json({error:e.message||'Error al iniciar la generación.'});}
});
app.get('/api/status/:id',async(req,res)=>{
 try{
  const job=jobs.get(req.params.id);
  if(!job)return res.status(404).json({error:'No se encuentra esta tarea en este servidor.'});
  const statusResponse=await fetch(job.status_url,{headers:{Authorization:`Key ${KEY}`}});
  const statusData=await statusResponse.json();
  if(!statusResponse.ok)throw new Error(statusData.detail||'No se pudo consultar el estado.');
  if(statusData.status==='COMPLETED'){
   const output=await fetch(job.response_url,{headers:{Authorization:`Key ${KEY}`}});
   const result=await output.json();
   const videoUrl=result.video?.url||result.output?.video?.url||result.video_url;
   return res.json({status:'COMPLETED',videoUrl,result});
  }
  if(statusData.status==='FAILED')return res.json({status:'FAILED',error:statusData.error||'El proveedor indicó que la tarea falló.'});
  res.json({status:statusData.status||'IN_PROGRESS'});
 }catch(e){res.status(500).json({error:e.message});}
});
app.listen(PORT,()=>console.log(`AI Video Studio API en http://localhost:${PORT}`));
