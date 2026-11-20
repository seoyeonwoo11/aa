// 대한민국 공휴일 (관공서의 공휴일에 관한 규정, 2023년 개정 기준)
//
// - 양력 공휴일: 신정, 삼일절, 어린이날, 현충일, 광복절, 개천절, 한글날, 성탄절
// - 음력 공휴일: 설날(전날·당일·다음날), 부처님오신날, 추석(전날·당일·다음날)
// - 대체공휴일:
//   · 설날·추석 연휴가 일요일이나 다른 공휴일과 겹치면 연휴 다음 첫 평일
//   · 어린이날이 토·일요일이나 다른 공휴일과 겹치면 다음 첫 평일
//   · 삼일절·부처님오신날·광복절·개천절·한글날·성탄절이 토·일요일과 겹치면 다음 첫 평일
//   · 신정·현충일은 대체공휴일이 없다
// - 선거일은 법으로 정해진 날짜를 넣었다. 임시공휴일은 미리 알 수 없어 넣지 않는다.

// 음력 공휴일의 양력 날짜 [설날, 부처님오신날, 추석] (한국 음력 기준으로 계산해 둔 표)
const LUNAR = {
  2024: ['02-10', '05-15', '09-17'],
  2025: ['01-29', '05-05', '10-06'],
  2026: ['02-17', '05-24', '09-25'],
  2027: ['02-07', '05-13', '09-15'],
  2028: ['01-27', '05-02', '10-03'],
  2029: ['02-13', '05-20', '09-22'],
  2030: ['02-03', '05-09', '09-12'],
  2031: ['01-23', '05-28', '10-01'],
  2032: ['02-11', '05-16', '09-19'],
  2033: ['01-31', '05-06', '09-08'],
  2034: ['02-19', '05-25', '09-27'],
  2035: ['02-08', '05-15', '09-16'],
  2036: ['01-28', '05-03', '10-04'],
  2037: ['02-15', '05-22', '09-24'],
  2038: ['02-04', '05-11', '09-13'],
  2039: ['01-24', '04-30', '10-02'],
  2040: ['02-12', '05-18', '09-21'],
  2041: ['02-01', '05-07', '09-10'],
  2042: ['01-22', '05-26', '09-28'],
  2043: ['02-10', '05-16', '09-17'],
  2044: ['01-30', '05-05', '10-05'],
  2045: ['02-17', '05-24', '09-25'],
};

const SOLAR = [
  ['01-01', '신정', null],
  ['03-01', '삼일절', 'weekend'],
  ['05-05', '어린이날', 'weekend-or-holiday'],
  ['06-06', '현충일', null],
  ['08-15', '광복절', 'weekend'],
  ['10-03', '개천절', 'weekend'],
  ['10-09', '한글날', 'weekend'],
  ['12-25', '성탄절', 'weekend']
];

const ELECTIONS = {
  '2028-04-12': '국회의원 선거일'
};

const pad = (n) => String(n).padStart(2, '0');
const toText = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromText = (text) => {
  const [y, m, d] = text.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (text, n) => {
  const d = fromText(text);
  d.setDate(d.getDate() + n);
  return toText(d);
};
const weekday = (text) => fromText(text).getDay();

const cache = new Map();

// 그 해의 공휴일 { 'YYYY-MM-DD': 이름 }. 표에 없는 해는 양력 공휴일만 낸다.
export function holidaysOfYear(year) {
  if (cache.has(year)) return cache.get(year);

  const days = new Map(); // 날짜 → 이름 목록
  const add = (date, name) => days.set(date, [...(days.get(date) || []), name]);
  const groups = []; // 대체공휴일을 따질 묶음 { dates, name, rule }

  for (const [md, name, rule] of SOLAR) {
    const date = `${year}-${md}`;
    add(date, name);
    if (rule) groups.push({ dates: [date], name, rule });
  }
  const lunar = LUNAR[year];
  if (lunar) {
    const [seol, buddha, chuseok] = lunar.map((md) => `${year}-${md}`);
    const seolDays = [addDays(seol, -1), seol, addDays(seol, 1)];
    const chuseokDays = [addDays(chuseok, -1), chuseok, addDays(chuseok, 1)];
    seolDays.forEach((d) => add(d, '설날'));
    add(buddha, '부처님오신날');
    chuseokDays.forEach((d) => add(d, '추석'));
    groups.push({ dates: seolDays, name: '설날', rule: 'sunday-or-holiday' });
    groups.push({ dates: [buddha], name: '부처님오신날', rule: 'weekend' });
    groups.push({ dates: chuseokDays, name: '추석', rule: 'sunday-or-holiday' });
  }
  for (const [date, name] of Object.entries(ELECTIONS)) {
    if (date.startsWith(`${year}-`)) add(date, name);
  }

  // 대체공휴일: 날짜 순서대로 정해, 앞에서 정한 대체공휴일도 피해 간다
  groups.sort((a, b) => (a.dates[0] < b.dates[0] ? -1 : 1));
  const isOff = (date) => days.has(date) || weekday(date) === 0 || weekday(date) === 6;
  for (const group of groups) {
    const overlaps = group.dates.filter((date) => {
      const day = weekday(date);
      const shared = (days.get(date) || []).filter((n) => n !== group.name).length > 0;
      if (group.rule === 'weekend') return day === 0 || day === 6;
      if (group.rule === 'weekend-or-holiday') return day === 0 || day === 6 || shared;
      return day === 0 || shared; // 설날·추석: 토요일은 대체하지 않는다
    }).length;
    let date = group.dates[group.dates.length - 1];
    for (let i = 0; i < overlaps; i++) {
      do date = addDays(date, 1); while (isOff(date));
      add(date, '대체공휴일');
    }
  }

  const result = {};
  for (const [date, names] of [...days].sort()) {
    if (date.startsWith(`${year}-`)) result[date] = [...new Set(names)].join(', ');
  }
  cache.set(year, result);
  return result;
}

// 그 날이 공휴일이면 이름, 아니면 null
export function holidayName(dateText) {
  return holidaysOfYear(Number(dateText.slice(0, 4)))[dateText] || null;
}
