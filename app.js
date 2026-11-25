let DATA=JSON.parse(document.getElementById('seed-data').textContent);const LEVELS=['A1','A2','B1','B2','C1','C2'];const TYPES={deit:['DE → IT','Traduzione scritta'],itde:['IT → DE','Richiamo scritto'],choice:['Scelta multipla','Riconoscimento DE → IT'],article:['Articoli','Der / die / das'],plural:['Plurali','Forma plurale scritta'],listen:['Dettato','Ascolta e trascrivi'],grammar:['Grammatica','Casi, verbi, sintassi'],order:['Riordino','Costruisci la frase'],reading:['Lettura','Comprensione del testo'],free:['Traduzione frasi','Risposta aperta'],dialog:['Dialoghi','Simulazione guidata'],reading2:['Lettura e comprensione II','Testi completi con traduzione bilingue']};
const KEY='deutsch-trainer-v1';const DAY=86400000;const DEFAULT=()=>({version:1,prefs:{level:'A2',mode:'mix',count:20,types:['deit','itde','grammar','order'],daily:60,scope:'level',unlockAll:false,discoveryLevel:'A1',discoveryDirection:'deit'},reviews:{},knowledge:{},events:[],edits:{},custom:[],sessions:[]});let state=DEFAULT(),storageOK=true;
try{const raw=localStorage.getItem(KEY);if(raw){const d=JSON.parse(raw);if(valid(d))state={...DEFAULT(),...d,knowledge:d.knowledge&&typeof d.knowledge==='object'?d.knowledge:{},prefs:{...DEFAULT().prefs,...d.prefs}};}}catch(e){storageOK=false;}
function valid(d){return d&&d.version===1&&d.reviews&&typeof d.reviews==='object'&&Array.isArray(d.events)&&Array.isArray(d.custom)&&d.edits&&typeof d.edits==='object'&&d.prefs&&LEVELS.includes(d.prefs.level)&&Array.isArray(d.prefs.types)&&d.prefs.types.every(t=>t in TYPES)&&['mix','new','newWord','review','errors'].includes(d.prefs.mode)&&[5,10,20,30,50].includes(Number(d.prefs.count))&&Array.isArray(d.sessions)&&d.events.every(e=>typeof e.id==='string'&&[0,1,2,null].includes(e.score))&&d.custom.every(w=>typeof w.id==='string'&&LEVELS.includes(w.level)&&typeof w.de==='string'&&typeof w.ref==='string');}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));storageOK=true;window.DTSync?.schedule?.();return true}catch(e){storageOK=false;return false}}
const $=s=>document.querySelector(s);const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const pct=(a,b)=>b?Math.round(1000*a/b)/10:0;const fmt=x=>Number(x).toLocaleString('it-IT');const label=(t)=>t==='newwords'?'Nuove parole':TYPES[t]?.[0]||t;const scoreText=(x,ungraded=false)=>ungraded?'Non valutata':x===2?'Corretta':x===1?'Parziale':x===0?'Errata':'Saltata';const cssStatus=x=>x==='Corretta'||x==='Consolidata'?'good':x==='Errata'?'bad':x==='Parziale'?'partial':'';const statusTag=x=>`<span class="status ${cssStatus(x)}">${esc(x)}</span>`;const now=()=>Date.now();const shuffle=a=>{let b=a.slice();for(let i=b.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b};const unique=a=>[...new Set(a)];const getWords=()=>[...DATA.words,...state.custom].map(w=>({...w,...(state.edits[w.id]||{})}));const wordMap=()=>new Map(getWords().map(w=>[w.id,w]));const speechAvailable=()=>('speechSynthesis' in window&&'SpeechSynthesisUtterance'in window);let view='home',session=null,qIndex=0,submitted=null,newWordCard=null,picked=[],tokenList=[],pendingFree='',catPage=0,catFilter={q:'',level:'all',status:'all',source:'all'},historyPage=0,historyMode='local',toastTimer;
function toast(msg){let t=$('#toast');t.textContent=msg;t.classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.add('hidden'),3500);}
function setView(v){if(view==='practice'&&session&&!session.done&&v!=='practice'){if(!confirm('Uscire dalla sessione? Le risposte già date restano salvate.'))return;}view=v;render();window.scrollTo({top:0,behavior:'instant'});}
function currentWords(){let levels=LEVELS.slice(0,LEVELS.indexOf(state.prefs.level)+1);return getWords().filter(w=>state.prefs.scope==='through'?levels.includes(w.level):w.level===state.prefs.level);}

/* Knowledge is explicitly opened in "Nuove parole"; historical sheet statuses are
   deliberately not silently promoted to known words. New events are synced like
   other verification events, and the map can be replayed on another device. */
function knowledgeOf(id){return state.knowledge?.[id]||null}
function knowledgeStage(id){return knowledgeOf(id)?.stage||'unknown'}
function addKnowledgeEvent(map,event){
 if(!event||!event.id)return map;
 let current=map[event.id],type=event.type;
 if(type==='newwords'){
  const date=Date.parse(event.date)||Date.now();
  const manual=event.answer==='__KNOWN__';
  if(manual){map[event.id]={stage:'known',hits:3,misses:0,streak:3,productions:1,manual:true,verifiedKnown:0,consolidatedAt:null,lastVerifiedAt:null,updatedAt:date,nextAt:date+14*DAY};return map}
  const correct=event.score===2;
  const before=current||{hits:0,misses:0,streak:0,productions:0,verifiedKnown:0,consolidatedAt:null,lastVerifiedAt:null};
  map[event.id]={...before,stage:'learning',manual:false,hits:(before.hits||0)+(correct?1:0),misses:(before.misses||0)+(correct?0:1),streak:correct?(before.streak||0)+1:0,updatedAt:date,nextAt:correct?date+DAY:date};
  return map;
 }
 if(!current||type==='reading2'||event.score===null||event.score===undefined)return map;
 if(!['deit','itde','choice','article','plural','listen','grammar','order','reading','free','dialog'].includes(type))return map;
 const date=Date.parse(event.date)||Date.now(),correct=event.score===2,wrong=event.score===0;
 let next={...current,updatedAt:date};
 if(correct){
  if(current.stage==='known'){next.verifiedKnown=(next.verifiedKnown||0)+1;next.lastVerifiedAt=date;if(next.verifiedKnown>=10&&!next.consolidatedAt)next.consolidatedAt=date;}
  next.hits=(next.hits||0)+1;next.streak=(next.streak||0)+1;
  next.misses=Math.max(0,(next.misses||0)-1);
  if(type==='itde')next.productions=(next.productions||0)+1;
  if(next.stage==='learning'&&next.streak>=3&&next.productions>=1)next.stage='known';
  next.nextAt=date+(next.stage==='known'?14:1)*DAY;
 }else if(wrong){
  next.misses=(next.misses||0)+1;next.streak=0;
  if(next.stage==='known'&&next.misses>=2){next.stage='learning';next.manual=false;next.verifiedKnown=0;next.consolidatedAt=null;next.lastVerifiedAt=null}
  next.nextAt=date;
 }
 map[event.id]=next;return map;
}
function rebuildKnowledge(){
 const map={};
 for(const item of state.events.slice().sort((a,b)=>(Date.parse(a.date)||0)-(Date.parse(b.date)||0)))addKnowledgeEvent(map,item);
 state.knowledge=map;
}
function knowledgeStats(){
 const all=getWords(),rows=LEVELS.map(level=>{
  const w=all.filter(x=>x.level===level&&x.de&&x.ref),known=w.filter(x=>knowledgeStage(x.id)==='known').length,consolidated=w.filter(x=>knowledgeStage(x.id)==='known'&&(knowledgeOf(x.id)?.verifiedKnown||0)>=10).length,learning=w.filter(x=>knowledgeStage(x.id)==='learning').length;
  const es=state.events.filter(e=>e.level===level&&e.score!==null&&!['newwords','reading2'].includes(e.type)).slice(-100);
  const ratio=es.length?es.filter(e=>e.score===2).length/es.length:0;
  return {level,total:w.length,known,consolidated,learning,unknown:w.length-known-learning,attempts:es.length,success:ratio,coverage:w.length?(known+.35*learning)/w.length:0};
 });
 let attained='In valutazione';
 for(const row of rows){if(!row.total||row.coverage<.6||row.attempts<20||row.success<.75)break;attained=row.level}
 return {rows,attained};
}
function appGradedEvents(){return state.events.filter(e=>e.type!=='newwords'&&[0,1,2].includes(e.score));}
function todayKey(date){const d=new Date(date);return Number.isFinite(d.getTime())?d.toLocaleDateString('sv-SE'):'';}
function knowledgeGateEnabled(){return !state.prefs.unlockAll}
function allowedWord(w){return !knowledgeGateEnabled()||knowledgeStage(w.id)!=='unknown'}
/* Structured BANK exercises have no word ID: match the meaningful German
   dictionary lemmas appearing in their prompts/answers, excluding grammatical
   function words. If there is no identified active lemma, defer the exercise. */
function bankVocabularyIndex(all){
 const map=new Map();
 for(const w of all){
  const term=normal(w.de,'de').replace(/^(?:der|die|das) /,'').trim();
  if(term.length<4||term.includes(' '))continue;
  const allowed=knowledgeStage(w.id)!=='unknown';
  if(allowed||!map.has(term))map.set(term,allowed);
  if(partOfSpeech(w)==='verbo'&&/(?:en|n)$/.test(term)){
   const root=term.replace(/(?:en|n)$/,'');
   for(const ending of ['e','st','t','en','et','est']){
    const form=root+ending;
    if(allowed||!map.has(form))map.set(form,allowed);
   }
  }
 }
 return map;
}
function bankAllowed(b,index){
 if(!knowledgeGateEnabled())return true;
 const raw=b.kind==='order'||b.kind==='free'||b.kind==='dialog'?b.answer:[b.prompt,b.answer,b.passage].filter(x=>typeof x==='string').join(' ');
 const terms=new Set((String(raw||'').match(/[\p{L}äöüÄÖÜß]{4,}/gu)||[]).map(t=>normal(t,'de')));
 let matched=0;
 for(const term of terms){
  const status=index.get(term);
  if(status===false)return false;
  if(status===true)matched++;
 }
 return matched>0;
}
function relevantWordRate(q){
 if(!q.word||!knowledgeGateEnabled())return 1;
 const p=knowledgeOf(q.refId);
 if(!p)return .6;
 const overdue=Date.now()>=(p.nextAt||0);
 if(p.stage==='learning')return Math.min(7,2+(p.misses||0)*.6+(overdue?1:0));
 if(['choice','deit','itde'].includes(q.type))return overdue?.32:.09;
 if(['article','plural'].includes(q.type))return overdue?2.1:.55;
 return overdue?1.15:.35;
}
function weightedDraw(list){return list.map(q=>({q,key:Math.pow(Math.random(),1/Math.max(.04,relevantWordRate(q)))})).sort((a,b)=>b.key-a.key).map(x=>x.q)}


