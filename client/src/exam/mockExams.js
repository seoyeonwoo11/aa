// 모의고사 일정: 고3 전국연합학력평가(3·5·7·10월, 시도교육청)
//               + 평가원 6월·9월 모의평가 (2028학년도부터는 6월·8월)
//               + 사용자가 추가한 시험(사설 모의고사, 학교 시험 등)
//
// 날짜는 해마다 따로 발표되므로, 모르는 해는 '예상' 날짜로 보여주고
// 사용자가 설정에서 실제 날짜로 고칠 수 있게 한다.

import { parseDate, toDateText } from '../utils/date.js';

// 공식 날짜를 알면 여기에 추가한다. 키: `${학년도}-${PRESETS key}`
export const OFFICIAL_MOCK_DATES = {
  '2026-june': '2025-06-04',
  '2026-sept': '2025-09-03',
  // 2027학년도 (2026년 시행)
  '2027-mar': '2026-03-24',
  '2027-may': '2026-05-07',
  '2027-june': '2026-06-04', // 지방선거(6월 3일)로 하루 미뤄짐
  '2027-jul': '2026-07-08',
  '2027-sept': '2026-09-02',
  '2027-oct': '2026-10-20'
};

// n번째 (weekday)요일. from일 이후(그날 포함)부터 센다.
function nthWeekday(year, month, weekday, n, from = 1) {
  const start = new Date(year, month, from);
  return new Date(year, month, from + ((weekday - start.getDay() + 7) % 7) + (n - 1) * 7);
}

// 예상 날짜는 최근 몇 년의 실제 날짜에 가장 가까운 규칙으로 정했다.
export const PRESETS = [
  { key: 'mar', name: '3월 학력평가', short: '3학평', estimate: (y) => nthWeekday(y, 2, 3, 4) }, // 넷째 수요일
  { key: 'may', name: '5월 학력평가', short: '5학평', estimate: (y) => nthWeekday(y, 4, 4, 1, 6) }, // 어린이날 다음 첫 목요일
  { key: 'june', name: '6월 모의평가', short: '6모', estimate: (y) => nthWeekday(y, 5, 3, 1) }, // 첫째 수요일
  { key: 'jul', name: '7월 학력평가', short: '7학평', estimate: (y) => nthWeekday(y, 6, 3, 2) }, // 둘째 수요일
  { key: 'sept', name: '9월 모의평가', short: '9모', estimate: (y) => nthWeekday(y, 8, 3, 1) }, // 첫째 수요일
  { key: 'oct', name: '10월 학력평가', short: '10학평', estimate: (y) => nthWeekday(y, 9, 2, 3) } // 셋째 화요일
];
// 2028학년도(2027년 시행)부터 평가원 하반기 모의평가는 9월 → 8월 넷째·다섯째 주로 옮겨진다
// (모의평가 성적을 보고 수시 원서를 낼 수 있게). 저장된 날짜·목표와 이어지도록 id는 그대로 'sept'를 쓴다.
const AUGUST_FROM = 2028;
const AUGUST_MOCK = { name: '8월 모의평가', short: '8모', estimate: (y) => nthWeekday(y, 7, 3, 4) }; // 넷째 수요일

export const PRESET_ID = new RegExp(`^\\d{4}-(${PRESETS.map((p) => p.key).join('|')})$`);

// 예상: 그 달의 첫 번째 수요일 (6월·9월 모의평가)
export function estimateMockDate(calendarYear, month) {
  return nthWeekday(calendarYear, month, 3, 1);
}

// 목표 학년도의 모의고사 목록 (날짜순)
// [{ id, name, short, date: 'YYYY-MM-DD', status: 'official' | 'estimated' | 'edited' | 'custom' }]
export function getMockExams(settings) {
  const year = settings.academicYear;
  const overrides = settings.mockOverrides || {};
  const presets = PRESETS.map((preset) => {
    const p = preset.key === 'sept' && year >= AUGUST_FROM ? { ...preset, ...AUGUST_MOCK } : preset;
    const key = `${year}-${p.key}`;
    const official = OFFICIAL_MOCK_DATES[key];
    const edited = overrides[key];
    return {
      id: key,
      name: p.name,
      short: p.short,
      date: edited || official || toDateText(p.estimate(year - 1)),
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
