/* Reading support is separate from scoring and cloud transport.
   A learner-selected clue is a reflection aid, never proof of correctness. */
const Learning = Object.freeze({
  chunks(text) {
    return (String(text || '').match(/[^，。！？；：\n]{1,36}[，。！？；：\n]?/gu) || []).slice(0,24);
  },
  ready(entry) { return !!entry && Number.isInteger(entry.clue) && entry.clue >= 0 && ['sure','unsure'].includes(entry.confidence); },
  strategy(q) {
    return ({match:'先找代稱，再看動作。',order:'圈出先、後、才等時間詞。',classify:'找句子共同的語言特徵。',hotspot:'先讀方位，再對照標註。',binary:'找一句支持或反對的線索。',eliminate:'逐項代入語境，排除矛盾。'})[q.kind] || '先找誰做甚麼，再代入詞義。';
  },
  reflection: ['我用原文線索作判斷','我比較選項後改正','我仍需要老師再示範'],
  summary(g) {
    const a=g.answers||[], entries=Object.values(g.learning||{});
    return {first:a.filter(x=>x.firstCorrect).length, corrected:a.filter(x=>!x.firstCorrect&&x.score>0).length,
      needHelp:entries.filter(x=>x.reflection===2).length, clues:entries.filter(x=>Number.isInteger(x.clue)).length};
  }
});