function discoveryLevel(){return LEVELS.includes(state.prefs.discoveryLevel)?state.prefs.discoveryLevel:'A1'}
function chooseDiscovery(){
 const level=discoveryLevel(),items=getWords().filter(w=>w.level===level&&w.de&&w.ref),recent=new Set(newWordCard?.recent||[]);
 const unseen=items.filter(w=>knowledgeStage(w.id)==='unknown'),learning=items.filter(w=>knowledgeStage(w.id)==='learning'&&(knowledgeOf(w.id)?.nextAt||0)<=Date.now());
 const unseenFresh=unseen.filter(w=>!recent.has(w.id)),learningFresh=learning.filter(w=>!recent.has(w.id));
 const pool=learningFresh.length&&(!unseenFresh.length||Math.random()<.4)?learningFresh:unseenFresh.length?unseenFresh:learningFresh.length?learningFresh:unseen.length?unseen:learning;
 if(!pool.length)return null;
 const difficult=pool.filter(w=>(knowledgeOf(w.id)?.misses||0)>0);
 if(difficult.length&&Math.random()<.6)return difficult[Math.floor(Math.random()*difficult.length)];
 return pool[Math.floor(Math.random()*pool.length)];
}
function discoveryOptions(w,dir,all){
 const wrong=semanticChoiceOptions(w,all);
 if(wrong.length!==3)return null;
 if(dir==='deit')return {prompt:w.de,answer:w.ref,options:shuffle([w.ref,...wrong])};
 const options=[];
 for(const gloss of wrong){
  const found=all.find(v=>v.id!==w.id&&v.ref===gloss&&partOfSpeech(v)===partOfSpeech(w)&&!options.includes(v.de));
  if(found)options.push(found.de);
 }
 if(options.length!==3)return null;
 return {prompt:REVERSE_CONTEXT[w.de]?.[0]||w.ref,answer:w.de,options:shuffle([w.de,...options])};
}
function prepareNewWord(){
 if(newWordCard?.id||newWordCard?.empty)return;
 const dir=state.prefs.discoveryDirection==='itde'?'itde':'deit',level=discoveryLevel(),all=getWords().filter(w=>w.de&&w.ref);
 const recent=newWordCard?.recent||[];
 for(let i=0;i<35;i++){
  const w=chooseDiscovery();if(!w)break;
  const data=discoveryOptions(w,dir,all);
  if(data){newWordCard={...data,id:w.id,level,dir,recent};return}
  if(!newWordCard)newWordCard={recent:[]};
  newWordCard.recent=unique([...(newWordCard.recent||[]),w.id]).slice(-20);
 }
 newWordCard={empty:true,level,dir,recent};
}
function recordDiscovery(w,score,answer){
 const event={uid:'DT-'+(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)),id:w.id,type:'newwords',level:w.level,prompt:newWordCard.prompt,expected:newWordCard.answer,answer,score,manual:answer==='__KNOWN__',ungraded:false,date:new Date().toISOString(),session:'NEWWORDS-'+new Date().toISOString().slice(0,10)};
 state.events.push(event);addKnowledgeEvent(state.knowledge,event);save();return event;
}
function discoveryKnown(){
 if(view!=='newwords'||!newWordCard?.id||newWordCard.feedback)return;
 const w=wordMap().get(newWordCard.id);if(!w)return;
 recordDiscovery(w,2,'__KNOWN__');
 newWordCard.feedback={correct:true,known:true,title:'Già conosciuta',detail:w.de+' = '+w.ref};render();
}
function discoveryPick(i){
 if(view!=='newwords'||!newWordCard?.id||newWordCard.feedback)return;
 const chosen=newWordCard.options[i],w=wordMap().get(newWordCard.id);
 if(chosen===undefined||!w)return;
 const score=chosen===newWordCard.answer?2:0;
 recordDiscovery(w,score,chosen);
 newWordCard.feedback={correct:score===2,known:false,title:score===2?'Corretta · in apprendimento':'Da imparare · ripasso prioritario',detail:w.de+' = '+w.ref};render();
}
function discoveryNext(){
 if(!newWordCard)return;
 const recent=unique([...(newWordCard.recent||[]),newWordCard.id].filter(Boolean)).slice(-12);
 newWordCard={recent};prepareNewWord();render();
}
function progressPanel(){
 const summary=knowledgeStats(),rows=summary.rows;
 let table='<div class="tablebox"><table><thead><tr><th>Livello</th><th>Conosciute</th><th>Consolidate (10+)</th><th>In studio</th><th>Sconosciute</th><th>Corrette recenti</th></tr></thead><tbody>';
 for(const r of rows)table+='<tr><td>'+esc(r.level)+'</td><td>'+fmt(r.known)+' / '+fmt(r.total)+'</td><td>'+fmt(r.consolidated)+'</td><td>'+fmt(r.learning)+'</td><td>'+fmt(r.unknown)+'</td><td>'+(r.attempts?pct(Math.round(r.success*r.attempts),r.attempts)+'% ('+r.attempts+')':'—')+'</td></tr>';
 return '<section class="card"><h2>Conoscenza delle parole per livello</h2><p><strong>Livello stimato:</strong> '+esc(summary.attained)+'</p><p class="muted">Indicatore interno, non certificazione QCER: richiede copertura del vocabolario, almeno 20 prove recenti e il 75% di risposte corrette.</p>'+table+'</tbody></table></div><div class="divider"></div><button class="secondary" data-action="newwords">Apri Nuove parole</button></section>';
}
function newWords(){
 prepareNewWord();const summary=knowledgeStats(),level=discoveryLevel(),row=summary.rows.find(r=>r.level===level);
 let out='<div class="intro"><div class="eyebrow">Allenamento</div><h1>Nuove parole</h1><p class="muted">Scopri le parole dei vari livelli e indica quali conosci già. Se indovini una traduzione, il termine passa in apprendimento e non ancora in conosciute.</p></div><section class="card"><h2>Livello '+esc(level)+'</h2><p>'+fmt(row.known)+' conosciute · '+fmt(row.learning)+' in apprendimento · '+fmt(row.unknown)+' da scoprire</p><div class="row">';
 for(const l of LEVELS)out+='<button class="chip '+(l===level?'active':'')+'" data-new-level="'+esc(l)+'">'+esc(l)+'</button>';
 out+='</div><div class="row" style="margin-top:12px"><button class="chip '+(state.prefs.discoveryDirection==='deit'?'active':'')+'" data-new-dir="deit">Tedesco → Italiano</button><button class="chip '+(state.prefs.discoveryDirection==='itde'?'active':'')+'" data-new-dir="itde">Italiano → Tedesco</button></div></section>';
 if(!newWordCard?.id)return out+'<section class="card"><h2>Nessuna parola disponibile</h2><p>Il livello selezionato non contiene altre parole da classificare con quattro opzioni sufficientemente distinte. Puoi scegliere un altro livello oppure ripassare le parole in studio.</p></section>';
 out+='<section class="card"><div class="eyebrow">'+esc(level)+' · '+(newWordCard.dir==='deit'?'Tedesco → Italiano':'Italiano → Tedesco')+'</div><div class="question">'+esc(newWordCard.prompt)+'</div><p class="muted">Scegli il significato o segnala che conosci già il termine.</p><div class="answergrid">';
 for(let i=0;i<newWordCard.options.length;i++)out+='<button class="answer '+(newWordCard.feedback&&newWordCard.options[i]===newWordCard.answer?'good':'')+'" data-new-pick="'+i+'" '+(newWordCard.feedback?'disabled':'')+'>'+esc(newWordCard.options[i])+'</button>';
 out+='</div><div class="row" style="margin-top:14px"><button class="secondary" data-action="discovery-known" '+(newWordCard.feedback?'disabled':'')+'>La conosco già</button>';
 if(newWordCard.feedback)out+='<button class="primary" data-action="discovery-next">Prossima parola</button>';
 out+='</div>';
 if(newWordCard.feedback)out+='<div class="feedback '+(newWordCard.feedback.correct?'':'bad')+'" style="margin-top:16px"><h3>'+esc(newWordCard.feedback.title)+'</h3><p>'+esc(newWordCard.feedback.detail)+'</p><p class="muted">'+(newWordCard.feedback.known?'La parola sarà proposta ogni tanto per controllare ciò che ricordi, inclusi articolo e plurale quando disponibili.':newWordCard.feedback.correct?'Parola in apprendimento: per consolidarla servono ulteriori risposte corrette e almeno un richiamo IT→DE.':'Parola in apprendimento: verrà riproposta più frequentemente.')+'</p></div>';
 return out+'</section>';
}

function localScore(id,type){return state.reviews[id+'|'+type]||null}
function seedReview(){return {seen:false,score:null,due:0,streak:0};}
function getReview(q){const saved=localScore(q.refId,q.type),p=q.word&&knowledgeOf(q.refId);if(p?.stage==='known'&&['choice','deit','itde'].includes(q.type)&&(!saved||(saved.last||0)<(p.updatedAt||0)))return {seen:true,score:2,due:p.nextAt||Date.now()+14*DAY,streak:1};if(saved)return saved;return q.word?seedReview(q.word,q.type):{seen:false,score:null,due:0,streak:0};}
function applicable(w,type){if(!w.de)return false;if(type==='article')return /^(der|die|das) [A-ZÄÖÜ]/.test(w.de)&&!['die Möbel','die Eltern','die Geschwister','die Großeltern','die Ferien','die Leute','die Papiere','die Lebensmittel','die Kenntnisse','die Fundsachen','die Süßigkeiten'].includes(w.de);if(type==='plural')return !!w.forms;if(type==='listen')return speechAvailable()&&!/\/|\(|\)|-$/.test(w.de);if(!w.ref)return false;if(type==='itde')return !/\(possessivo\)|\/|\(sich\)|-$/.test(w.de);return ['deit','choice'].includes(type)}
/* Curated equivalents are accepted only for a meaning shared by the two entries in
   a context-free flashcard, not as a claim that they substitute in every sentence. */
