import React,{useState} from 'react';
import {View,Text,TextInput,Pressable,ScrollView,StyleSheet,ActivityIndicator,Image,Alert,Platform} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const API=(process.env.EXPO_PUBLIC_API_URL||'http://localhost:8787').replace(/\/$/,'');
type Job={id:string;status:string;videoUrl?:string;error?:string;prompt:string};
export default function Home(){
 const [mode,setMode]=useState<'text'|'image'>('text');
 const [prompt,setPrompt]=useState('');
 const [ratio,setRatio]=useState('16:9');
 const [duration,setDuration]=useState('5');
 const [image,setImage]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);
 const [job,setJob]=useState<Job|null>(null);
 const [history,setHistory]=useState<Job[]>([]);
 const [tab,setTab]=useState('Crear');
 const [error,setError]=useState('');
 async function chooseImage(){
  const p=await ImagePicker.requestMediaLibraryPermissionsAsync();
  if(!p.granted){Alert.alert('Permiso necesario','Permite el acceso a tus fotos para elegir una imagen.');return;}
  const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:0.9});
  if(!r.canceled)setImage(r.assets[0].uri);
 }
 async function generate(){
  if(!prompt.trim()){setError('Escribe una descripción para tu vídeo.');return;}
  if(mode==='image'&&!image){setError('Selecciona una imagen primero.');return;}
  setError('');setBusy(true);setJob(null);
  try{
   let imageData:string|undefined;
   if(image && mode==='image'){
    const res=await fetch(image);const blob=await res.blob();
    imageData=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob);});
   }
   const response=await fetch(`${API}/api/generate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,mode,aspectRatio:ratio,duration:Number(duration),imageData})});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||'No se pudo iniciar la generación.');
   const initial={id:data.requestId,status:'IN_QUEUE',prompt};setJob(initial);
   let current=initial;
   for(let i=0;i<90;i++){
    await new Promise(r=>setTimeout(r,4000));
    const poll=await fetch(`${API}/api/status/${data.requestId}`);const result=await poll.json();
    if(!poll.ok)throw new Error(result.error||'Error consultando el estado.');
    current={...initial,status:result.status,videoUrl:result.videoUrl,error:result.error};setJob(current);
    if(result.status==='COMPLETED'||result.status==='FAILED')break;
   }
   if(current.status==='COMPLETED'){setHistory(h=>[current,...h]);}
   else if(current.status!=='FAILED')setError('La generación sigue en curso. Puedes volver a consultar más tarde.');
   else setError(current.error||'La generación ha fallado.');
  }catch(e:any){setError(e.message||'Error de conexión. Comprueba que el servidor está activo.');}
  finally{setBusy(false);}
 }
 return <View style={s.page}>
  <View style={s.top}><View><Text style={s.logo}>✦ AI VIDEO STUDIO</Text><Text style={s.tag}>TU LABORATORIO CREATIVO</Text></View><View style={s.avatar}><Text style={{color:'#D8CCFF',fontWeight:'800'}}>IA</Text></View></View>
  <View style={s.nav}>{['Crear','Mis vídeos'].map(t=><Pressable key={t} onPress={()=>setTab(t)} style={[s.navitem,tab===t&&s.navactive]}><Text style={[s.navtext,tab===t&&{color:'#C4B5FD'}]}>{t}</Text></Pressable>)}</View>
  <ScrollView contentContainerStyle={s.content}>
  {tab==='Crear'?<>
   <View style={s.hero}><Text style={s.eyebrow}>DE TU IMAGINACIÓN A LA PANTALLA</Text><Text style={s.title}>Haz que tus ideas{ '\n' }cobren <Text style={{color:'#A78BFA'}}>vida.</Text></Text><Text style={s.sub}>Crea vídeos únicos con inteligencia artificial en unos pocos pasos.</Text></View>
   <View style={s.panel}>
    <Text style={s.label}>1 · ELIGE CÓMO EMPEZAR</Text>
    <View style={s.switchrow}><Pressable onPress={()=>setMode('text')} style={[s.switch,mode==='text'&&s.switchOn]}><Text style={s.switchText}>✎  Texto a vídeo</Text></Pressable><Pressable onPress={()=>setMode('image')} style={[s.switch,mode==='image'&&s.switchOn]}><Text style={s.switchText}>▧  Imagen a vídeo</Text></Pressable></View>
    {mode==='image'&&<Pressable onPress={chooseImage} style={s.upload}>{image?<Image source={{uri:image}} style={s.preview}/>:<><Text style={s.uploadIcon}>＋</Text><Text style={s.uploadTitle}>Añadir una imagen</Text><Text style={s.muted}>JPG, PNG o WEBP</Text></>}</Pressable>}
    <Text style={s.label}>2 · DESCRIBE TU VÍDEO</Text>
    <TextInput value={prompt} onChangeText={setPrompt} multiline placeholder="Ej. Un zorro ártico caminando por un bosque nevado al amanecer, luz cinematográfica, cámara lenta..." placeholderTextColor="#77788A" style={s.input}/>
    <Text style={s.label}>3 · AJUSTA EL RESULTADO</Text>
    <Text style={s.smalllabel}>Formato</Text><View style={s.options}>{['16:9','9:16','1:1'].map(v=><Pressable onPress={()=>setRatio(v)} style={[s.option,ratio===v&&s.optionOn]} key={v}><Text style={s.optionText}>{v}</Text></Pressable>)}</View>
    <Text style={s.smalllabel}>Duración</Text><View style={s.options}>{['5','10'].map(v=><Pressable onPress={()=>setDuration(v)} style={[s.option,duration===v&&s.optionOn]} key={v}><Text style={s.optionText}>{v} segundos</Text></Pressable>)}</View>
    {error!==''&&<Text style={s.error}>{error}</Text>}
    <Pressable disabled={busy} onPress={generate} style={[s.generate,busy&&{opacity:0.65}]}>{busy?<ActivityIndicator color="#fff"/>:<Text style={s.generateText}>✦  Generar vídeo con IA</Text>}</Pressable>
    <Text style={s.disclaimer}>La generación puede consumir créditos del proveedor de IA.</Text>
   </View>
   {job&&<View style={s.panel}><Text style={s.label}>ESTADO DE GENERACIÓN</Text><Text style={s.resultTitle}>{job.status==='COMPLETED'?'¡Tu vídeo está listo!':job.status==='FAILED'?'No se pudo generar':'Creando tu vídeo…'}</Text>{job.status!=='COMPLETED'&&<ActivityIndicator color="#A78BFA"/>}{job.videoUrl&&<><Text style={s.muted}>Vídeo generado correctamente.</Text><Pressable onPress={()=>{if(Platform.OS==='web')window.open(job.videoUrl,'_blank');else Alert.alert('Vídeo listo',job.videoUrl);}} style={s.optionOn}><Text style={s.optionText}>Abrir vídeo ↗</Text></Pressable></>}</View>}
  </>:<View style={s.panel}><Text style={s.title}>Mis vídeos</Text><Text style={s.sub}>Tus creaciones de esta sesión aparecerán aquí.</Text>{history.length===0?<Text style={s.muted}>Todavía no has generado ningún vídeo.</Text>:history.map((h,i)=><View key={h.id+i} style={s.history}><Text style={s.resultTitle}>{h.prompt}</Text><Text style={s.muted}>{h.videoUrl}</Text></View>)}</View>}
  <Text style={s.footer}>AI VIDEO STUDIO · CREADO PARA DAR VIDA A TUS IDEAS</Text>
  </ScrollView>
 </View>
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#090B12'},top:{height:76,paddingHorizontal:22,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:'#202231'},logo:{color:'#F4F0FF',fontWeight:'900',letterSpacing:1.4,fontSize:15},tag:{color:'#858398',fontSize:9,letterSpacing:2,marginTop:4},avatar:{width:38,height:38,borderRadius:14,backgroundColor:'#29213F',alignItems:'center',justifyContent:'center'},nav:{flexDirection:'row',paddingHorizontal:22,gap:24,borderBottomWidth:1,borderBottomColor:'#202231'},navitem:{paddingVertical:15,borderBottomWidth:2,borderBottomColor:'transparent'},navactive:{borderBottomColor:'#A78BFA'},navtext:{color:'#858398',fontWeight:'700'},content:{width:'100%',maxWidth:760,alignSelf:'center',padding:20,paddingBottom:50,gap:18},hero:{paddingVertical:20},eyebrow:{color:'#A78BFA',fontSize:10,fontWeight:'900',letterSpacing:2},title:{color:'#F8F7FF',fontSize:36,fontWeight:'900',lineHeight:42,marginTop:12},sub:{color:'#A3A2B3',fontSize:14,lineHeight:22,marginTop:10},panel:{backgroundColor:'#131522',borderColor:'#292B3C',borderWidth:1,borderRadius:20,padding:18,gap:14},label:{color:'#C7C4D8',fontSize:10,fontWeight:'900',letterSpacing:1.4,marginTop:5},switchrow:{flexDirection:'row',gap:9},switch:{flex:1,padding:13,borderRadius:11,backgroundColor:'#202232',alignItems:'center'},switchOn:{backgroundColor:'#34274F',borderWidth:1,borderColor:'#8B6BD2',padding:13,borderRadius:11},switchText:{color:'#E5E1F2',fontWeight:'700',fontSize:12},upload:{height:140,borderWidth:1,borderColor:'#55506A',borderStyle:'dashed',borderRadius:13,alignItems:'center',justifyContent:'center',gap:6,overflow:'hidden'},uploadIcon:{color:'#B9A2FF',fontSize:30},uploadTitle:{color:'#EEEAF8',fontWeight:'700'},muted:{color:'#858398',fontSize:12},preview:{width:'100%',height:'100%',resizeMode:'contain'},input:{minHeight:112,backgroundColor:'#0D0F19',borderWidth:1,borderColor:'#303246',borderRadius:12,padding:13,color:'#F7F4FF',textAlignVertical:'top',fontSize:13,lineHeight:20},smalllabel:{color:'#9997AA',fontSize:11,marginBottom:-7},options:{flexDirection:'row',gap:9,flexWrap:'wrap'},option:{paddingVertical:10,paddingHorizontal:16,backgroundColor:'#202232',borderRadius:9,borderWidth:1,borderColor:'#303246'},optionOn:{backgroundColor:'#34274F',borderColor:'#8B6BD2',padding:11,borderRadius:9},optionText:{color:'#E9E3F7',fontWeight:'700',fontSize:12},generate:{backgroundColor:'#8056D9',padding:16,borderRadius:12,alignItems:'center',marginTop:3},generateText:{color:'#fff',fontWeight:'900',fontSize:14},disclaimer:{color:'#777589',fontSize:10,textAlign:'center'},error:{color:'#FF9A9A',fontSize:12},resultTitle:{color:'#F4F0FF',fontWeight:'800',fontSize:16},history:{padding:12,borderRadius:10,backgroundColor:'#202232',gap:7},footer:{textAlign:'center',color:'#5E5D70',fontSize:9,letterSpacing:1.5,marginTop:12}});