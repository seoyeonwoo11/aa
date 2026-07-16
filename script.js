const STORAGE_KEY = 'phoneHabitAppState';

const questions = [
  {
    id: 'timeOfUse',
    text: '스마트폰을 가장 많이 사용하는 시간대는 언제인가요?',
    options: ['아침', '학교 또는 공부 시간', '저녁', '자기 전']
  },
  {
    id: 'reason',
    text: '스마트폰을 자주 사용하는 가장 큰 이유는 무엇인가요?',
    options: ['심심해서', '습관적으로', '스트레스를 풀기 위해', '친구들과 연락하기 위해', '공부를 피하고 싶어서']
  },
  {
    id: 'interest',
    text: '관심 있는 활동을 하나 골라주세요.',
    options: ['운동', '독서', '공부', '그림 또는 글쓰기', '음악', '정리', '산책 또는 휴식']
  },
  {
    id: 'availableTime',
    text: '새로운 습관에 하루 몇 분 정도 사용할 수 있나요?',
    options: ['5분', '10분', '15분']
  },
  {
    id: 'goal',
    text: '가장 개선하고 싶은 부분은 무엇인가요?',
    options: ['집중력', '수면', '운동 부족', '스트레스', '시간 관리']
  }
];

const habits = [
  {
    id: 'read_before_sleep',
    name: '자기 전 책 5쪽 읽기',
    duration: '5분',
    method: '잠들기 전 스마트폰을 침대에서 멀리 두고 종이책이나 교재를 5쪽 읽습니다.',
    difficulty: '쉬움',
    reason: '자기 전 화면 시간을 줄이고 잠들기 전 마음을 차분하게 만드는 데 도움이 됩니다.'
  },
  {
    id: 'evening_walk',
    name: '저녁 식사 후 10분 산책하기',
    duration: '10분',
    method: '저녁 식사 후 집 주변이나 학교 운동장을 천천히 걸으며 몸을 움직입니다.',
    difficulty: '보통',
    reason: '스트레스를 풀기 위해 스마트폰을 켜는 순간을 짧은 움직임과 휴식으로 바꿀 수 있습니다.'
  },
  {
    id: 'desk_reset',
    name: '공부 시작 전 책상 5분 정리하기',
    duration: '5분',
    method: '공부를 시작하기 전에 필요 없는 물건을 치우고 오늘 쓸 책과 필기구만 남깁니다.',
    difficulty: '쉬움',
    reason: '공부 전 작은 정리는 스마트폰을 만지기 전에 집중할 환경을 먼저 만드는 데 도움이 됩니다.'
  },
  {
    id: 'water_break',
    name: '스마트폰을 확인하고 싶을 때 물 한 잔 마시기',
    duration: '5분 이하',
    method: '스마트폰을 습관적으로 확인하고 싶을 때 먼저 물을 한 잔 마시고 깊게 숨을 쉽니다.',
    difficulty: '쉬움',
    reason: '반복되는 확인 습관을 아주 짧고 건강한 행동으로 바꾸기 좋습니다.'
  },
  {
    id: 'stretch',
    name: '하루 5분 스트레칭하기',
    duration: '5분',
    method: '목, 어깨, 허리, 다리를 천천히 늘리며 굳은 몸을 풀어줍니다.',
    difficulty: '쉬움',
    reason: '운동 시간이 부족해도 짧게 시작할 수 있고, 오래 앉아 생기는 피로를 줄일 수 있습니다.'
  },
  {
    id: 'three_sentences',
    name: '오늘 있었던 일을 세 문장으로 기록하기',
    duration: '5분',
    method: '오늘 좋았던 일, 아쉬웠던 일, 내일 해볼 일을 각각 한 문장씩 적습니다.',
    difficulty: '쉬움',
    reason: '자기 전 스마트폰을 보는 시간을 차분한 정리 시간으로 바꾸는 데 도움이 됩니다.'
  },
  {
    id: 'screen_off_music',
    name: '좋아하는 음악 한 곡을 스마트폰 화면을 끄고 듣기',
    duration: '5분',
    method: '음악을 재생한 뒤 화면을 끄고 노래 한 곡 동안 알림이나 화면을 보지 않습니다.',
    difficulty: '쉬움',
    reason: '스트레스 해소는 유지하면서 화면을 계속 넘기는 행동은 줄일 수 있습니다.'
  },
  {
    id: 'focus_10',
    name: '10분 동안 한 가지 공부에만 집중하기',
    duration: '10분',
    method: '타이머를 10분으로 맞추고 한 문제, 한 단락, 한 과목처럼 하나의 공부만 진행합니다.',
    difficulty: '보통',
    reason: '공부를 피하려고 스마트폰을 보는 흐름을 짧은 집중 성공 경험으로 바꿀 수 있습니다.'
  }
];

const defaultState = {
  answers: {},
  recommendedHabitId: null,
  selectedHabitId: null,
  records: {}
};

let appState = loadState();
let currentQuestionIndex = 0;
let alternateIndex = 0;

