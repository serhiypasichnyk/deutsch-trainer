/* Deutsch Trainer — Lettura e comprensione II.
   Scores are objective token overlap with an editorial reference, NOT semantic AI assessment. */
(()=>{'use strict';
const ALL=window.DT_READING2_BANK||[];
const NIV=['A1','A2','B1','B2','C1','C2'];
const defaultCfg=()=>({level:'A2',dir:'deit',story:'',active:null,seen:[]});
if(!state.reading2||typeof state.reading2!=='object')state.reading2=defaultCfg();
const cfg=()=>{if(!Array.isArray(state.reading2.seen))state.reading2.seen=[];return state.reading2;};
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tokens=s=>((String(s||'').toLocaleLowerCase().normalize('NFKC').replace(/ß/g,'ss').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').match(/[\p{L}\p{N}]+/gu))||[]).filter(Boolean);
const wordN=s=>(String(s||'').trim().match(/[\p{L}\p{N}]+/gu)||[]).length;
function segmentStory(story,dir){
 const si=dir==='itde'?1:0,ti=1-si,out=[];let current=[],countS=0,countT=0;
 for(const pair of story.pairs){const sn=wordN(pair[si]),tn=wordN(pair[ti]);if(sn>200||tn>200)throw Error('Paragrafo troppo lungo');if(current.length&&(countS+sn>200||countT+tn>200)){out.push(current);current=[];countS=0;countT=0;}current.push(pair);countS+=sn;countT+=tn;}
 if(current.length)out.push(current);
 return out.map((pairs,i)=>({index:i,source:pairs.map(p=>p[si]).join('\n\n'),target:pairs.map(p=>p[ti]).join('\n\n')}));
}
/* Context-aware lexical comparator: replaces only manually approved equivalences.
   This is NOT a semantic/grammatical correction engine. */
function normalizedText(s,lang){
 let t=String(s||'').toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
 if(lang==='de')t=t.replace(/ß/g,'ss').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue');
 return (t.match(/[\p{L}\p{N}]+/gu)||[]);
}
const commonEquivalents={
 it:[
  ['che cosa','cosa'],['buongiorno','buon mattino'],['certamente','naturalmente','certo'],
  ['buona giornata','una buona giornata'],['vuole','vorrebbe'],['sacchetto','busta'],
  ['preparano','fanno'],['venire a trovare','venire a visitare'],
  ['sì','si']
 ],
 de:[['du','du']]
};
function replacePhrases(words,equivalents,lang){
 const rules=[];
 for(const group of equivalents||[]){
  if(!Array.isArray(group)||group.length<2)continue;
  const canon=normalizedText(group[0],lang);
  if(!canon.length)continue;
  for(const phrase of group.slice(1)){
   const variant=normalizedText(phrase,lang);
   if(variant.length)rules.push({variant,canon});
  }
 }
 rules.sort((a,b)=>b.variant.length-a.variant.length);
 let changed=0,out=[];
 for(let i=0;i<words.length;){
  const hit=rules.find(r=>r.variant.every((token,j)=>words[i+j]===token));
  if(hit){out.push(...hit.canon);i+=hit.variant.length;changed++;}
  else{out.push(words[i]);i++;}
 }
 return {words:out,changed};
}
function scoreWords(user,reference,language='it',equivalents=[]){
 const origUser=normalizedText(user,language),origRef=normalizedText(reference,language);
 const dictionary=[...(commonEquivalents[language]||[]),...(equivalents||[])];
 const u=replacePhrases(origUser,dictionary,language),ref=replacePhrases(origRef,dictionary,language);
 const have=new Map();for(const w of u.words)have.set(w,(have.get(w)||0)+1);
 let matched=0,missing=[];for(const w of ref.words){if((have.get(w)||0)>0){matched++;have.set(w,have.get(w)-1);}else missing.push(w)}
 const surplus=[...have.entries()].flatMap(([w,n])=>Array.from({length:n},()=>w));
 const maxWords=Math.max(ref.words.length,u.words.length);
 const percent=maxWords?Math.round(100*matched/maxWords):0;
 return {percent,matched,expected:ref.words.length,entered:u.words.length,missing:missing.slice(0,40),surplus:surplus.slice(0,40),adapted:u.changed+ref.changed>0,method:'lexical_equivalents_v2'};
}
const currentStory=()=>ALL.find(x=>x.id===cfg().active?.id);
function selectOptions(stories,selected){return stories.map(x=>`<option value="${e(x.id)}" ${x.id===selected?'selected':''}>${e(x.title)} · ${e(x.genre||'Lettura')} (${x.pairs.map(p=>p[0]).join(' ').trim().split(/\s+/).length} parole DE)</option>`).join('')}
function renderReading2(){
 const st=cfg(),list=ALL.filter(x=>x.level===st.level),active=st.active,story=currentStory();
 let h=`<div class="intro"><div class="eyebrow">Lettura e comprensione II</div><h1>Traduzione di testi completi</h1><p class="muted">${list.length} testi distinti per il livello ${e(st.level)} · ${list.filter(x=>st.seen.includes(x.id)).length} già affrontate. Due direzioni e correzione automatica delle parole. Il punteggio usa il confronto lessicale normalizzato e alcune equivalenze editoriali contestuali. Non è una verifica completa del significato, della grammatica o dello stile.</p></div>`;
 if(!active||!story){
 h+=`<section class="card"><h2>Prepara la lettura</h2><div class="controls"><div><label class="label" for="r2-level">Livello</label><select id="r2-level">${NIV.map(l=>`<option value="${l}" ${st.level===l?'selected':''}>${l}</option>`).join('')}</select></div><div><label class="label" for="r2-dir">Direzione</label><select id="r2-dir"><option value="deit" ${st.dir==='deit'?'selected':''}>DE → IT (scrivi in italiano)</option><option value="itde" ${st.dir==='itde'?'selected':''}>IT → DE (scrivi in tedesco)</option></select></div></div><label class="label" for="r2-story">Testo</label><select id="r2-story" style="width:100%;margin-bottom:16px">${selectOptions(list,st.story&&list.some(x=>x.id===st.story)?st.story:list[0]?.id)}</select><div class="row"><button class="primary" data-r2="start">Inizia il testo</button><button class="secondary" data-r2="random">Testo casuale</button></div></section>`;
 const examples=list.slice(0,9);h+=`<section class="card"><h2>Tipologie e fonti</h2><p class="muted">I temi sono differenti fra i livelli, con testi creati per A1–C1 e brani da opere storiche di pubblico dominio per C2. I testi originali e le traduzioni italiane sono materiali di studio, non prove ufficiali Goethe. Alcuni testi hanno più turni; nessun turno supera le 200 parole.</p><div class="row" style="flex-wrap:wrap">${examples.map(x=>`<span class="chip">${e(x.title)}</span>`).join('')}</div></section>`;
 return h;
 }
 const segments=segmentStory(story,active.dir),results=active.results||[];
 if(active.done){const correct=results.reduce((s,r)=>s+r.matched,0),max=results.reduce((s,r)=>s+Math.max(r.expected,r.entered),0),percent=max?Math.round(100*correct/max):0;
 h+=`<section class="card"><h2>Testo completato: ${e(story.title)}</h2><p class="muted">${e(story.genre||'Lettura')} · ${e(story.sourceType==='public_domain'?'Estratto o adattamento da '+story.sourceName:(story.sourceName||'Testo originale per Deutsch Trainer'))}</p><div class="big">${percent}%</div><p>${correct} parole corrispondenti su ${max} parole considerate; ${segments.length} turni completati.</p><p class="muted">Il valore è una misura del confronto lessicale, non un voto certificato sul significato. Traduzioni sinonimiche o ordini delle parole diversi possono alterare il risultato.</p><div class="row"><button class="primary" data-r2="again">Un altro testo</button><button class="secondary" data-r2="restart">Ricomincia questo testo</button></div></section>`;
 results.forEach((r,i)=>{h+=`<section class="card"><h3>Turno ${i+1}: ${r.percent}%</h3><p class="muted">${r.matched} corrispondenze · riferimento ${r.expected} parole · risposta ${r.entered} parole</p></section>`});return h;
 }
 const index=Math.min(active.step||0,segments.length-1),seg=segments[index],result=active.currentResult;
 h+=`<section class="card"><div class="row spread"><div><div class="eyebrow">${e(st.level)} · ${active.dir==='deit'?'Tedesco → Italiano':'Italiano → Tedesco'}</div><h2>${e(story.title)}</h2><p class="muted">${e(story.genre||'Lettura')} · ${e(story.sourceType==='public_domain'?'Estratto o adattamento da '+story.sourceName:(story.sourceName||'Testo originale per Deutsch Trainer'))}${story.sourceUrl?` · <a href="${e(story.sourceUrl)}" target="_blank" rel="noopener noreferrer">Fonte originale</a>`:''}</p></div><strong>Turno ${index+1}/${segments.length}</strong></div><p class="muted">${wordN(seg.source)} parole da leggere · traduci l’intero segmento nella lingua richiesta. La lunghezza è calibrata sul livello; ogni segmento contiene al massimo 200 parole.</p><div class="passage" style="white-space:pre-line" lang="${active.dir==='deit'?'de':'it'}">${e(seg.source)}</div>`;
 if(!result){h+=`<form id="r2-answer-form"><label for="r2-answer" class="label">La tua traduzione (${active.dir==='deit'?'italiano':'tedesco'})</label><textarea id="r2-answer" rows="12" style="width:100%;min-height:240px;resize:vertical" required placeholder="Traduci tutto il testo. Non è necessario mantenere l’ordine identico, ma il punteggio automatico confronta le singole parole."></textarea><div class="row" style="margin-top:14px"><button type="submit" class="primary">Valuta automaticamente</button><button class="secondary" type="button" data-r2="cancel">Esci dal testo</button></div></form>`}
 else{h+=`<div class="feedback"><div class="eyebrow">Corrispondenza lessicale</div><div class="big">${result.percent}%</div><p>${result.matched} parole riconosciute · ${result.expected} parole nel riferimento · ${result.entered} parole nella risposta.</p><p><strong>La tua risposta</strong></p><div class="passage" style="white-space:pre-line">${e(result.answer)}</div><p><strong>Possibile traduzione di riferimento</strong></p><div class="passage" style="white-space:pre-line">${e(seg.target)}</div><p class="muted">Parole non riconosciute dopo le equivalenze disponibili: ${e(result.missing.join(', ')||'nessuna')}. Il calcolo riconosce solo le varianti approvate: non comprende automaticamente tutte le parafrasi, le negazioni o le concordanze. La percentuale resta una misura lessicale.</p><button class="primary" data-r2="next">${index+1>=segments.length?'Completa testo':'Prossimo turno'}</button></div>`}
 h+=`</section>`;return h;
}
function startWith(id){const story=ALL.find(x=>x.id===id&&x.level===cfg().level);if(!story)return;cfg().active={id:story.id,dir:cfg().dir,step:0,results:[],started:new Date().toISOString()};cfg().story=story.id;if(!cfg().seen.includes(story.id))cfg().seen.push(story.id);save();render();}
function scoreAnswer(answer){const active=cfg().active,story=currentStory();if(!active||!story||active.currentResult||!answer.trim())return;const seg=segmentStory(story,active.dir)[active.step];const result=scoreWords(answer,seg.target,active.dir==='deit'?'it':'de',story.equivalents?.[active.dir==='deit'?'it':'de']||[]);active.currentResult={...result,answer};active.results.push({...result});const stamp=new Date().toISOString();const ev={id:story.id+'-'+active.dir+'-turn'+(active.step+1),type:'reading2',level:story.level,prompt:seg.source,answer,expected:seg.target,score:result.percent>=85?2:result.percent>=55?1:0,percent:result.percent,matched:result.matched,referenceWords:result.expected,enteredWords:result.entered,ungraded:false,manual:false,date:stamp,session:'READ2-'+active.started,uid:'DT-'+(crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2))};state.events.push(ev);save();render();}
function next(){const active=cfg().active,story=currentStory();if(!active?.currentResult||!story)return;const segments=segmentStory(story,active.dir);if(active.step+1>=segments.length){active.done=true;const r=active.results;state.sessions.push({id:'READ2-'+active.started,date:new Date().toISOString(),level:story.level,n:r.length,correct:r.filter(x=>x.percent>=85).length,partial:r.filter(x=>x.percent>=55&&x.percent<85).length,skipped:0,duration:Math.max(1,Math.round((Date.now()-Date.parse(active.started))/1000))});}else{active.step++;active.currentResult=null;}save();render();}
document.addEventListener('click',ev=>{const btn=ev.target.closest('button[data-r2]');if(!btn||btn.disabled)return;ev.preventDefault();const cmd=btn.dataset.r2;const st=cfg();if(cmd==='start'){startWith(document.getElementById('r2-story')?.value||ALL.find(x=>x.level===st.level)?.id)}else if(cmd==='random'){const list=ALL.filter(x=>x.level===st.level),unseen=list.filter(x=>!st.seen.includes(x.id)),pool=unseen.length?unseen:list;if(pool.length)startWith(pool[Math.floor(Math.random()*pool.length)].id)}else if(cmd==='next'){next()}else if(cmd==='cancel'||cmd==='again'){st.active=null;save();render()}else if(cmd==='restart'){startWith(st.active.id)}});
document.addEventListener('change',ev=>{const st=cfg();if(ev.target.id==='r2-level'){st.level=ev.target.value;st.story='';st.active=null;save();render()}else if(ev.target.id==='r2-dir'){st.dir=ev.target.value;save();render()}else if(ev.target.id==='r2-story'){st.story=ev.target.value;save();}});
document.addEventListener('submit',ev=>{if(ev.target.id==='r2-answer-form'){ev.preventDefault();scoreAnswer(document.getElementById('r2-answer')?.value||'')}});
window.DTReading2={render:renderReading2,count:()=>ALL.length,scoreWords,segmentStory};
})();