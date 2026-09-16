function validateBankPackage(value){
  if(!value||value.format!=='chinese-unit-bank-v1'||!Array.isArray(value.mc)||!Array.isArray(value.interactive))throw Error('請使用 chinese-unit-bank-v1 格式的單元題庫。');
  if(value.mc.length+value.interactive.length===0||value.mc.length>100||value.interactive.length>100)throw Error('每份題庫須有題目；選擇題及互動題各最多 100 題。');
  const mc=value.mc.map(q=>parseQuestionPaste([q.chapter,q.sentence,q.targetWord,q.correct,...(q.distractors||[]),q.hint||'',q.explanation||''].join('\t'))[0]);
  const interactive=value.interactive.map(q=>{IQ.validate(q);return q;});
  return {mc,interactive};
}
function openBankPackage(){
  showModal('匯入完整單元題庫','<p>選擇本機 JSON 題庫，先校閱再新增。檔案只送往你的私人 Google Sheets；不會上載 GitHub。可重試，重複題目會略過。</p><label for="bank-file">單元題庫檔案（最多 2 MB）</label><input type="file" id="bank-file" accept=".json,application/json" required>',async()=>{
    const file=$('bank-file').files[0];if(!file||file.size>2*1024*1024)throw Error('請選擇 2 MB 以下的 JSON 檔案。');
    const pack=validateBankPackage(JSON.parse(await file.text()));previewBankPackage(pack);
  },'檢查並校閱');
}
function previewBankPackage(pack){
  const all=pack.mc.concat(pack.interactive),chapters=[...new Set(all.map(q=>q.chapter))];
  showModal('校閱單元題庫 · '+all.length+' 題',`<p>${chapters.map(esc).join('／')}<br>選擇題 ${pack.mc.length} 題 · 互動題 ${pack.interactive.length} 題</p><div style="max-height:48vh;overflow:auto">${all.map((q,i)=>`<article class="iq-preview"><b>${i+1}. ${esc(q.kind?IQ.names[q.kind]:'詞義選擇')}</b><p>${esc(q.sentence)}</p><p>正解：${esc(q.kind?IQ.format(IQ.validate(q)):q.correct)}</p><p>${esc(q.explanation||'')}</p></article>`).join('')}</div><p id="bank-progress" role="status">確認後新增，不覆蓋原有題目。兩類題目分批儲存；中途失敗可重試。</p>`,async()=>{
    if(DEMO){toast('示範版只可校閱；正式版登入教師後才能匯入。');return;}
    let added=0,skipped=0;
    for(const [method,questions] of [['importQuestions',pack.mc],['importInteractiveQuestions',pack.interactive]]){
      if(!questions.length)continue;$('bank-progress').textContent=`正在加入${method==='importQuestions'?'選擇':'互動'}題…`;
      const r=await rpc(method,teacherToken,questions);added+=r.added;skipped+=r.skipped;
    }
    boot=await rpc('getBootstrap');renderCamp();closeModal();showView('camp');toast(`題庫已儲存：新增 ${added} 題，略過 ${skipped} 題。`);
  },DEMO?'示範版不儲存':'確認加入私人題庫');
}
