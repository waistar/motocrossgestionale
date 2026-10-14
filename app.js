'use strict';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { downloadActivityReport } from './report.js?v=34a7873530';
const KEY='motolog-mx-v1';
const configured=SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY.length>25;
const supabase=configured?createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
let currentUser=null, saveQueue=Promise.resolve(), busy=false;
const status=t=>{document.getElementById('syncStatus').textContent=t};
const today=()=>new Date().toLocaleDateString('en-CA');
const uid=()=>globalThis.crypto?.randomUUID?.()||String(Date.now()+Math.random());
const num=v=>Number(v)||0;
const fmt=n=>num(n).toFixed(1);
const dateIT=s=>s?new Date(s+'T12:00:00').toLocaleDateString('it-IT'):'—';
const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const seed=()=>({version:1,bike:{brand:'',model:'',year:'',number:''},baseHours:0,sessions:[],works:[],rules:[{id:uid(),name:'Cambio olio motore',intervalHours:8,intervalDays:null,startHours:0,startDate:today()},{id:uid(),name:'Pulizia filtro aria',intervalHours:3,intervalDays:null,startHours:0,startDate:today()},{id:uid(),name:'Controllo catena e trasmissione',intervalHours:5,intervalDays:null,startHours:0,startDate:today()},{id:uid(),name:'Controllo generale',intervalHours:15,intervalDays:30,startHours:0,startDate:today()}]});
function valid(s){return s&&typeof s==='object'&&s.bike&&typeof s.bike==='object'&&Array.isArray(s.sessions)&&Array.isArray(s.works)&&Array.isArray(s.rules)&&Number.isFinite(Number(s.baseHours))&&s.sessions.length<100000&&s.works.length<100000&&s.rules.length<10000}
let state=seed();
const hours=()=>num(state.baseHours)+state.sessions.reduce((a,s)=>a+num(s.hours),0);
const $=id=>document.getElementById(id);
const save=()=>{
 if(!currentUser){alert('Devi effettuare l’accesso.');return;}
 const payload=structuredClone(state), userId=currentUser.id;render();status('● Sincronizzazione…');
 saveQueue=saveQueue.catch(()=>{}).then(async()=>{
  const {error}=await supabase.from('garage_data').upsert({user_id:userId,data:payload},{onConflict:'user_id'});
  if(error)throw error;
 }).then(()=>{status('● Salvato nel cloud')},e=>{status('⚠ Salvataggio non riuscito');notify('ATTENZIONE: dati non salvati! '+e.message);alert('Salvataggio cloud non riuscito. Non chiudere la pagina: '+e.message);throw e;});
};
function notify(msg){$('toast').textContent=msg;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2600)}
function navigate(page){document.querySelectorAll('.page').forEach(e=>e.classList.toggle('active',e.id==='page-'+page));document.querySelectorAll('[data-page]').forEach(e=>e.classList.toggle('active',e.dataset.page===page));$('breadcrumb').textContent={dashboard:'DASHBOARD',sessions:'CONTAORE',maintenance:'ATTIVITÀ RECENTI',schedule:'SCADENZE',settings:'MOTO E DATI'}[page];window.scrollTo({top:0,behavior:'smooth'})}
function latestWork(id){return state.works.filter(w=>w.ruleId===id).sort((a,b)=>b.date.localeCompare(a.date)||num(b.meter)-num(a.meter))[0]}
function ruleStatus(r){const w=latestWork(r.id);const base=w?num(w.meter):num(r.startHours);const fromDate=w?.date||r.startDate||today();const dueHours=num(r.intervalHours)>0?base+num(r.intervalHours):null;const dueDate=num(r.intervalDays)>0?new Date(new Date(fromDate+'T12:00:00').getTime()+num(r.intervalDays)*86400000).toLocaleDateString('en-CA'):null;const remainH=dueHours===null?null:dueHours-hours();const days=dueDate?Math.ceil((new Date(dueDate+'T12:00:00')-new Date(today()+'T12:00:00'))/86400000):null;const overdue=(remainH!==null&&remainH<=0)||(days!==null&&days<=0);const soon=!overdue&&((remainH!==null&&remainH<=Math.min(2,num(r.intervalHours)*.25))||(days!==null&&days<=3));return {dueHours,dueDate,remainH,days,status:overdue?'due':soon?'soon':'ok',label:overdue?'DA FARE':soon?'IN ARRIVO':'IN REGOLA'} }
function entry(title,sub,badge,cls){return `<div class="entry"><div class="entry-main"><strong>${escapeHTML(title)}</strong><small>${escapeHTML(sub)}</small></div>${badge?`<span class="tag ${cls||''}">${escapeHTML(badge)}</span>`:''}</div>`}
function render(){const h=hours();$('totalHours').textContent=fmt(h);$('sessionsHours').textContent=fmt(h);$('sessionsCount').textContent=state.sessions.length;$('worksCount').textContent=state.works.length;$('bikeName').textContent=[state.bike.brand,state.bike.model].filter(Boolean).join(' ')||'La mia motocross';$('bikeDetails').textContent=[state.bike.year,state.bike.number].filter(Boolean).join(' · ')||'Configura marca, modello e anno';const rs=state.rules.map(r=>({...r,calc:ruleStatus(r)})).sort((a,b)=>({due:0,soon:1,ok:2}[a.calc.status]-{due:0,soon:1,ok:2}[b.calc.status]));$('alertsCount').textContent=rs.filter(r=>r.calc.status!=='ok').length;$('dashSchedule').innerHTML=rs.length?rs.slice(0,4).map(r=>entry(r.name,detail(r.calc),r.calc.label,r.calc.status)).join(''):'<div class="empty">Nessuna scadenza configurata.</div>';
const combined=activities();$('dashRecent').innerHTML=combined.length?combined.slice(0,5).map(x=>entry(x.label+' · '+x.name,dateIT(x.date)+' · '+(x.type==='session'?`${fmt(x.hours)} h di utilizzo`:`Intervento a ${fmt(x.meter)} h`))).join(''):'<div class="empty">Nessuna attività registrata. Inizia aggiungendo un’uscita o un intervento.</div>';
const sessions=[...state.sessions].sort((a,b)=>b.date.localeCompare(a.date));$('lastSession').textContent=sessions.length?dateIT(sessions[0].date):'Nessuna uscita';$('sessionsSubcount').textContent=`${sessions.length} uscite`;$('sessionsTable').innerHTML=sessions.length?sessions.map(s=>`<tr><td>${dateIT(s.date)}</td><td><strong>${escapeHTML(s.name)}</strong></td><td><span class="tag ok">+${fmt(s.hours)} h</span></td><td>${escapeHTML(s.notes||'—')}</td><td><button class="delete" data-delete="session" data-id="${escapeHTML(s.id)}" aria-label="Elimina uscita">✕</button></td></tr>`).join(''):'<tr><td colspan="5" class="empty">Nessuna uscita registrata.</td></tr>';
renderActivities();$('rulesGrid').innerHTML=rs.length?rs.map(r=>`<div class="rule-card"><div class="rule-head"><div><div class="eyebrow">MANUTENZIONE</div><h3>${escapeHTML(r.name)}</h3></div><span class="tag ${r.calc.status}">${r.calc.label}</span></div><div class="rule-details">${detail(r.calc)}<div>Frequenza: ${[r.intervalHours?`ogni ${fmt(r.intervalHours)} h`:null,r.intervalDays?`ogni ${r.intervalDays} giorni`:null].filter(Boolean).join(' / ')}</div><div>Ultima esecuzione: ${latestWork(r.id)?dateIT(latestWork(r.id).date):'non registrata'}</div></div><div class="rule-actions"><button class="text-btn" data-complete="${escapeHTML(r.id)}">✓ Segna eseguita</button><button class="delete" data-delete="rule" data-id="${escapeHTML(r.id)}" aria-label="Elimina scadenza">✕</button></div></div>`).join(''):'<div class="empty">Non ci sono manutenzioni programmate.</div>';
const form=$('bikeForm');for(const k of ['brand','model','year','number'])form.elements[k].value=state.bike[k]||'';}
function detail(c){return [c.dueHours!==null?`a ${fmt(c.dueHours)} h (${c.remainH>0?fmt(c.remainH)+' h rimanenti':'soglia raggiunta'})`:null,c.dueDate?`entro il ${dateIT(c.dueDate)}${c.days<0?' (scaduta)':''}`:null].filter(Boolean).join(' · ')}
function activities(){
 return [
  ...state.sessions.map(s=>({...s,type:'session',label:'Uscita'})),
  ...state.works.map(w=>({...w,type:'work',label:'Intervento'}))
 ].sort((a,b)=>b.date.localeCompare(a.date));
}
function renderActivities(){
 const q=$('activitySearch').value.trim().toLocaleLowerCase('it');
 const rows=activities().filter(a=>[a.name,a.notes,a.label].join(' ').toLocaleLowerCase('it').includes(q));
 $('activitiesTable').innerHTML=rows.length?rows.map(a=>`<tr>
 <td>${dateIT(a.date)}</td>
 <td><span class="tag ${a.type==='session'?'activity-session':'activity-work'}">${a.label}</span></td>
 <td><strong>${escapeHTML(a.name)}</strong>${a.type==='work'&&a.ruleId?'<br><small>Collegato a scadenza</small>':''}</td>
 <td>${a.type==='session'?`+${fmt(a.hours)} h <small>di utilizzo</small>`:`${fmt(a.meter)} h <small>contaore</small>`}</td>
 <td>${escapeHTML(a.notes||'—')}</td>
 <td><button class="delete" data-delete="${a.type}" data-id="${escapeHTML(a.id)}" aria-label="Elimina ${a.type==='session'?'uscita':'intervento'}">✕</button></td>
 </tr>`).join(''):`<tr><td colspan="6" class="empty">${q?'Nessuna attività corrisponde alla ricerca.':'Nessuna attività registrata. Aggiungi un’uscita o un intervento.'}</td></tr>`;
}
let onModalSave=null;const field=(title,html)=>`<label>${title}${html}</label>`;
function modal(eyebrow,title,fields,handler){$('modalEyebrow').textContent=eyebrow;$('modalTitle').textContent=title;$('modalFields').innerHTML=fields;onModalSave=handler;$('modal').showModal()}
function sessionModal(){modal('CONTAORE','Registra una nuova uscita',field('Data',`<input name="date" type="date" value="${today()}" required>`)+field('Pista / nome uscita','<input name="name" placeholder="Es. Allenamento pista" required maxlength="120">')+field('Ore motore utilizzate','<input name="hours" type="number" step="0.1" min="0.1" max="1000" placeholder="Es. 1.5" required>')+field('Note facoltative','<textarea name="notes" maxlength="2000" placeholder="Condizioni, regolazioni, osservazioni..."></textarea>'),fd=>{const h=Number(fd.get('hours'));if(!Number.isFinite(h)||h<=0||h>1000)throw Error('Inserisci ore valide.');state.sessions.push({id:uid(),date:fd.get('date'),name:String(fd.get('name')).trim(),hours:h,notes:String(fd.get('notes')).trim()});save();notify('Uscita registrata')})}
function workModal(ruleId=''){const rule=state.rules.find(r=>r.id===ruleId);const options='<option value="">Nessuna scadenza collegata</option>'+state.rules.map(r=>`<option value="${escapeHTML(r.id)}" ${r.id===ruleId?'selected':''}>${escapeHTML(r.name)}</option>`).join('');modal('OFFICINA','Registra un intervento',field('Intervento',`<input name="name" value="${escapeHTML(rule?.name||'')}" placeholder="Es. Cambio olio" required maxlength="150">`)+field('Data',`<input name="date" type="date" value="${today()}" required>`)+field('Contaore al momento dell’intervento',`<input name="meter" type="number" min="0" step="0.1" value="${fmt(hours())}" required>`)+field('Collega alla manutenzione programmata',`<select name="ruleId">${options}</select>`)+field('Note tecniche','<textarea name="notes" maxlength="2000" placeholder="Materiali utilizzati, controlli, osservazioni..."></textarea>'),fd=>{const meter=Number(fd.get('meter'));if(!Number.isFinite(meter)||meter<0)throw Error('Contaore non valido');state.works.push({id:uid(),name:String(fd.get('name')).trim(),date:fd.get('date'),meter,ruleId:fd.get('ruleId'),notes:String(fd.get('notes')).trim()});save();notify('Intervento registrato')})}
function ruleModal(){modal('PROGRAMMA','Nuova scadenza',field('Nome manutenzione','<input name="name" placeholder="Es. Sostituzione pistone" required maxlength="150">')+field('Ripeti ogni N ore motore (facoltativo)','<input name="intervalHours" type="number" min="0" step="0.1" placeholder="Es. 40">')+field('Ripeti ogni N giorni (facoltativo)','<input name="intervalDays" type="number" min="0" step="1" placeholder="Es. 90">')+'<p class="muted">Compila almeno uno dei due intervalli. Se li compili entrambi, vale la prima scadenza raggiunta.</p>'+field('Ore di partenza',`<input name="startHours" type="number" min="0" step="0.1" value="${fmt(hours())}" required>`)+field('Data di partenza',`<input name="startDate" type="date" value="${today()}" required>`),fd=>{const ih=Number(fd.get('intervalHours')),id=Number(fd.get('intervalDays'));if((ih<=0&&id<=0)||ih<0||id<0)throw Error('Inserisci almeno un intervallo positivo.');state.rules.push({id:uid(),name:String(fd.get('name')).trim(),intervalHours:ih||null,intervalDays:id||null,startHours:Number(fd.get('startHours')),startDate:fd.get('startDate')});save();notify('Scadenza aggiunta')})}
function adjustModal(){modal('CONTATORE','Imposta contaore',`<p class="muted">Imposta le ore totali attuali. Le uscite già registrate restano in archivio: viene aggiornato il valore di partenza.</p>`+field('Ore totali attuali',`<input name="meter" type="number" min="0" step="0.1" value="${fmt(hours())}" required>`),fd=>{const target=Number(fd.get('meter'));if(!Number.isFinite(target)||target<0)throw Error('Valore non valido');state.baseHours=target-state.sessions.reduce((a,s)=>a+num(s.hours),0);save();notify('Contaore aggiornato')})}
$('modalForm').addEventListener('submit',ev=>{ev.preventDefault();const form=$('modalForm');if(!form.reportValidity())return;try{onModalSave(new FormData(form));$('modal').close()}catch(e){alert(e.message||'Dati non validi')}});
$('closeModal').onclick=$('cancelModal').onclick=()=>$('modal').close();
document.addEventListener('click',ev=>{const p=ev.target.closest('[data-page],[data-goto]');if(p)navigate(p.dataset.page||p.dataset.goto);const complete=ev.target.closest('[data-complete]');if(complete)workModal(complete.dataset.complete);const del=ev.target.closest('[data-delete]');if(del&&confirm('Confermi l’eliminazione?')){const map={session:'sessions',work:'works',rule:'rules'},arr=map[del.dataset.delete];if(arr){state[arr]=state[arr].filter(x=>x.id!==del.dataset.id);save();notify('Elemento eliminato')}}});
$('quickSession').onclick=$('newSession').onclick=sessionModal;$('quickWork').onclick=$('newWork').onclick=()=>workModal();$('newRule').onclick=ruleModal;$('adjustHours').onclick=adjustModal;$('editMoto').onclick=()=>navigate('settings');$('activitySearch').oninput=renderActivities;
$('bikeForm').onsubmit=ev=>{ev.preventDefault();const f=ev.currentTarget;state.bike={brand:f.elements.brand.value.trim(),model:f.elements.model.value.trim(),year:f.elements.year.value,number:f.elements.number.value.trim()};save();notify('Moto salvata')};
$('exportReport').onclick=async()=>{
 const button=$('exportReport');
 button.disabled=true;button.textContent='Creazione PDF…';
 try{await downloadActivityReport(state);notify('Report PDF creato')}
 catch(error){notify('Impossibile creare il PDF. Riprova.');console.error('Esportazione report PDF non riuscita',error)}
 finally{button.disabled=false;button.textContent='↓ Esporta attività PDF'}
};
$('exportData').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='motolog-backup-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$('importData').onclick=()=>$('importFile').click();$('importFile').onchange=async ev=>{const file=ev.target.files[0];if(!file)return;try{if(file.size>10_000_000)throw Error('File troppo grande');const d=JSON.parse(await file.text());if(!valid(d)||d.sessions.some(s=>!s.id||!s.date)||d.works.some(w=>!w.id||!w.date)||d.rules.some(r=>!r.id||!r.name))throw Error('Formato backup non valido');if(confirm('Sostituire tutti i dati ONLINE con questo backup?')){state=d;save();notify('Backup ripristinato')}}catch(e){alert('Impossibile importare: '+e.message)}ev.target.value=''};
$('resetData').onclick=()=>{if(confirm('Eliminare definitivamente tutti i dati ONLINE? Questa operazione non si può annullare.')&&confirm('Ultima conferma: eliminare tutto?')){state=seed();save();notify('Dati azzerati')}};