const screens = document.querySelectorAll('.screen');
const startSurveyBtn = document.querySelector('#start-survey-btn');
const goCurrentBtn = document.querySelector('#go-current-btn');
const questionCount = document.querySelector('#question-count');
const progressPercent = document.querySelector('#progress-percent');
const progressFill = document.querySelector('#progress-fill');
const questionTitle = document.querySelector('#question-title');
const optionsList = document.querySelector('#options-list');
const prevQuestionBtn = document.querySelector('#prev-question-btn');
const selectHabitBtn = document.querySelector('#select-habit-btn');
const anotherHabitBtn = document.querySelector('#another-habit-btn');
const recordButtons = document.querySelectorAll('[data-status]');

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaultState, ...JSON.parse(saved) } : { ...defaultState };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function showScreen(name) {
  screens.forEach((screen) => {
    screen.classList.toggle('active', screen.id === `${name}-screen`);
  });

  document.querySelector('.top-nav').classList.toggle('hidden', !appState.selectedHabitId);
}

function getHabit(id) {
  return habits.find((habit) => habit.id === id) || habits[0];
}

function startSurvey() {
  currentQuestionIndex = 0;
  alternateIndex = 0;
  appState.answers = {};
  renderQuestion();
  showScreen('survey');
}

function renderQuestion() {
  const question = questions[currentQuestionIndex];
  const progress = Math.round(((currentQuestionIndex + 1) / questions.length) * 100);
  questionCount.textContent = `${currentQuestionIndex + 1} / ${questions.length}`;
  progressPercent.textContent = `${progress}%`;
  progressFill.style.width = `${progress}%`;
  questionTitle.textContent = question.text;
  optionsList.innerHTML = '';

  question.options.forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'option-btn';
    button.textContent = option;
    button.classList.toggle('selected', appState.answers[question.id] === option);
    button.addEventListener('click', () => selectAnswer(question.id, option));
    optionsList.appendChild(button);
  });

  prevQuestionBtn.classList.toggle('hidden', currentQuestionIndex === 0);
}

function selectAnswer(questionId, option) {
  appState.answers[questionId] = option;

  if (currentQuestionIndex < questions.length - 1) {
    currentQuestionIndex += 1;
    renderQuestion();
    return;
  }

  appState.recommendedHabitId = recommendHabit(appState.answers).id;
  saveState();
  renderResult();
  showScreen('result');
}

function recommendHabit(answers) {
  const { timeOfUse, reason, interest, availableTime, goal } = answers;

  if (timeOfUse === '자기 전' && goal === '수면') return getHabit('read_before_sleep');
  if (timeOfUse === '자기 전' && (interest === '그림 또는 글쓰기' || interest === '산책 또는 휴식')) return getHabit('three_sentences');
  if (reason === '스트레스를 풀기 위해' && interest === '산책 또는 휴식') return getHabit('evening_walk');
  if (goal === '스트레스' && interest === '음악') return getHabit('screen_off_music');
  if (reason === '공부를 피하고 싶어서' && goal === '집중력') return getHabit('focus_10');
  if (timeOfUse === '학교 또는 공부 시간' && interest === '정리') return getHabit('desk_reset');
  if (goal === '운동 부족') return interest === '산책 또는 휴식' && availableTime !== '5분' ? getHabit('evening_walk') : getHabit('stretch');
  if (reason === '습관적으로') return getHabit('water_break');
  if (interest === '독서') return getHabit('read_before_sleep');
  if ((interest === '운동' || interest === '산책 또는 휴식') && availableTime !== '5분') return getHabit('evening_walk');
  if (goal === '시간 관리') return getHabit('desk_reset');

  return getHabit('stretch');
}

function renderResult() {
  const habit = getHabit(appState.recommendedHabitId);
  document.querySelector('#result-name').textContent = habit.name;
  document.querySelector('#result-duration').textContent = habit.duration;
  document.querySelector('#result-difficulty').textContent = habit.difficulty;
  document.querySelector('#result-method').textContent = habit.method;
  document.querySelector('#result-reason').textContent = habit.reason;
}

function showAnotherHabit() {
  const currentId = appState.recommendedHabitId;
  const candidates = habits.filter((habit) => habit.id !== currentId);
  appState.recommendedHabitId = candidates[alternateIndex % candidates.length].id;
  alternateIndex += 1;
  saveState();
  renderResult();
}

function selectHabit() {
  appState.selectedHabitId = appState.recommendedHabitId;
  saveState();
  renderHome();
  showScreen('home');
}

function renderHome() {
  const habit = getHabit(appState.selectedHabitId);
  const today = getDateKey(new Date());
  const todayRecord = appState.records[today];

  document.querySelector('#today-habit-name').textContent = habit.name;
  document.querySelector('#today-method').textContent = habit.method;
  document.querySelector('#today-duration').textContent = habit.duration;
  document.querySelector('#current-streak').textContent = `${calculateStreak()}일`;
  document.querySelector('#encouragement').textContent = getEncouragement();
  document.querySelector('#today-status').textContent = todayRecord ? `오늘 기록: ${getStatusLabel(todayRecord)}` : '오늘 기록은 아직 없어요. 작은 실천부터 시작해보세요.';

  recordButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.status === todayRecord);
  });
}

