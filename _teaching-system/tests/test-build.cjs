const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
let passed=0;function test(name,fn){fn();passed++;console.log('PASS '+name);}
test('Pages demo uses relative versioned assets',()=>{const html=read('dist/pages/demo.html');assert(!html.includes('data:image'));assert.match(html,/\.\/app\.[a-f0-9]+\.js/);for(const m of html.matchAll(/(?:href|src)="(\.\/[^"?#]+)"/g))assert(fs.existsSync(path.join(root,'dist/pages',m[1])));});
test('All CSS artwork resolves beneath project URL',()=>{const file=fs.readdirSync(path.join(root,'dist/pages')).find(x=>x.startsWith('styles.'));for(const m of read('dist/pages/'+file).matchAll(/\.\/assets\/(art-\d+\.webp)/g))assert(fs.existsSync(path.join(root,'dist/pages/assets',m[1])));});
test('Source contains no original spreadsheet binding',()=>{assert(!read('apps-script/Code.gs').includes('1oOk1sFe'));assert(read('apps-script/Code.gs').includes("getProperty('SPREADSHEET_ID')"));});
test('Pages portal labels demo and current deployment version',()=>{assert(read('src/portal.html').includes('成績保存在本機'));assert(read('src/portal.js').includes('config.liveVersion'));});
test('Generated Apps Script JavaScript parses',()=>{new vm.Script(read('dist/apps-script/Code.gs'));new vm.Script(read('dist/apps-script/index.html').match(/<script>([\s\S]*?)<\/script>/)[1]);});
test('Portal JavaScript parses',()=>new vm.Script(read('src/portal.js')));
function resolveEntry(search) {
  const html=read('dist/pages/play.html');
  const link={};let destination;
  vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],{
    URL,URLSearchParams,document:{getElementById:id=>{assert.equal(id,'open-system');return link;}},
    window:{location:{search,replace:url=>{destination=url;}}}
  });
  assert.equal(link.href,destination);
  assert(!html.includes('<iframe'));
  assert(!/src="\.\/app\./.test(html));
  return new URL(destination);
}
test('Public entry opens the configured native app without a cross-site bridge',()=>{
  assert.equal(resolveEntry('').href,JSON.parse(read('config/public.json')).liveUrl);
});
test('Public entry preserves classroom and Chinese practice links',()=>{
  const params=new URLSearchParams({mode:'live',pin:'012345',chapter:'論仁、論孝、論君子',count:'5',seed:'1234'});
  const target=resolveEntry('?'+params);
  for(const [key,value] of params)assert.equal(target.searchParams.get(key),value);
});
test('Public entry discards capabilities and cannot be made an open redirect',()=>{
  const target=resolveEntry('?hostToken=secret&token=secret&bridge=1&channel=secret&redirect=https://example.com&chapter='+ 'a'.repeat(300));
  assert.equal(target.origin,'https://script.google.com');
  for(const key of ['hostToken','token','bridge','channel','redirect'])assert.equal(target.searchParams.get(key),null);
  assert.equal(target.searchParams.get('chapter').length,200);
  assert.equal(target.hash,'');
});
console.log(JSON.stringify({passed,total:9}));
