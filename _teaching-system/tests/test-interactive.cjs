const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {ctx,sheets,cache}=require('./test-backend.cjs');
const iq=vm.runInContext('IQ',ctx),samples=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/interactive-samples.json'),'utf8'));
let passed=0;function test(name,fn){fn();passed++;console.log('PASS '+name);}
test('Explicit UTF-8 distinguishes Chinese characters and schools',()=>{assert.notEqual(ctx.hash_('甲'),ctx.hash_('乙'));assert.notEqual(ctx.identityKey_({studentSchool:'甲校',studentClass:'2A',studentNumber:'01'}),ctx.identityKey_({studentSchool:'乙校',studentClass:'2A',studentNumber:'01'}));});
for(const sample of samples)test(sample.kind+' validates, formats and accepts its canonical answer',()=>{const q=iq.validate(sample);assert(iq.validAnswer(q,q.correct));assert(iq.format(q).length>0);assert(!iq.validAnswer(q,'null'));assert(!iq.validAnswer(q,'[]'));});
test('Invalid matching reuse, sequence duplicates and unsupported HTML are rejected',()=>{assert.throws(()=>iq.validate({...samples[0],key:[0,0,1]}));assert.throws(()=>iq.validate({...samples[1],key:[1,1,2]}));assert.throws(()=>iq.validate({...samples[0],sentence:'<img onerror=x>'}));});
test('Hotspots reject outside and overlapping touch targets',()=>{assert.throws(()=>iq.validate({...samples[3],payload:{...samples[3].payload,spots:[[50,50],[50,50],[80,55],[50,80]]}}));assert.throws(()=>iq.validate({...samples[3],key:99}));});
test('Teacher import refuses unauthenticated and validates before creating rows',()=>{const count=sheets.get('InteractiveBank').data.length;assert.throws(()=>ctx.importInteractiveQuestions('invalid',samples));const token=ctx.teacherLogin('test-only-password').token;assert.throws(()=>ctx.importInteractiveQuestions(token,[samples[0],{...samples[1],key:[0,0,1]}]));assert.equal(sheets.get('InteractiveBank').data.length,count);});
const teacher=ctx.teacherLogin('test-only-password').token;
test('Six formats persist once and duplicate retries cannot add rows',()=>{assert.equal(ctx.importInteractiveQuestions(teacher,samples).added,6);assert.equal(ctx.importInteractiveQuestions(teacher,samples).skipped,6);assert.equal(sheets.get('InteractiveBank').data.length,7);cache.delete('v2:bank');assert.equal(ctx.bank_().filter(q=>q.kind).length,6);});
for(const [i,sample] of samples.entries()){
  test(sample.kind+' practice is scored by stored answer and live payload hides key',()=>{
    const profile={studentSchool:'QA',studentClass:'QA',studentNumber:String(80+i)};
    const run=ctx.startPractice(profile,{chapter:sample.chapter,count:1,seed:10}),q=run.questions[0];
    const r=ctx.savePractice(run.runId,[{id:q.id,attempts:[q.correct],score:99999}]);assert.equal(r.score,3);
    assert.equal(ctx.savePractice(run.runId,[{id:q.id,attempts:[]}]).score,3);
    const room=ctx.createLiveRoom(teacher,{chapter:sample.chapter,count:1}),player=ctx.joinLiveRoom(room.pin,profile);
    ctx.hostLiveAction(room.pin,room.hostToken,'start');const publicQ=ctx.getLiveState(room.pin,player.playerToken).question;
    assert.equal(publicQ.correct,undefined);assert.equal(publicQ.key,undefined);assert.equal(publicQ.payload.key,undefined);
    assert.throws(()=>ctx.submitLiveAnswer(room.pin,player.playerToken,0,q.correct));
    ctx.hostLiveAction(room.pin,room.hostToken,'answer');assert.throws(()=>ctx.submitLiveAnswer(room.pin,player.playerToken,0,'null'));
    ctx.submitLiveAnswer(room.pin,player.playerToken,0,q.correct);assert.equal(ctx.getLiveState(room.pin,player.playerToken).myScore,0);
    ctx.hostLiveAction(room.pin,room.hostToken,'reveal');assert.equal(ctx.getLiveState(room.pin,player.playerToken).myScore,3);
  });
}
test('New modules parse and touch controls have non-drag alternatives',()=>{const ui=fs.readFileSync(path.join(__dirname,'../src/interactive-ui.js'),'utf8');new vm.Script(ui);new vm.Script(fs.readFileSync(path.join(__dirname,'../src/interactive-author.js'),'utf8'));assert(ui.includes('data-up'));assert(ui.includes('data-target'));assert(ui.includes('data-binary'));assert(ui.includes('onpointercancel'));});
console.log(JSON.stringify({interactivePassed:passed}));

