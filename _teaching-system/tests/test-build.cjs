const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
let passed=0;function test(name,fn){fn();passed++;console.log('PASS '+name);}
test('Pages demo uses relative versioned assets',()=>{const html=read('dist/pages/demo.html');assert(!html.includes('data:image'));assert.match(html,/\.\/app\.[a-f0-9]+\.js/);for(const m of html.matchAll(/(?:href|src)="(\.\/[^"?#]+)"/g))assert(fs.existsSync(path.join(root,'dist/pages',m[1])));});
test('All CSS artwork resolves beneath project URL',()=>{const file=fs.readdirSync(path.join(root,'dist/pages')).find(x=>x.startsWith('styles.'));for(const m of read('dist/pages/'+file).matchAll(/\.\/assets\/(art-\d+\.webp)/g))assert(fs.existsSync(path.join(root,'dist/pages/assets',m[1])));});
test('Source contains no original spreadsheet binding',()=>{assert(!read('apps-script/Code.gs').includes('1oOk1sFe'));assert(read('apps-script/Code.gs').includes("getProperty('SPREADSHEET_ID')"));});
test('Pages portal labels demo and current deployment version',()=>{assert(read('src/portal.html').includes('成績保存在本機'));assert(read('src/portal.js').includes('config.liveVersion'));});
test('Generated Apps Script JavaScript parses',()=>{new vm.Script(read('dist/apps-script/Code.gs'));new vm.Script(read('dist/apps-script/index.html').match(/<script>([\s\S]*?)<\/script>/)[1]);});
test('Portal JavaScript parses',()=>new vm.Script(read('src/portal.js')));
console.log(JSON.stringify({passed,total:6}));
