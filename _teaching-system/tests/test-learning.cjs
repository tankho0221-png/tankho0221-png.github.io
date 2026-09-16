const assert=require('node:assert/strict'),vm=require('node:vm');
const {ctx,game,$}=require('./test-client.cjs');
const learning=vm.runInContext('Learning',ctx);let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name);}
test('Guided practice rejects answers until a clue and confidence are recorded',()=>{
  const g=game();g.guided=true;g.learning={};ctx.answer(g.questions[0].correct);
  assert.equal(g.answers.length,0);assert.equal(g.attempts.length,0);
  g.learning[0]={clue:0};ctx.answer(g.questions[0].correct);assert.equal(g.answers.length,0);
  g.learning[0].confidence='unsure';ctx.answer(g.questions[0].correct);
  assert.equal(g.score,3);assert.equal(g.answers.length,1);
});
test('Uncertain students are not penalized or assigned mastery from their clue',()=>{
  assert(learning.ready({clue:0,confidence:'unsure'}));
  assert(!learning.ready({clue:-1,confidence:'sure'}));
  assert(!learning.ready({clue:0,confidence:'unknown'}));
});
test('Reflection is required before advancing guided practice',()=>{
  const g=game();g.guided=true;g.learning={0:{clue:0,confidence:'sure'}};g.done=true;
  g.questions.push({...g.questions[0],id:'two'});ctx.advance();assert.equal(g.index,0);
  g.learning[0].reflection=2;ctx.advance();assert.equal(g.index,1);
});
test('Disabling guidance preserves direct practice',()=>{
  const g=game();g.guided=false;ctx.answer(g.questions[0].correct);assert.equal(g.score,3);
});
test('Sentence segmentation limits controls and preserves a short original text',()=>{
  assert.equal(learning.chunks('先讀原文，再說理由。').join(''),'先讀原文，再說理由。');
  assert(learning.chunks('甲'.repeat(5000)).length<=24);
  assert.equal(learning.chunks('').length,0);
});
test('Result summary distinguishes first answers, corrections and self-reported help',()=>{
  const s=learning.summary({answers:[{firstCorrect:true,score:3},{firstCorrect:false,score:1},{firstCorrect:false,score:0}],learning:{0:{clue:0,reflection:0},1:{clue:1,reflection:2}}});
  assert.equal(s.first,1);assert.equal(s.corrected,1);assert.equal(s.needHelp,1);assert.equal(s.clues,2);
});
test('Unchanged live polls preserve the DOM instead of destroying active controls',()=>{
  vm.runInContext("live={pin:'123456',token:'test'};lastLiveRender=''",ctx);
  const r={state:{status:'WAITING',phase:'think',index:0},question:null,players:[],isHost:false};
  ctx.renderLive(r);$('live-view').innerHTML='existing interactive DOM';ctx.renderLive(r);
  assert.equal($('live-view').innerHTML,'existing interactive DOM');
  r.players=[{name:'QA',isMe:false,answered:false}];ctx.renderLive(r);assert($('competition-board').innerHTML.includes('QA'));assert.equal($('live-view').innerHTML,'existing interactive DOM');
});
console.log(JSON.stringify({learningPassed:passed,total:passed}));

test('Classroom interactive board opens for discussion and retains draft for showing answers',()=>{
  const g=game('classroom');g.questions=[{id:'classify',kind:'classify',chapter:'test',sentence:'test',payload:{items:['a','b','c'],targets:['x','y']},correct:'[0,1,0]',distractors:[]}];
  const render=ctx.renderInteractive,calls=[],draft={values:[1,null,null]};ctx.renderInteractive=(root,q,o)=>{calls.push(o);return o.draft||draft;};
  try{g.phase=0;ctx.renderQuestion();assert.equal(calls.length,1);assert.equal(calls[0].disabled,true);
    g.phase=1;ctx.renderPhase();assert.equal(calls.at(-1).disabled,false);assert.equal(calls.at(-1).boardOnly,true);
    g.phase=2;ctx.renderPhase();assert.equal(calls.at(-1).draft,draft);assert.equal(calls.at(-1).disabled,false);
    g.phase=3;ctx.renderPhase();assert.equal(calls.at(-1).disabled,true);assert.equal(calls.at(-1).revealed,true);assert.equal(g.teams[0].score,0);
  }finally{ctx.renderInteractive=render;}
});
test('Original text is readable before answering and safely escaped separately from prompt',()=>{
 const html=ctx.sentenceHTML({sentence:'【原文】\n甲曰：<script>不可信</script>\n【題目】\n先後如何？',targetWord:'時序布陣'});
 assert(html.includes('<details class="question-reading" open>'));assert(html.includes('&lt;script&gt;'));assert(!html.includes('<script>'));assert(html.includes('<div class="question-task">先後如何？</div>'));
});
