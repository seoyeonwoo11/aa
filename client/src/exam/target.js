// 설정(학년도 또는 직접 입력 날짜)으로 목표 시험 정보를 만든다.

import { parseDate } from '../utils/date.js';
import { getExam } from './examDates.js';

export function getTarget(settings) {
  if (settings.customDate) {
    return { label: '직접 입력한 날짜', date: parseDate(settings.customDate), badge: '직접 입력', previous: null };
  }
  const exam = getExam(settings.academicYear);
  return {
    label: `${exam.academicYear}학년도 수능`,
    date: exam.date,
    badge: exam.official ? '확정' : '예상',
    previous: getExam(exam.academicYear - 1).date
  };
}
