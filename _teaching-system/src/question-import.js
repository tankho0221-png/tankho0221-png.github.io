// Copy directly from seven to nine Google Sheets columns; each row is one question.
function parseQuestionPaste(text) {
  const lines=String(text).replace(/^\uFEFF/,'').trim().split(/\r?\n/);
  if(!lines[0]) throw Error('請先貼上題目。');
  if(/^(篇章|chapter)\t/.test(lines[0])) lines.shift();
  if(lines.length>100) throw Error('每次最多加入 100 題。');
  return lines.map((line,i)=>{
    const cells=line.split('\t').map(x=>x.trim());
    if(cells.length<7||cells.length>9||cells.slice(0,7).some(x=>!x))throw Error(`第 ${i+1} 題：請填齊篇章、原句、目標字詞、正解及三個錯項，共 7 至 9 欄。`);
    if(new Set(cells.slice(3,7)).size!==4)throw Error(`第 ${i+1} 題：四個選項不可重複。`);
    return {chapter:cells[0],sentence:cells[1],targetWord:cells[2],correct:cells[3],distractors:cells.slice(4,7),hint:cells[7]||'',explanation:cells[8]||''};
  });
}
function openQuestionImport(){
  if(DEMO){toast('新增題目需要進入正式 Google 課堂並以教師身分登入。');return;}
  showModal('補充軍糧 · 批次加題',`<p>從 Google Sheets 複製 7 至 9 欄，直接貼到下方。每行一題，最多 100 題。</p><p class="muted">篇章｜原句｜目標字詞｜正解｜錯項 1｜錯項 2｜錯項 3｜提示（選填）｜解釋（選填）</p><label for="question-paste">貼上題目</label><textarea id="question-paste" name="questions" rows="9" style="width:100%;font-size:16px" required></textarea>`,async data=>{
    const questions=parseQuestionPaste(data.get('questions'));
    showModal('確認新增 '+questions.length+' 題',`<p>只加入新題，不會覆蓋原有題目；與原題庫重複的題目會略過。</p><div style="max-height:45vh;overflow:auto">${questions.map((q,i)=>`<article class="list-row"><div><b>${i+1}.《${esc(q.chapter)}》${esc(q.targetWord)}</b><p>${esc(q.sentence)}</p><p>正解：${esc(q.correct)}<br>錯項：${q.distractors.map(esc).join('／')}</p></div></article>`).join('')}</div>`,async()=>{
      const result=await rpc('importQuestions',teacherToken,questions);
      boot=await rpc('getBootstrap');renderCamp();closeModal();toast(`已加入 ${result.added} 題；略過重複 ${result.skipped} 題。`);
    },'確認加入題庫');
  },'檢查並預覽');
}
