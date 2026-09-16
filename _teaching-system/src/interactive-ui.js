const iqLiveDrafts=new Map();
function renderInteractive(root,q,opts={}) {
  const p=q.payload,disabled=!!opts.disabled;
  const state=opts.draft||{values:q.kind==='order'?shuffle(p.items.map((_,i)=>i),(opts.seed||1)+13):p.items.map(()=>null),choice:null,removed:[],selected:null};
  if(opts.revealed&&q.correct!==undefined){const key=JSON.parse(q.correct);if(['match','order','classify'].includes(q.kind))state.values=key;else if(q.kind==='eliminate')state.removed=p.items.map((_,i)=>i).filter(i=>i!==key);else state.choice=key;}
  const button=(label,attrs='')=>`<button type="button" class="iq-tile" ${attrs} ${disabled?'disabled':''}>${label}</button>`;
  root.classList.add('interactive-options');
  root.dataset.questionId=q.id;
  function value(){if(q.kind==='binary'||q.kind==='hotspot')return JSON.stringify(state.choice);if(q.kind==='eliminate')return state.removed.length===p.items.length-1?JSON.stringify(p.items.findIndex((_,i)=>!state.removed.includes(i))):'';return JSON.stringify(state.values);}
  function draw(){
    let html=`<div class="iq-heading"><span class="iq-seal">${esc(IQ.names[q.kind])}</span><span>點選即可 · 不用打字</span></div>`;
    if(q.kind==='match'||q.kind==='classify'){
      html+='<p class="iq-instruction">先選一張卡，再點目的地；也可拖動「移動」把手。</p><div class="iq-pairs"><div class="iq-items">';
      html+=p.items.map((s,i)=>button(`<span>${esc(s)}</span><small>${state.values[i]===null?'待安排':'→ '+esc(p.targets[state.values[i]])}</small><span class="iq-handle" data-drag="${i}" aria-hidden="true">⠿ 移動</span>`,`data-item="${i}" aria-pressed="${state.selected===i}"`)).join('');
      html+='</div><div class="iq-targets">'+p.targets.map((s,j)=>button(`<b>${esc(s)}</b><small>${q.kind==='match'?'配對位置':'分類營帳'}</small>`,`data-target="${j}"`)).join('')+'</div></div>';
    }else if(q.kind==='order'){
      html+='<p class="iq-instruction">由上至下排列先後。可拖動把手，或按「上移／下移」。</p><ol class="iq-order">'+state.values.map((i,pos)=>`<li data-position="${pos}"><span class="iq-number">${pos+1}</span>${button(esc(p.items[i])+`<span class="iq-handle" data-drag="${pos}" aria-hidden="true">⠿ 移動</span>`,`data-position="${pos}" aria-label="第 ${pos+1} 項：${esc(p.items[i])}"`)}<div class="iq-moves">${button('↑',`data-up="${pos}" aria-label="${esc(p.items[i])} 上移" ${pos===0?'disabled':''}`)}${button('↓',`data-down="${pos}" aria-label="${esc(p.items[i])} 下移" ${pos===state.values.length-1?'disabled':''}`)}</div></li>`).join('')+'</ol>';
    }else if(q.kind==='hotspot'){
      html+='<p class="iq-instruction">依據題幹與標註選位置。圖下亦有相同的地點按鈕。</p><div class="iq-map" role="group" aria-label="可點選的閱讀簡圖"><img src="'+esc(REMOTE||DEMO?'./assets/'+p.image:PUBLIC_CONFIG.assetBaseUrl+p.image)+'" alt="原創示意背景，判斷以地點標註為準"><span class="iq-compass">北 ↑<br>西　東<br>南 ↓</span>'+p.items.map((s,i)=>button(`<span>${i+1}</span>${esc(s)}`,`data-choice-index="${i}" aria-pressed="${state.choice===i}" style="left:${p.spots[i][0]}%;top:${p.spots[i][1]}%"`)).join('')+'</div><div class="iq-map-list">'+p.items.map((s,i)=>button(`${i+1} · ${esc(s)}`,`data-choice-index="${i}" aria-pressed="${state.choice===i}"`)).join('')+'</div>';
    }else if(q.kind==='binary'){
      html+='<p class="iq-instruction">左滑選「非」，右滑選「是」；也可直接點按鈕。最後按確認。</p><div class="iq-decision" tabindex="0" role="group" aria-label="左右判斷卡"><span class="iq-card-title">'+esc(state.choice===null?'審慎判斷':state.choice?'是 · 此說成立':'非 · 此說有誤')+'</span><div class="iq-binary">'+button('← 非',`data-binary="false" aria-pressed="${state.choice===false}"`)+button('是 →',`data-binary="true" aria-pressed="${state.choice===true}"`)+'</div></div>';
    }else{
      html+='<p class="iq-instruction">點選劃去三個錯項，留下唯一正解。再點可還原。</p><div class="iq-eliminate">'+p.items.map((s,i)=>button(`<span>${state.removed.includes(i)?'×':'○'}</span> ${esc(s)}`,`data-remove="${i}" aria-pressed="${state.removed.includes(i)}"`)).join('')+'</div>';
    }
    html+=`<p class="iq-status" aria-live="polite">${opts.revealed?'參考答案：'+esc(IQ.format(q)):(q.kind==='eliminate'?'已劃去 '+state.removed.length+' / 3 項':disabled?'本階段僅供閱讀；作答由主持人開放':'完成安排後，再確認答案。')}</p>`;
    if(!disabled)html+='<div class="iq-actions"><button type="button" class="btn ghost" data-reset>重布 · 重設</button><button type="button" class="btn primary" data-submit>確認答案</button></div>';
    root.innerHTML='<div class="iq-board">'+html+'</div>';
    if(opts.revealed)root.classList.add('iq-revealed');else root.classList.remove('iq-revealed');
    if(disabled)return;
    const one=s=>root.querySelector(s),all=s=>Array.from(root.querySelectorAll(s));
    one('[data-submit]').disabled=!IQ.validAnswer(q,value());
    function assign(i,j){
      if(q.kind==='match'){const previous=state.values.indexOf(j);if(previous>=0&&previous!==i)state.values[previous]=null;}
      state.values[i]=j;state.selected=null;draw();
    }
    all('[data-item]').forEach(b=>b.onclick=()=>{state.selected=Number(b.dataset.item);draw();});
    all('[data-target]').forEach(b=>b.onclick=()=>{if(state.selected===null){one('.iq-status').textContent='先選左邊的一張卡。';return;}assign(state.selected,Number(b.dataset.target));});
    const move=(from,to)=>{if(to<0||to>=state.values.length||from===to)return;const [item]=state.values.splice(from,1);state.values.splice(to,0,item);draw();};
    all('[data-up]').forEach(b=>b.onclick=()=>move(Number(b.dataset.up),Number(b.dataset.up)-1));
    all('[data-down]').forEach(b=>b.onclick=()=>move(Number(b.dataset.down),Number(b.dataset.down)+1));
    all('[data-choice-index]').forEach(b=>b.onclick=()=>{state.choice=Number(b.dataset.choiceIndex);draw();});
    all('[data-binary]').forEach(b=>b.onclick=()=>{state.choice=b.dataset.binary==='true';draw();});
    all('[data-remove]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.remove),idx=state.removed.indexOf(i);if(idx>=0)state.removed.splice(idx,1);else if(state.removed.length<3)state.removed.push(i);draw();});
    all('[data-drag]').forEach(handle=>{
      handle.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();const start=Number(handle.dataset.drag);handle.setPointerCapture(e.pointerId);handle.classList.add('dragging');handle.onpointerup=up=>{handle.releasePointerCapture(up.pointerId);const target=document.elementFromPoint(up.clientX,up.clientY);handle.classList.remove('dragging');if(q.kind==='order'){const drop=target?.closest('[data-position]');if(drop&&root.contains(drop))move(start,Number(drop.dataset.position));}else{const drop=target?.closest('[data-target]');if(drop&&root.contains(drop))assign(start,Number(drop.dataset.target));}};handle.onpointercancel=()=>handle.classList.remove('dragging');};
    });
    const decision=one('.iq-decision');if(decision){let start=null;decision.onpointerdown=e=>{if(e.target.closest('button'))return;start=[e.clientX,e.clientY];decision.setPointerCapture(e.pointerId);};decision.onpointerup=e=>{if(!start)return;const dx=e.clientX-start[0],dy=e.clientY-start[1];start=null;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5){state.choice=dx>0;draw();}};decision.onpointercancel=()=>{start=null;};decision.onkeydown=e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();state.choice=e.key==='ArrowRight';draw();}};}
    one('[data-reset]').onclick=()=>{state.values=q.kind==='order'?p.items.map((_,i)=>i):p.items.map(()=>null);state.choice=null;state.removed=[];state.selected=null;draw();};
    one('[data-submit]').onclick=async()=>{const v=value();if(!IQ.validAnswer(q,v))return;const b=one('[data-submit]');b.disabled=true;try{await opts.onSubmit(v);}catch(e){toast(e.message);}finally{if(root.contains(b))b.disabled=false;}};
  }
  draw();return state;
}
function mountLiveInteractive(r){
  const root=$('live-view').querySelector('.options'),q=r.question;if(!root)return;
  const key=live.pin+':'+r.state.index;
  const draft=iqLiveDrafts.get(key);
  const next=renderInteractive(root,q,{draft,disabled:r.isHost||r.state.phase!=='answer'||r.submitted,revealed:r.state.phase==='reveal',seed:Number(live.pin),onSubmit:async value=>{await rpc('submitLiveAnswer',live.pin,live.token,r.state.index,value);toast('軍報已提交，等候揭曉。');await refreshLive();}});
  iqLiveDrafts.set(key,next);if(iqLiveDrafts.size>30)iqLiveDrafts.delete(iqLiveDrafts.keys().next().value);
}
