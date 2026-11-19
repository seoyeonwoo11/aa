// 모의고사 일정: 평가원 6월·9월 모의평가 + 사용자가 추가한 시험(학력평가, 학교 시험 등)
//
// 평가원은 모의평가 날짜를 해마다 따로 발표하므로, 모르는 해는 '예상' 날짜로 보여주고
// 사용자가 설정에서 실제 날짜로 고칠 수 있게 한다.

import { parseDate, toDateText } from '../utils/date.js';

// 공식 날짜를 알면 여기에 추가한다. 키: `${학년도}-june` / `${학년도}-sept`
export const OFFICIAL_MOCK_DATES = {
  '2026-june': '2025-06-04',
  '2026-sept': '2025-09-03'
};

export const PRESETS = [
  { key: 'june', name: '6월 모의평가', short: '6모', month: 5 },
  { key: 'sept', name: '9월 모의평가', short: '9모', month: 8 }
];

// 예상: 그 달의 첫 번째 수요일 (최근 몇 년의 실제 날짜와 가장 가깝다)
export function estimateMockDate(calendarYear, month) {
  const first = new Date(calendarYear, month, 1);
  return new Date(calendarYear, month, 1 + ((3 - first.getDay() + 7) % 7));
}

// 목표 학년도의 모의고사 목록 (날짜순)
// [{ id, name, short, date: 'YYYY-MM-DD', status: 'official' | 'estimated' | 'edited' | 'custom' }]
export function getMockExams(settings) {
  const year = settings.academicYear;
  const overrides = settings.mockOverrides || {};
  const presets = PRESETS.map((p) => {
    const key = `${year}-${p.key}`;
    const official = OFFICIAL_MOCK_DATES[key];
    const edited = overrides[key];
    return {
      id: key,
      name: p.name,
      short: p.short,
      date: edited || official || toDateText(estimateMockDate(year - 1, p.month)),
      status: edited ? 'edited' : official ? 'official' : 'estimated',
      preset: true
    };
  });
  const custom = (settings.customExams || []).map((e) => ({ ...e, short: e.name, status: 'custom', preset: false }));
  return [...presets, ...custom].sort((a, b) => a.date.localeCompare(b.date));
}

// today(YYYY-MM-DD) 이후(오늘 포함) 가장 가까운 모의고사
export function nextMockExam(settings, today) {
  return getMockExams(settings).find((e) => e.date >= today) || null;
}

export function mockExamsByDate(settings) {
  const map = {};
  for (const exam of getMockExams(settings)) (map[exam.date] ||= []).push(exam);
  return map;
}

export const isDateText = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(parseDate(v).getTime());
