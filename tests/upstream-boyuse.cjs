#!/usr/bin/env node
/** Additional snapshot checks for the copied holding-tax engine. Not a legal-currentness audit. */
'use strict';
const assert = require('node:assert/strict');
const engine = require('../engine/runtime/boyuse.js');
const params = { price: 2_000_000_000, age: 0, holdYears: 0, liveYears: 0 };
const byKey = key => engine.CASES.find(item => item.key === key);
const calculate = (key, patch = {}) => engine.calculateCase(byKey(key), { ...params, ...patch }, 'current');
let checks = 0;
const test = (name, callback) => {
  try { callback(); checks++; } catch (error) { error.message = `${name}: ${error.message}`; throw error; }
};

test('Sole ownership current snapshot has independently calculated components', () => {
  const result = calculate('sole-live');
  assert.equal(result.taxBase, 480_000_000);
  assert.equal(result.grossTax, 2_760_000);
  assert.equal(result.propertyOverlap, 360_000);
  assert.equal(result.taxHousehold, 2_400_000);
  assert.equal(result.ruralTax, 480_000);
  assert.equal(result.propertyTax, 2_970_000);
  assert.equal(result.urbanTax, 1_260_000);
  assert.equal(result.eduTax, 594_000);
  assert.equal(result.holdingTotal, 7_704_000);
});
test('Equal joint ownership independently applies each owner allowance', () => {
  const result = calculate('joint-live');
  assert.equal(result.price, 1_000_000_000);
  assert.equal(result.taxBase, 60_000_000);
  assert.equal(result.taxPerPerson, 273_000);
  assert.equal(result.taxHousehold, 546_000);
  assert.equal(result.holdingTotal, 5_479_200);
});
for (const [key, threshold] of [['sole-live', 1_200_000_000], ['joint-live', 1_800_000_000]]) {
  test(`${key} allowance boundary`, () => {
    const at = calculate(key, { price: threshold });
    const above = calculate(key, { price: threshold + 1 });
    assert.equal(at.taxable, false);
    assert.equal(at.jongbuTotal, 0);
    assert.equal(above.taxable, true);
    assert.ok(above.jongbuTotal > 0);
  });
}
test('Current tax does not change solely because of occupancy', () => {
  for (const ownership of ['sole', 'joint']) assert.deepEqual(calculate(`${ownership}-live`), calculate(`${ownership}-away`));
});
test('Special joint election equals the single-householder calculation', () => {
  assert.deepEqual(calculate('joint-live-special', { age: 70, holdYears: 15, liveYears: 15 }), calculate('sole-live', { age: 70, holdYears: 15, liveYears: 15 }));
});
test('Credit never increases the tax and does not apply to joint individual filing', () => {
  const older = { age: 70, holdYears: 15, liveYears: 15 };
  assert.ok(calculate('sole-live', older).taxHousehold < calculate('sole-live').taxHousehold);
  assert.deepEqual(calculate('joint-live', older), calculate('joint-live'));
});
test('All scenarios preserve the component sum', () => {
  for (const regime of ['current', 'y2027', 'y2028']) {
    for (const result of Object.values(engine.calculateAll(params, regime))) {
      assert.equal(result.holdingTotal, result.jongbuTotal + result.propertyTax + result.urbanTax + result.eduTax);
      assert.ok(result.holdingTotal >= 0);
      assert.ok(Number.isFinite(result.holdingTotal));
    }
  }
});
console.log(`${checks}/${checks} holding-tax snapshot checks passed`);
