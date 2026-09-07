#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {catalog} = require('./calculator.cjs');
const root = path.resolve(__dirname, '..');
function write(p, body) { fs.mkdirSync(path.dirname(p), {recursive:true}); fs.writeFileSync(p, body); }
const entries = catalog();
const seen = new Set();
for (const e of entries) {
  if (seen.has(e.id)) throw new Error('Duplicate calculator: ' + e.id);
  seen.add(e.id);
  const folder = path.join(root, 'skills', e.id);
  const show = v => JSON.stringify(v);
  const opts = f => f.type === 'enum' ? f.options.map(o => `${o.label} (${o.value})`).join(' / ') : (f.unit ?? '');
  const mandatory = e.fields.filter(f => f.required || f.requiredWhen || f.requiredUnless);
  const optional = e.fields.filter(f => !f.required && !f.requiredWhen && !f.requiredUnless);
  const condition = f => f.appliesWhen ? `적용 조건: ${show(f.appliesWhen)}` : f.requiredWhen ? `조건: ${show(f.requiredWhen)}` : f.requiredUnless ? `제외 조건: ${show(f.requiredUnless)}` : '';
  const body = `---\nname: ${e.id}\ndescription: ${JSON.stringify(e.description + ' ' + e.title + ' 요청에 사용합니다.')}\n---\n\n# ${e.title}\n\n${e.description}\n\n**계산 결과는 실행한 코드의 출력과 공개한 전제에 근거해 설명한다.** 먼저 [공통 대화 절차](../../docs/conversation.md)를 읽고 아래 계산기 계약을 적용한다.\n\n**필수 정보만 먼저 묻는다.** 사용자가 이미 제공한 값은 다시 묻지 않고, 해당되는 조건부 질문만 한다.\n\n| 입력 키 | 쉽게 묻는 질문 | 단위·선택지 | 조건 |\n| --- | --- | --- | --- |\n${mandatory.map(f => `| ${f.key} | ${f.question} | ${opts(f)} | ${condition(f)} |`).join('\n')}\n\n**선택 질문은 건너뛸 수 있다.** 생략하거나 “기본값”이라고 답하면 다음 전제를 사용하고 결과에서 밝힌다.\n\n| 입력 키 | 선택 질문 | 생략할 때 적용하는 전제 |\n| --- | --- | --- |\n${optional.map(f => `| ${f.key} | ${f.question} | ${f.assumption ?? ''} (입력값 ${show(f.default)}) |`).join('\n')}\n\n**적용 범위에 필요한 사실도 확인한다.**\n\n${(e.scopeChecks ?? []).map(s => '- ' + s).join('\n')}\n\n**정확한 입력 형식은 실행기로 확인한다.** 아래 경로는 이 SKILL.md의 폴더를 기준으로 한다. 실제 호출 시 절대경로로 해석한다.\n\n\`\`\`text\nnode ../../scripts/calculator.cjs describe ${e.id}\nnode ../../scripts/calculator.cjs questions ${e.id} <답변 JSON 파일의 절대경로>\nnode ../../scripts/calculator.cjs calculate ${e.id} <답변 JSON 파일의 절대경로>\n\`\`\`\n\n**이 계산기는 ${e.mode === 'scenario' ? '가정 시뮬레이션' : '예상 금액 계산'}이다.** ${e.notes.join(' ')}\n\n**결과부터 설명한다.** 예상 금액 또는 비교 결론, 사용자 답변, 생략한 전제, 계산 과정, 적용 범위 순서로 쓴다. 법령·약정 확인이 남으면 예상 결과와 함께 그 사실을 짧게 표시한다.\n`;
  write(path.join(folder,'SKILL.md'),body);
  write(path.join(folder,'agents/openai.yaml'),`interface:\n  display_name: ${JSON.stringify(e.title)}\n  short_description: ${JSON.stringify(e.description)}\n  default_prompt: ${JSON.stringify('$' + e.id + ' 필요한 정보를 물어보고 계산해 주세요. 선택 질문은 기본 전제로 진행해 주세요.')}\n`);
}
write(path.join(root,'docs/calculators.md'),`# 필요한 계산기를 골라 말하면 됩니다\n\n**${entries.length}개 계산기를 각각의 스킬로 사용할 수 있습니다.** 이름을 몰라도 “집을 살 때 드는 세금”처럼 상황을 설명하면 AI가 맞는 계산기를 고릅니다.\n\n| 계산기 | 할 수 있는 일 | Codex 스킬 | 계산 범위 |\n| --- | --- | --- | --- |\n${entries.map(e => `| [${e.title}](../skills/${e.id}/SKILL.md) | ${e.description} | \`$${e.id}\` | ${e.mode === 'scenario' ? '가정 시뮬레이션' : '예상 계산'} |`).join('\n')}\n\n**Claude Code에서는 이름 앞에 플러그인 이름을 붙입니다.** 예를 들어 취득세는 \`/budongsan-skills:chwideuk\`으로 실행합니다.\n`);
write(path.join(root,'examples/all-calculators.json'),JSON.stringify(Object.fromEntries(entries.map(e => [e.id,e.example])),null,2)+'\n');
console.log(`Generated ${entries.length} skills and examples.`);
