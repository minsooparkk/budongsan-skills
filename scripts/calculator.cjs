#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT = '2026-09-07';
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const plain = o => o !== null && typeof o === 'object' && !Array.isArray(o);
const clone = o => JSON.parse(JSON.stringify(o));

function catalog() {
  return fs.readdirSync(path.join(ROOT, 'catalog')).filter(f => f.endsWith('.json'))
    .sort().flatMap(f => JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog', f), 'utf8')));
}
function condition(c, values) {
  if (!c) return true;
  if (Array.isArray(c)) return c.every(item => condition(item, values));
  return own(values, c.key) && (c.values ? c.values.includes(values[c.key]) : values[c.key] === c.value);
}
function active(field, values) {
  if (field.appliesWhen && !condition(field.appliesWhen, values)) return false;
  if (field.requiredWhen) return condition(field.requiredWhen, values);
  if (field.requiredUnless) return !condition(field.requiredUnless, values);
  return true;
}
function required(field, values) {
  return active(field, values) && (field.required || !!field.requiredWhen || !!field.requiredUnless);
}
function validate(value, field, location) {
  if (value === null && field.nullable) return [];
  const bad = reason => [`${location}: ${reason}`];
  if (field.type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) return bad('단위에 맞는 유한한 숫자를 입력해 주세요.');
    if ((field.integer || field.unit === '원') && !Number.isSafeInteger(value)) return bad('정수를 입력해 주세요.');
    if (value < (field.min ?? 0) || value > (field.max ?? Number.MAX_SAFE_INTEGER)) return bad('허용 범위를 확인해 주세요.');
  } else if (field.type === 'boolean') {
    if (typeof value !== 'boolean') return bad('예 또는 아니요에 해당하는 true/false가 필요합니다.');
  } else if (field.type === 'enum') {
    if (!field.options.some(o => o.value === value)) return bad('안내된 선택지 중 하나를 선택해 주세요.');
  } else if (field.type === 'string') {
    if (typeof value !== 'string' || !value.trim() || value.length > 500) return bad('비어 있지 않은 짧은 문자를 입력해 주세요.');
    if (field.pattern && !new RegExp(field.pattern).test(value)) return bad('입력 형식을 확인해 주세요.');
    if (field.format === 'date' && !validDate(value)) return bad('YYYY-MM-DD 형식의 실제 날짜가 필요합니다.');
  } else if (field.type === 'array') {
    if (!Array.isArray(value) || value.length > (field.maxItems ?? 200)) return bad('허용 개수 이내의 목록이 필요합니다.');
    if (field.minItems != null && value.length < field.minItems) return bad('목록 항목이 부족합니다.');
    return value.flatMap((v, i) => Array.isArray(field.items)
      ? validateObject(v, field.items, `${location}[${i}]`)
      : validate(v, field.items ?? {type:'number'}, `${location}[${i}]`));
  } else if (field.type === 'object') {
    return validateObject(value, field.fields ?? field.items ?? [], location);
  } else return bad('지원하지 않는 입력 형식입니다.');
  return [];
}
function validateObject(value, fields, location) {
  if (!plain(value)) return [`${location}: 항목별 값이 필요합니다.`];
  const errors = Object.keys(value).filter(k => !fields.some(f => f.key === k)).map(k => `${location}.${k}: 알 수 없는 항목입니다.`);
  for (const f of fields) {
    if (!own(value, f.key)) {
      if (f.required !== false) errors.push(`${location}.${f.key}: 값이 필요합니다.`);
    } else errors.push(...validate(value[f.key], f, `${location}.${f.key}`));
  }
  return errors;
}
function prepare(entry, answers) {
  if (!plain(answers)) return {status:'invalid_input', errors:['답변은 항목별 객체로 입력해 주세요.']};
  const allowed = new Set([...entry.fields.map(f => f.key), ...Object.keys(entry.preset ?? {}), '_meta']);
  const errors = Object.keys(answers).filter(k => !allowed.has(k)).map(k => `${k}: 알 수 없는 항목입니다.`);
  for (const [key,value] of Object.entries(entry.preset ?? {})) {
    if (own(answers,key) && JSON.stringify(answers[key]) !== JSON.stringify(value)) errors.push(`${key}: 이 계산기의 고정 조건을 바꿀 수 없습니다.`);
  }
  const values = {...clone(entry.preset ?? {}), ...answers};
  delete values._meta;
  // Resolve selector defaults before evaluating conditional questions, independent of field order.
  for (const field of entry.fields) {
    if (!own(values, field.key) && !field.required && !field.requiredWhen && !field.requiredUnless && own(field, 'default')) values[field.key] = clone(field.default);
  }
  const missing = [], assumptions = [];
  for (const field of entry.fields) {
    const isActive = active(field, values);
    const supplied = own(answers, field.key);
    if (!isActive && supplied && own(field,'default') && JSON.stringify(answers[field.key]) !== JSON.stringify(field.default)) {
      errors.push(`${field.key}: 선택을 바꾸기 전의 답이 남아 있습니다. 해당하지 않는 항목을 제거한 뒤 다시 계산해 주세요.`);
      continue;
    }
    if (!supplied && required(field, values)) {
      missing.push(field);
      continue;
    }
    if (!supplied && own(field, 'default')) {
      values[field.key] = clone(field.default);
      if (isActive) assumptions.push({key:field.key, value:values[field.key], explanation:field.assumption});
    }
    const inactivePlaceholder = !isActive && own(field,'default') && JSON.stringify(values[field.key]) === JSON.stringify(field.default);
    if (own(values, field.key) && !inactivePlaceholder) errors.push(...validate(values[field.key], field, field.key));
  }
  if (own(answers, '_meta')) {
    if (!plain(answers._meta)) errors.push('_meta: 기준일 객체가 필요합니다.');
    else {
      for (const k of Object.keys(answers._meta)) if (k !== 'asOf') errors.push(`_meta.${k}: 알 수 없는 항목입니다.`);
      if (answers._meta.asOf != null && !validDate(answers._meta.asOf)) errors.push('_meta.asOf: YYYY-MM-DD 실제 날짜가 필요합니다.');
    }
  }
  for (const c of entry.comparisons ?? []) {
    if (c.when && !condition(c.when, values)) continue;
    if (!own(values,c.left) || !own(values,c.right)) continue;
    if (typeof values[c.left] !== 'number' || typeof values[c.right] !== 'number') continue;
    if ((c.op === '<=' && values[c.left] > values[c.right]) || (c.op === '>=' && values[c.left] < values[c.right])) errors.push(c.message);
  }
  for (const p of entry.dateParts ?? []) {
    if (p.when && !condition(p.when, values)) continue;
    if (!validDate(values[p.date])) continue;
    if (Number(values[p.date].slice(0,4)) !== values[p.year] || Number(values[p.date].slice(5,7)) !== values[p.month]) errors.push(p.message);
  }
  if (errors.length) return {status:'invalid_input', errors, missing};
  if (missing.length) return {status:'needs_input', missing, message:'계산하려면 필수 질문에 답해 주세요. 이미 알려주신 정보는 다시 묻지 않습니다.'};
  return {status:'ready', values, assumptions};
}
function validDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
function execute(entry, values, asOf) {
  if (!/^[a-z-]+$/.test(entry.module)) throw new Error('잘못된 엔진 경로');
  const mod = require(path.join(ROOT, 'engine/runtime', entry.module + '.js'));
  if (entry.call === 'bandTable') {
    const table = mod.BAND_TABLES.find(t => t.id === values.table);
    if (!table) throw new Error('세율표를 찾을 수 없습니다.');
    const r = mod.applyTable(values.taxBase, table);
    return {...r, tax:Math.floor(r.tax / 10) * 10, table:table.name, law:table.law};
  }
  if (entry.call === 'boyuseCase') {
    const selected = mod.CASES.find(c => c.key === values.caseKey || c.id === values.caseKey);
    if (!selected) throw new Error('명의 유형을 찾을 수 없습니다.');
    return mod.calculateCase(selected, values, values.regime);
  }
  if (entry.call === 'transferCurrent') return mod.calcYear(values, 2026, 'current');
  if (entry.id === 'jaegeonchuk') {
    const eligibleYear = values.completedYear + values.limitYears;
    const yearsLeft = eligibleYear - Number(asOf.slice(0,4));
    return {
      eligibleYear, yearsLeft,
      headline:[{label:'입력한 연한에 따른 도래 연도',value:0,displayValue:`${eligibleYear}년`}],
      steps:[{label:'준공연도 + 적용 연한',value:`${values.completedYear} + ${values.limitYears} = ${eligibleYear}`},{label:'기준일의 연도',value:asOf.slice(0,4)},{label:'남은 기간',value:yearsLeft>0?`${yearsLeft}년`:'입력한 연한 도래'}],
      tips:[{level:'watch',title:'연한만 계산한 결과입니다',body:'진단·정비계획·인가 등 실제 재건축 요건 충족을 뜻하지 않습니다.'}]
    };
  }
  if (typeof mod[entry.export] !== 'function') throw new Error('계산 함수를 찾을 수 없습니다.');
  return mod[entry.export](values);
}
function evaluate(id, answers) {
  const entry = catalog().find(e => e.id === id);
  if (!entry) return {status:'invalid_input',errors:['계산기 이름을 확인해 주세요. list 명령으로 목록을 볼 수 있습니다.']};
  const prepared = prepare(entry, answers);
  if (prepared.status !== 'ready') return {calculator:id, ...prepared};
  const guardErrors = [];
  for (const g of entry.guards ?? []) {
    if (g.when && !condition(g.when, prepared.values)) continue;
    const v = prepared.values[g.key];
    if ((own(g, 'equals') && v !== g.equals) || (own(g, 'min') && v < g.min) || (own(g, 'max') && v > g.max)) guardErrors.push(g.message);
  }
  if (guardErrors.length) return {status:'needs_review',calculator:id,message:'이 조건은 간편 계산 범위를 벗어납니다.',reasons:guardErrors};
  let result;
  const asOf = answers._meta?.asOf ?? SNAPSHOT;
  if (entry.rulesKind === 'dated' && !asOf.startsWith('2026-')) {
    return {status:'needs_review',calculator:id,message:'다른 연도의 세율은 자동 적용되지 않습니다.',reasons:['요청 기준일의 법령을 별도로 확인해야 합니다. 동봉 계산식은 2026년 기준 예상 계산용입니다.']};
  }
  for (const w of entry.dateWindows ?? []) {
    if (w.when && !condition(w.when, prepared.values)) continue;
    const value = prepared.values[w.date], anchor = prepared.values[w.anchor];
    if (!validDate(value) || !validDate(anchor)) return {status:'invalid_input',calculator:id,errors:['공제 확인용 날짜가 필요합니다.']};
    const shift = n => {
      const d = new Date(anchor+'T00:00:00Z'), month=d.getUTCMonth();
      d.setUTCFullYear(d.getUTCFullYear()+n);
      if (d.getUTCMonth() !== month) d.setUTCDate(0);
      return d.toISOString().slice(0,10);
    };
    if (value < shift(-w.yearsBefore) || value > shift(w.yearsAfter)) return {status:'needs_review',calculator:id,message:'공제의 날짜 조건을 충족하지 않습니다.',reasons:[w.message]};
  }
  try { result = execute(entry, prepared.values, asOf); }
  catch (err) { return {status:'calculation_error',calculator:id,message:err.message}; }
  const engineErrors = [];
  function collectErrors(value) {
    if (!value || typeof value !== 'object') return;
    if (typeof value.validationError === 'string') engineErrors.push(value.validationError);
    for (const item of Object.values(value)) if (item && typeof item === 'object') collectErrors(item);
  }
  collectErrors(result);
  if (engineErrors.length) return {status:'invalid_input',calculator:id,errors:[...new Set(engineErrors)]};
  if (entry.id === 'daehwan' && result.breakEvenMonths === Infinity) result = {...result,breakEvenMonths:null,breakEvenExplanation:'월 상환액 절감이 없어 비용을 회수할 수 없습니다.'};
  if (entry.id === 'remodeling' && result.payback === Infinity) result = {...result,payback:null,paybackExplanation:'월세 증가가 없어 월세로 공사비를 회수할 수 없습니다.'};
  if (entry.id === 'junggae' && result.cap === Infinity) result = {...result,cap:null,capExplanation:'별도의 정액 한도가 없는 구간입니다. 요율에 따른 보수 상한은 적용됩니다.'};
  let nonfinite = false;
  JSON.stringify(result, (_, v) => { if (typeof v === 'number' && !Number.isFinite(v)) nonfinite = true; return v; });
  if (nonfinite) return {status:'calculation_error',calculator:id,message:'유한한 계산 결과를 만들 수 없는 입력입니다.'};
  return {
    status:'calculated', calculator:id, title:entry.title,
    resultLabel:entry.mode === 'scenario' ? '가정 시뮬레이션 결과' : '입력과 기본 전제에 따른 예상 결과',
    rulesSnapshotDate:SNAPSHOT, asOf,
    rulesKind:entry.rulesKind,
    lawStatus:entry.rulesKind === 'arithmetic' ? '입력한 수치와 명시한 계산식 기준입니다.' : '동봉된 계산식 기준입니다. 기준일의 법령·고시·약정과 대조해야 하며 최신 세법 검증을 뜻하지 않습니다.',
    inputs:prepared.values, assumptions:prepared.assumptions,
    notes:entry.notes ?? [], result
  };
}
function readInput(file) {
  const text = fs.readFileSync(file === '-' ? 0 : file, 'utf8');
  if (Buffer.byteLength(text) > 1_000_000) throw new Error('입력 파일은 1MB 이하여야 합니다.');
  return JSON.parse(text);
}
function main(argv) {
  const [command, id, file] = argv;
  if (command === 'list') return catalog().map(({id,title,description,mode}) => ({id,title,description,mode}));
  if (command === 'describe') {
    const entry = catalog().find(e => e.id === id);
    if (!entry) throw new Error('계산기 이름을 확인해 주세요.');
    return entry;
  }
  if (command === 'calculate' || command === 'questions') {
    const answers = file ? readInput(file) : {};
    if (command === 'calculate') return evaluate(id, answers);
    const entry = catalog().find(e => e.id === id);
    if (!entry) throw new Error('계산기 이름을 확인해 주세요.');
    const state = prepare(entry, answers);
    return {...state, optional:entry.fields.filter(f => !required(f, state.values ?? answers) && active(f, state.values ?? answers) && !own(answers, f.key))};
  }
  return {usage:'node scripts/calculator.cjs list | describe <id> | questions <id> [answers.json] | calculate <id> <answers.json|->',units:'금액은 원, 비율은 각 질문에 표시된 단위입니다. 일반 사용자는 자연어로 답하고 AI가 입력 파일을 작성합니다.'};
}
if (require.main === module) {
  try {
    const output = main(process.argv.slice(2));
    process.stdout.write(JSON.stringify(output, null, 2) + '\n');
    if (['invalid_input','calculation_error'].includes(output.status)) process.exitCode = 1;
  } catch (err) {
    process.stdout.write(JSON.stringify({status:'invalid_input',message:err.message}) + '\n');
    process.exitCode = 1;
  }
}
module.exports = {catalog, prepare, evaluate, validate, active, required, validDate};