function learningEntry(){game.learning=game.learning||{};return game.learning[game.index]||(game.learning[game.index]={});}
function learningRequired(){return !!game?.guided && game.type!=='classroom';}
function learningReady(){return !learningRequired() || Learning.ready(learningEntry());}
function renderLearning(){
  const root=$('reading-support');if(!root || !root.querySelectorAll)return;
  root.classList.toggle('hidden',!learningRequired());if(!learningRequired())return;
  const q=game.questions[game.index],entry=learningEntry(),parts=Learning.chunks(q.sentence);
  root.innerHTML=`<div class="support-title"><span class="step-seal">壹</span><div><h3>先找線索，再作判斷</h3><p>${esc(Learning.strategy(q))}</p></div></div><p class="support-note">點選一段你認為有用的原文。這是你的閱讀記號，不會自動判為正確。</p><div class="clue-list" role="group" aria-label="選擇閱讀線索">${parts.map((s,i)=>`<button class="clue" data-clue="${i}" aria-pressed="${entry.clue===i}" ${game.done?'disabled':''}>${esc(s)}</button>`).join('')}</div><div class="confidence" role="group" aria-label="作答前的把握"><span>現在的把握</span><button class="btn small" data-confidence="sure" aria-pressed="${entry.confidence==='sure'}" ${game.done?'disabled':''}>有線索，想試試</button><button class="btn small" data-confidence="unsure" aria-pressed="${entry.confidence==='unsure'}" ${game.done?'disabled':''}>未肯定，也先試</button></div><p class="support-status" role="status">${game.done?'已留下你的閱讀記號。':learningReady()?'可以作答了；不肯定也可以嘗試。':'選一段線索和作答把握，即可展開答案。'}</p>`;
  root.querySelectorAll('[data-clue]').forEach(b=>b.onclick=()=>{entry.clue=Number(b.dataset.clue);persist();renderLearning();});
  root.querySelectorAll('[data-confidence]').forEach(b=>b.onclick=()=>{entry.confidence=b.dataset.confidence;persist();renderLearning();});
  $('options').classList.toggle('hidden',!game.done&&!learningReady());
  if(game.done)renderReflection();
}
function renderReflection(){
  const root=$('learning-reflection');if(!root||!root.querySelectorAll)return;
  root.classList.toggle('hidden',!learningRequired()||!game.done);if(!learningRequired()||!game.done)return;
  const entry=learningEntry();
  root.innerHTML=`<div class="support-title"><span class="step-seal">參</span><div><h3>回望這一步</h3><p>讀完解釋，選一句最接近你的情況。</p></div></div><div class="reflection-options">${Learning.reflection.map((s,i)=>`<button class="btn" data-reflect="${i}" aria-pressed="${entry.reflection===i}">${s}</button>`).join('')}</div><p class="support-note">只作自我檢視，不加分、不扣分；本頁記號不會送到教師成績表。</p>`;
  $('advance').disabled=!Number.isInteger(entry.reflection);
  root.querySelectorAll('[data-reflect]').forEach(b=>b.onclick=()=>{entry.reflection=Number(b.dataset.reflect);persist();renderReflection();});
}
function resetLearningPanel(){
  $('advance').disabled=false;
  $('learning-reflection')?.classList.add('hidden');
  renderLearning();
}
function mountLearningResult(){
  if(!game?.guided||game.type==='classroom')return;
  const root=$('result-view');if(!root?.querySelector)return;
  const summary=Learning.summary(game),panel=document.createElement('section');panel.className='learning-result';
  panel.innerHTML=`<div class="eyebrow">把收穫帶回課文</div><h3>你的下一步</h3><div class="learning-metrics"><span><b>${summary.first}</b>題首次獨立答對</span><span><b>${summary.corrected}</b>題經嘗試後訂正</span><span><b>${summary.needHelp}</b>題希望老師再示範</span></div><p>${summary.needHelp?'下次課堂，帶着下方標記的題目，請老師示範如何找線索。':summary.corrected?'先遮住答案，明天再試一次需要訂正的題目。':'明天再讀一次原句，試着向同學說明你的判斷理由。'}</p>${Object.entries(game.learning||{}).filter(([,e])=>e.reflection===2).map(([i])=>`<p class="help-question">待請教：${esc(game.questions[i]?.sentence||'')}</p>`).join('')}<small>這是本次表現與自我回顧，並非能力診斷。</small>`;
  root.querySelector('.stats-grid')?.after(panel);
}
function renderLibrary(){
  const root=$('chapter-library');if(!root||!boot)return;
  const query=($('chapter-search')?.value||'').trim().toLowerCase();
  const list=boot.chapters.filter(c=>c.name.toLowerCase().includes(query));
  root.innerHTML=list.map((c,i)=>`<button class="chapter-book ${$('chapter').value===c.name?'selected':''}" data-book="${esc(c.name)}"><span class="book-number">${String(i+1).padStart(2,'0')}</span><span><strong>${esc(c.name)}</strong><small>${c.count} 題 · 點選此單元</small></span><span aria-hidden="true">↗</span></button>`).join('')||'<p class="empty">找不到這個單元，試試較短的篇名。</p>';
  $('library-count').textContent=`${list.length} 個單元`;
  root.querySelectorAll('[data-book]').forEach(b=>b.onclick=()=>{$('chapter').value=b.dataset.book;updateMission();renderLibrary();$('mission-title').scrollIntoView({behavior:document.body.classList.contains('still')?'auto':'smooth',block:'center'});});
}
function openLessonGuide(){
  showModal('十分鐘課堂 · 每人先答一步',`<div class="lesson-guide"><p>學生毋須裝置；準備紙筆或白板。先選篇章和三至五題，再開「課堂攻城」。</p><ol><li><b>0–2 分鐘｜老師示範</b><p>讀一句，圈一個線索，說出「因為……所以我選……」。</p></li><li><b>2–4 分鐘｜每人先試</b><p>每人寫一個答案或圈一個字。巡視確認留下記號，再進入討論。</p></li><li><b>4–6 分鐘｜兩人互說</b><p>一人指原文，一人說理由；下一題交換角色。</p></li><li><b>6–8 分鐘｜同時亮板</b><p>先展示不同判斷，邀請學生指出證據，再揭曉。</p></li><li><b>8–10 分鐘｜修訂離堂</b><p>用另一顏色改一處，說出今天用過的閱讀方法。</p></li></ol><p>每次只選一個觀察重點：有多少人先答？能否指出原文？訂正後能否再答？</p></div>`,()=>closeModal(),'明白，返回備課');
}
function initLearning(){
  if(!$('chapter-search')?.addEventListener)return;
  $('chapter-search').addEventListener('input',renderLibrary);
  $('lesson-guide').onclick=openLessonGuide;
  $('guided-mode').checked=storage.get('guided',true);
  $('guided-mode').onchange=()=>storage.set('guided',$('guided-mode').checked);
  $('large-text').onclick=()=>{const on=document.body.classList.toggle('large-reading');$('large-text').setAttribute('aria-pressed',String(on));storage.set('largeReading',on);};
  if(storage.get('largeReading',false)){document.body.classList.add('large-reading');$('large-text').setAttribute('aria-pressed','true');}
}
