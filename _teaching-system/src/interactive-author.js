function openInteractiveAuthor(kind='match'){
  const name=IQ.names[kind],sample=IQ_SAMPLES.find(q=>q.kind===kind);
  const lines=q=>q.kind==='match'?q.payload.items.map((s,i)=>s+' | '+q.payload.targets[q.key[i]]).join('\n'):q.kind==='classify'?q.payload.items.map((s,i)=>s+' | '+q.payload.targets[q.key[i]]).join('\n'):q.kind==='order'?q.key.map(i=>q.payload.items[i]).join('\n'):q.kind==='binary'?'':q.payload.items.join('\n');
  const help={match:'每行一組「詞語 | 正確意思」。例如：吾 | 我。共 2 至 6 組。',order:'每行一項，按正確先後次序輸入。共 3 至 6 項，出題時自動打亂。',classify:'每行一組「句子 | 類別」。共 3 至 6 項，類別須有 2 至 3 種。',hotspot:'每行一個地點名稱，共 2 至 6 個。使用下方預設位置；題幹須配合標註位置。',binary:'學生以左右滑動或是非按鈕作答。請直接選擇正解。',eliminate:'每行一個解釋，共 4 項。學生劃去三項，留下正解。'};
  const fields=`<p>教師編題表單；學生作答全用點選或拖曳。</p><label for="iq-kind">題型</label><select id="iq-kind">${Object.entries(IQ.names).map(([v,n])=>`<option value="${v}" ${v===kind?'selected':''}>${n}</option>`).join('')}</select><label for="iq-chapter">篇章／單元</label><input id="iq-chapter" name="chapter" maxlength="200" value="${esc(sample.chapter)}" required><label for="iq-prompt">題幹／閱讀材料</label><textarea id="iq-prompt" name="sentence" rows="3" maxlength="4000" required>${esc(sample.sentence)}</textarea><p class="muted">${esc(help[kind])}</p>${kind!=='binary'?`<label for="iq-items">項目（每行一項）</label><textarea id="iq-items" name="items" rows="5" required>${esc(lines(sample))}</textarea>`:''}${['hotspot','eliminate'].includes(kind)?`<label for="iq-key">正解項目編號（按上方輸入次序）</label><select id="iq-key" name="key">${Array.from({length:kind==='eliminate'?4:6},(_,i)=>`<option value="${i}" ${sample.key===i?'selected':''}>第 ${i+1} 項</option>`).join('')}</select>`:''}${kind==='binary'?'<label for="iq-key">正解</label><select id="iq-key" name="key"><option value="true">是</option><option value="false">非</option></select>':''}${kind==='hotspot'?'<p class="muted">位置依次：中上、西中、東中、南中、西北、東北。背景只作示意；以標註為準。</p><label for="iq-image">背景</label><select id="iq-image" name="image"><option value="art-10.webp">軍議桌</option><option value="art-00.webp">古地圖</option><option value="art-09.webp">軍營</option><option value="art-08.webp">藏書閣</option></select>':''}<label for="iq-hint">提示（選填）</label><input id="iq-hint" name="hint" maxlength="2000" value="${esc(sample.hint)}"><label for="iq-explanation">答案解釋</label><textarea id="iq-explanation" name="explanation" maxlength="2000" rows="2" required>${esc(sample.explanation)}</textarea><button type="button" class="btn ghost" id="iq-samples">預覽六款示範題</button>`;
  showModal('兵法編題 · '+name,fields,async f=>{
    const items=String(f.get('items')||'').trim().split(/\r?\n/).map(s=>s.trim());
    const raw={kind,chapter:String(f.get('chapter')),sentence:String(f.get('sentence')),hint:String(f.get('hint')),explanation:String(f.get('explanation')),payload:{}};
    if(kind==='match'||kind==='classify'){
      const pairs=items.map(s=>{const a=s.split(/\s*[|｜]\s*/);if(a.length!==2||a.some(x=>!x))throw Error('每行請使用「項目 | 正解／類別」。');return a;});
      raw.payload.items=pairs.map(a=>a[0]);raw.payload.targets=[...new Set(pairs.map(a=>a[1]))].reverse();raw.key=pairs.map(a=>raw.payload.targets.indexOf(a[1]));
    }else if(kind==='order'){raw.payload.items=items.slice().reverse();raw.key=items.map((_,i)=>items.length-1-i);}
    else if(kind==='binary')raw.key=f.get('key')==='true';
    else{raw.payload.items=items;raw.key=Number(f.get('key'));if(kind==='hotspot'){raw.payload.image=String(f.get('image'));raw.payload.spots=[[50,35],[20,55],[80,55],[50,80],[20,20],[80,20]].slice(0,items.length);}}
    previewInteractiveAuthor([raw]);
  },'預覽並試玩');
  $('iq-kind').onchange=e=>openInteractiveAuthor(e.target.value);
  $('iq-samples').onclick=()=>previewInteractiveAuthor(IQ_SAMPLES);
}
function previewInteractiveAuthor(rawQuestions){
  const questions=rawQuestions.map(q=>IQ.validate(q));
  showModal('校閱軍令 · '+questions.length+' 題',`<p>確認後新增到私人 Google Sheets。相同題型、篇章及題幹會略過，不覆蓋舊題。</p>${questions.map((q,i)=>`<section class="iq-preview"><h3>${i+1}. ${esc(q.chapter)} · ${esc(IQ.names[q.kind])}</h3><p>${esc(q.sentence)}</p><div id="iq-preview-${i}"></div><p class="gold">正解：${esc(IQ.format(q))}</p><p>${esc(q.explanation)}</p></section>`).join('')}`,async()=>{
    if(DEMO){toast('這是本機預覽。正式版登入教師後，才能加入 Google Sheets。');return;}
    const result=await rpc('importInteractiveQuestions',teacherToken,rawQuestions);boot=await rpc('getBootstrap');renderCamp();closeModal();showView('camp');toast(`已加入 ${result.added} 題；略過重複 ${result.skipped} 題。`);
  },DEMO?'示範版不儲存':'確認加入題庫');
  questions.forEach((q,i)=>renderInteractive($('iq-preview-'+i),q,{seed:37,onSubmit:value=>toast(value===q.correct?'預覽作答正確。':'預覽作答未正確，可調整後再試。')}));
}
