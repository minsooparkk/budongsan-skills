#!/usr/bin/env node
/** Upstream calculation regressions, adapted only to use the shipped runtime.
 * Run: node tests/upstream-audit-calc-core.cjs
 * Source hashes and adaptation scope: docs/source-provenance.md
 */
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const out = path.join(__dirname, '..', 'engine', 'runtime');

const load = name => require(path.join(out, `${name}.js`));
const A = load('auction'), F = load('finance'), I = load('invest'), U = load('units'), L = load('lease'), G = load('gift'), C = load('acquisition'), W = load('won'), Fees = load('fees');
const B = load('brokerage');
let checks = 0, failures = 0;
function test(name, fn) { checks++; try { fn(); } catch (e) { failures++; console.error(`FAIL ${name}: ${e.message}`); } }
function isolated(module, fn, input) { return JSON.parse(execFileSync(process.execPath, ['-e', `process.stdout.write(JSON.stringify(require(${JSON.stringify(path.join(out, module + '.js'))})[${JSON.stringify(fn)}](${JSON.stringify(input)})))`], { timeout: 750, maxBuffer: 1000000, encoding:'utf8' })); }
function invalid(r) { assert.ok(r.validationError); assert.equal(r.headline[0].displayValue, '입력 확인 필요'); assert.doesNotMatch(JSON.stringify(r), /NaN|Infinity/); }
test('money decimal preserves won', () => { assert.equal(W.manToWon('37.5'), 375000); assert.equal(W.wonToMan(375000), 37.5); assert.equal(W.grouped('1234.5678'), '1,234.5678'); });
test('leading decimal money accepted without inflation',()=>assert.equal(W.manToWon('.5'),5000));
test('large safe won retains exact decimal input', () => { assert.equal(W.manToWon('450359962737.0004'), 4503599627370004); assert.equal(W.manToWon('900719925474.0991'), Number.MAX_SAFE_INTEGER); assert.ok(Number.isNaN(W.manToWon('900719925474.0992'))); });
test('safe won display and parse roundtrip exactly', () => { for(const value of [0,1,375000,4503599627370004,Number.MAX_SAFE_INTEGER]) assert.equal(W.manToWon(W.wonToManText(value)), value); });
test('money malformed/overflow rejected', () => { assert.ok(Number.isNaN(W.manToWon('1.2.3'))); assert.ok(Number.isNaN(W.manToWon('9'.repeat(400)))); });
for (const failures of [-1, 0.5, 1e308]) test(`auction count ${failures} rejected`, () => invalid(isolated('auction','calcMinBid',{...A.EMPTY_MIN_BID, failures})));
test('zero appraisal is explicit', () => invalid(A.calcMinBid({...A.EMPTY_MIN_BID, appraisal:0})));
test('invalid appraisal method rejected', () => invalid(I.calcAppraisal({...I.EMPTY_APPRAISAL, method:'bogus'})));
test('DCF unbounded years rejected', () => invalid(isolated('invest','calcAppraisal',{...I.EMPTY_APPRAISAL, method:'dcf', years:1e308})));
test('zero useful life rejected', () => invalid(I.calcResidual({...I.EMPTY_RESIDUAL, life:0})));
test('invalid loan region rejected', () => invalid(F.calcAuctionLoan({...F.EMPTY_AUCTION_LOAN, region:'bogus'})));
test('invalid unit rejected', () => invalid(U.calcLength({...U.EMPTY_LENGTH, unit:'bogus'})));
for (const patch of [{years:1,graceYears:5},{years:1.1},{years:1e308},{repay:'bogus'}]) test(`loan invalid ${JSON.stringify(patch)}`, () => invalid(isolated('finance','calcLoanInterest',{...F.EMPTY_LOAN_INTEREST,...patch})));
for (const repay of ['annuity','principal','bullet']) for (const months of [1,12,13,360,600]) for (const rate of [0,0.042,1e-12]) {
  test(`principal conservation ${repay}/${months}/${rate}`, () => { const s=F.schedule(400000000,rate,months,repay,months>12?12:0); assert.ok(Math.abs(s.rows.reduce((n,r)=>n+r.principal,0)-400000000)<0.01); assert.equal(s.rows.at(-1).balance,0); });
}
test('savings huge loop rejected', () => invalid(isolated('finance','calcSavings',{...F.EMPTY_SAVINGS,kind:'installment',compound:true,months:1e308})));
for(const fn of ['calcDsr','calcDti']) test(`${fn} zero income`,()=>invalid(F[fn]({...F[fn==='calcDsr'?'EMPTY_DSR':'EMPTY_DTI'],income:0})));
for(const [fn,defaults,patch] of [['calcDsr','EMPTY_DSR',{rate:11}],['calcDsr','EMPTY_DSR',{rate:9,stress:2}],['calcDti','EMPTY_DTI',{rate:11}],['calcRefinance','EMPTY_REFINANCE',{newRate:11}],['calcRefinance','EMPTY_REFINANCE',{currentRate:11}]]) test(`${fn} unsupported rate ${JSON.stringify(patch)}`,()=>invalid(F[fn]({...F[defaults],...patch})));
test('zero RTI rate explicit',()=>invalid(F.calcRti({...F.EMPTY_RTI,rate:0})));
test('sub-won RTI interest explicit',()=>invalid(F.calcRti({...F.EMPTY_RTI,amount:0.5})));
test('invalid fair-price acquisition rate rejected',()=>invalid(I.calcFairPrice({...I.EMPTY_FAIR,acquisitionRate:-1})));
test('unknown bond category rejected',()=>invalid(Fees.calcBond({...Fees.EMPTY_BOND,kind:'bogus'})));
test('unknown brokerage deal rejected',()=>invalid(B.calcBrokerage({...B.EMPTY_BROKERAGE,deal:'bogus'})));
test('zero imputed rate explicit',()=>invalid(F.calcImputedIncome({...F.EMPTY_IMPUTED,healthRate:0})));
test('zero installment no NaN advice',()=>assert.doesNotMatch(JSON.stringify(F.calcSavings({...F.EMPTY_SAVINGS,kind:'installment',monthly:0})),/NaN|Infinity/));
for(const from of ['', '2026-02-31','2026-09-08']) test(`bad date ${from}`,()=>invalid(U.calcDate({from,to:'2026-09-07'})));
const dateCases=[{from:'2024-03-01',to:'2024-04-01'}, {from:'2024-01-31',to:'2024-03-01'}, {from:'2024-02-29',to:'2025-02-28'}];
test('date-only across time zones',()=>{ const run=tz=>execFileSync(process.execPath,['-e',`const u=require(${JSON.stringify(path.join(out,'units.js'))});process.stdout.write(JSON.stringify(${JSON.stringify(dateCases)}.map(x=>u.calcDate(x))))`],{env:{...process.env,TZ:tz},encoding:'utf8'});const reference=run('UTC'); for(const tz of ['Asia/Seoul','America/New_York','America/Los_Angeles'])assert.equal(run(tz),reference); });
test('noncurrency headlines explicit',()=>{ for(const r of [U.calcArea(U.EMPTY_AREA),U.calcLength(U.EMPTY_LENGTH),U.calcDate(U.EMPTY_DATE),F.calcDsr(F.EMPTY_DSR)])assert.ok(r.headline[0].displayValue); });
test('insurance upper bound satisfies regional cap',()=>assert.equal(L.calcInsurance({...L.EMPTY_INSURANCE,homePrice:1000000000}).maxDeposit,700000000));
test('insurance exact decimal fee',()=>assert.equal(L.calcInsurance({...L.EMPTY_INSURANCE,feeRate:0.0012}).fee,960000));
test('rent increase waiting is primary',()=>assert.match(L.calcIncrease({...L.EMPTY_INCREASE,monthsSince:0}).headline[0].displayValue,/불가/));
test('negative break-even remains impossible',()=>{const r=L.calcCompare({...L.EMPTY_COMPARE,jeonse:100000000,loanShare:0,wolseDeposit:200000000,monthly:0});assert.equal(r.breakEvenMonthly,-250000);assert.match(r.headline[2].displayValue,/없음/);assert.doesNotMatch(r.tips[0].title,/0원 이하면/);});
test('appraisal formula shared',()=>{const r=A.calcAuctionCost({...A.EMPTY_AUCTION_COST,appraisal:1000000000});assert.equal(r.headline[2].value,Fees.calcAppraisalFee({value:1000000000,factor:0.8,expenses:0,vat:true}).total);});
test('cumulative gifts do not deduct prior allowance twice',()=>{const r=G.calcGift({...G.EMPTY_GIFT,realEstate:100000000,priorGift:100000000,usedDeduction:50000000,priorIncludedDeduction:50000000,priorGiftGrossTax:5000000,priorTaxBase:50000000,priorDetailsConfirmed:true});assert.equal(r.taxBase,150000000);assert.equal(r.payable,14550000);});
test('prior gross-tax credit uses prior taxable base cap',()=>{const r=G.calcGift({...G.EMPTY_GIFT,realEstate:100000000,priorGift:100000000,usedDeduction:50000000,priorIncludedDeduction:50000000,priorGiftGrossTax:50000000,priorTaxBase:50000000,priorDetailsConfirmed:true});assert.equal(r.priorCredit,20000000/3);});
test('unknown prior tax does not produce complete recommendation',()=>invalid(G.calcGift({...G.EMPTY_GIFT,priorGift:100000000})));
test('known zero prior tax retains valid full deduction',()=>{const r=G.calcGift({...G.EMPTY_GIFT,realEstate:40000000,priorGift:10000000,usedDeduction:10000000,priorIncludedDeduction:10000000,priorTaxBase:0,priorGiftGrossTax:0,priorDetailsConfirmed:true});assert.equal(r.validationError,undefined);assert.equal(r.payable,0);assert.equal(r.taxBase,0);});
for(const relation of ['other','spouse','kin','lineal-asc']) test(`incompatible prior marriage gift ${relation}`,()=>invalid(G.calcGift({...G.EMPTY_GIFT,relation,realEstate:100000000,priorGift:100000000,usedMarriageBirth:100000000,priorIncludedMarriageBirth:100000000,priorDetailsConfirmed:true})));
test('minor deduction history cannot exceed selected cap',()=>invalid(G.calcGift({...G.EMPTY_GIFT,minor:true,priorGift:50000000,usedDeduction:50000000,priorIncludedDeduction:50000000,priorDetailsConfirmed:true})));
test('legacy cash-paid credit is not silently reinterpreted',()=>invalid(G.calcGift({...G.EMPTY_GIFT,priorGift:100000000,priorGiftTaxPaid:4850000})));
test('unsupported historical gift year rejected',()=>invalid(G.calcGift({...G.EMPTY_GIFT,year:2010})));
test('split events preserve debt and lifetime allowance',()=>{const s=G.calcGiftSplit({...G.EMPTY_GIFT,realEstate:500000000,assumedDebt:100000000,marriageBirth:true});assert.equal(s.first.transferPortion+s.second.transferPortion,100000000);assert.equal(s.first.marriageDeduction+s.second.marriageDeduction,100000000);assert.equal(s.total,s.first.payable+s.second.payable);});
test('split odd won preserved',()=>{const s=G.calcGiftSplit({...G.EMPTY_GIFT,realEstate:500000001});assert.equal(s.firstInput.realEstate+s.secondInput.realEstate,500000001);});
test('split debt follows actual odd asset allocation',()=>{const s=G.calcGiftSplit({...G.EMPTY_GIFT,realEstate:1,cash:1,stock:1,etc:1,assumedDebt:4});assert.equal(s.first.transferPortion+s.second.transferPortion,4);});
test('gift exact decimal rate and filing credit boundaries',()=>{for(let i=1;i<=2000;i++){const base=500000+i*1549991; const [,percent,quick]=[[100000000,10,0],[500000000,20,10000000],[1000000000,30,60000000],[3000000000,40,160000000],[Infinity,50,460000000]].find(([limit])=>base<=limit);const expected=Number((BigInt(base)*BigInt(percent)-BigInt(quick)*100n)*97n/100000n*10n);const r=G.calcGift({...G.EMPTY_GIFT,realEstate:base+50000000});assert.equal(r.payable,expected);}});
test('official acquisition 7억 example',()=>{const r=C.calcAcquisition({...C.EMPTY_ACQUISITION,price:700000000});assert.equal(r.rate,0.016667);assert.equal(r.acquisitionTax,11666900);});
test('acquisition decimal arithmetic over arbitrary amounts',()=>{for(let n=1;n<=3001;n++){const price=600000000+n*99991; const r=C.calcAcquisition({...C.EMPTY_ACQUISITION,price,area:84}); const rate=BigInt(Math.round(r.rate*1000000));assert.equal(r.acquisitionTax,Number(BigInt(price)*rate/10000000n*10n));assert.equal(r.eduTax,Number(BigInt(price)*rate/100000000n*10n));}});
console.log(`${checks-failures}/${checks} audit calculator checks passed`);
process.exitCode=failures?1:0;
