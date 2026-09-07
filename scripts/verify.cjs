#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const {catalog,evaluate,prepare,required,active} = require('./calculator.cjs');
const root = path.resolve(__dirname,'..');
const entries = catalog();
let checks = 0;
function check(fn) { fn(); checks++; }
check(() => assert.equal(entries.length, 58, '전체 계산기 58개'));
check(() => assert.equal(new Set(entries.map(e=>e.id)).size, entries.length));
for (const entry of entries) {
  check(() => assert.match(entry.id,/^[a-z0-9-]+$/));
  const keys = entry.fields.map(f=>f.key);
  check(() => assert.equal(new Set(keys).size, keys.length, entry.id));
  for (const f of entry.fields) {
    check(() => assert.ok(f.question && f.type, `${entry.id}.${f.key} 질문`));
    if (f.required) check(() => assert.equal(Object.hasOwn(f,'default'),false, `${entry.id}.${f.key} 필수 기본값 금지`));
    else check(() => assert.ok(Object.hasOwn(f,'default') && f.assumption, `${entry.id}.${f.key} 선택 전제 공개`));
  }
  const example = evaluate(entry.id,entry.example);
  check(() => assert.equal(example.status,'calculated',`${entry.id}: ${JSON.stringify(example)}`));
  check(() => assert.ok(example.result != null,entry.id));
  check(() => assert.equal(example.resultLabel, entry.mode === 'scenario' ? '가정 시뮬레이션 결과' : '입력과 기본 전제에 따른 예상 결과'));
  const state = prepare(entry,entry.example);
  for (const f of entry.fields.filter(f=>required(f,state.values))) {
    const partial = {...entry.example}; delete partial[f.key];
    const result = evaluate(entry.id,partial);
    check(() => assert.notEqual(result.status,'calculated', `${entry.id}.${f.key} 누락 방지`));
  }
  for (const f of entry.fields.filter(f=>!required(f,state.values) && active(f,state.values))) {
    const partial = {...entry.example}; delete partial[f.key];
    const result = evaluate(entry.id,partial);
    check(() => assert.equal(result.status,'calculated', `${entry.id}.${f.key} 선택 생략: ${JSON.stringify(result)}`));
    check(() => assert.ok(result.assumptions.some(a=>a.key===f.key && a.explanation),`${entry.id}.${f.key} 전제`));
  }
  const unknown = evaluate(entry.id,{...entry.example,unexpected:1});
  check(() => assert.equal(unknown.status,'invalid_input'));
  const skill = fs.readFileSync(path.join(root,'skills',entry.id,'SKILL.md'),'utf8');
  check(() => assert.ok(skill.startsWith(`---\nname: ${entry.id}\n`)));
  for (const match of skill.matchAll(/\]\((\.\.[^)]+)\)/g)) check(() => assert.ok(fs.existsSync(path.resolve(root,'skills',entry.id,match[1])),match[1]));
}
const area = evaluate('pyeongsu',{value:84,unit:'sqm'});
check(() => assert.ok(Math.abs(area.result.pyeong-25.41)<0.02));
for (const bad of [NaN,Infinity,'84',true,-1]) check(()=>assert.equal(evaluate('pyeongsu',{value:bad,unit:'sqm'}).status,'invalid_input'));
check(() => assert.equal(evaluate('pyeongsu',{value:84,unit:'sqm',_meta:{asOf:'2026-02-30'}}).status,'invalid_input'));
check(() => assert.equal(evaluate('not-a-calculator',{}).status,'invalid_input'));
check(() => assert.equal(evaluate('pyeongsu',JSON.parse('{"value":84,"unit":"sqm","__proto__":{"polluted":true}}')).status,'invalid_input'));
check(() => assert.equal({}.polluted,undefined));
const codex = JSON.parse(fs.readFileSync(path.join(root,'.codex-plugin/plugin.json')));
const claude = JSON.parse(fs.readFileSync(path.join(root,'.claude-plugin/plugin.json')));
check(() => assert.equal(codex.name,claude.name));
check(() => assert.equal(codex.version,claude.version));
const marketplace = JSON.parse(fs.readFileSync(path.join(root,'.claude-plugin/marketplace.json')));
check(() => assert.ok(fs.existsSync(path.resolve(root,marketplace.plugins[0].source,'.codex-plugin/plugin.json'))));
for (const dir of ['scripts','tests','engine/runtime']) {
  for (const f of fs.readdirSync(path.join(root,dir)).filter(f=>/\.(cjs|js)$/.test(f))) execFileSync(process.execPath,['--check',path.join(root,dir,f)],{stdio:'pipe'});
}
console.log(`Plugin checks passed: ${checks}`);
execFileSync(process.execPath,[path.join(root,'tests/conversation-regressions.cjs')],{stdio:'inherit'});
for (const f of fs.readdirSync(path.join(root,'tests')).filter(f=>/^upstream-.*\.cjs$/.test(f)).sort()) {
  const output = execFileSync(process.execPath,[path.join(root,'tests',f)],{encoding:'utf8'});
  const lines = output.trim().split('\n');
  console.log(`${f}: ${lines.slice(-2).join(' ')}`);
}
