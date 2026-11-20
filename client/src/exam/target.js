// 설정으로 목표 시험 정보를 만든다: 수능(학년도) / 모의고사 / 직접 정한 시험(이름+날짜)
// 고른 모의고사가 없어졌거나 직접 정한 시험에 날짜가 없으면 수능으로 돌아간다.

import { parseDate } from '../utils/date.js';
import { getExam } from './examDates.js';
import { getMockExams } from './mockExams.js';

const MOCK_BADGE = { official: '확정', estimated: '예상', edited: '수정함', custom: '직접 추가' };

export function getTarget(settings) {
  if (settings.targetKind === 'custom' && settings.customDate) {
    return {
      kind: 'custom',
      label: settings.customName || '직접 정한 시험',
      date: parseDate(settings.customDate),
      badge: '직접 입력',
      previous: null
    };
  }
  if (settings.targetKind === 'mock') {
    const mock = getMockExams(settings).find((e) => e.id === settings.targetMockId);
    if (mock) {
      return { kind: 'mock', id: mock.id, label: mock.name, date: parseDate(mock.date), badge: MOCK_BADGE[mock.status], previous: null };
    }
  }
  const exam = getExam(settings.academicYear);
  return {
    kind: 'suneung',
    label: `${exam.academicYear}학년도 수능`,
    date: exam.date,
    badge: exam.official ? '확정' : '예상',
    previous: getExam(exam.academicYear - 1).date
  };
}
