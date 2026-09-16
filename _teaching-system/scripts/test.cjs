const {spawnSync}=require('node:child_process');
const path=require('node:path');
for(const name of ['test-competition.cjs','test-learning.cjs','test-interactive.cjs','test-online.cjs','test-build.cjs','test-bridge.cjs']) {
  const result=spawnSync(process.execPath,[path.join(__dirname,'../tests',name)],{stdio:'inherit'});
  if(result.status!==0) process.exit(result.status||1);
}