const VOCAB_EQUIVALENCE_GROUPS=[
 ['anfangen','beginnen','starten'],['aufmachen','öffnen'],['schließen','zumachen'],
 ['bekommen','kriegen','erhalten'],['bezahlen','zahlen'],['reden','sprechen'],
 ['machen','tun'],['der Frühling','das Frühjahr'],
 ['das Brötchen','die Semmel','das Brötli'],['die Karotte','die Möhre','das Rüebli'],
 ['die Disco','die Disko','die Diskothek'],['das Couvert','das Kuvert','der Briefumschlag'],
 ['schnell','rasch'],['schön','hübsch'],['danken','sich bedanken']
];
/* Words with one Italian gloss and different meanings need context, not a global synonym rule. */
const VOCAB_CONFUSABLE_GROUPS=[
 ['anfangen','beginnen','starten','aufhören','beenden','fortsetzen','weitermachen'],
 ['reden','sprechen','sagen','erzählen','fragen','antworten','zuhören','hören'],
 ['bekommen','kriegen','erhalten','empfangen','geben','nehmen','holen','schicken','senden','bringen'],
 ['sich','mich','dich','uns','euch','ihn','ihm','sie','ihr','mir','dir'],
 ['kaufen','einkaufen','verkaufen','bezahlen','zahlen','bestellen','nehmen','holen','bringen'],
 ['kommen','gehen','fahren','laufen','rennen','reisen','ankommen','abfahren'],
 ['wohnen','leben','bleiben','besuchen','umziehen','mieten','vermieten'],
 ['öffnen','aufmachen','zumachen','schließen','abschließen','eröffnen'],
 ['kennen','wissen','verstehen','lernen','merken','erinnern','vergessen'],
 ['mögen','lieben','gefallen','wollen','möchten','brauchen','müssen','dürfen','können','sollen'],
 ['schön','hübsch','hässlich','groß','klein','alt','neu','jung'],
 ['schnell','rasch','langsam','früh','spät','sofort','gleich'],
 ['ganz','alles','all','alle','jeder','jede','sämtlich','sämtliche','halb','die Hälfte','vollständig','komplett','teilweise'],
 ['gut','schlecht','besser','richtig','falsch','leicht','schwer'],
 ['der Herd','die Küche','der Backofen','der Ofen','der Topf','die Pfanne','die Mikrowelle','das Kochfeld'],
 ['der Schüler','der Student','die Schülerin','die Studentin','der Lehrer','die Lehrerin','der Professor','die Schule','die Universität'],
 ['die Frage','der Antrag','die Antwort','die Bitte','die Forderung','das Formular','die Anmeldung'],
 ['die Arbeit','der Job','der Beruf','der Arbeitsplatz','die Stelle','das Werk','die Aufgabe'],
 ['das Haus','die Wohnung','das Zimmer','das Zuhause','die Unterkunft','das Heim'],
 ['die Mutter','der Vater','die Tochter','der Sohn','der Bruder','die Schwester','die Eltern'],
 ['der Zug','der Bus','das Auto','das Fahrrad','das Flugzeug','die Straßenbahn','die U-Bahn'],
 ['der Tisch','der Stuhl','das Bett','das Sofa','der Schrank','das Regal'],
 ['die Jacke','die Hose','das Hemd','das T-Shirt','der Pullover','die Schuhe'],
 ['der Morgen','der Abend','die Nacht','der Mittag','der Vormittag','der Nachmittag'],
 ['die Stadt','das Dorf','die Straße','der Platz','der Park','der Bahnhof'],
 ['das Buch','die Zeitung','die Zeitschrift','der Brief','die E-Mail','die Nachricht'],
 ['der Hund','die Katze','der Vogel','das Pferd','die Kuh','das Schwein'],
 ['die Sonne','der Regen','der Schnee','der Wind','das Wetter','die Wolke'],
 ['der Preis','das Geld','die Rechnung','der Rabatt','das Wechselgeld','die Münze']
];
function confusableSet(w,all){
 const key=normal(w.de,'de');
 const candidates=new Set();
 for(const group of VOCAB_CONFUSABLE_GROUPS)
  if(group.some(x=>normal(x,'de')===key))for(const lemma of group)
   if(normal(lemma,'de')!==key)candidates.add(normal(lemma,'de'));
 return all.filter(x=>candidates.has(normal(x.de,'de')));
}
const REVERSE_CONTEXT={
 'der Schüler':['studente (di scuola)','Schüler indica normalmente uno studente della scuola, non dell’università.'],
 'die Schülerin':['studentessa di scuola; alunna','Schülerin indica una ragazza che frequenta la scuola; Studentin indica una studentessa universitaria.'],
 'die Studentin':['studentessa universitaria','Studentin indica una ragazza che studia all’università; Schülerin indica una studentessa di scuola.'],
 'der Lerner':['allievo; persona che sta imparando','Lerner indica una persona che apprende, non necessariamente uno studente universitario.'],
 'die Lernerin':['allieva; persona che sta imparando (donna)','Lernerin indica una donna che apprende.'],
 'der Studierende':['studente (universitario, maschile)','Studierende indica una persona che studia, spesso in un’università.'],
 'die Studierende':['studentessa (universitaria)','Studierende indica una donna che studia, spesso in un’università.'],
 'der Schnupfen':['raffreddore; naso che cola','Schnupfen indica un disturbo nasale; Kälte indica freddo atmosferico.'],
 'die Erkältung':['raffreddore; malattia da raffreddamento','Erkältung è un raffreddore, non la temperatura fredda.'],
 'die Kälte':['freddo (temperatura)','Kälte indica il freddo come condizione termica, non il raffreddore.'],
 'das Camp':['campo (campeggio, evento organizzato)','Camp indica un campo organizzato o un campeggio.'],
 'das Feld':['campo agricolo; terreno','Feld indica un terreno, un campo coltivato o una disciplina.'],
 'der Flur':['corridoio, ingresso interno','Flur come spazio interno significa corridoio; può anche indicare terreni in ambito geografico.'],
 'das Quartier':['quartiere; alloggio','Quartier indica un quartiere o un alloggio; Viertel può indicare un quarto o quartiere.'],
 'die Forderung':['pretesa; richiesta, rivendicazione','Forderung indica una richiesta esigente o una pretesa, non semplicemente una domanda.'],
 'fordern':['esigere; richiedere','Fordern è un verbo, diverso dal sostantivo Frage.'],
 'das Werk':['opera; prodotto realizzato; stabilimento','Werk può indicare un’opera, un lavoro realizzato o uno stabilimento industriale.'],
 'der Student':['studente (universitario)','Student indica normalmente uno studente universitario.'],
 'die Frage':['domanda (quesito)','Frage è una domanda rivolta a qualcuno.'],
 'der Antrag':['domanda (richiesta formale)','Antrag è una richiesta o domanda amministrativa.'],
 'die Leiter':['scala a pioli / persona dirigente (secondo genere e contesto)','Die Leiter può riferirsi alla scala; una persona dirigente è der Leiter / die Leiterin.'],
 'der Leiter':['responsabile, dirigente','Der Leiter indica una persona che dirige; die Leiter può indicare anche una scala.'],
 'das Werk':['opera, lavoro realizzato','Werk non coincide sempre con Arbeit o Job.'],
 'die Arbeit':['lavoro, attività lavorativa','Arbeit può indicare lavoro, attività o compito, non necessariamente un posto di lavoro.'],
 'der Job':['impiego, posto di lavoro','Job indica un impiego specifico; Arbeit può indicare anche lavoro e attività in senso generale.']
};
function partOfSpeech(w){
 const c=String(w.cat||'').toLowerCase();
 if(c==='da classificare'||c==='altro'){
  if(/^(?:der|die|das)\s+\p{Lu}/u.test(w.de||''))return 'sostantivo';
  if(/(?:are|ere|ire)(?:[;,\s]|$)/i.test(String(w.ref||'').split(/[;\/]/)[0]))return 'verbo';
  return c;
 }
 return c;
}
function reverseGermanAlternatives(w,all){
 const values=[];
 if(w.de==='ganz'&&normal(w.ref,'it')==='tutto')values.push('alles');
 const target=normal(w.de,'de');
 for(const group of VOCAB_EQUIVALENCE_GROUPS){
  if(!group.some(x=>normal(x,'de')===target))continue;
  for(const candidate of group){
   if(normal(candidate,'de')!==target&&(!all||all.some(x=>normal(x.de,'de')===normal(candidate,'de'))))values.push(candidate);
  }
 }
 return unique(values);
}
function wordMeaningAlternatives(w,all){
 const expected=variants(w.ref,'it');
 if(!expected.length||expected.some(x=>x.length<3))return [];
 const explicit=new Set([normal(w.de,'de'),...reverseGermanAlternatives(w,all).map(x=>normal(x,'de'))]);
 return all.filter(x=>x.id!==w.id&&x.ref&&variants(x.ref,'it').some(a=>expected.includes(a))&&!explicit.has(normal(x.de,'de'))&&!/[/()]/.test(x.de)).slice(0,20).map(x=>x.de);
}
/* A distractor should belong to a related field, but not share an accepted
   meaning with the right answer. Tags use word stems, not fragile exact labels. */
