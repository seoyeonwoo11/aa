// 날짜별 계획(할 일) 목록 다루기. plans: { 'YYYY-MM-DD': [{ id, text, done }] }

export const MAX_PLAN_LENGTH = 100;

function newId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function addPlan(plans, date, text) {
  const trimmed = text.trim().slice(0, MAX_PLAN_LENGTH);
  if (!trimmed) return plans;
  return { ...plans, [date]: [...(plans[date] || []), { id: newId(), text: trimmed, done: false }] };
}

export function togglePlan(plans, date, id) {
  return { ...plans, [date]: (plans[date] || []).map((p) => (p.id === id ? { ...p, done: !p.done } : p)) };
}

export function removePlan(plans, date, id) {
  const rest = (plans[date] || []).filter((p) => p.id !== id);
  const next = { ...plans, [date]: rest };
  if (!rest.length) delete next[date];
  return next;
}

export function planProgress(items = []) {
  const done = items.filter((p) => p.done).length;
  return { done, total: items.length };
}
