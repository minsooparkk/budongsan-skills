"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFiniteNumber = isFiniteNumber;
exports.isIntegerInRange = isIntegerInRange;
exports.isOneOf = isOneOf;
exports.parseDateOnly = parseDateOnly;
exports.hasInvalidNumbers = hasInvalidNumbers;
exports.invalidCalculation = invalidCalculation;
exports.loanMonths = loanMonths;
function isFiniteNumber(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
    return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}
function isIntegerInRange(value, min, max) {
    return isFiniteNumber(value, min, max) && Number.isInteger(value);
}
function isOneOf(value, values) {
    return typeof value === "string" && values.includes(value);
}
/** YYYY-MM-DD only; never silently normalizes February 31 or depends on local TZ. */
function parseDateOnly(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
        return null;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}
/** Monetary/quantity inputs must stay finite even when a caller bypasses the form codec. */
function hasInvalidNumbers(input) {
    return Object.values(input).some(value => typeof value === "number" && !isFiniteNumber(value));
}
function invalidCalculation(values, message) {
    return {
        ...values,
        validationError: message,
        headline: [{ label: "계산할 수 없습니다", value: 0, displayValue: "입력 확인 필요", hint: message }],
        steps: [],
        tips: [{ level: "must", title: "입력값을 확인해 주세요", body: message }],
    };
}
/** Loan UI uses years, but schedules consist of whole months; cap work at 100 years. */
function loanMonths(years) {
    const months = years * 12;
    return isIntegerInRange(months, 1, 1200) ? months : null;
}
