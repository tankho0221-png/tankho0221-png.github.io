/* Original pentatonic score, synthesized locally: no external audio tracking. */
const WarMusic=(()=>{
 let ctx,master,timer=null,next=0,beat=0,enabled=false,level=.35,starting=false;const voices=new Set();
 const melody=[0,2,4,7,9,7,4,2,0,4,7,12,9,7,4,2,2,4,7,9,14,12,9,7,4,2,0,2,4,7,2,0];
 function note(midi,t,d,amp,type='triangle'){const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=440*2**((midi-69)/12);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(amp,t+.018);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(master);voices.add(o);o.onended=()=>{voices.delete(o);o.disconnect();g.disconnect();};o.start(t);o.stop(t+d+.03);}
 function tick(){if(!enabled||ctx.state!=='running')return;if(next<ctx.currentTime-.2)next=ctx.currentTime+.05;while(next<ctx.currentTime+.2){note(60+melody[beat%32],next,.9,.20);if(beat%4===0){note(36+[0,7,9,4][Math.floor(beat/8)%4],next,2.5,.28,'sine');note(48,next,.18,.16,'sine');}next+=60/84;beat++;}}
 function paint(){const b=document.getElementById('bgm');if(b){b.textContent=enabled?'♫ 軍樂 開':'♫ 軍樂 關';b.setAttribute('aria-pressed',String(enabled));}}
 function stop(){enabled=false;clearInterval(timer);timer=null;voices.forEach(o=>{try{o.stop();}catch(e){}});voices.clear();paint();}
 async function start(){if(enabled||starting)return;starting=true;try{ctx=ctx||new(window.AudioContext||window.webkitAudioContext)();if(!master){master=ctx.createGain();master.connect(ctx.destination);}await ctx.resume();if(ctx.state!=='running')throw Error('請再點選軍樂按鈕，以啟動聲音。');master.gain.value=level*.45;enabled=true;next=ctx.currentTime+.05;tick();timer=setInterval(tick,100);paint();}finally{starting=false;}}
 function volume(v){level=Math.max(0,Math.min(1,Number(v)/100));if(master)master.gain.setTargetAtTime(level*.45,ctx.currentTime,.08);}
 function init(){const b=document.getElementById('bgm'),v=document.getElementById('bgm-volume');if(!b)return;b.onclick=async()=>{b.disabled=true;try{if(enabled)stop();else await start();}catch(e){stop();toast(e.message||'此瀏覽器暫未能播放軍樂。');}finally{b.disabled=false;}};v.oninput=()=>volume(v.value);document.addEventListener('visibilitychange',()=>{if(document.hidden&&enabled)stop();});}
 return {init,start,stop,volume};
})();
