// Cross-origin transport. Google credentials stay inside Google's frame.
const remoteTransport=(()=>{
  let ready=null,peer=null,peerOrigin='',channel='',frame=null;
  const waiting=new Map();
  function connect(){
    if(ready)return ready;
    channel=crypto.randomUUID();
    ready=new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>{ready=null;frame?.remove();reject(Error('Google 資料服務未接通。請確認已部署新版後端，並允許本網站網址。'));},25000);
      const listener=e=>{
        const d=e.data;
        if(!d||d.channel!==channel||d.kind!=='rtk-ready'||!/^https:\/\/([a-z0-9-]+\.)?googleusercontent\.com$/.test(e.origin))return;
        peer=e.source;peerOrigin=e.origin;clearTimeout(timeout);window.removeEventListener('message',listener);resolve();
      };
      window.addEventListener('message',listener);
      frame=document.createElement('iframe');frame.hidden=true;frame.title='Google 資料連接';frame.referrerPolicy='no-referrer';
      const url=new URL(PUBLIC_CONFIG.liveUrl);url.searchParams.set('bridge','1');url.searchParams.set('channel',channel);frame.src=url.href;document.body.appendChild(frame);
    });return ready;
  }
  window.addEventListener('message',e=>{
    const d=e.data;if(e.source!==peer||e.origin!==peerOrigin||!d||d.channel!==channel||d.kind!=='rtk-result')return;
    const request=waiting.get(d.id);if(!request)return;waiting.delete(d.id);clearTimeout(request.timer);
    if(d.error)request.reject(Error(d.error));else request.resolve(d.result);
  });
  return {async call(name,args){await connect();return new Promise((resolve,reject)=>{
    const id=crypto.randomUUID(),timer=setTimeout(()=>{waiting.delete(id);reject(Error('Google 回應逾時，請重試；已提交的答案不會重複計分。'));},30000);
    waiting.set(id,{resolve,reject,timer});peer.postMessage({kind:'rtk-call',channel,id,name,args},peerOrigin);
  });}};
})();
