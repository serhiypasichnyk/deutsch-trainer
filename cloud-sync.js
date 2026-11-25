/* Deutsch Trainer cloud connection. No credentials or OAuth access tokens are written to disk.
   Google Sheets is the shared event log. Device data remains local/offline first. */
(()=>{'use strict';
const SHEET_DEFAULT='';
const RESET_KIND='DT|reset|system';
const OAUTH_SCOPE='https://www.googleapis.com/auth/spreadsheets';
const CONFIG_KEY='deutsch-trainer-google-sync-v2';
const DEVICE_KEY='deutsch-trainer-device-v2';
const defaults={clientId:'',spreadsheetId:SHEET_DEFAULT};
let config={...defaults};try{config={...defaults,...JSON.parse(localStorage.getItem(CONFIG_KEY)||'{}')}}catch{}
let device=localStorage.getItem(DEVICE_KEY);
if(!device){device='device-'+(crypto.randomUUID?.()||Date.now().toString(36));localStorage.setItem(DEVICE_KEY,device)}
let accessToken='',expiresAt=0,tokenClient=null,authBusy=false,syncing=false,lastSync='',lastError='',queued=null,loop=null,needsSync=false;
const stats={uploaded:0,downloaded:0,updated:0};
const escapeHtml=t=>String(t??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
function setMessage(message,error=false){lastError=error?String(message):'';if(!error)lastSync=String(message);let e=document.getElementById('dt-sync-status');if(e){e.textContent=error?'Errore: '+message:message;e.classList.toggle('dangerline',error)}if(error)console.warn('Deutsch Trainer sync:',message)}
function ensureSettings(){localStorage.setItem(CONFIG_KEY,JSON.stringify(config))}
function settingsPanel(){const pending=state.events.filter(x=>x.score!==undefined&&!x.uid).length;return `<section class="sync-card"><h2>Google Sheets · sincronizzazione</h2><p>Le risposte vengono salvate prima offline. Dopo aver collegato il tuo account, la sincronizzazione aggiorna il foglio «Verifiche» e le statistiche di «Statistiche App». La stessa cronologia viene scaricata sugli altri dispositivi.</p><div class="sync-status" id="dt-sync-status">${escapeHtml(lastError?'Errore: '+lastError:lastSync||(!navigator.onLine?'Offline: i dati restano sul dispositivo.':accessToken?'Autorizzazione attiva; sincronizzazione disponibile.':'Non collegato a Google.'))}</div><div class="row"><button class="primary" data-cloud="login">${accessToken?'Riautorizza Google':'Collega Google'}</button><button class="secondary" data-cloud="sync" ${!accessToken?'disabled':''}>Sincronizza adesso</button><button class="secondary" data-cloud="disconnect" ${!accessToken?'disabled':''}>Disconnetti</button></div><div class="divider"></div><p class="note">Per la connessione occorre un ID client OAuth di tipo «Applicazione web» creato nel tuo progetto Google Cloud, con Google Sheets API abilitata e dominio di questa app autorizzato. Non è una password. Non inserire mai un client secret in questa pagina.</p><label class="sync-label" for="dt-client-id">ID client OAuth Google</label><input id="dt-client-id" type="text" autocomplete="off" placeholder="xxxxxxxx.apps.googleusercontent.com" value="${escapeHtml(config.clientId)}"><label class="sync-label" for="dt-sheet-id">ID del tuo Google Sheet</label><input id="dt-sheet-id" type="text" value="${escapeHtml(config.spreadsheetId)}"><div class="row"><button class="secondary" data-cloud="save-config">Salva configurazione</button><button class="secondary" data-cloud="refresh-catalog" ${!accessToken?'disabled':''}>Aggiorna vocabolario e traduzioni A1–B1</button></div><div class="divider"></div><h3>Importa il database personale</h3><p class="note">Dopo aver installato l'app pubblica, importa una sola volta <code>DeutschTrainer_DatiPrivati.json</code>. Il file viene memorizzato soltanto nel browser; non va caricato sul sito pubblico. Puoi anche collegarti a Google e usare «Aggiorna vocabolario da Sheets», ma le traduzioni di riferimento non presenti sul foglio potrebbero mancare.</p><button class="secondary" data-cloud="import-catalog">Importa il catalogo JSON</button><input id="dt-catalog-file" type="file" accept=".json,application/json" class="hidden"><p class="note">Eventi presenti localmente: <strong>${state.events.length}</strong>. Ultima sincronizzazione: <strong>${escapeHtml(lastSync||'non effettuata')}</strong>. Accesso Google disponibile soltanto mentre l'app è aperta e il token è valido. Non sono previsti aggiornamenti in background con l'app chiusa.</p></section>`}
function saveConfig(){const a=document.getElementById('dt-client-id')?.value.trim(),b=document.getElementById('dt-sheet-id')?.value.trim();if(!a||!/^\d+-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i.test(a)){setMessage('Inserisci un ID client Google OAuth valido.',true);return false}if(!b||!/^[\w-]{20,120}$/.test(b)){setMessage('ID Google Sheet non valido.',true);return false}if(config.clientId!==a||config.spreadsheetId!==b){accessToken='';expiresAt=0;tokenClient=null}config={clientId:a,spreadsheetId:b};ensureSettings();setMessage('Configurazione salvata. Collega l’account Google.');return true}
function loadGIS(){if(window.google?.accounts?.oauth2)return Promise.resolve();return new Promise((ok,no)=>{let s=document.getElementById('dt-gis');if(!s){s=document.createElement('script');s.id='dt-gis';s.src='https://accounts.google.com/gsi/client';s.async=true;s.onload=ok;s.onerror=()=>no(Error('Impossibile caricare Google Identity Services. Verifica la connessione.'));document.head.appendChild(s)}else{s.addEventListener('load',ok,{once:true});s.addEventListener('error',()=>no(Error('Caricamento Google non riuscito')),{once:true})}})}
async function login(){if(!config.clientId){setMessage('Inserisci e salva prima l’ID client Google OAuth.',true);return}if(location.protocol!=='https:'&&location.hostname!=='localhost'){setMessage('Google OAuth richiede HTTPS o localhost. Pubblica prima la PWA.',true);return}if(authBusy)return;authBusy=true;setMessage('Apertura autorizzazione Google…');try{await loadGIS();if(!tokenClient){tokenClient=google.accounts.oauth2.initTokenClient({client_id:config.clientId,scope:OAUTH_SCOPE,error_callback:e=>{authBusy=false;setMessage(e.message||e.type||'Finestra Google chiusa o non disponibile',true)},callback:async v=>{authBusy=false;if(v.error||!v.access_token){setMessage(v.error_description||v.error||'Autorizzazione non concessa',true);return}accessToken=v.access_token;expiresAt=Date.now()+Math.max(60,Number(v.expires_in||3500))*1000-30000;setMessage('Google collegato. Avvio la sincronizzazione…');try{await syncNow()}catch(e){setMessage(e.message,true)}if(view==='settings')render()}})}tokenClient.requestAccessToken({prompt:'consent'});}catch(e){authBusy=false;setMessage(e.message,true)}}
async function api(path,init={}){if(!accessToken||Date.now()>=expiresAt)throw Error('Autorizzazione Google scaduta: premi «Collega Google» per rinnovarla.');const endpoint='https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(config.spreadsheetId)+path;const r=await fetch(endpoint,{...init,headers:{Authorization:'Bearer '+accessToken,...(init.body?{'Content-Type':'application/json'}:{}),...(init.headers||{})}});let body;try{body=await r.json()}catch{body={}}if(!r.ok){if(r.status===401){accessToken='';expiresAt=0}throw Error('Google Sheets '+r.status+': '+(body.error?.message||'richiesta non riuscita'))}return body}
function stableHash(s){let h=2166136261;for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),16777619)}return (h>>>0).toString(36)}
function ensureIds(){let changed=false;state.events.forEach((e,i)=>{if(!e.uid){e.uid='DT-LEG-'+stableHash([e.session,e.date,e.id,e.type,e.prompt,i].join('|'));e.modifiedAt=e.modifiedAt||e.date;changed=true}});if(changed)localStorage.setItem(KEY,JSON.stringify(state))}
const parseMeta=row=>{try{return JSON.parse(row?.[12]||'{}')}catch{return{}}};
function eventFromRow(row){const type=String(row[4]||'').split('|')[1]||'deit',level=String(row[4]||'').split('|')[2]||'A1',m=parseMeta(row);return {uid:String(row[10]),session:String(row[0]||''),date:m.timestamp||String(row[1]||'')+'T12:00:00.000Z',id:String(row[2]||''),type,level,prompt:m.prompt||'',answer:String(row[5]||''),expected:m.expected||'',score:row[6]===null||row[6]===undefined||row[6]===''?null:Number(row[6]),manual:!!m.manual,ungraded:!!m.ungraded,percent:Number.isFinite(Number(m.percent))?Number(m.percent):null,matched:Number(m.matched)||0,referenceWords:Number(m.referenceWords)||0,enteredWords:Number(m.enteredWords)||0,lexicalPercent:m.lexicalPercent==null?null:Number(m.lexicalPercent),grammarPercent:m.grammarPercent==null?null:Number(m.grammarPercent),diagnostics:Array.isArray(m.diagnostics)?m.diagnostics:[],assessment:m.assessment||'',modifiedAt:m.modifiedAt||m.timestamp||''}}
function toDate(val){return typeof val==='string'&&/^\d{4}-\d{2}-\d{2}/.test(val)?val.slice(0,10):new Date().toISOString().slice(0,10)}
function reviewAfter(e){if(e.score===null||e.type==='newwords')return;const key=e.id+'|'+e.type, old=state.reviews[key];const time=Date.parse(e.modifiedAt||e.date)||Date.now();if(old&&old.last&&old.last>time)return;const streak=e.score===2?((old?.streak||0)+1):0;const interval=e.score===2?[1,3,7,14,30,60][Math.min(streak-1,5)]:e.score===1?0.25:0;state.reviews[key]={seen:true,score:e.score,streak,attempts:(old?.attempts||0)+1,correct:(old?.correct||0)+(e.score===2?1:0),last:time,due:time+interval*86400000}}

/* Separate W:Z fields in Vocabolario are generated exclusively from app
   verification events. Never modify E (user translation) or H (old review status).
   Since all events are fetched before this call, counts converge across devices. */
async function syncKnowledgeToSheet(){
 const [idsResponse, existingResponse]=await Promise.all([
  api('/values/'+encodeURIComponent("'Vocabolario'!A2:A4200")),
  api('/values/'+encodeURIComponent("'Vocabolario'!W2:Z4200"))
 ]);
 const ids=idsResponse.values||[],existing=existingResponse.values||[],updates=[];
 const formatDate=value=>value&&Number.isFinite(Number(value))?new Date(Number(value)).toISOString().slice(0,10):'';
 for(let i=0;i<ids.length;i++){
  const id=String(ids[i]?.[0]||'');
  if(!/^DE-/.test(id))continue;
  const info=state.knowledge?.[id];
  if(!info||!['learning','known'].includes(info.stage))continue;
  const verified=Math.max(0,Math.floor(Number(info.verifiedKnown)||0));
  const confirmed=info.stage==='known'&&verified>=10;
  const status=confirmed?'Conosciuta e consolidata':info.stage==='known'?'In verifica (non consolidata)':'In apprendimento';
  const desired=[status,String(verified),formatDate(info.lastVerifiedAt),confirmed?formatDate(info.consolidatedAt):''];
  const current=existing[i]||[];
  if(desired.every((v,j)=>v===String(current[j]??'')))continue;
  updates.push({range:"'Vocabolario'!W"+(i+2)+':Z'+(i+2),values:[desired]});
 }
 for(let i=0;i<updates.length;i+=100){
  await api('/values:batchUpdate',{method:'POST',body:JSON.stringify({
   valueInputOption:'RAW',data:updates.slice(i,i+100)
  })});
 }
 return updates.length;
}

async function syncNow(){if(syncing)return;if(!navigator.onLine){setMessage('Offline: sincronizzazione in attesa.');needsSync=true;return}if(!accessToken||Date.now()>=expiresAt){setMessage('Collega Google o rinnova l’autorizzazione per sincronizzare.',true);needsSync=true;return}syncing=true;needsSync=false;try{
// Confirm target has the exact expected worksheet, preventing writes to an unrelated file.
let meta=await api('?fields=spreadsheetId,sheets(properties(title))');const sheets=(meta.sheets||[]).map(s=>s.properties?.title);if(!sheets.includes('Verifiche')||!sheets.includes('Vocabolario'))throw Error('Il Google Sheet non contiene le schede Verifiche e Vocabolario.');
ensureIds();let history=await api('/values/'+encodeURIComponent("'Verifiche'!A2:M"));
const sheetRows=history.values||[];
let resetEntry=null;
for(let i=0;i<sheetRows.length;i++){const row=sheetRows[i];if(row[4]===RESET_KIND && /^DT-RESET-/.test(String(row[10]||''))){resetEntry={uid:String(row[10]),date:parseMeta(row).timestamp||String(row[1]||'')+'T00:00:00Z',index:i+2};}}
if(resetEntry && resetEntry.uid!==state.resetUid){window.DTApp?.applySharedReset?.(resetEntry.date,resetEntry.uid);}
const firstActiveRow=resetEntry?resetEntry.index+1:2;
let remote=new Map();sheetRows.forEach((row,i)=>{if((i+2>=firstActiveRow||String(row[4]||'').includes('|newwords|'))&&row[4]!==RESET_KIND&&/^DT-/.test(String(row[10]||'')))remote.set(String(row[10]),{row,index:i+2})});
let newEvents=[],updates=[],remoteChanged=0;
for(const e of state.events){if(!/^DT-/.test(e.uid||''))continue;if(resetEntry && e.type!=='newwords' && (Date.parse(e.date)||0)<=Date.parse(resetEntry.date))continue;const other=remote.get(e.uid);if(!other){newEvents.push(e);continue}const row=other.row,score=e.score===null?'':String(e.score),ans=String(e.answer||'');const remoteMeta=parseMeta(row);const localTime=Date.parse(e.modifiedAt||e.date)||0,remoteTime=Date.parse(remoteMeta.modifiedAt||remoteMeta.timestamp)||0;if(remoteTime>localTime){const pulled=eventFromRow(row);Object.assign(e,pulled);reviewAfter(pulled);remoteChanged++;continue;}if(String(row[6]??'')!==score||String(row[5]??'')!==ans){const metadata={timestamp:e.date,modifiedAt:e.modifiedAt||e.date,prompt:e.prompt,expected:e.expected,manual:!!e.manual,ungraded:!!e.ungraded,percent:e.percent??null,matched:e.matched??null,referenceWords:e.referenceWords??null,enteredWords:e.enteredWords??null,lexicalPercent:e.lexicalPercent??null,grammarPercent:e.grammarPercent??null,diagnostics:Array.isArray(e.diagnostics)?e.diagnostics:[],assessment:e.assessment||''};updates.push({range:"'Verifiche'!F"+other.index+':G'+other.index,values:[[ans,e.score===null?'':e.score]]});updates.push({range:"'Verifiche'!M"+other.index,values:[[JSON.stringify(metadata)]]})}}
if(updates.length){for(let i=0;i<updates.length;i+=100){await api('/values:batchUpdate',{method:'POST',body:JSON.stringify({valueInputOption:'RAW',data:updates.slice(i,i+100)})})}}
let uploaded=0;for(let i=0;i<newEvents.length;i+=100){const items=newEvents.slice(i,i+100),rows=items.map(e=>{const kind=e.type==='newwords'?'Nuove parole':e.type==='deit'||e.type==='choice'?'DE→IT':e.type==='itde'?'IT→DE':e.type==='dialog'?'Dialogo':'Frase';const metadata=JSON.stringify({timestamp:e.date,modifiedAt:e.modifiedAt||e.date,prompt:e.prompt,expected:e.expected,manual:!!e.manual,ungraded:!!e.ungraded,percent:e.percent??null,matched:e.matched??null,referenceWords:e.referenceWords??null,enteredWords:e.enteredWords??null,lexicalPercent:e.lexicalPercent??null,grammarPercent:e.grammarPercent??null,diagnostics:Array.isArray(e.diagnostics)?e.diagnostics:[],assessment:e.assessment||''});return [e.session,toDate(e.date),e.id,kind,'DT|'+e.type+'|'+e.level,String(e.answer||''),e.score===null?'':e.score,'App / '+(e.ungraded?'non valutato':'automatico'),'', '',e.uid,device,metadata]});await api('/values/'+encodeURIComponent("'Verifiche'!A:M")+':append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS',{method:'POST',body:JSON.stringify({values:rows})});uploaded+=items.length}
let deviceEvents=0;const known=new Set(state.events.map(e=>e.uid));for(const [uid,entry] of remote){if(known.has(uid))continue;const e=eventFromRow(entry.row);state.events.push(e);reviewAfter(e);known.add(uid);deviceEvents++}
if(deviceEvents||remoteChanged){state.events.sort((a,b)=>(Date.parse(a.date)||0)-(Date.parse(b.date)||0));window.DTApp?.rebuildKnowledge?.();localStorage.setItem(KEY,JSON.stringify(state))}
window.DTApp?.rebuildKnowledge?.();const knowledgeUpdated=await syncKnowledgeToSheet();
stats.uploaded+=uploaded;stats.downloaded+=deviceEvents+remoteChanged;stats.updated+=Math.floor(updates.length/2);lastSync=new Date().toLocaleString('it-IT');setMessage('Sincronizzato: '+uploaded+' nuove risposte inviate, '+deviceEvents+' scaricate, '+Math.floor(updates.length/2)+' correzioni aggiornate, '+knowledgeUpdated+' stati del vocabolario sincronizzati. Ultimo controllo: '+lastSync);if(['settings','history','home'].includes(view))render();
}catch(e){needsSync=true;setMessage(e.message,true);throw e}finally{syncing=false}}
async function resetShared(){
if(syncing){setMessage('Sincronizzazione in corso: riprova fra poco.',true);return;}
if(!accessToken||Date.now()>=expiresAt||!navigator.onLine){setMessage('Per azzerare in modo condiviso devi essere online e collegato a Google.',true);return;}
if(!confirm('Vuoi iniziare un nuovo periodo di studio su PC e telefono? Le verifiche precedenti resteranno archiviate su Google Sheets, ma non saranno più conteggiate.'))return;
const proof=prompt('Per confermare, digita AZZERA. Una copia JSON dei risultati locali verrà scaricata prima della modifica.');
if(proof!=='AZZERA')return;
try {
window.DTApp?.exportBeforeReset?.();
setMessage('Salvo e sincronizzo i risultati precedenti…');
await syncNow();
if(syncing)throw Error('Attendi la fine della sincronizzazione prima del reset.');
const latest=await api('/values/'+encodeURIComponent("'Verifiche'!A2:M"));
const rows=latest.values||[];
let lastReset=null;
for(let i=0;i<rows.length;i++){const row=rows[i];if(row[4]===RESET_KIND && /^DT-RESET-/.test(String(row[10]||'')))lastReset=String(row[10]);}
if(lastReset&&lastReset!==state.resetUid)throw Error('Un altro dispositivo ha azzerato i risultati: sincronizza di nuovo e ripeti la richiesta.');
const epoch=new Date().toISOString(),uid='DT-RESET-'+(crypto.randomUUID?.()||Date.now().toString(36));
const marker=['RESET-'+epoch.slice(0,10),epoch.slice(0,10),'','',RESET_KIND,'','','Reset condiviso (archivio precedente mantenuto)','','',uid,device,JSON.stringify({kind:'reset',timestamp:epoch})];
await api('/values/'+encodeURIComponent("'Verifiche'!A:M")+':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',{method:'POST',body:JSON.stringify({values:[marker]})});
window.DTApp?.applySharedReset?.(epoch,uid);
setMessage('Azzeramento condiviso completato. I dati precedenti sono archiviati; i nuovi contatori partono da zero.');
if(view==='settings')render();
}catch(e){setMessage('Reset non completato: '+e.message,true)}
}
async function refreshCatalog(){if(!accessToken){setMessage('Collega prima Google.',true);return}try{setMessage('Lettura del catalogo Google Sheets…');const res=await api('/values/'+encodeURIComponent("'Vocabolario'!A2:V4200"));const raw=(res.values||[]).filter(r=>String(r[0]||'').startsWith('DE-'));if(raw.length<100){throw Error('Il foglio restituisce meno di 100 vocaboli; operazione interrotta.')}const prev=new Map(DATA.words.map(w=>[w.id,w]));const words=raw.map(r=>{const old=prev.get(r[0])||{},status=r[7]||'Da verificare',user=r[4]||'',baseRef=(r[14]&&!/^ERRORE|DA REVISIONARE|TRADUZIONE NON DISPONIBILE/i.test(String(r[14]))?r[14]:'')||old.ref||((status==='Corretta'||status==='Consolidata')?user:'');const lists=[['Goethe A1',17],['Goethe Start A1',18],['Goethe A2',19],['Goethe B1',20]].filter(([k,i])=>r[i]).map(([k])=>k);return {...old,id:r[0],level:r[1]||'A1',de:r[2]||'',cat:r[3]||'',user,extra:r[5]||'',confidence:r[6]||null,status,correct:Number(r[8]||0),reverse:Number(r[9]||0),phrase:Number(r[10]||0),errors:Number(r[11]||0),last:r[12]||null,due:r[13]||null,ref:baseRef,note:r[15]||old.note||'',origin:r[16]||old.origin||'',lists:lists.length?lists:old.lists||[],forms:old.forms||'',referenceSource:r[21]||old.referenceSource||(r[14]?'Riferimento presente nel foglio':'Non verificato')}});const advanced=DATA.words.filter(w=>!String(w.id).startsWith('DE-'));const next={...DATA,words:[...words,...advanced],sourceCount:words.length,sourceTranslations:words.filter(w=>w.user).length,sourceCorrect:words.filter(w=>['Corretta','Consolidata'].includes(w.status)).length};await window.DTCatalog.store(next);DATA=next;setMessage('Vocabolario aggiornato: '+words.length+' voci; '+words.filter(w=>w.ref).length+' con riferimento italiano. '+words.filter(w=>String(w.referenceSource).startsWith('Automatica')).length+' traduzioni automatiche da revisionare.');if(view!=='practice')render()}catch(e){setMessage(e.message,true)}}
async function importCatalog(file){try{if(!file||file.size>30e6)throw Error('File troppo grande o mancante');let v=JSON.parse(await file.text());await window.DTCatalog.store(v);DATA=v;if(!config.spreadsheetId){const m=String(v.sourceUrl||'').match(/spreadsheets\/d\/([\w-]{20,120})/);if(m){config.spreadsheetId=m[1];ensureSettings()}}setMessage('Catalogo importato: '+DATA.words.length+' voci. Dati salvati esclusivamente su questo dispositivo.');if(view!=='practice')render()}catch(e){setMessage('Importazione catalogo: '+e.message,true)}}
function schedule(){needsSync=true;if(!accessToken||syncing||!navigator.onLine)return;clearTimeout(queued);queued=setTimeout(()=>syncNow().catch(()=>{}),14000)}
function startup(){if(navigator.onLine)loadGIS().catch(()=>{});window.addEventListener('online',()=>{if(accessToken&&needsSync)syncNow().catch(()=>{})});document.addEventListener('visibilitychange',()=>{if(!document.hidden&&accessToken&&needsSync)syncNow().catch(()=>{})});loop=setInterval(()=>{if(accessToken&&Date.now()<expiresAt&&!syncing)syncNow().catch(()=>{})},60000)}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-cloud]');if(!b||b.disabled)return;e.preventDefault();switch(b.dataset.cloud){case 'save-config':saveConfig();break;case 'login':await login();break;case 'sync':await syncNow().catch(()=>{});break;case 'disconnect':accessToken='';expiresAt=0;tokenClient=null;setMessage('Disconnesso da Google. I dati locali sono conservati.');render();break;case 'refresh-catalog':await refreshCatalog();break;case 'import-catalog':document.getElementById('dt-catalog-file')?.click();break;case 'reset-shared':await resetShared();break;}});
document.addEventListener('change',e=>{if(e.target.id==='dt-catalog-file'&&e.target.files?.[0])importCatalog(e.target.files[0])});
window.DTSync={settingsPanel,schedule,startup,syncNow,refreshCatalog,importCatalog};
})();
