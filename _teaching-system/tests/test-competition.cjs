const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const c=vm.createContext({});for(const f of ['interactive-core.js','question-import.js','bank-package.js','competition.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../src',f),'utf8'),c);const C=vm.runInContext('Competition',c);let n=0;
function test(name,f){f();n++;console.log('PASS '+name);}
test('Ranks tie fairly without speed or submission-order bonus',()=>assert.equal(JSON.stringify(C.standings([{score:3},{score:6},{score:6},{score:0}]).map(p=>p.rank)),'[1,1,3,4]'));
test('Progress counts submissions independently of correctness',()=>{const a=C.summary([{score:0,answered:true},{score:3,answered:false}]);assert.equal(a.submitted,1);assert.equal(a.remaining,1);assert.equal(a.percent,50);});
test('Empty room has finite zero progress',()=>assert.equal(C.summary([]).percent,0));
test('Other players submitting does not replace active answer controls',()=>{const a={state:{phase:'answer',index:0},question:{id:'x'},submitted:false,isHost:false,players:[]};const b={...a,players:[{answered:true}]};assert.equal(C.questionKey(a),C.questionKey(b));assert.notEqual(C.questionKey(a),C.questionKey({...b,submitted:true}));});
test('Phase changes reveal and replace the question controls',()=>{const a={state:{phase:'answer'},question:{id:'x'}};assert.notEqual(C.questionKey(a),C.questionKey({...a,state:{phase:'reveal'}}));});
test('Bank packages reject empty and oversized collections',()=>{assert.throws(()=>c.validateBankPackage({format:'chinese-unit-bank-v1',mc:[],interactive:[]}));assert.throws(()=>c.validateBankPackage({format:'chinese-unit-bank-v1',mc:Array(101).fill({}),interactive:[]}));});
test('Bank package validates interactive answer keys before writing',()=>assert.throws(()=>c.validateBankPackage({format:'chinese-unit-bank-v1',mc:[],interactive:[{kind:'binary',chapter:'測試',sentence:'測試',explanation:'解釋',key:'true'}]})));
test('Mixed package preserves valid multiple choice and interactive questions',()=>{const p=c.validateBankPackage({format:'chinese-unit-bank-v1',mc:[{chapter:'測試',sentence:'見友人',targetWord:'見',correct:'看見',distractors:['聽見','走路','休息']}],interactive:[{kind:'binary',chapter:'測試',sentence:'題幹',explanation:'解釋',key:true}]});assert.equal(p.mc.length+p.interactive.length,2);});
console.log(JSON.stringify({competitionPassed:n,total:n}));