const VOCAB_SEMANTIC_FIELDS={
 cucina:['fornell','cottura','cucin','pentol','padell','forno','frigorif','microond','coltell','cucchiai','piatt','forchett','tazza','bicchier','lavello','spugna','posat','bollitor'],
 alimenti:['pane','panino','formagg','latte','mela','pera','banana','frutta','verdura','carne','pesce','riso','patat','zuccher','sale','pepe','cioccolat','gelato','acqua','bevanda','birra','vino','caffe','te '],
 trasporti:['treno','autobus','bus','metr','tram','biciclett','aereo','automobil','macchin','taxi','bigliett','stazion','binario','fermata','viaggi','aeroporto','passegger','guidare','parcheggio'],
 famiglia:['madre','mamma','padre','papa','figli','fratell','sorell','nonno','nonna','nipot','zii','zio','zia','genitor','marito','moglie','cugin','parente','famigli'],
 casa:['casa','appartamento','stanza','camera','salotto','soggiorno','bagno','letto','tavolo','sedia','divano','porta','finestra','tetto','giardino','balcone','armadio','mobile','parete','pavimento'],
 scuola:['scuola','scolast','universit','studente','alunn','insegnante','professor','maestr','compit','esame','lezion','libro','quaderno','penna','matita','classe','biblioteca'],
 lavoro:['lavoro','lavorare','mestiere','professione','ufficio','collega','stipendio','capo','azienda','dipendente','contratto','riunione','fabbrica','turno','disoccupat'],
 tempo:['giorno','settimana','mese','anno','ora','minuto','secondo','ieri','oggi','domani','mattina','sera','notte','lunedi','martedi','mercoledi','giovedi','venerdi','sabato','domenica'],
 corpo:['testa','collo','spalla','braccio','mano','dita','piede','gamba','pancia','stomaco','orecchio','occhio','naso','bocca','dente','schiena','cuore','sangue'],
 abbigliamento:['giacca','scarpa','camicia','maglietta','pantalon','vestito','gonna','calzino','cappello','cintura','guanto','maglione','stivale'],
 emozioni:['felice','triste','paura','ansia','gioia','rabbia','amore','odio','nervos','preoccup','tranquill','content','spavent'],
 natura:['albero','foresta','bosco','fiume','lago','montagn','mare','spiaggia','fiore','foglia','pianta','animale','cane','gatto','uccello','pioggia','sole','neve','vento'],
 denaro:['soldi','denaro','euro','prezzo','costo','conto','pagare','comprare','vendere','acquist','banconot','moneta','sconto','resto','fattura'],
 comunicazione:['parlare','dire','raccontare','chiedere','rispondere','scrivere','leggere','lettera','messaggio','telefonare','chiamare','conversazion','domanda','risposta','ascoltare'],
 movimento:['andare','venire','correre','camminare','saltare','arrivare','partire','uscire','entrare','salire','scendere','muovere','spostare','fermare'],
 colori:['colore','rosso','verde','giallo','blu','azzurr','nero','bianco','grigio','marron','viola','rosa','arancion'],
 quantita:['tutto','ogni','intero','completo','completamente','niente','nessuno','metà','mezzo','parte','parziale','tanto','quanto','molto','poco','alcuni','ciascuno','totalmente','metà'],
 dimensioni:['grande','piccolo','lungo','corto','alto','basso','largo','stretto','pesante','leggero','veloce','lento']
};
function meaningTopics(w){
 const tokens=(normal(w.ref||'','it').match(/[\p{L}\p{N}]+/gu)||[]),fields=[];
 for(const [name,stems] of Object.entries(VOCAB_SEMANTIC_FIELDS))if(stems.some(s=>{const stem=s.trim();return tokens.some(token=>stem.length<=3?token===stem:token.startsWith(stem));}))fields.push(name);
 return fields;
}
const choiceCache=new WeakMap();
function choiceIndex(all){
 let cached=choiceCache.get(all);if(cached)return cached;
 const byCat=new Map(),byTopic=new Map(),topics=new Map();
 for(const w of all){const cat=partOfSpeech(w),ts=meaningTopics(w);topics.set(w.id,ts);
  if(!byCat.has(cat))byCat.set(cat,[]);byCat.get(cat).push(w);
  for(const t of ts){if(!byTopic.has(t))byTopic.set(t,[]);byTopic.get(t).push(w)}
 }
 cached={byCat,byTopic,topics};choiceCache.set(all,cached);return cached;
}
function semanticChoiceOptions(w,all){
 const a=w.ref,sense=REVERSE_CONTEXT[w.de]?.[0]||a,options=[],catalog=choiceIndex(all),cat=partOfSpeech(w),topics=catalog.topics.get(w.id)||[];
 const verified=new Set(reverseGermanAlternatives(w,all).map(x=>normal(x,'de')));
 const sameCat=catalog.byCat.get(cat)||[],nearby=new Map();
 for(const tag of topics)for(const item of catalog.byTopic.get(tag)||[]){
  if(partOfSpeech(item)===cat&&item.id!==w.id)nearby.set(item.id,item);
 }
 // Use at most a small random sample when no meaningful topical match exists.
 // This avoids O(n²) dictionary-wide sorting during session creation.
 for(const item of confusableSet(w,all))if(partOfSpeech(item)===cat)nearby.set(item.id,item);
 if(nearby.size<6)for(const item of shuffle(sameCat).slice(0,90))nearby.set(item.id,item);
 const key=normal(w.de,'de').replace(/^(?:der|die|das)\s+/,'');
 const ranked=[],close=new Set(confusableSet(w,all).map(x=>x.id));
 for(const v of nearby.values()){
  if(v.id===w.id||!v.ref||v.ref===a||String(v.ref).length>95||partOfSpeech(v)!==cat)continue;
  if(cat!=='numero'&&/\d/.test(v.ref))continue;
  if(sameMeaning(v.ref,a)||sameMeaning(v.ref,sense)||verified.has(normal(v.de,'de')))continue;
  const vt=catalog.topics.get(v.id)||[],shared=vt.filter(t=>topics.includes(t)).length;
  const vk=normal(v.de,'de').replace(/^(?:der|die|das)\s+/,'');
  const lexical=variants(v.ref,'it').join(' '),target=variants(a,'it').join(' ');
  const distance=editdist(key,vk);
  const closeness=Math.max(0,8-Math.abs(vk.length-key.length)-Math.min(6,distance));
  const nearMeaning=close.has(v.id);
  if(!nearMeaning && !shared && distance>2)continue; // Skip unrelated distractors entirely.
  const score=(nearMeaning?30:0)+shared*12+(v.level===w.level?2:0)+closeness*.5+Math.max(0,5-Math.abs(lexical.length-target.length)/4)*.25+Math.random()*2;
  ranked.push({v,score,related:nearMeaning||shared>0});
 }
 ranked.sort((a,b)=>b.score-a.score);
 for(const {v,related} of ranked){if(options.length>=3)break;if(related&&!options.some(x=>sameMeaning(x,v.ref)))options.push(v.ref)}
 for(const {v} of ranked){if(options.length>=3)break;if(!options.some(x=>sameMeaning(x,v.ref)))options.push(v.ref)}
 if(options.length<3)for(const v of shuffle(all)){
  if(options.length>=3)break;
  if(v.id===w.id||!v.ref||String(v.ref).length>95||v.ref===a)continue;
  if(sameMeaning(v.ref,a)||sameMeaning(v.ref,sense)||options.some(x=>sameMeaning(x,v.ref)))continue;
  options.push(v.ref);
 }
 // If there are fewer than three credible distractors, do not pad with garbage.
 return options;
}
function relevantWordNote(q,submitted){if(!q.word||!submitted||submitted.score===2||!q.word.note)return '';const note=String(q.word.note);const quoted=[...note.matchAll(/«([^»]+)»/g)].map(x=>x[1]);if(!quoted.length)return '';const lang=q.language||'it',actual=variants(submitted.raw,lang);return quoted.some(x=>actual.includes(normal(x,lang)))?note:''}
function makeWordQ(w,type,all){let base={refId:w.id,id:w.id+'|'+type,word:w,level:w.level,type,topic:label(type),prompt:'',answer:'',options:[],explanation:'',kind:'typed'};if(type==='deit'){return {...base,prompt:w.de,answer:w.ref,language:'it',hint:'Scrivi il significato in italiano.'};}if(type==='itde'){const alternatives=reverseGermanAlternatives(w),context=REVERSE_CONTEXT[w.de];return {...base,prompt:context?context[0]:w.ref,answer:w.de,acceptedAnswers:alternatives,uncertainAnswers:[],lazyReverse:!context,reverseAmbiguity:w.de==='ganz'?'«ganz» = intero, completo o del tutto; «alles» = tutto nel senso di ogni cosa. Senza contesto, per «tutto» sono possibili entrambe le traduzioni.':context?context[1]:alternatives.length?'Sono accettate anche traduzioni equivalenti verificate: la loro sostituibilità può dipendere dal contesto.':'',language:'de',hint:w.cat==='sostantivo'?'Scrivi in tedesco, includendo l’articolo del sostantivo.':'Scrivi la traduzione in tedesco.'};}if(type==='choice'){return {...base,prompt:w.de,answer:w.ref,options:[],kind:'choice',hint:'Scegli il significato.',lazyChoice:true};}if(type==='article'){let [a,...r]=w.de.split(' ');return {...base,prompt:r.join(' '),answer:a,options:shuffle(['der','die','das']),kind:'choice',hint:'Scegli l’articolo determinativo al singolare.',explanation:w.de+(w.ref?' = '+w.ref:' · articolo determinativo')};}if(type==='plural')return {...base,prompt:w.de,answer:w.forms,language:'de',hint:'Scrivi il plurale, con o senza die.',explanation:'Plurale: die '+w.forms};if(type==='listen')return {...base,prompt:'Ascolta e trascrivi',answer:w.de,language:'de',audio:w.de,hint:'Premi Ascolta. Trascrivi anche l’articolo, se presente.',explanation:w.ref};return null;}
function normal(s,lang='de'){let t=String(s||'').normalize('NFC').toLowerCase().trim().replace(/[’‘`]/g,"'").replace(/[.,!?;:…“”„"()]/g,' ').replace(/\s+/g,' ').trim();if(lang==='de')t=t.replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss');else t=t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/^(?:(?:il|lo|la|i|gli|le|un|uno|una)\s+|l')/,'');return t;}
function variants(a,lang){return unique(String(a||'').split(lang==='it'?/[;,/]|(?:\s+oppure\s+)/:/[;/]|(?:\s+oppure\s+)/).flatMap(s=>[s,s.replace(/\([^)]*\)/g,'')]).map(x=>normal(x,lang)).filter(Boolean));}
/* Avoid wrong-answer choices that are legitimate Italian paraphrases of the answer.
   This rule is applied to the distractors only; it does not automatically give
   credit to a different German lemma in an IT→DE test. */
const ITALIAN_GLOSS_EQUIVALENCE=[
 ['iniziare','cominciare'],['finire','terminare','concludere'],
 ['comprare','acquistare'],['vendere','cedere'],
 ['veloce','rapido'],['lentamente','piano'],['presto','rapidamente'],
 ['bello','carino','grazioso'],['brutto','orribile'],
 ['grande','ampio'],['piccolo','minuscolo'],
 ['difficile','complicato'],['facile','semplice'],
 ['ricevere','ottenere'],['pagare','versare'],
 ['parlare','conversare'],['domandare','chiedere'],['rispondere','replicare'],
 ['arrivare','giungere'],['partire','andarsene'],
 ['prendere','afferrare'],['dare','consegnare'],
 ['abitare','risiedere'],['casa','abitazione'],
 ['lavoro','impiego','posto di lavoro','occupazione'],['professione','mestiere'],
 ['meglio','migliore'],
 ['bambino','bimbo'],['ragazzo','giovane'],
 ['felice','contento'],['triste','infelice'],
 ['paura','timore'],['coraggioso','audace'],
 ['negozio','bottega'],['auto','automobile','macchina'],
 ['autobus','bus'],['treno','convoglio'],['bicicletta','bici'],
 ['fornello','piano cottura'],['verdura','ortaggio'],['frutta','frutti'],
 ['soldi','denaro'],['prezzo','costo'],['sconto','riduzione'],
 ['giacca','giubbotto'],['maglietta','t-shirt'],
 ['schermo','display'],['telefono','cellulare']
];
function sameMeaning(a,b){
 const aa=variants(a,'it'),bb=variants(b,'it');
 if(aa.some(x=>bb.includes(x)))return true;
 for(const group of ITALIAN_GLOSS_EQUIVALENCE){
  const normalized=group.map(x=>normal(x,'it'));
  if(aa.some(x=>normalized.includes(x))&&bb.some(x=>normalized.includes(x)))return true;
 }
 return false;
}
function editdist(a,b){let d=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let last=d[0];d[0]=i;for(let j=1;j<=b.length;j++){let t=d[j];d[j]=Math.min(d[j]+1,d[j-1]+1,last+(a[i-1]!==b[j-1]?1:0));last=t}}return d[b.length]}
function grade(q,raw){if(q.kind==='choice'||q.kind==='reading')return raw===q.answer?2:0;let lang=q.language||'de';let a=normal(raw,lang),answers=variants(q.answer,lang);if(a===normal(q.answer,lang)&&a)return 2;if(q.type==='plural'){a=a.replace(/^die /,'');answers=answers.map(x=>x.replace(/^die /,''));}if(q.type==='deit'){const provided=variants(raw,'it');const nmap={'1':'uno','2':'due','3':'tre','4':'quattro','5':'cinque','6':'sei','7':'sette','8':'otto','9':'nove','10':'dieci','11':'undici','12':'dodici','13':'tredici','14':'quattordici','15':'quindici','16':'sedici','17':'diciassette','18':'diciotto','19':'diciannove','20':'venti','21':'ventuno','30':'trenta','40':'quaranta','50':'cinquanta','60':'sessanta','70':'settanta','80':'ottanta','90':'novanta','100':'cento','101':'centouno','200':'duecento','1000':'mille','2001':'duemilauno'};for(const v of answers.slice()){if(nmap[v])answers.push(nmap[v]);let k=Object.keys(nmap).find(k=>nmap[k]===v);if(k)answers.push(k);}if(provided.length&&provided.every(v=>answers.includes(v)))return 2;if(provided.some(v=>answers.includes(v)))return 1;}if(answers.includes(a))return 2;if(q.type==='itde'&&Array.isArray(q.acceptedAnswers)&&q.acceptedAnswers.some(value=>normal(value,'de')===a))return 2;
 if(q.type==='itde'&&/^(?:sich)\s+/i.test(normal(q.answer,'de'))&&a===normal(q.answer,'de').replace(/^sich\s+/,'')&&a)return 1;
 if(q.type==='itde'&&Array.isArray(q.acceptedAnswers)&&q.acceptedAnswers.some(value=>{let n=normal(value,'de');return /^(der|die|das) /.test(n)&&n.replace(/^(der|die|das) /,'')===a;}))return 1;if(q.type==='itde'&&Array.isArray(q.uncertainAnswers)&&q.uncertainAnswers.some(value=>{const n=normal(value,'de');return n===a||(/^(der|die|das) /.test(n)&&n.replace(/^(der|die|das) /,'')===a)}))return null;if(q.type==='itde'||q.type==='listen'){if(/^(der|die|das) /.test(normal(q.answer))&&a.replace(/^(der|die|das) /,'')===normal(q.answer).replace(/^(der|die|das) /,''))return 1;}if(a.length>=4&&answers.some(b=>b.length>=4&&editdist(a,b)===1))return 1;return 0;}
function createPool(){const all=getWords(),w=currentWords().filter(allowedWord),types=state.prefs.types,bankIndex=knowledgeGateEnabled()?bankVocabularyIndex(all):null;let c=[];for(const word of w)for(const t of types)if(applicable(word,t)){let q=makeWordQ(word,t,all);if(q)c.push(q)}let selectedLevels=state.prefs.scope==='through'?LEVELS.slice(0,LEVELS.indexOf(state.prefs.level)+1):[state.prefs.level];for(const b of BANK){let type=b.kind==='reading'?'reading':b.kind==='order'?'order':b.kind==='free'?'free':b.kind==='dialog'?'dialog':'grammar';if(types.includes(type)&&selectedLevels.includes(b.level)&&bankAllowed(b,bankIndex))c.push({...b,refId:b.id,type,language:'de',options:shuffle(b.options),hint:b.kind==='typed'?'Scrivi la forma richiesta.':'',word:null})}return c;}
function chooseQueue(pool,count,mode){let samples=weightedDraw(pool).map(q=>({...q,r:getReview(q)})),newItems=[],due=[],later=[];for(const q of samples){let r=q.r;if(!r.seen)newItems.push(q);else if((r.due||0)<=now())due.push(q);else later.push(q)}due.sort((a,b)=>(a.r.score??0)-(b.r.score??0)||(a.r.due||0)-(b.r.due||0));const wordSeen=new Set(state.events.filter(e=>e.score!==null&&e.type!=='newwords').map(e=>e.id));let sets=mode==='new'?[newItems]:mode==='newWord'?[newItems.filter(q=>!q.word||(knowledgeStage(q.refId)==='learning'&&!wordSeen.has(q.refId)))]:mode==='review'?[due]:mode==='errors'?[samples.filter(q=>q.r.seen&&q.r.score<2)]:[due,newItems,later];let used=new Set,chosen=[];function take(arr,limit){let selected=0;while(arr.length&&selected<limit&&chosen.length<count){let q=arr.shift();const group=q.word?normal(q.word.de):q.refId;if(used.has(group))continue;chosen.push(q);used.add(group);selected++;}}if(mode==='mix'){take(newItems,Math.ceil(count*.45));take(due,count-chosen.length);take(newItems,count-chosen.length);take(later,count-chosen.length);}else take(sets[0],count);return shuffle(chosen);}
function begin(){let pool=createPool(),wanted=Number(state.prefs.count),extra=state.prefs.types.includes('choice')?Math.min(120,wanted*4):0,queue=chooseQueue(pool,wanted+extra,state.prefs.mode);if(queue.some(q=>q.lazyChoice||q.lazyReverse)){const all=getWords();queue=queue.map(q=>{if(q.lazyReverse)q={...q,uncertainAnswers:wordMeaningAlternatives(q.word,all),lazyReverse:false};if(!q.lazyChoice)return q;const opts=semanticChoiceOptions(q.word,all);return opts.length===3?{...q,options:shuffle([q.answer,...opts]),lazyChoice:false}:null;}).filter(Boolean);}queue=queue.slice(0,wanted);if(!queue.length){toast('Nessun esercizio disponibile con questi filtri. Scegli Misto, un altro modulo o livello.');return;}session={id:'S-'+Date.now(),level:state.prefs.level,queue,results:[],start:Date.now(),done:false};qIndex=0;submitted=null;picked=[];pendingFree='';view='practice';render();window.scrollTo(0,0);}
function record(score,raw,manual=false,ungraded=false){let q=session.queue[qIndex];let event={id:q.refId,type:q.type,level:q.level,prompt:q.prompt,answer:String(raw||''),expected:q.answer,score,manual,ungraded,date:new Date().toISOString(),session:session.id};event.uid='DT-'+(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));let idx=state.events.length;state.events.push(event);addKnowledgeEvent(state.knowledge,event);session.results.push({...event,eventIndex:idx});if(score!==null)updateReview(q,score);save();return event;}
function updateReview(q,score,previous=null){let key=q.refId+'|'+q.type,r=previous||state.reviews[key]||{seen:false,attempts:0,correct:0,streak:0};let streak=score===2?(r.streak||0)+1:0;let interval=score===2?[1,3,7,14,30,60][Math.min(streak-1,5)]:score===1?0.25:0;state.reviews[key]={seen:true,score,streak,attempts:(r.attempts||0)+1,correct:(r.correct||0)+(score===2?1:0),last:now(),due:now()+interval*DAY};}
function submit(raw){if(submitted||typeof raw!=='string'||!raw.trim())return;let q=session.queue[qIndex];const isOpen=q.kind==='free'||q.kind==='dialog';const score=isOpen?(normal(raw,'de')===normal(q.answer,'de')?2:null):grade(q,raw);const ungraded=score===null;record(score,raw,false,ungraded);submitted={score,raw,ungraded};render();}
function skip(){if(submitted){next();return;}record(null,'');next();}
function next(){if(!submitted&&session.results.length<=qIndex)return;if(qIndex+1>=session.queue.length){session.done=true;state.sessions.push({id:session.id,date:new Date().toISOString(),level:session.level,n:session.results.length,correct:session.results.filter(x=>x.score===2).length,partial:session.results.filter(x=>x.score===1).length,skipped:session.results.filter(x=>x.score===null&&!x.ungraded).length,duration:Math.round((now()-session.start)/1000)});save();render();window.scrollTo(0,0);return;}qIndex++;submitted=null;pendingFree='';picked=[];tokenList=[];render();}
function speak(s,rate=.85){if(!speechAvailable()){toast('Sintesi vocale non disponibile su questo browser.');return;}try{speechSynthesis.cancel();let u=new SpeechSynthesisUtterance(s);u.lang='de-DE';let voices=speechSynthesis.getVoices().filter(v=>v.lang.toLowerCase().startsWith('de'));if(voices.length)u.voice=voices[0];u.rate=rate;u.onerror=()=>toast('Voce tedesca non disponibile: controlla le impostazioni vocali del dispositivo.');speechSynthesis.speak(u);}catch(e){toast('Impossibile avviare l’audio.')}}
function bar(v){return `<div class="bar"><i style="width:${Math.max(0,Math.min(100,v))}%"></i></div>`}function intro(k,h,p){return `<div class="intro"><div class="eyebrow">${esc(k)}</div><h1>${esc(h)}</h1><p class="muted">${esc(p)}</p></div>`}function statsCard(n,l){return `<div class="card"><div class="big">${esc(n)}</div><div class="statlabel">${esc(l)}</div></div>`}function metric(n,a,b,txt){return `<div class="metric"><div class="row spread"><strong>${esc(n)}</strong><span class="muted">${fmt(a)} / ${fmt(b)} · ${pct(a,b)}%</span></div>${bar(pct(a,b))}${txt?`<small>${esc(txt)}</small>`:''}</div>`}
function selectBox(name,arr,value){return `<select id="${name}">${arr.map(([v,l])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(l)}</option>`).join('')}</select>`}
function home(){let ls=state.prefs.level,events=appGradedEvents(),day=todayKey(new Date().toISOString()),today=events.filter(e=>todayKey(e.date)===day),correct=events.filter(e=>e.score===2).length,summary=knowledgeStats(),known=summary.rows.reduce((n,r)=>n+r.known,0),consolidated=summary.rows.reduce((n,r)=>n+r.consolidated,0),learning=summary.rows.reduce((n,r)=>n+r.learning,0);return `${intro('Il tuo percorso','Deutsch Trainer','Allenamento personale, dal vocabolario alla produzione spontanea.')}<div class="hero"><div><div class="eyebrow">Percorso attuale · ${esc(ls)}</div><h2>Nuove parole, ogni giorno.</h2><p class="muted">Nessun livello bloccato. Sessioni finite, ripasso separato e risultati salvati sul dispositivo.</p></div><button class="primary" data-action="study">Inizia allenamento</button></div><div class="grid stats">${statsCard(fmt(known),'Parole conosciute nell’app')}${statsCard(fmt(consolidated),'Consolidate con 10 verifiche')}${statsCard(fmt(events.length),'Risposte valutate nell’app')}${statsCard(events.length?pct(correct,events.length)+'%':'—','Accuratezza nell’app')}</div>${progressPanel()}<div class="layout"><section class="card"><h2>Apprendimento nell’app</h2>${metric("Parole in studio",learning,summary.rows.reduce((n,r)=>n+r.total,0),"Escluse le voci non ancora scoperte")}<p class="muted">Le traduzioni personali del foglio Google non influenzano questi dati. Dopo 10 verifiche corrette successive allo stato «Conosciuta», il termine viene consolidato nel registro separato dell’app.</p><button class="secondary" data-action="newwords">Scopri nuove parole</button></section><section class="card"><h2>Allenamento nell’app</h2><div class="row spread"><div><div class="big">${today.length}</div><small>Risposte di oggi</small></div><div><div class="big">${events.length?pct(correct,events.length)+'%':'—'}</div><small>Accuratezza locale</small></div></div><div class="divider"></div><div class="metric"><div class="row spread"><strong>Obiettivo giornaliero</strong><span>${state.prefs.daily} min</span></div><small>Tempo registrato nelle sessioni completate oggi: ${Math.round(state.sessions.filter(s=>s.date.startsWith(day)).reduce((a,s)=>a+s.duration,0)/60)} min.</small></div><button class="secondary" data-action="history">Apri statistiche</button></section></div><p class="footer">A1–B1: voci dal tuo Google Sheet, comprese le liste Goethe. B2–C2: esercizi originali orientati alle abilità d'esame, non liste ufficiali complete. Le voci B1 senza soluzione italiana restano disponibili per articoli, plurali e dettato. Il risultato di un esercizio non è una certificazione QCER.</p>`}
function reading2CTA(){return '<section class="card"><h2>Lettura e comprensione II</h2><p>Leggi testi originali graduati o estratti da opere di pubblico dominio, senza trame riciclate fra i livelli. Traduzione DE→IT e IT→DE in segmenti di massimo 200 parole. Il punteggio automatico misura la corrispondenza lessicale, non l’intera correttezza della traduzione.</p><button class="primary" data-action="reading2">Apri Lettura e comprensione II</button></section>'}
function study(){let l=state.prefs.level,counts=currentWords().length,advanced=LEVELS.indexOf(l)>=2;let grammarCount=BANK.filter(b=>b.level===l).length;return `${intro('Allenamento','Prepara una sessione','Scegli il livello e gli esercizi. Le domande già riuscite non possono bloccare i nuovi contenuti.')}${reading2CTA()}<section class="card"><h2>Nuove parole</h2><p>Classifica il lessico che conosci e quello che stai studiando, con quattro scelte a ogni domanda.</p><button class="primary" data-action="newwords">Apri Nuove parole</button><div class="divider"></div><label class="label" for="unlock-all"><input id="unlock-all" type="checkbox" ${state.prefs.unlockAll?'checked':''}> Sblocca tutti i vocaboli</label><p class="muted">${state.prefs.unlockAll?'Tutte le voci disponibili negli esercizi.':'Solo parole conosciute e in apprendimento, esclusa Lettura II.'}</p></section>${progressPanel()}<div class="layout"><section class="card"><div class="label">Livello</div><div class="level-select">${LEVELS.map(x=>`<button class="chip ${l===x?'active':''}" data-level="${x}">${x}</button>`).join('')}</div>${advanced?'<div class="notice warn">B1–C2 contengono al momento campioni di pratica, non una copertura completa del Goethe.</div>':''}<div class="divider"></div><div class="controls"><div><label class="label" for="mode">Progressione</label>${selectBox('mode',[['mix','Misto'],['newWord','Solo parole nuove'],['new','Nuovi esercizi'],['review','Ripassi in scadenza'],['errors','Solo errori e parziali']],state.prefs.mode)}</div><div><label class="label" for="count">Esercizi per sessione</label>${selectBox('count',[[5,'5'],[10,'10'],[20,'20'],[30,'30'],[50,'50']],state.prefs.count)}</div><div><label class="label" for="scope">Livelli inclusi</label>${selectBox('scope',[['level','Solo '+l],['through','Da A1 fino a '+l]],state.prefs.scope)}</div><div><label class="label" for="daily">Obiettivo giornaliero</label>${selectBox('daily',[[15,'15 min'],[30,'30 min'],[45,'45 min'],[60,'60 min'],[90,'90 min']],state.prefs.daily)}</div></div><h2>Tipi di esercizio</h2><div class="row"><button class="plain" data-preset="balanced">Equilibrato</button><button class="plain" data-preset="vocab">Lessico</button><button class="plain" data-preset="gram">Grammatica</button><button class="plain" data-preset="all">Tutti</button></div><div class="modulegrid">${Object.entries(TYPES).filter(([k])=>k!=='reading2').map(([k,[title,desc]])=>`<label class="module ${state.prefs.types.includes(k)?'selected':''}"><input type="checkbox" data-type="${k}" ${state.prefs.types.includes(k)?'checked':''} ${k==='listen'&&!speechAvailable()?'disabled':''}><span><strong>${esc(title)}</strong><small>${esc(desc)}</small></span></label>`).join('')}</div><button class="primary" data-action="begin" ${!state.prefs.types.length?'disabled':''}>Avvia sessione</button></section><section class="card"><h2>Disponibilità</h2><div class="big">${fmt(counts)}</div><small>Voci del vocabolario nel filtro selezionato</small><div class="divider"></div><div class="big">${grammarCount}</div><small>Esercizi strutturati e aperti del livello ${l}</small><div class="notice">Una parola può apparire al massimo una volta per sessione, indipendentemente dal tipo di esercizio. Il ripasso è indipendente per competenza. Se gli esercizi disponibili sono meno del numero richiesto, la sessione sarà più corta.</div><p class="muted">Scegli «Solo parole nuove» per allenare voci senza tua traduzione nel foglio e non ancora valutate nell’app. «Nuovi esercizi» esclude invece le competenze già verificate. Le vecchie valutazioni del foglio non influiscono sui ripassi: vengono utilizzate soltanto le risposte dell’app passiva.</p></section></div>`}
function practice(){if(!session)return study();if(session.done){let res=session.results,graded=res.filter(x=>x.score!==null),ok=graded.filter(x=>x.score===2).length,partial=graded.filter(x=>x.score===1).length,wrong=graded.filter(x=>x.score===0).length,skipped=res.filter(x=>x.score===null&&!x.ungraded).length,ungraded=res.filter(x=>x.ungraded).length;return `<div class="practice">${intro('Sessione completata','Risultati',`${session.level} · ${res.length} esercizi · ${Math.max(1,Math.round((now()-session.start)/60000))} min`)}<div class="grid stats">${statsCard(ok,'Corrette')}${statsCard(partial,'Parziali')}${statsCard(wrong,'Errate')}</div><div class="card"><h2>Accuratezza: ${graded.length?pct(ok,graded.length)+'%':'—'}</h2><p class="muted">${skipped} saltate · ${ungraded} non valutate · solo le risposte valutate entrano nell’accuratezza.</p>${bar(pct(ok,graded.length))}<div class="divider"></div><div class="row"><button class="primary" data-action="again">Nuova sessione</button><button class="secondary" data-action="study">Cambia impostazioni</button></div></div><div class="card"><h2>Riepilogo</h2>${res.map(r=>`<div class="result-entry"><div class="row spread"><strong>${esc(label(r.type))}</strong>${statusTag(scoreText(r.score,r.ungraded))}</div><p>${esc(r.prompt)}</p><p class="muted">Tua risposta: ${esc(r.answer||'—')} · Riferimento: ${esc(r.expected)}</p></div>`).join('')}</div></div>`;}
let q=session.queue[qIndex];let html=`<div class="practice"><div class="row spread"><button class="plain" data-action="study">← Allenamento</button><span class="step">${qIndex+1} / ${session.queue.length} · ${esc(q.level)} · ${esc(q.topic)}</span></div>${bar(100*qIndex/session.queue.length)}<section class="card" style="margin-top:20px"><div class="eyebrow">${esc(label(q.type))}</div>${q.passage?`<div class="passage" lang="de">${esc(q.passage)}</div>`:''}<div class="question" lang="${q.language==='it'?'de':q.type==='itde'?'it':'de'}">${esc(q.prompt)}</div>${q.hint?`<p class="muted">${esc(q.hint)}</p>`:''}`;
if(q.audio)html+=`<div class="row" style="margin-bottom:16px"><button class="secondary" data-action="audio">Ascolta</button><button class="secondary" data-action="slow">Più lentamente</button></div>`;
if(q.kind==='choice'||q.kind==='reading'){html+=`<div class="answergrid">${q.options.map((o,i)=>`<button class="answer ${submitted?(o===q.answer?'good':o===submitted.raw?'wrong':''):''}" ${submitted?'disabled':''} data-choice="${i}">${esc(o)}</button>`).join('')}</div>`;}
else if(q.kind==='order'){if(!tokenList.length)tokenList=shuffle(q.answer.split(' ').map((t,i)=>({t,i})));html+=`<div class="tokenarea">${picked.length?`<div class="tokens">${picked.map((i,j)=>`<button class="token" data-unpick="${j}" ${submitted?'disabled':''}>${esc(tokenList[i].t)}</button>`).join('')}</div>`:'<small>Seleziona le parole qui sotto.</small>'}</div><div class="tokens">${tokenList.map((t,i)=>`<button class="token" data-pick="${i}" ${picked.includes(i)||submitted?'disabled':''}>${esc(t.t)}</button>`).join('')}</div><button class="secondary" data-action="check-order" ${picked.length!==tokenList.length||submitted?'disabled':''}>Verifica frase</button>`;}
else if(!submitted){html+=`<form id="answer-form"><label class="label" for="answer-input">La tua risposta</label><div class="answerline">${q.kind==='free'||q.kind==='dialog'?'<textarea id="answer-input" required placeholder="Scrivi la tua risposta in tedesco…" autocomplete="off" spellcheck="false"></textarea>':'<input id="answer-input" type="text" required placeholder="Scrivi qui…" autocomplete="off" autocapitalize="off" spellcheck="false">'}<button class="primary" type="submit">Verifica</button></div></form>`;if(q.language==='de'||q.kind==='free'||q.kind==='dialog')html+=`<div class="row" id="special">${['ä','ö','ü','ß','Ä','Ö','Ü'].map(x=>`<button class="chip" data-char="${x}">${x}</button>`).join('')}</div>`;}
if(submitted){html+=`<div class="feedback ${submitted.score===0?'bad':''}"><h3>${scoreText(submitted.score,submitted.ungraded)}</h3><p><strong>La tua risposta:</strong> ${esc(submitted.raw)}</p>${q.type==='itde'&&submitted.score===1&&/^sich\s+/i.test(q.answer)&&normal(submitted.raw,'de')===normal(q.answer,'de').replace(/^sich\s+/,'')?'<p class="muted">Hai riconosciuto il verbo corretto, ma manca il pronome riflessivo sich: la risposta è parzialmente corretta.</p>':''}<p><strong>${q.kind==='free'||q.kind==='dialog'?'Esempio possibile':'Soluzione'}:</strong> ${esc(q.answer)}</p>${q.explanation&&(!q.word||['article','plural','listen'].includes(q.type))?`<p>${esc(q.explanation)}</p>`:''}${q.word&&relevantWordNote(q,submitted)?`<p class="muted">${esc(relevantWordNote(q,submitted))}</p>`:''}${q.acceptedAnswers?.length?`<p class="muted"><strong>Alternative accettate:</strong> ${esc(q.acceptedAnswers.join(' / '))}</p>`:''}${q.reverseAmbiguity?`<p class="muted">${esc(q.reverseAmbiguity)}</p>`:''}${q.type==='itde'&&submitted.ungraded&&q.uncertainAnswers?.some(x=>normal(x,'de')===normal(submitted.raw,'de')||normal(x,'de').replace(/^(der|die|das) /,'')===normal(submitted.raw,'de'))?`<p class="muted">La tua risposta è presente nel vocabolario con lo stesso significato italiano, ma la sostituibilità non è stata ancora confermata: nessun punto perso e nessun voto assegnato. Per distinguere le due parole serve una frase di contesto.</p>`:''}${submitted.ungraded?'<p class="muted">Risposta non valutata automaticamente: può richiedere una distinzione di significato o un correttore linguistico più avanzato. Non altera il tuo punteggio.</p>':submitted.score!==2?'<p class="muted">Controllo automatico basato sulle traduzioni disponibili: possono esistere altre soluzioni valide.</p>':''}<div class="row" style="margin-top:12px"><button class="primary" data-action="next">${qIndex+1===session.queue.length?'Risultati':'Continua'}</button></div></div>`;}
html+=`<div class="divider"></div><div class="row spread"><button class="plain" data-action="skip">${submitted?'Avanti':'Salta esercizio'}</button>${q.word&&!q.audio&&submitted?'<button class="secondary" data-speak="'+esc(q.word.de)+'">Pronuncia</button>':''}</div></section><p class="footer">La sessione non ripete lo stesso ID. I ripassi vengono riprogrammati per le sessioni future.</p></div>`;return html;}
function catalogue(){let ww=getWords(),query=catFilter.q.toLowerCase().trim();ww=ww.filter(w=>(catFilter.level==='all'||w.level===catFilter.level)&&(catFilter.status==='all'||w.status===catFilter.status)&&(catFilter.source==='all'||(catFilter.source==='new'?!w.user:w.lists?.includes(catFilter.source)))&&(!query||[w.de,w.user,w.ref,w.id].some(x=>String(x||'').toLowerCase().includes(query))));let pages=Math.max(1,Math.ceil(ww.length/40));catPage=Math.min(catPage,pages-1);return `${intro('Database','Vocabolario','Le tue traduzioni, le soluzioni di riferimento e i progressi importati. Le modifiche qui sono locali.')}<section class="card"><div class="controls"><div><label class="label" for="search">Cerca parola o traduzione</label><input type="search" id="search" value="${esc(catFilter.q)}" placeholder="Es. bekommen, affitto"></div><div><label class="label" for="catlevel">Livello indicativo</label>${selectBox('catlevel',[['all','Tutti'],...LEVELS.map(x=>[x,x])],catFilter.level)}</div><div><label class="label" for="catstatus">Stato originale</label>${selectBox('catstatus',[['all','Tutti'],...['Corretta','Parziale','Errata','Da verificare','Consolidata'].map(x=>[x,x])],catFilter.status)}</div><div><label class="label" for="catsource">Lista o traduzione</label>${selectBox('catsource',[['all','Tutte'],['new','Senza tua traduzione'],['Goethe A1','Goethe A1 Fit'],['Goethe Start A1','Goethe Start A1'],['Goethe A2','Goethe A2'],['Goethe B1','Goethe B1']],catFilter.source)}</div></div><div class="row spread"><strong>${fmt(ww.length)} voci</strong><button class="secondary" data-action="add-word">Aggiungi parola</button></div></section><div class="tablebox" style="margin-top:14px"><table><thead><tr><th>Parola</th><th>Livello</th><th>Tua traduzione</th><th>Riferimento</th><th>Stato storico</th><th></th></tr></thead><tbody>${ww.slice(catPage*40,catPage*40+40).map(w=>`<tr><td><b lang="de">${esc(w.de)}</b><small>${esc(w.id)}</small></td><td>${esc(w.level)}</td><td>${esc(w.user||'—')}</td><td>${esc(w.ref)}</td><td>${statusTag(w.status)}</td><td><button class="plain" data-edit="${esc(w.id)}">Apri</button></td></tr>`).join('')}</tbody></table>${!ww.length?'<div class="empty">Nessuna voce trovata.</div>':''}</div><div class="row spread" style="margin-top:14px"><button class="secondary" data-action="cat-prev" ${catPage===0?'disabled':''}>Precedente</button><small>Pagina ${catPage+1} di ${pages}</small><button class="secondary" data-action="cat-next" ${catPage+1>=pages?'disabled':''}>Successiva</button></div>`}
function history(){let events=appGradedEvents(),groups=Object.keys(TYPES).map(type=>({type,items:events.filter(x=>x.type===type)})),rows=state.events.slice().reverse(),summary=knowledgeStats(),known=summary.rows.reduce((n,r)=>n+r.known,0),consolidated=summary.rows.reduce((n,r)=>n+r.consolidated,0),pages=Math.max(1,Math.ceil(rows.length/40));historyPage=Math.min(historyPage,pages-1);let map=wordMap();return `${intro('Monitoraggio','Statistiche e storico','I dati precedenti restano distinti; i nuovi risultati vengono sincronizzati con Google Sheets soltanto dopo il collegamento volontario.')}<div class="grid stats">${statsCard(fmt(events.length),'Risposte locali valutate')}${statsCard(events.length?pct(events.filter(x=>x.score===2).length,events.length)+'%':'—','Corrette in locale')}${statsCard(fmt(known),'Parole conosciute')}${statsCard(fmt(consolidated),'Consolidate dopo 10 verifiche')}</div>${progressPanel()}<div class="layout"><section class="card"><h2>Competenze nell’app</h2>${groups.filter(x=>x.items.length).map(({type,items})=>metric(label(type),items.filter(x=>x.score===2).length,items.length,'Valutazione automatica')).join('')||'<p class="muted">Completa una sessione per visualizzare i risultati.</p>'}</section><section class="card"><h2>Dati separati</h2><p>Le traduzioni personali originarie restano sul Google Sheet, senza entrare nelle statistiche di Deutsch Trainer.</p><p class="muted">La classificazione, i ripassi e le nuove verifiche dell’app vengono registrati separatamente.</p></section></div><div class="row spread" style="margin:20px 0 12px"><h2 style="margin:0">Registro risposte</h2></div><div class="tablebox"><table><thead><tr><th>Data</th><th>Esercizio</th><th>Risposta</th><th>Esito</th></tr></thead><tbody>${rows.slice(historyPage*40,historyPage*40+40).map(r=>`<tr><td>${esc(r.date.slice(0,10))}</td><td>${esc(map.get(r.id)?.de||r.prompt)}<small>${esc(label(r.type))}</small></td><td>${r.type==="newwords"&&r.answer==="__KNOWN__"?"La conosco già":esc(r.answer||"—")}<small>Rif.: ${esc(r.expected||"")}</small></td><td>${r.type==="newwords"?statusTag(r.answer==="__KNOWN__"?"Conosciuta":r.score===2?"In apprendimento":"Da imparare"):r.type==="reading2"&&Number.isFinite(Number(r.percent))?`<span class="status">${esc(r.percent)}%</span>`:statusTag(scoreText(r.score,r.ungraded))}</td></tr>`).join("")}</tbody></table>${!rows.length?'<div class="empty">Ancora nessuna risposta locale.</div>':''}</div><div class="row spread" style="margin-top:13px"><button class="secondary" data-action="hist-prev" ${historyPage===0?'disabled':''}>Precedente</button><small>Pagina ${historyPage+1} di ${pages}</small><button class="secondary" data-action="hist-next" ${historyPage+1>=pages?'disabled':''}>Successiva</button></div>`}
function settings(){return `${window.DTSync?.settingsPanel?.()||''}${intro('Dati e privacy','Impostazioni','Funziona offline senza account; la sincronizzazione con Google Sheets è opzionale e richiede autorizzazione.')}<div class="layout"><section class="card"><h2>Backup e trasferimento</h2><p>Esporta regolarmente i progressi locali. Il backup comprende tutte le sessioni, le valutazioni, le modifiche e le parole aggiunte.</p><div class="row"><button class="primary" data-action="backup">Esporta backup JSON</button><button class="secondary" data-action="restore">Importa backup JSON</button><input class="hidden" type="file" id="restore-file" accept=".json,application/json"></div><div class="divider"></div><h3>Esportazione per Google Sheets</h3><p class="muted">Il CSV contiene le risposte nuove dell’app, con gli ID originali. Puoi importarlo manualmente. Quando colleghi Google Sheets, il programma sincronizza direttamente le risposte. Il CSV rimane disponibile come esportazione alternativa.</p><button class="secondary" data-action="export-csv">Esporta verifiche CSV</button></section><section class="card"><h2>Origine dei dati</h2><p>${fmt(DATA.sourceCount)} voci e ${fmt(DATA.history.length)} verifiche esportate dal tuo Google Sheet. Le nuove voci B1 senza traduzione non vengono presentate in esercizi DE–IT o IT–DE finché non hanno un riferimento italiano. Le poche traduzioni integrate manualmente sono revisionabili dal catalogo.</p><p class="muted">Le risposte pregresse sono conservate esattamente. I risultati storici non sostituiscono la verifica attiva. Le traduzioni aggiuntive non sono tutte verificate da un dizionario esterno. Le tue vecchie risposte sbagliate non vengono mostrate nel feedback degli esercizi.</p><div class="notice ${storageOK?'':'warn'}">${storageOK?'Salvataggio locale disponibile.':'Salvataggio locale non disponibile in questo browser. Esporta subito un backup.'}</div><div class="divider"></div><p class="muted">Puoi azzerare i risultati delle prove sia sul PC sia sul telefono. I tentativi precedenti rimangono archiviati nel foglio, ma non vengono più conteggiati nelle statistiche dell’app. Le 926 verifiche iniziali restano intatte. Prima dell’azzeramento viene scaricato un backup.</p><button class="danger" data-cloud="reset-shared">Azzera risultati e statistiche su tutti i dispositivi</button></section></div><section class="card"><h2>Installazione e voce</h2><p>Apri questo file HTML anche offline da PC. Per installare l’app su Android o usarla come PWA, usa il pacchetto del progetto tramite una pagina ospitata in HTTPS oppure localhost sul dispositivo. La voce tedesca usa la sintesi vocale del browser/dispositivo: una voce offline installata è necessaria per il dettato senza rete.</p><button class="secondary" data-speak="Guten Tag! Ich lerne Deutsch.">Prova voce tedesca</button></section>`}
function render(){if(!['home','study','newwords','practice','catalogue','history','settings','reading2'].includes(view))view='home';let homeNav=['practice','newwords'].includes(view)?'study':view;document.querySelectorAll('nav button').forEach(btn=>btn.classList.toggle('active',btn.dataset.action===homeNav));$('#main').innerHTML=(view==='reading2'?(window.DTReading2?.render?.()||'<div class="notice warn">Modulo di lettura non caricato.</div>'):({home,study,newwords:newWords,practice,catalogue,history,settings}[view])());if(!storageOK)$('#main').insertAdjacentHTML('afterbegin','<div class="notice warn">Il browser non consente il salvataggio locale: salva il backup JSON prima di chiudere l’app.</div>');if(view==='practice'&&!submitted&&!session?.done){let f=$('#answer-input');if(f&&window.matchMedia('(min-width: 780px)').matches)f.focus();}}
function editWord(id){let w=id?wordMap().get(id):null;if(id&&!w)return;let html=`<div class="modal" id="modal"><div class="card"><div class="row spread"><h2>${w?esc(w.de):'Nuova parola'}</h2><button class="plain" data-action="close-modal">Chiudi</button></div><form id="edit-form" data-id="${esc(id||'')}">${w?`<p><small>${esc(w.id)} · ${esc(w.level)} · ${esc(w.origin)}</small></p><p>Tua traduzione originale: <strong>${esc(w.user||'—')}</strong><br>Valutazione: ${statusTag(w.status)}</p>`:`<label class="label" for="word-de">Tedesco</label><input id="word-de" required type="text"><label class="label" for="word-level" style="margin-top:10px">Livello</label>${selectBox('word-level',LEVELS.map(l=>[l,l]),state.prefs.level)}`}<label class="label" for="ref-edit">Traduzioni accettate (separate da ;)</label><textarea id="ref-edit" required>${esc(w?.ref||'')}</textarea><label class="label" for="plural-edit">Plurale (facoltativo)</label><input id="plural-edit" type="text" value="${esc(w?.forms||'')}"><label class="label" for="note-edit" style="margin-top:10px">Nota / spiegazione</label><textarea id="note-edit">${esc(w?.note||'')}</textarea>${w?`<div class="divider"></div><small>Competenze locali: ${Object.keys(TYPES).map(t=>{let r=localScore(w.id,t);return r?label(t)+': '+scoreText(r.score):null;}).filter(Boolean).join(' · ')||'Non ancora verificate nell’app'}</small>`:''}<div class="row" style="margin-top:12px"><button type="submit" class="primary">Salva localmente</button>${w?`<button type="button" class="secondary" data-speak="${esc(w.de)}">Pronuncia</button>`:''}</div></form></div></div>`;$('#overlay').innerHTML=html;}
function download(name,body,mime){let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([body],{type:mime}));a.download=name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)}
function csvQuote(v){let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
function applySharedReset(epoch,uid){if(!uid||state.resetUid===uid)return;const when=Date.parse(epoch);if(!Number.isFinite(when))return;state.events=state.events.filter(e=>e.type==='newwords'||(Date.parse(e.date)||0)>when);state.sessions=state.sessions.filter(s=>(Date.parse(s.date)||0)>when);if(state.reading2)state.reading2.active=null;state.reviews={};rebuildKnowledge();for(const e of state.events.slice().sort((a,b)=>Date.parse(a.date)-Date.parse(b.date))){if(e.score===null||e.type==='newwords')continue;const key=e.id+'|'+e.type,old=state.reviews[key]||{seen:false,attempts:0,correct:0,streak:0},streak=e.score===2?(old.streak||0)+1:0,time=Date.parse(e.date)||Date.now(),interval=e.score===2?[1,3,7,14,30,60][Math.min(streak-1,5)]:e.score===1?.25:0;state.reviews[key]={seen:true,score:e.score,streak,attempts:(old.attempts||0)+1,correct:(old.correct||0)+(e.score===2?1:0),last:time,due:time+interval*DAY};}state.resetUid=uid;session=null;submitted=null;picked=[];pendingFree='';localStorage.setItem(KEY,JSON.stringify(state));view='settings';render();toast('Risultati azzerati sui dispositivi sincronizzati.');}
window.DTApp={applySharedReset,rebuildKnowledge,exportBeforeReset:()=>download('DeutschTrainer-backup-prima-reset-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(state,null,2),'application/json')};
const actions={home:()=>setView('home'),study:()=>setView('study'),newwords:()=>{newWordCard=null;setView('newwords')},'discovery-known':discoveryKnown,'discovery-next':discoveryNext,reading2:()=>setView('reading2'),catalogue:()=>setView('catalogue'),history:()=>setView('history'),settings:()=>setView('settings'),begin,again:begin,next,skip,'check-order':()=>submit(picked.map(i=>tokenList[i].t).join(' ')),audio:()=>speak(session.queue[qIndex].audio),slow:()=>speak(session.queue[qIndex].audio,.62),'cat-prev':()=>{catPage--;render()},'cat-next':()=>{catPage++;render()},'hist-prev':()=>{historyPage--;render()},'hist-next':()=>{historyPage++;render()},'add-word':()=>editWord(null),'close-modal':()=>{$('#overlay').innerHTML=''},backup:()=>download('DeutschTrainer-backup-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(state,null,2),'application/json'),restore:()=>$('#restore-file').click(),'export-csv':()=>{let lines=[['Sessione','Data','ID parola o esercizio','Tipo','Livello','Domanda','Risposta','Riferimento','Esito 0–2','Metodo valutazione'],...state.events.map(e=>[e.session,e.date,e.id,e.type,e.level,e.prompt,e.answer,e.expected,e.score,e.manual?'Storica manuale':e.ungraded?'Non valutata':'Automatica'])];download('DeutschTrainer-verifiche.csv','\ufeff'+lines.map(r=>r.map(csvQuote).join(';')).join('\r\n'),'text/csv;charset=utf-8')},reset:()=>toast('Per azzerare le verifiche condivise usa il pulsante nelle impostazioni Google Sheets.')};
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;const d=b.dataset;if(d.action&&actions[d.action]){e.preventDefault();actions[d.action]();return;}if(d.newLevel){state.prefs.discoveryLevel=d.newLevel;newWordCard=null;save();render();return;}if(d.newDir){state.prefs.discoveryDirection=d.newDir;newWordCard=null;save();render();return;}if(d.newPick!==undefined){discoveryPick(Number(d.newPick));return;}if(d.level){state.prefs.level=d.level;save();render();return;}if(d.preset){state.prefs.types=d.preset==='all'?Object.keys(TYPES).filter(t=>t!=='reading2'&&(t!=='listen'||speechAvailable())):d.preset==='balanced'?['deit','itde','grammar','order']:d.preset==='vocab'?['deit','itde','choice','article','plural']:['grammar','order','reading','free','dialog'];save();render();return;}if(d.choice!==undefined){submit(session.queue[qIndex].options[Number(d.choice)]);return;}if(d.pick!==undefined){picked.push(Number(d.pick));render();return;}if(d.unpick!==undefined){picked.splice(Number(d.unpick),1);render();return;}if(d.char){let input=$('#answer-input');if(input){let start=input.selectionStart,end=input.selectionEnd;input.setRangeText(d.char,start,end,'end');input.focus();}return;}if(d.edit){editWord(d.edit);return;}if(d.speak){speak(d.speak);return;}if(d.history){historyMode=d.history;historyPage=0;render();}});
document.addEventListener('change',async e=>{let el=e.target,id=el.id;if(id==='unlock-all'){state.prefs.unlockAll=el.checked;save();render();return;}if(el.dataset.type){let t=el.dataset.type;state.prefs.types=el.checked?unique([...state.prefs.types,t]):state.prefs.types.filter(x=>x!==t);save();render();return;}if(['mode','count','scope','daily'].includes(id)){state.prefs[id]=['count','daily'].includes(id)?Number(el.value):el.value;save();render();return;}if(['catlevel','catstatus','catsource'].includes(id)){catFilter[{catlevel:'level',catstatus:'status',catsource:'source'}[id]]=el.value;catPage=0;render();return;}if(id==='restore-file'&&el.files.length){try{let data=JSON.parse(await el.files[0].text());if(!valid(data))throw Error('Formato non compatibile');if(!confirm('Sostituire le statistiche locali con il backup?'))return;state={...DEFAULT(),...data,knowledge:data.knowledge&&typeof data.knowledge==='object'?data.knowledge:{},prefs:{...DEFAULT().prefs,...data.prefs}};rebuildKnowledge();save();render();toast('Backup importato.')}catch(x){toast('Importazione non riuscita: '+x.message);}}});
let searchTimer;document.addEventListener('input',e=>{if(e.target.id==='search'){catFilter.q=e.target.value;catPage=0;clearTimeout(searchTimer);searchTimer=setTimeout(()=>{let pos=$('#search')?.selectionStart;render();let s=$('#search');if(s){s.focus();try{s.setSelectionRange(pos,pos)}catch{}}},250);}});
document.addEventListener('submit',e=>{if(e.target.id==='answer-form'){e.preventDefault();submit($('#answer-input').value);return;}if(e.target.id==='edit-form'){e.preventDefault();let id=e.target.dataset.id,ref=$('#ref-edit').value.trim(),forms=$('#plural-edit').value.trim(),note=$('#note-edit').value.trim();if(!ref)return;if(id){state.edits[id]={ref,forms,note,referenceSource:'Riferimento revisionato localmente'};}else{let de=$('#word-de').value.trim();if(!de)return;state.custom.push({id:'LOCAL-'+Date.now(),level:$('#word-level').value,de,ref,forms,note,user:'',status:'Da verificare',origin:'Aggiunta locale',lists:[],referenceSource:'Riferimento inserito localmente'});}save();$('#overlay').innerHTML='';render();toast('Voce salvata localmente.');}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#modal'))$('#overlay').innerHTML='';if(e.key==='Enter'&&view==='practice'&&submitted&&!submitted.free&&e.target.tagName!=='BUTTON'){e.preventDefault();next();}});save();render();
