/* Competition derives progress from submitted answers, never from answer correctness. */
const Competition = {
  standings(players) {
    const rows=players.map((p,i)=>({...p,score:Number(p.score)||0,original:i})).sort((a,b)=>b.score-a.score||a.original-b.original);
    rows.forEach((p,i)=>p.rank=i&&p.score===rows[i-1].score?rows[i-1].rank:i+1);
    return rows;
  },
  summary(players){const total=players.length,submitted=players.filter(p=>p.answered).length;return {total,submitted,remaining:total-submitted,percent:total?Math.round(submitted/total*100):0};},
  questionKey(r){return JSON.stringify([r.state,r.question,r.isHost,r.submitted]);}
};
function competitionBoard(r){
  const c=Competition.summary(r.players),s=r.state,ranked=Competition.standings(r.players),reveal=s.phase==='reveal'||s.status==='FINISHED';
  return `<section class="war-board" aria-label="全班戰況"><div class="war-heading"><div><span class="eyebrow">軍情即報 · 全班戰況</span><h3>${s.status==='WAITING'?'諸將集結':s.status==='FINISHED'?'本役軍功榜':'第 '+(s.index+1)+' 關 · 軍報進度'}</h3></div><strong class="war-count">${s.status==='WAITING'?c.total+' 人入營':c.submitted+' / '+c.total+' 已交'}</strong></div><div class="war-meter" role="progressbar" aria-label="本題交卷進度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${c.percent}"><i style="width:${c.percent}%"></i></div><p class="war-status" role="status">${s.status==='WAITING'?'等候軍師開始':c.remaining?c.remaining+' 人尚未交卷；留時間讀原文。':'本輪軍報已齊；由軍師決定何時揭曉。'} · 每約 4 秒同步，網絡慢時會延後。</p><div class="war-ranks">${ranked.map(p=>`<div class="war-lane ${p.isMe?'is-me':''}"><span class="war-place">${p.rank}</span><div class="war-general"><b>${esc(p.name)}${p.isMe?' · 你':''}</b><div class="war-track"><i style="width:${Math.min(100,p.score/Math.max(3,(s.count||1)*3)*100)}%"></i></div></div><strong>${p.score} 分</strong><span class="war-tag ${p.answered?'done':''}">${s.status==='WAITING'?'已入營':p.answered?'軍報已交':'尚未交卷'}</span></div>`).join('')||'<p>等候將領加入。</p>'}</div><p class="muted">${reveal?'本輪分數已計入；同分並列。':'排名只計已揭曉題目；已交不代表答對。'} 正確作答每題 3 分，沒有搶快加分。</p>${r.isHost?'<p class="teacher-note">主持提示：交卷比例偏低時先留讀題時間；揭曉後抽一位同學指出原文證據。</p>':''}</section>`;
}
function classroomReadiness(){
  const ready=(game.readiness||{})[game.index]||{},done=game.teams.filter((_,i)=>ready[i]).length;
  return `<div class="class-readiness"><p><b>本輪 ${done} / ${game.teams.length} 組已亮板</b> · 教師手動標記</p><p class="muted">每人先選答案，再同時亮板；此標記不計分，也不代表答對。</p><div class="toolbar">${game.teams.map((t,i)=>`<button class="btn ${ready[i]?'primary':'ghost'}" data-ready="${i}" aria-pressed="${!!ready[i]}">${esc(t.name)} · ${ready[i]?'已亮板 ✓':'待亮板'}</button>`).join('')}</div></div>`;
}
function bindReadiness(){ $$('[data-ready]').forEach(b=>b.onclick=()=>{game.readiness=game.readiness||{};const flags=game.readiness[game.index]||(game.readiness[game.index]={});flags[b.dataset.ready]=!flags[b.dataset.ready];persist();renderTeams();}); }
