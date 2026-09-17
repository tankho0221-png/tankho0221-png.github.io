const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const write = (p, value) => { fs.mkdirSync(path.dirname(path.join(root,p)), {recursive:true}); fs.writeFileSync(path.join(root,p), value); };
const config = JSON.parse(read('config/public.json'));
if (config.liveUrl && !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(config.liveUrl)) throw Error('liveUrl 必須是 Google Apps Script /exec 網址');
if (config.assetBaseUrl && (!/^https:\/\/[A-Za-z0-9.-]+\/[A-Za-z0-9/_-]*$/.test(config.assetBaseUrl) || !config.assetBaseUrl.endsWith('/'))) throw Error('assetBaseUrl 必須是 HTTPS 路徑，並以 / 結尾');
const safeJson = value => JSON.stringify(value).replace(/</g,'\\u003c');
const js = 'const PUBLIC_CONFIG='+safeJson(config)+';\n'+read('src/interactive-core.js')+'\nconst IQ_SAMPLES='+safeJson(JSON.parse(read('data/interactive-samples.json')))+';\nconst DEMO_QUESTIONS='+safeJson(JSON.parse(read('data/demo-questions.json')))+'.concat(IQ_SAMPLES.map((q,i)=>({...IQ.validate(q),id:"iq-demo-"+i})));\n'+read('vendor/qrcode.js')+'\n'+read('src/remote.js')+'\n'+read('src/question-import.js')+'\n'+read('src/interactive-ui.js')+'\n'+read('src/interactive-author.js')+'\n'+read('src/competition.js')+'\n'+read('src/bank-package.js')+'\n'+read('src/learning.js')+'\n'+read('src/session.js')+'\n'+read('src/music.js')+'\n'+read('src/live.js')+'\n'+read('src/teacher.js')+'\n'+read('src/app.js');
const css = read('src/styles.css')+'\n'+read('src/interactive.css')+'\n'+read('src/learning.css')+'\n'+read('src/competition.css');
const template = read('src/index.html');
const hash = crypto.createHash('sha256').update(css+js).digest('hex').slice(0,12);
const cssName = `styles.${hash}.css`, jsName = `app.${hash}.js`;
// Only remove generated output inside this project's dist directory.
const dist = path.join(root,'dist');
fs.rmSync(dist, {recursive:true,force:true});
fs.mkdirSync(dist,{recursive:true});
fs.cpSync(path.join(root,'public/assets'),path.join(dist,'pages/assets'),{recursive:true});
write('dist/pages/'+cssName, css);
write('dist/pages/'+jsName, js);
write('dist/pages/demo.html', template.replace('<!-- STYLES -->',()=>`<link rel="stylesheet" href="./${cssName}">`).replace('<!-- SCRIPTS -->',()=>`<script src="./${jsName}" defer></script>`));
// Open the live app as a top-level page. A Google bridge embedded on GitHub
// depends on cross-site browser policies; the native app uses google.script.run.
if (!config.liveUrl) throw Error('liveUrl is required for the public entry');
write('dist/pages/play.html', `<!doctype html>
<html lang="zh-HK"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>出師北伐 · 正在開啟</title>
<style>body{margin:0;padding:24px;background:#14291f;color:#f4eedb;font:18px/1.7 system-ui,sans-serif}main{max-width:560px;margin:12vh auto}a{display:inline-block;padding:14px 24px;background:#ecd494;color:#14291f;border-radius:8px}a:focus-visible{outline:3px solid white;outline-offset:5px}</style>
</head><body><main><h1>出師北伐</h1><p role="status">正在開啟教學系統；如未自動跳轉，請按下方按鈕。</p>
<a id="open-system" href="${config.liveUrl}">開啟教學系統</a>
<noscript><p>教學系統需要 JavaScript，請啟用後開啟。</p></noscript></main>
<script>
(function () {
  var target = new URL(${safeJson(config.liveUrl)});
  var incoming = new URLSearchParams(window.location.search);
  ['mode', 'pin', 'chapter', 'count', 'seed'].forEach(function (key) {
    var value = incoming.get(key);
    if (value !== null) target.searchParams.set(key, value.slice(0, 200));
  });
  document.getElementById('open-system').href = target.href;
  window.location.replace(target.href);
}());
</script></body></html>`);
write('dist/pages/index.html',read('src/portal.html'));
write('dist/pages/portal.css',read('src/portal.css'));
write('dist/pages/portal.js',read('src/portal.js'));
write('dist/pages/config.json',JSON.stringify(config));
write('dist/pages/.nojekyll','');
write('dist/pages/QR-LICENSE.txt',read('vendor/QR-LICENSE.txt'));
const gasCss = css.replace(/\.\/assets\/(art-\d+\.webp)/g,(_,name)=>config.assetBaseUrl ? config.assetBaseUrl+name : 'data:image/webp;base64,'+fs.readFileSync(path.join(root,'public/assets',name)).toString('base64'));
write('dist/apps-script/index.html',template.replace('<!-- STYLES -->',()=>'<style>'+gasCss+'</style>').replace('<!-- SCRIPTS -->',()=>'<script>'+js+'</script>'));
write('dist/apps-script/Code.gs',read('src/interactive-core.js')+'\n'+read('apps-script/Code.gs')+'\nfunction bridgeDocument_(){return '+JSON.stringify(read('apps-script/bridge.html'))+';}\n');
write('dist/apps-script/appsscript.json',read('apps-script/appsscript.json'));
write('dist/build-report.json',JSON.stringify({version:'4.4.0',assetCount:fs.readdirSync(path.join(root,'public/assets')).length,htmlBytes:Buffer.byteLength(fs.readFileSync(path.join(dist,'pages/demo.html'))),gasHtmlBytes:Buffer.byteLength(fs.readFileSync(path.join(dist,'apps-script/index.html'))),assetMode:config.assetBaseUrl?'external':'embedded'},null,2));
console.log(read('dist/build-report.json'));
