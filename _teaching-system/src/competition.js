/* Competition derives progress from submitted answers, never from answer correctness. */
const Competition = {
  standings(players) {
    const rows=players.map((p,i)=>({...p,score:Number(p.score)||0,original:i}));
    const timed=p=>p.score>0&&rows.filter(x=>x.score===p.score).every(x=>Number.isFinite(x.elapsedMs));
    rows.forEach(p=>p.timeRanked=timed(p));
    rows.sort((a,b)=>b.score-a.score||(a.timeRanked?a.elapsedMs-b.elapsedMs:0)||a.original-b.original);
    rows.forEach((p,i)=>p.rank=i&&p.score===rows[i-1].score&&(!p.timeRanked||p.elapsedMs===rows[i-1].elapsedMs)?rows[i-1].rank:i+1);
    return rows;
  },
  summary(players){const total=players.length,submitted=players.filter(p=>p.answered).length;return {total,submitted,remaining:total-submitted,percent:total?Math.round(submitted/total*100):0};},
  questionKey(r){return JSON.stringify([r.state,r.question,r.isHost,r.submitted]);}
};
function marchGraphic(percent){
  const value=Math.max(0,Math.min(100,Number(percent)||0));
  return `<div class="march-scene" role="img" aria-label="軍旗進城：本輪交卷進度 ${value}%"><svg viewBox="0 0 800 96" preserveAspectRatio="none" aria-hidden="true"><path d="M0 84 95 24 157 72 250 11 343 73 428 30 519 77 600 36 730 84Z" fill="#75847a" opacity=".18"/><path d="M0 91Q160 68 320 85T800 80" fill="none" stroke="#b79960" stroke-width="2" stroke-dasharray="5 9"/><path d="M704 87V38h12V27h12V38h12V27h12V38h12V27h12V87ZM696 38h88M738 87V67Q744 50 750 67V87" stroke="#cdb17b" stroke-width="3" fill="#273931"/></svg><span class="march-flag" style="left:${4+value*.82}%" aria-hidden="true"><i>令</i><b>◆</b></span><span class="march-caption">${value===100?'軍報已齊':'諸軍推進'} · ${value}%</span></div>`;
}
function competitionBoard(r){
  const c=Competition.summary(r.players),s=r.state,ranked=Competition.standings(r.players),reveal=s.phase==='reveal'||s.status==='FINISHED';
  return `<section class="war-board" aria-label="全班戰況"><div class="war-heading"><div><span class="eyebrow">軍情即報 · 全班戰況</span><h3>${s.status==='WAITING'?'諸將集結':s.status==='FINISHED'?'本役軍功榜':'第 '+(s.index+1)+' 關 · 軍報進度'}</h3></div><strong class="war-count">${s.status==='WAITING'?c.total+' 人入營':c.submitted+' / '+c.total+' 已交'}</strong></div>${marchGraphic(c.percent)}<div class="war-meter" role="progressbar" aria-label="本題交卷進度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${c.percent}"><i style="width:${c.percent}%"></i></div><p class="war-status" role="status">${s.status==='WAITING'?'等候軍師開始':c.remaining?c.remaining+' 人尚未交卷；留時間讀原文。':'本輪軍報已齊；由軍師決定何時揭曉。'} · 每約 4 秒同步，網絡慢時會延後。</p><div class="war-ranks">${ranked.map(p=>`<div class="war-lane ${p.isMe?'is-me':''}"><span class="war-place">${p.rank}</span><div class="war-general"><b>${esc(p.name)}${p.isMe?' · 你':''}</b><div class="war-track"><i style="width:${Math.min(100,p.score/Math.max(3,(s.count||1)*3)*100)}%"></i></div></div><strong>${p.score} 分${p.score>0&&Number.isFinite(p.elapsedMs)?`<small class="war-time">答對用時 ${p.elapsedMs/1000} 秒</small>`:""}</strong><span class="war-tag ${p.answered?'done':''}">${s.status==='WAITING'?'已入營':p.answered?'軍報已交':'尚未交卷'}</span></div>`).join('')||'<p>等候將領加入。</p>'}</div><p class="muted">${reveal?'本輪分數已計入；先比分數，同分比答對用時。':'排名只計已揭曉題目；已交不代表答對。'} 答對每題 3 分；同分時，答對題目的累積用時較短者排前。由開放作答計時，取整秒；網絡延遲可能影響結果。舊紀錄沒有時間則同分並列。</p>${r.isHost?'<p class="teacher-note">主持提示：交卷比例偏低時先留讀題時間；揭曉後抽一位同學指出原文證據。</p>':''}</section>`;
}
