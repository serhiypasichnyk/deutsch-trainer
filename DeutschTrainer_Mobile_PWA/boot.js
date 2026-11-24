(()=>{
const defaults={version:2,source:'Dati non ancora importati',sourceUrl:'',words:[],history:[],dialogs:[],sourceCount:0,sourceCorrect:0,sourceTranslations:0};
function openDB(){return new Promise((ok,no)=>{const r=indexedDB.open('deutsch-trainer-private',1);r.onupgradeneeded=()=>r.result.createObjectStore('data');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
async function readData(){let db=await openDB();return new Promise((ok,no)=>{let tx=db.transaction('data','readonly'),r=tx.objectStore('data').get('catalog');r.onsuccess=()=>ok(r.result||defaults);r.onerror=()=>no(r.error)})}
async function writeData(value){let db=await openDB();return new Promise((ok,no)=>{let tx=db.transaction('data','readwrite');tx.objectStore('data').put(value,'catalog');tx.oncomplete=()=>ok(true);tx.onerror=()=>no(tx.error)})}
function validCatalog(v){return v&&typeof v==='object'&&Array.isArray(v.words)&&Array.isArray(v.history)&&Array.isArray(v.dialogs)&&v.words.length<=25000&&v.words.every(w=>typeof w.id==='string'&&typeof w.de==='string'&&typeof w.level==='string')}
window.DTCatalog={store:async obj=>{if(!validCatalog(obj))throw Error('Catalogo non valido. Serve DeutschTrainer_DatiPrivati.json');await writeData(obj);return obj},valid:validCatalog};
async function start(){let catalog;try{catalog=await readData();if(!validCatalog(catalog))catalog=defaults}catch(e){catalog=defaults;document.getElementById('boot').textContent='Archivio privato non disponibile: '+e.message}document.getElementById('seed-data').textContent=JSON.stringify(catalog).replaceAll('<','\\u003c');
for(let p of ['exercises.js','extension.js','app.js','cloud-sync.js']){await new Promise((ok,no)=>{let s=document.createElement('script');s.src='./'+p;s.onload=ok;s.onerror=()=>no(Error('Manca '+p));document.body.append(s)})}
window.DTSync?.startup?.();document.getElementById('boot').remove();}
start().catch(e=>{document.getElementById('boot').textContent='Impossibile avviare Deutsch Trainer: '+e.message;console.error(e)});
})();