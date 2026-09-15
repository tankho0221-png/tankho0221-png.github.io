// Shared, deterministic question validation used by the browser and Apps Script.
// Answer keys never belong in public live-session payloads.
const IQ = (() => {
  const names = {match:'連環配對',order:'時序布陣',classify:'分營歸類',hotspot:'輿圖尋蹤',binary:'是非軍令',eliminate:'去偽存真'};
  const text = (v, max=500) => {
    if(typeof v!=='string'||!v.trim()||v.length>max||/[<>\u0000-\u0008]/.test(v))throw Error('文字不可留空、過長或包含 HTML 標籤。');
    return v.trim();
  };
  const list = (v,min=2,max=6) => {
    if(!Array.isArray(v)||v.length<min||v.length>max)throw Error(`請提供 ${min} 至 ${max} 個項目。`);
    const a=v.map(x=>text(x));if(new Set(a).size!==a.length)throw Error('項目不可重複。');return a;
  };
  const indices=(v,n,limit,unique=false)=>{
    if(!Array.isArray(v)||v.length!==n||v.some(x=>!Number.isInteger(x)||x<0||x>=limit)||(unique&&new Set(v).size!==n))throw Error('正解與項目不符。');return v.slice();
  };
  function validate(raw){
    if(!raw||!names[raw.kind])throw Error('請選擇有效題型。');
    const q={kind:raw.kind,chapter:text(raw.chapter,200),sentence:text(raw.sentence,4000),targetWord:names[raw.kind],hint:raw.hint?text(raw.hint,2000):'',explanation:text(raw.explanation,2000),payload:{},distractors:[]};
    const p=raw.payload||{},out=q.payload;let key;
    if(q.kind==='match'){
      out.items=list(p.items);out.targets=list(p.targets);if(out.items.length!==out.targets.length)throw Error('配對兩邊的項目數目須相同。');key=indices(raw.key,out.items.length,out.targets.length,true);
    }else if(q.kind==='order'){
      out.items=list(p.items,3);key=indices(raw.key,out.items.length,out.items.length,true);
    }else if(q.kind==='classify'){
      out.items=list(p.items,3);out.targets=list(p.targets,2,3);key=indices(raw.key,out.items.length,out.targets.length);
    }else if(q.kind==='hotspot'){
      out.items=list(p.items,2,6);
      out.image=typeof p.image==='string'&&/^art-\d{2}\.webp$/.test(p.image)&&Number(p.image.slice(4,6))<=12?p.image:'art-00.webp';
      if(!Array.isArray(p.spots)||p.spots.length!==out.items.length)throw Error('每個地點需要一個位置。');
      out.spots=p.spots.map(x=>{if(!Array.isArray(x)||x.length!==2||x.some(n=>!Number.isFinite(n)||n<10||n>90))throw Error('地點位置須在圖內 10% 至 90%。');return x.slice();});
      out.spots.forEach((x,i)=>{if(out.spots.some((y,j)=>j<i&&Math.hypot(x[0]-y[0],x[1]-y[1])<18))throw Error('地點太接近，請移開以免觸控重疊。');});
      key=indices([raw.key],1,out.items.length)[0];
    }else if(q.kind==='binary'){
      out.items=['非','是'];if(typeof raw.key!=='boolean')throw Error('請指定是或非。');key=raw.key;
    }else {
      out.items=list(p.items,4,4);key=indices([raw.key],1,4)[0];
    }
    q.correct=JSON.stringify(key);return q;
  }
  function validAnswer(q,value){
    try{
      if(typeof value!=='string'||value.length>500)return false;const a=JSON.parse(value),p=q.payload;
      if(q.kind==='binary')return typeof a==='boolean';
      if(['hotspot','eliminate'].includes(q.kind))return Number.isInteger(a)&&a>=0&&a<p.items.length;
      indices(a,p.items.length,q.kind==='order'?p.items.length:p.targets.length,q.kind!=='classify');return true;
    }catch(e){return false;}
  }
  function format(q,value=q.correct){
    try{const a=JSON.parse(value),p=q.payload;if(q.kind==='binary')return a?'是':'非';if(['hotspot','eliminate'].includes(q.kind))return p.items[a];if(q.kind==='order')return a.map(i=>p.items[i]).join(' → ');return a.map((j,i)=>p.items[i]+' → '+p.targets[j]).join('；');}catch(e){return '尚未作答';}
  }
  return {names,validate,validAnswer,format};
})();
