'use strict';
async function connect(){
  const link=document.getElementById('live'),status=document.getElementById('status');
  try{
    const response=await fetch('./config.json',{cache:'no-store'});
    if(!response.ok)throw Error('設定未能載入');
    const config=await response.json();
    if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(config.liveUrl))throw Error('老師尚未設定正式課堂網址');
    const url=new URL('./play.html',location.href),params=new URLSearchParams(location.search);
    for(const key of ['mode','pin','chapter','count','seed'])if(params.has(key))url.searchParams.set(key,params.get(key));
    link.href=url.href;link.removeAttribute('aria-disabled');link.textContent='進入正式課堂 ↗';
    status.textContent='目前課堂版本：'+config.liveVersion;
  }catch(error){link.textContent='課堂暫未接通';status.textContent=error.message+'。你仍可使用試玩。';}
}
connect();
