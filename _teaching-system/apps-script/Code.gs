/** 出師北伐 2.0 | Apps Script V8. Keep the existing QuestionBank / Schools / Records.
 * Replace the old Code.gs and index.html together. See 安裝與測試指南.md.
 * Every helper ends in '_' so google.script.run cannot call it.
 */
const APP_ = { version: '3.1.0', ttl: 180, zone: 'Asia/Hong_Kong' };
const HEADERS_ = {
  RunsV2: ['ID','CreatedAt','IdentityJSON','Mode','QuestionsJSON','ResultsJSON','Status'],
  RecordsV2: ['RunID','Date','School','Class','Number','Name','Team','Mode','Score','MaxScore','Accuracy','Count'],
  MistakesV2: ['Identity','QuestionID','QuestionJSON','Level','LastReview','Status','LastRunID'],
  RoomsV2: ['PIN','HostHash','StateJSON','QuestionsJSON','CreatedAt'],
  PlayersV2: ['PIN','TokenHash','IdentityJSON','AnswersJSON','Score','Finished'],
  LessonsV2: ['ID','Date','School','Class','Chapter','SummaryJSON'],
  InteractiveBank: ['ID','Chapter','Type','QuestionJSON']
};
function doGet(e) {
  if(e && e.parameter && e.parameter.bridge==='1') {
    const origin=PropertiesService.getScriptProperties().getProperty('PUBLIC_ORIGIN') || 'https://tankho0221-png.github.io';
    const channel=String(e.parameter.channel||'');
    if(!/^https:\/\/[a-z0-9.-]+$/.test(origin)||!/^[-a-zA-Z0-9]{20,80}$/.test(channel))throw new Error('不支援的連接設定。');
    const config=JSON.stringify({origin:origin,channel:channel}).replace(/</g,'\\u003c');
    return HtmlService.createHtmlOutput(bridgeDocument_().replace('__BRIDGE_CONFIG__',()=>config)).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  // No spreadsheet or Drive operations on the first paint path.
  return HtmlService.createHtmlOutputFromFile('index').setTitle('出師北伐 · 文言策略學堂')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}
function ss_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const sheet = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  if (!sheet) throw new Error('請在專案設定填寫 SPREADSHEET_ID，或使用綁定試算表的專案。');
  return sheet;
}
function table_(name) {
  const ss = ss_(); let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.getRange(1,1,1,HEADERS_[name].length).setValues([HEADERS_[name]]); sh.setFrozenRows(1); }
  return sh;
}
function rows_(name) {
  const sh = ss_().getSheetByName(name);
  return sh && sh.getLastRow() > 1 ? sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getValues() : [];
}
function append_(sh, rows) { if (rows.length) sh.getRange(sh.getLastRow()+1,1,rows.length,rows[0].length).setValues(rows); }
function lock_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('軍報繁忙，請稍後重試。');
  try { return fn(); } finally { SpreadsheetApp.flush(); lock.releaseLock(); }
}
function clean_(s, max) { return String(s == null ? '' : s).trim().slice(0,max || 200); }
function plain_(s) { return clean_(s,4000).replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>'); }
function cell_(s) { const v = clean_(s,4000); return /^[=+@-]/.test(v) ? "'"+v : v; }
function number_(n,min,max,fallback) { n=Number(n); return Number.isFinite(n) ? Math.max(min,Math.min(max,Math.floor(n))) : fallback; }
function id_() { return Utilities.getUuid(); }
function hash_(s) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(s),Utilities.Charset.UTF_8).map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join(''); }
function day_() { return Utilities.formatDate(new Date(),APP_.zone,'yyyy-MM-dd'); }
function identityKey_(p) { return hash_([p.studentSchool,p.studentClass,p.studentNumber].join('|')); }
function snapshot_(q) { const s=JSON.stringify(q); if(s.length>45000) throw new Error('本次文字量過大，請減少題數至五題或十題。'); return s; }
function cacheGet_(k) { try { const v=CacheService.getScriptCache().get(k); return v ? JSON.parse(v) : null; } catch(e) { return null; } }
function cachePut_(k,v,ttl) { try { const s=JSON.stringify(v); if (Utilities.newBlob(s).getBytes().length < 95000) CacheService.getScriptCache().put(k,s,ttl || APP_.ttl); } catch(e) {} }
function identity_(p) {
  p=p || {}; const num=clean_(p.studentNumber,8);
  return {studentSchool:clean_(p.studentSchool,100),studentClass:clean_(p.studentClass,12).replace(/\s/g,'').toUpperCase(),
    studentNumber:/^\d{1,3}$/.test(num) ? String(Number(num)).padStart(2,'0') : '',
    studentName:clean_(p.studentName,30),studentTeam:clean_(p.studentTeam || '青龍軍',20)};
}
function questionKey_(q) { return hash_([q.chapter,plain_(q.sentence),q.targetWord].join('\u001f')).slice(0,24); }
function bank_() {
  const cached=cacheGet_('v2:bank'); if (cached) return cached;
  const seen={}; const data=rows_('QuestionBank').map(r=>{
    const q={chapter:clean_(r[0]),sentence:plain_(r[1]),targetWord:clean_(r[2]),correct:clean_(r[3]),distractors:r.slice(4,7).map(x=>clean_(x)),hint:plain_(r[7] || ''),explanation:plain_(r[8] || '')};
    q.id=questionKey_(q); return q;
  }).filter(q=>{
    if (!q.chapter || !q.sentence || !q.targetWord || !q.correct || q.distractors.length!==3 || q.distractors.some(x=>!x) || new Set([q.correct].concat(q.distractors)).size!==4 || seen[q.id]) return false;
    seen[q.id]=true; return true;
  });
  const interactive=rows_('InteractiveBank').map(r=>{try{const q=IQ.validate(JSON.parse(r[3]));q.id=String(r[0]);return q;}catch(e){return null;}}).filter(Boolean);
  const combined=data.concat(interactive);cachePut_('v2:bank',combined); return combined;
}
function shuffle_(arr,seed) {
  const out=arr.slice(); let a=(Number(seed)||1)>>>0;
  function rnd() { let t=a+=0x6D2B79F5; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; }
  for(let i=out.length-1;i>0;i--) { const j=Math.floor(rnd()*(i+1)); [out[i],out[j]]=[out[j],out[i]]; }
  return out;
}
function select_(opts) {
  opts=opts || {}; let q=bank_(); if(opts.chapter && opts.chapter!=='all') q=q.filter(x=>x.chapter===opts.chapter);
  if (!q.length) throw new Error('此篇章沒有可用題目。請檢查 QuestionBank，四個選項不能重複或留空。');
  return shuffle_(q,opts.seed || Date.now()).slice(0,number_(opts.count,1,30,10));
}
function getBootstrap() {
  const q=bank_(), counts={}; q.forEach(x=>counts[x.chapter]=(counts[x.chapter]||0)+1);
  let schools=cacheGet_('v2:schools');
  if(!schools) { schools=rows_('Schools').map(r=>clean_(r[0],100)).filter(Boolean); cachePut_('v2:schools',schools); }
  return {success:true,version:APP_.version,chapters:Object.keys(counts).map(name=>({name,count:counts[name]})),total:q.length,schools:schools.length?schools:['其他學校 / 自修考生'],url:ScriptApp.getService().getUrl()};
}
function teacherLogin(passcode) {
  const prop=PropertiesService.getScriptProperties(), configured=prop.getProperty('TEACHER_PASSWORD');
  let pwd=configured;
  if(!pwd) { const sh=ss_().getSheetByName('Settings'); pwd=sh?String(sh.getRange('B1').getValue()).trim():''; }
  if(!pwd || pwd==='8888' || pwd.length<8) throw new Error('請先在指令碼屬性設定 TEACHER_PASSWORD（至少 8 個字元），再登入。');
  const guard=cacheGet_('v2:loginFailures')||{n:0};
  if(guard.n>=15) throw new Error('登入嘗試過多，請 5 分鐘後再試。');
  if(String(passcode)!==pwd) { cachePut_('v2:loginFailures',{n:guard.n+1},300); throw new Error('教師密碼不正確。'); }
  CacheService.getScriptCache().remove('v2:loginFailures');
  const token=id_()+id_(); cachePut_('v2:teacher:'+hash_(token),true,21600);
  return {success:true,token};
}
function teacher_(token) { if(!token || !cacheGet_('v2:teacher:'+hash_(token))) throw new Error('教師登入已過期，請重新登入。'); }
function refreshQuestionCache(token) { teacher_(token); CacheService.getScriptCache().removeAll(['v2:bank','v2:schools']); return getBootstrap(); }
function getClassroomQuestions(token,opts) { teacher_(token); return {success:true,questions:select_(opts)}; }
function startPractice(profile,opts) {
  const p=identity_(profile); if(!p.studentClass || !p.studentNumber) throw new Error('請填寫班別和有效學號。');
  const q=select_(opts), run=id_();
  lock_(()=>append_(table_('RunsV2'),[[run,new Date().toISOString(),JSON.stringify(p),clean_(opts.mode || 'practice'),snapshot_(q),'','OPEN']]));
  return {success:true,runId:run,questions:q};
}
function result_(q,a) {
  a=a||{}; const attempts=Array.isArray(a.attempts)?a.attempts.slice(0,q.kind?12:4).map(x=>clean_(x,500)):[];
  const choices=[q.correct].concat(q.distractors); if(attempts.some(x=>q.kind?!IQ.validAnswer(q,x):choices.indexOf(x)<0)) throw new Error('答案資料不符合題目。');
  const first=attempts[0]===q.correct && !a.hinted && !a.timedOut;
  const correct=attempts.indexOf(q.correct)>=0 && !a.timedOut;
  return {id:q.id,firstCorrect:first,correct,score:first?3:correct?1:0,attempts,hinted:!!a.hinted,timedOut:!!a.timedOut};
}
function savePractice(runId,answers) {
  if(!Array.isArray(answers)||answers.length>30) throw new Error('戰報格式錯誤。');
  return lock_(()=>{
    const runs=rows_('RunsV2'), idx=runs.findIndex(r=>String(r[0])===String(runId));
    if(idx<0) throw new Error('找不到本次練習，請重新開始。');
    const row=runs[idx], p=JSON.parse(row[2]), q=JSON.parse(row[4]);
    let results;
    if(row[6]==='DONE' || row[6]==='COMMITTING') results=JSON.parse(row[5]);
    else {
      if(answers.length!==q.length || new Set(answers.map(a=>a.id)).size!==q.length) throw new Error('戰報題數不符。');
      results=q.map(x=>{const a=answers.find(a=>a.id===x.id); if(!a) throw new Error('戰報遺漏題目。'); return result_(x,a);});
      table_('RunsV2').getRange(idx+2,6,1,2).setValues([[JSON.stringify(results),'COMMITTING']]);
    }
    const score=results.reduce((s,x)=>s+x.score,0), accuracy=Math.round(100*results.filter(x=>x.firstCorrect).length/q.length);
    // Durable idempotency: retries reconcile the same run and never append twice.
    if(!rows_('RecordsV2').some(r=>String(r[0])===String(runId))) append_(table_('RecordsV2'),[[runId,new Date().toISOString(),cell_(p.studentSchool),cell_(p.studentClass),cell_(p.studentNumber),cell_(p.studentName),cell_(p.studentTeam),row[3],score,q.length*3,accuracy,q.length]]);
    if(row[6]!=='DONE') updateMistakes_(identityKey_(p),q,results,runId);
    table_('RunsV2').getRange(idx+2,7).setValue('DONE');
    return {success:true,score,maxScore:q.length*3,accuracy};
  });
}
function updateMistakes_(who,questions,results,runId) {
  const sh=table_('MistakesV2'), data=rows_('MistakesV2'), today=day_();
  questions.forEach((q,i)=>{
    let r=data.find(x=>x[0]===who && x[1]===q.id); const correct=results[i].firstCorrect;
    if(r && r[6]===runId) return;
    if(!r && !correct) {r=[who,q.id,JSON.stringify(q),0,today,'ACTIVE',runId]; data.push(r);}
    else if(r && !correct) {r[3]=0;r[4]=today;r[5]='ACTIVE';}
    else if(r && r[5]==='ACTIVE' && String(r[4])!==today) {r[3]=(Number(r[3])||0)+1;r[4]=today;if(r[3]>=3) r[5]='RESOLVED';}
    if(r) r[6]=runId;
  });
  if(data.length) sh.getRange(2,1,data.length,7).setValues(data.map(r=>r.slice(0,7).concat(Array(Math.max(0,7-r.length)).fill(''))));
}
function saveClassroom(token,summary) {
  teacher_(token); if(!summary || !/^[\w-]{8,100}$/.test(summary.id)) throw new Error('課堂識別碼無效。');
  if(!Array.isArray(summary.teams)||summary.teams.length>8) throw new Error('軍團資料無效。');
  const safe={teams:summary.teams.map(t=>({name:clean_(t.name,20),score:number_(t.score,0,10000,0)})),questions:number_(summary.questions,1,30,1)};
  return lock_(()=>{const sh=table_('LessonsV2');if(!rows_('LessonsV2').some(r=>r[0]===summary.id)) append_(sh,[[summary.id,new Date().toISOString(),cell_(summary.school),cell_(summary.className),cell_(summary.chapter),JSON.stringify(safe)]]);return {success:true};});
}
function room_(pin) {
  if(!/^\d{6}$/.test(String(pin))) throw new Error('請輸入六位房間碼。');
  const rows=rows_('RoomsV2'), i=rows.findIndex(r=>String(r[0])===String(pin));
  if(i<0) throw new Error('找不到房間。');
  if(Date.now()-new Date(rows[i][4]).getTime()>6*3600000) throw new Error('房間已過期，請建立新房間。');
  return {row:i+2,pin:String(pin),host:rows[i][1],state:JSON.parse(rows[i][2]),questions:JSON.parse(rows[i][3]),created:String(rows[i][4])};
}
function host_(room,token) { if(!token || room.host!==hash_(token)) throw new Error('只有主持人可以操作。'); }
function writeRoom_(r) { r.state.revision++; table_('RoomsV2').getRange(r.row,3).setValue(JSON.stringify(r.state));CacheService.getScriptCache().remove('v2:room:'+r.pin); }
function publicQ_(q,pin) { if(q?.kind)return {id:q.id,chapter:q.chapter,sentence:q.sentence,targetWord:q.targetWord,kind:q.kind,payload:q.payload,options:[]}; return q ? {id:q.id,chapter:q.chapter,sentence:q.sentence,targetWord:q.targetWord,options:shuffle_([q.correct].concat(q.distractors),Number(pin)+parseInt(q.id.slice(0,6),16))}:null; }
function createLiveRoom(token,opts) {
  teacher_(token); const q=select_(opts);
  return lock_(()=>{
    const existing=new Set(rows_('RoomsV2').map(r=>String(r[0]))); let pin;
    for(let i=0;i<100;i++) {pin=String(100000+Math.floor(Math.random()*900000));if(!existing.has(pin))break;pin=null;}
    if(!pin) throw new Error('未能分配房間碼，請重試。');
    const host=id_()+id_(); const state={status:'WAITING',index:0,phase:'think',revision:1,count:q.length,chapter:opts.chapter || 'all'};
    append_(table_('RoomsV2'),[[pin,hash_(host),JSON.stringify(state),snapshot_(q),new Date().toISOString()]]);
    return {success:true,pin,hostToken:host,state};
  });
}
function joinLiveRoom(pin,profile) {
  return lock_(()=>{
    const r=room_(pin); if(r.state.status!=='WAITING') throw new Error('戰役已開始，請等候下一場。');
    const p=identity_(profile); if(!p.studentClass||!p.studentNumber) throw new Error('請填寫班別及學號。');
    const players=rows_('PlayersV2').filter(x=>String(x[0])===String(pin));
    if(players.length>=60) throw new Error('房間已滿（60 人）。');
    if(players.some(x=>{const v=JSON.parse(x[2]);return v.studentSchool===p.studentSchool&&v.studentClass===p.studentClass&&v.studentNumber===p.studentNumber;})) throw new Error('此學號已加入，請返回原來的分頁。');
    const token=id_()+id_();append_(table_('PlayersV2'),[[String(pin),hash_(token),JSON.stringify(p),'[]',0,false]]);
    CacheService.getScriptCache().remove('v2:room:'+pin);return {success:true,pin:String(pin),playerToken:token};
  });
}
function liveAccess_(pin,token) {
  const r=room_(pin), key=hash_(token || '');
  if(r.host===key) return {r,isHost:true};
  const players=rows_('PlayersV2');const idx=players.findIndex(p=>String(p[0])===String(pin)&&p[1]===key);
  if(idx<0) throw new Error('房間憑證無效，請重新加入。');
  return {r,isHost:false,player:players[idx],playerRow:idx+2};
}
function getLiveState(pin,token) {
  // Cache shared read model, but verify capability against the cached token hashes.
  let v=cacheGet_('v2:room:'+pin);
  if(!v) {
    const r=room_(pin), players=rows_('PlayersV2').filter(p=>String(p[0])===String(pin));
    v={r,players};cachePut_('v2:room:'+pin,v,4);
  }
  if(Date.now()-new Date(v.r.created || 0).getTime()>6*3600000 && v.r.created) throw new Error('房間已過期。');
  const key=hash_(token||''), isHost=v.r.host===key, me=v.players.find(p=>p[1]===key);
  if(!isHost&&!me) throw new Error('房間憑證無效。');
  const s=v.r.state, q=v.r.questions[s.index], reveal=s.phase==='reveal'||s.status==='FINISHED';
  const myAnswers=me?JSON.parse(me[3]):[];
  const visibleScore=p=>JSON.parse(p[3]).filter(a=>reveal||a.index<s.index).reduce((n,a)=>n+a.score,0);
  const visibleTime=p=>{const correct=JSON.parse(p[3]).filter(a=>(reveal||a.index<s.index)&&a.score>0);return correct.every(a=>Number.isFinite(a.elapsedMs))?correct.reduce((n,a)=>n+a.elapsedMs,0):null;};
  const board=v.players.map(p=>{const u=JSON.parse(p[2]);return {name:u.studentClass+' · '+u.studentNumber+'號',score:visibleScore(p),elapsedMs:visibleTime(p),answered:JSON.parse(p[3]).some(a=>a.index===s.index),isMe:p[1]===key};}).sort((a,b)=>b.score-a.score);
  const question=s.status==='WAITING'?null:publicQ_(q,pin);
  if(question&&reveal) { question.correct=q.correct;question.explanation=q.explanation; }
  return {success:true,state:s,isHost,question,players:board,submitted:myAnswers.some(a=>a.index===s.index),myScore:me?visibleScore(me):0};
}
function hostLiveAction(pin,token,action) {
  return lock_(()=>{
    const r=room_(pin);host_(r,token);const s=r.state;
    if(action==='start'&&s.status==='WAITING') {s.status='PLAYING';s.phase='think';}
    else if(action==='discuss'&&s.status==='PLAYING'&&s.phase==='think') s.phase='discuss';
    else if(action==='answer'&&s.status==='PLAYING'&&['think','discuss'].includes(s.phase)) {s.phase='answer';s.answerOpenedAt=Date.now();}
    else if(action==='reveal'&&s.status==='PLAYING'&&s.phase==='answer') s.phase='reveal';
    else if(action==='next'&&s.status==='PLAYING'&&s.phase==='reveal') {if(s.index+1>=r.questions.length)s.status='FINISHED';else {s.index++;s.phase='think';}}
    else if(action==='close') s.status='FINISHED';
    else throw new Error('此階段不能執行該操作，請重新整理戰況。');
    writeRoom_(r);return {success:true};
  });
}
function submitLiveAnswer(pin,token,index,choice) {
  return lock_(()=>{
    const a=liveAccess_(pin,token); if(a.isHost) throw new Error('主持人不能代替學生提交。');
    const r=a.r; const answers=JSON.parse(a.player[3]);
    if(answers.some(x=>x.index===Number(index))) return {success:true,duplicate:true};
    if(r.state.status!=='PLAYING'||r.state.phase!=='answer'||r.state.index!==Number(index)) throw new Error('本題尚未開放或已截止作答。');
    const q=r.questions[index]; if(q.kind?!IQ.validAnswer(q,choice):[q.correct].concat(q.distractors).indexOf(String(choice))<0) throw new Error('選項無效。');
    const elapsedMs=Number.isFinite(r.state.answerOpenedAt)?Math.max(0,Math.round((Date.now()-r.state.answerOpenedAt)/1000)*1000):null;
    answers.push({index:Number(index),id:q.id,choice:String(choice),score:choice===q.correct?3:0,elapsedMs});
    const score=answers.reduce((n,x)=>n+x.score,0);
    table_('PlayersV2').getRange(a.playerRow,4,1,3).setValues([[JSON.stringify(answers),score,answers.length===r.questions.length]]);
    CacheService.getScriptCache().remove('v2:room:'+pin);
    // Do not disclose correctness or score before the host reveals the answer.
    return {success:true};
  });
}
function getTeacherAnalytics(token,filters) {
  teacher_(token);filters=filters||{};
  const records=rows_('RecordsV2').filter(r=>(!filters.school||String(r[2])===filters.school)&&(!filters.className||String(r[3])===filters.className));
  const legacy=rows_('Records'); const lessons=rows_('LessonsV2').filter(r=>(!filters.school||String(r[2])===filters.school)&&(!filters.className||String(r[3])===filters.className));
  const stats={};rows_('MistakesV2').filter(r=>r[5]==='ACTIVE').forEach(r=>{const q=JSON.parse(r[2]);if(!stats[q.id])stats[q.id]={chapter:q.chapter,word:q.targetWord,correct:q.correct,count:0};stats[q.id].count++;});
  return {success:true,totalBattles:records.length,avgAccuracy:records.length?Math.round(records.reduce((n,r)=>n+(Number(r[10])||0),0)/records.length):0,
    legacyRecords:legacy.length,classroomSessions:lessons.length,liveRooms:rows_('RoomsV2').length,
    difficultWords:(!filters.school&&!filters.className)?Object.values(stats).sort((a,b)=>b.count-a.count).slice(0,10):[],
    recent:records.slice(-20).reverse().map(r=>({date:String(r[1]),className:String(r[3]),number:String(r[4]),score:r[8],maxScore:r[9],accuracy:r[10]}))};
}
/** Run manually in Apps Script editor only; never clears existing sheets. */
function setupSystem_() {
  Object.keys(HEADERS_).forEach(table_);
  const ss=ss_(); if(!ss.getSheetByName('QuestionBank')) {const sh=ss.insertSheet('QuestionBank');sh.appendRow(['chapter','sentence','target_word','correct','distractor1','distractor2','distractor3','hint','explanation']);}
  return '已建立新版工作表；原有題庫、成績及錯題均保留。';
}
/** Teacher-only bulk append. Entire batch validates before any write. */
function importQuestions(token, questions) {
  teacher_(token);
  if (!Array.isArray(questions) || !questions.length || questions.length > 100) throw new Error('每次請加入 1 至 100 題。');
  const normalized = questions.map((q, i) => {
    if (!q || !Array.isArray(q.distractors) || q.distractors.length !== 3) throw new Error('第 '+(i+1)+' 題格式不完整。');
    const values=[q.chapter,q.sentence,q.targetWord,q.correct].concat(q.distractors,[q.hint||'',q.explanation||'']);
    const limits=[200,4000,200,200,200,200,200,4000,4000];
    values.forEach((v,j)=>{if(typeof v!=='string'||v.length>limits[j]||/[\t\r\n]/.test(v)||/^[=+@-]/.test(v.trim()))throw new Error('第 '+(i+1)+' 題含不支援的格式、公式或過長文字。');});
    const row=values.map((v,j)=>[1,7,8].includes(j)?plain_(v):clean_(v,limits[j]));
    if(row.slice(0,7).some(v=>!v)||new Set(row.slice(3,7)).size!==4)throw new Error('第 '+(i+1)+' 題有空白或重複選項。');
    return row;
  });
  return lock_(()=>{
    const existing=new Set(rows_('QuestionBank').map(r=>questionKey_({chapter:r[0],sentence:r[1],targetWord:r[2]})));
    const added=[];let skipped=0;
    normalized.forEach(row=>{const id=questionKey_({chapter:row[0],sentence:row[1],targetWord:row[2]});if(existing.has(id)){skipped++;return;}existing.add(id);added.push(row);});
    if(added.length){let sh=ss_().getSheetByName('QuestionBank');if(!sh){sh=ss_().insertSheet('QuestionBank');sh.appendRow(['chapter','sentence','target_word','correct','distractor1','distractor2','distractor3','hint','explanation']);}append_(sh,added);}
    CacheService.getScriptCache().remove('v2:bank');
    return {success:true,added:added.length,skipped};
  });
}

function importInteractiveQuestions(token, questions) {
  teacher_(token);
  if(!Array.isArray(questions)||!questions.length||questions.length>100)throw Error('每次請加入 1 至 100 題。');
  const validated=questions.map(raw=>{const q=IQ.validate(raw);const id=hash_('interactive|'+q.kind+'|'+q.chapter+'|'+q.sentence).slice(0,24);return [id,cell_(q.chapter),q.kind,JSON.stringify({...q,key:JSON.parse(q.correct)})];});
  return lock_(()=>{
    const existing=new Set(rows_('InteractiveBank').map(r=>String(r[0]))),add=[];let skipped=0;
    validated.forEach(r=>{if(existing.has(r[0]))skipped++;else{existing.add(r[0]);add.push(r);}});
    if(add.length)append_(table_('InteractiveBank'),add);
    CacheService.getScriptCache().remove('v2:bank');return {success:true,added:add.length,skipped};
  });
}