function recordToday(status) {
  const today = getDateKey(new Date());
  appState.records[today] = status;
  saveState();
  renderHome();
}

function renderRecords() {
  const recordDays = document.querySelector('#record-days');
  const recentDays = getRecentDays(7);
  const streak = calculateStreak();
  const weekSuccess = recentDays.filter((date) => appState.records[date] === 'done').length;
  const totalRecorded = Object.keys(appState.records).length;
  const totalDone = Object.values(appState.records).filter((status) => status === 'done').length;
  const successRate = totalRecorded ? Math.round((totalDone / totalRecorded) * 100) : 0;

  recordDays.innerHTML = '';
  recentDays.forEach((date) => {
    const status = appState.records[date] || 'empty';
    const card = document.createElement('div');
    card.className = `day-card ${status}`;
    card.innerHTML = `
      <span class="day-date">${formatShortDate(date)}</span>
      <span class="day-icon">${getStatusIcon(status)}</span>
      <span class="day-label">${getStatusLabel(status)}</span>
    `;
    recordDays.appendChild(card);
  });

  document.querySelector('#record-streak').textContent = `${streak}일`;
  document.querySelector('#week-success').textContent = `${weekSuccess}회`;
  document.querySelector('#success-rate').textContent = `${successRate}%`;
  document.querySelector('#success-bar').style.width = `${successRate}%`;
  document.querySelector('#record-message').textContent = getRecordMessage(streak, weekSuccess);
}

function calculateStreak() {
  let streak = 0;
  const cursor = new Date();

  while (true) {
    const key = getDateKey(cursor);
    if (appState.records[key] !== 'done') break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function getRecentDays(count) {
  const days = [];
  const date = new Date();
  date.setDate(date.getDate() - count + 1);

  for (let i = 0; i < count; i += 1) {
    days.push(getDateKey(date));
    date.setDate(date.getDate() + 1);
  }

  return days;
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatShortDate(dateKey) {
  const [, month, day] = dateKey.split('-');
  return `${Number(month)}/${Number(day)}`;
}

function getStatusIcon(status) {
  return { done: '✓', partial: '△', missed: '×', empty: '○' }[status];
}

function getStatusLabel(status) {
  return { done: '완료', partial: '일부 완료', missed: '미완료', empty: '기록 없음' }[status];
}

function getEncouragement() {
  const messages = [
    '완벽하지 않아도 괜찮아요. 오늘 한 번의 선택이 좋은 시작입니다.',
    '스마트폰을 덜 보는 시간보다 내가 원하는 시간을 늘리는 것이 목표예요.',
    '작은 습관은 짧아도 충분히 의미 있어요.'
  ];
  return messages[new Date().getDay() % messages.length];
}

function getRecordMessage(streak, weekSuccess) {
  if (streak >= 7) return '일주일 이상 이어졌어요. 작은 습관이 생활 리듬이 되고 있어요!';
  if (weekSuccess >= 4) return '최근 일주일 동안 절반 이상 실천했어요. 좋은 흐름입니다.';
  if (weekSuccess > 0) return '이미 시작했다는 것이 중요해요. 내일도 가볍게 이어가 보세요.';
  return '기록이 없어도 괜찮아요. 오늘부터 다시 시작할 수 있습니다.';
}

function resetSurveyOnly() {
  appState.answers = {};
  appState.recommendedHabitId = null;
  appState.selectedHabitId = null;
  saveState();
  startSurvey();
}

startSurveyBtn.addEventListener('click', startSurvey);
goCurrentBtn.addEventListener('click', () => {
  renderHome();
  showScreen('home');
});
prevQuestionBtn.addEventListener('click', () => {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex -= 1;
    renderQuestion();
  }
});
selectHabitBtn.addEventListener('click', selectHabit);
anotherHabitBtn.addEventListener('click', showAnotherHabit);
document.querySelector('#open-records-btn').addEventListener('click', () => {
  renderRecords();
  showScreen('records');
});
document.querySelector('#back-home-btn').addEventListener('click', () => {
  renderHome();
  showScreen('home');
});
document.querySelector('#restart-btn').addEventListener('click', resetSurveyOnly);
document.querySelectorAll('[data-nav]').forEach((button) => {
  button.addEventListener('click', () => {
    if (!appState.selectedHabitId) return;
    if (button.dataset.nav === 'records') {
      renderRecords();
      showScreen('records');
    } else {
      renderHome();
      showScreen('home');
    }
  });
});
recordButtons.forEach((button) => {
  button.addEventListener('click', () => recordToday(button.dataset.status));
});

if (appState.selectedHabitId) {
  goCurrentBtn.classList.remove('hidden');
  renderHome();
  showScreen('home');
} else {
  showScreen('start');
}
