'use strict';
const assert = require('node:assert/strict');
const {catalog,evaluate,prepare} = require('../scripts/calculator.cjs');
const entries = catalog();
const example = id => structuredClone(entries.find(e=>e.id===id).example);
const run = (id, updates) => evaluate(id,{...example(id),...updates});
let checks = 0;
function test(label,fn){try{fn();checks++;}catch(e){e.message=label+': '+e.message;throw e;}}
test('월세 증가가 없어도 리모델링 계산은 성공한다',()=>{
  const r=run('remodeling',{rentIncrease:0});assert.equal(r.status,'calculated');assert.equal(r.result.payback,null);assert.ok(r.result.paybackExplanation);
});
test('대환 절감액이 없으면 회수불가를 표시한다',()=>{
  const r=run('daehwan',{currentRate:0.04,newRate:0.06});assert.equal(r.status,'calculated');assert.equal(r.result.breakEvenMonths,null);assert.ok(r.result.breakEvenExplanation);
});
test('복비 정액 상한 없음은 요율 상한의 부재가 아니다',()=>{
  const r=run('junggae',{});assert.equal(r.status,'calculated');assert.equal(r.result.cap,null);assert.ok(r.result.maxRate>0);assert.ok(r.result.capExplanation);
});
test('비주택 등기의 취득세를 누락하지 않는다',()=>{
  const a=example('deunggi');a.kind='building';delete a.houses;delete a.area;delete a.regulated;
  const r=evaluate('deunggi',a);assert.equal(r.status,'calculated');assert.ok(r.result.acquisition.total>0);
});
test('기간 모순을 거부한다',()=>assert.equal(run('yangdo',{liveYears:20,holdYears:5}).status,'invalid_input'));
test('근로소득이 없다는 수정에 이전 금액을 합산하지 않는다',()=>assert.equal(run('jonghap',{hasEarned:false,earned:10000000}).status,'invalid_input'));
test('전용면적은 계약면적을 넘을 수 없다',()=>assert.equal(run('noc',{exclusive:200,area:165}).status,'invalid_input'));
test('기존 보증금보다 큰 전환액을 몰래 줄이지 않는다',()=>assert.equal(run('jeonwolse',{direction:'toMonthly',amount:400000000,deposit:300000000}).status,'invalid_input'));
test('주택 증여 취득세는 특수사례 표기를 우회해도 중단한다',()=>assert.equal(run('chwideuk',{cause:'gift',kind:'house',specialCase:false}).status,'needs_review'));
test('감면 선택 후 추가 사실을 묻는다',()=>assert.equal(run('jeungyeo',{marriageBirth:true}).status,'needs_input'));
const gift={marriageBirth:true,giftDate:'2026-08-15',eventType:'marriage',eventDate:'2025-08-15'};
test('확인한 혼인기간 안에서 계산한다',()=>assert.equal(run('jeungyeo',gift).status,'calculated'));
test('혼인기간 밖이면 혜택을 자동 적용하지 않는다',()=>assert.equal(run('jeungyeo',{...gift,eventDate:'2020-08-15'}).status,'needs_review'));
test('존재하지 않는 공제 날짜를 거부한다',()=>assert.equal(run('jeungyeo',{...gift,eventDate:'2025-02-30'}).status,'invalid_input'));
test('증여일의 연월 모순을 거부한다',()=>assert.equal(run('jeungyeo',{...gift,giftDate:'2026-09-15'}).status,'invalid_input'));
test('출생 전 증여에는 출산 공제를 적용하지 않는다',()=>assert.equal(run('jeungyeo',{...gift,eventType:'birth',eventDate:'2026-09-15'}).status,'needs_review'));
test('재건축 기간은 지정 기준일로 계산한다',()=>{
  const r=run('jaegeonchuk',{completedYear:2000,limitYears:30,_meta:{asOf:'2028-01-01'}});
  assert.equal(r.status,'calculated');assert.equal(r.result.yearsLeft,2);
});
for(const e of entries){
 test(e.id+' 정규화 입력 재실행',()=>{
   const a=evaluate(e.id,e.example);const b=evaluate(e.id,a.inputs);assert.equal(b.status,'calculated');assert.deepEqual(b.result,a.result);
 });
 if(e.rulesKind==='dated')test(e.id+' 다른 연도 자동세율 방지',()=>assert.equal(run(e.id,{_meta:{asOf:'2020-01-01'}}).status,'needs_review'));
 if(e.preset)for(const key of Object.keys(e.preset))test(e.id+' 고정값 변경 방지 '+key,()=>assert.equal(run(e.id,{[key]:'changed'}).status,'invalid_input'));
}
console.log(`Conversation regressions passed: ${checks}`);