const authPanel=document.getElementById('authPanel');
const authMsg=document.getElementById('authMessage');
const authForm=document.getElementById('authForm');
const appContainer=document.querySelector('.app');
async function loadGarage(user){
 status('● Caricamento…');
 const {data,error}=await supabase.from('garage_data').select('data').eq('user_id',user.id).maybeSingle();
 if(error)throw error;
 state=data?.data&&valid(data.data)?data.data:seed();
 if(!data){
  const {error:insertError}=await supabase.from('garage_data').insert({user_id:user.id,data:state});
  if(insertError)throw insertError;
 }
 render();status('● Salvato nel cloud');
}
async function enter(user){
 currentUser=user;authPanel.hidden=true;appContainer.hidden=false;
 try{await loadGarage(user)}catch(e){authPanel.hidden=false;appContainer.hidden=true;authMsg.textContent='Errore nel caricamento del database: '+e.message;}
}
async function leave(){currentUser=null;authPanel.hidden=false;appContainer.hidden=true;state=seed();authMsg.textContent='Accedi per vedere i tuoi dati.';}
authForm.addEventListener('submit',async e=>{
 e.preventDefault();if(!supabase){authMsg.textContent='Configura config.js con URL e chiave pubblica Supabase.';return;}
 const email=authForm.elements.email.value.trim(),password=authForm.elements.password.value;
 const type=e.submitter?.value||'signin';
 authMsg.textContent='Attendi…';
 const {data,error}=type==='signup'?await supabase.auth.signUp({email,password}):await supabase.auth.signInWithPassword({email,password});
 if(error){authMsg.textContent=error.message;return;}
 if(type==='signup'&&!data.session){authMsg.textContent='Registrazione avviata: verifica la tua email, poi accedi.';return;}
 if(data.user)await enter(data.user);
});
document.getElementById('logout').addEventListener('click',async()=>{
 try{await saveQueue}catch{alert('Ci sono dati non salvati: esporta un backup prima di uscire.');return;}
 await supabase.auth.signOut();await leave();
});
if(!supabase){authMsg.textContent='Apri config.js e inserisci URL e chiave pubblica (anon/publishable) di Supabase.';}
else {
 const {data:{session},error}=await supabase.auth.getSession();
 if(error)authMsg.textContent=error.message;
 else if(session?.user)await enter(session.user);
 else await leave();
 supabase.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT')void leave();});
}
