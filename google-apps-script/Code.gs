/**
 * COSS 성과지표 총괄관리 시스템 - Google Apps Script API
 * 강원대학교 데이터보안·활용 혁신융합대학사업단
 *
 * 이 스크립트는 사업단이 실제로 운영 중인 성과지표 스프레드시트(대학별 탭 구조)를
 * 그대로 읽고 쓰도록 작성되었다. 대학별 탭(강원대학교/아주대학교/충남대학교/
 * 한양대학교ERICA/영남이공대학교)에 이미 입력되어 있는 지표·목표값·실적값을
 * 그대로 사용하며, 그 외 시트를 새로 만들 필요가 없다(사용자 계정/수정이력 시트만
 * 최초 실행 시 자동 생성됨).
 *
 * 배포: 배포 > 새 배포 > 유형: 웹 앱
 *   - 실행 계정: 나(스프레드시트 소유자)
 *   - 액세스 권한: 전체 공개(익명 사용자 포함)
 * 배포 후 발급되는 웹 앱 URL을 프론트엔드 .env 파일의 VITE_GAS_API_URL 에 설정한다.
 *
 * ── 대학별 탭 컬럼 구조 (A~I열, 4행부터 데이터 시작) ──
 *   A: 지표 대분류 (병합 셀 — forward-fill로 복원)
 *   B: 지표 중분류 (병합 셀 — forward-fill로 복원)
 *   C: 증빙 링크 (읽지 않음)
 *   D: 지표명
 *   E: 담당자 (병합 셀일 수 있음 — forward-fill)
 *   F: 3차년도 목표값 (배부 목표값)
 *   G: 3차년도 실적값
 *   H: 목표값-실적 (차이, 계산에 사용하지 않음 — 달성률은 이 스크립트가 직접 계산)
 *   I: 비고/내용 (탭마다 있을 수도, 없을 수도 있음 — 있으면 읽음)
 */

const UNIVERSITY_SHEET_NAMES = ['강원대학교', '아주대학교', '충남대학교', '한양대학교ERICA', '영남이공대학교'];

// 시트 탭 이름(공백 없음) → 화면에 표시할 대학명(공백 포함, 프론트엔드 UNIVERSITIES 상수와 일치)
const SHEET_TO_DISPLAY_NAME = {
  강원대학교: '강원대학교',
  아주대학교: '아주대학교',
  충남대학교: '충남대학교',
  한양대학교ERICA: '한양대학교 ERICA',
  영남이공대학교: '영남이공대학교',
};
const DISPLAY_TO_SHEET_NAME = Object.keys(SHEET_TO_DISPLAY_NAME).reduce((acc, k) => {
  acc[SHEET_TO_DISPLAY_NAME[k]] = k;
  return acc;
}, {});

// 지표 목록·대분류는 강원대학교 탭(주관대학) 순서를 기준(canonical)으로 삼는다.
const CANONICAL_SHEET = '강원대학교';

const DATA_START_ROW = 4; // 1-indexed, 실제 지표 데이터가 시작되는 행
const NUM_COLS = 9; // A~I
const COL = { CATEGORY: 0, SUBCATEGORY: 1, EVIDENCE: 2, NAME: 3, MANAGER: 4, TARGET: 5, ACTUAL: 6, DIFF: 7, NOTE: 8 };

const SHEET_NAMES = { USERS: 'users', LOGS: 'logs' };
const DEFAULT_YEAR = 2026;

// ---------------------------------------------------------------------------
// 공통 유틸
// ---------------------------------------------------------------------------

function getSpreadsheet_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function nowTimestamp_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Seoul', 'yyyy-MM-dd HH:mm');
}

function parseNumberCell_(value) {
  if (value === '' || value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  const str = String(value).trim();
  if (str === '-' || str === '') return null;
  const num = Number(str.replace(/,/g, ''));
  return isNaN(num) ? null : num;
}

function calculateAchievementRate_(actual, target) {
  if (actual === null || actual === undefined) return null;
  if (!target || Number(target) <= 0) return null;
  return Math.round((Number(actual) / Number(target)) * 1000) / 10;
}

function getAchievementStatus_(rate, hasActual) {
  if (!hasActual || rate === null) return '미제출';
  if (rate >= 100) return '정상';
  if (rate >= 80) return '주의';
  return '미달';
}

function average_(nums) {
  const filtered = nums.filter((n) => typeof n === 'number' && !isNaN(n));
  if (filtered.length === 0) return 0;
  const sum = filtered.reduce((a, b) => a + b, 0);
  return Math.round((sum / filtered.length) * 10) / 10;
}

// ---------------------------------------------------------------------------
// 대학별 탭 읽기 (A/B/E열 병합 셀 forward-fill 포함)
// ---------------------------------------------------------------------------

function readUniversitySheetRows_(sheetName) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) throw new Error('시트를 찾을 수 없습니다: ' + sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow < DATA_START_ROW) return [];

  const values = sheet.getRange(DATA_START_ROW, 1, lastRow - DATA_START_ROW + 1, NUM_COLS).getValues();

  let lastCategory = '';
  let lastSubcategory = '';
  let lastManager = '';
  const rows = [];

  values.forEach((row) => {
    const name = String(row[COL.NAME] || '').trim();
    if (!name) return; // 지표명이 없는 행(구분선 등)은 건너뜀

    if (String(row[COL.CATEGORY] || '').trim()) lastCategory = String(row[COL.CATEGORY]).trim();
    if (String(row[COL.SUBCATEGORY] || '').trim()) lastSubcategory = String(row[COL.SUBCATEGORY]).trim();
    if (String(row[COL.MANAGER] || '').trim()) lastManager = String(row[COL.MANAGER]).trim();

    rows.push({
      category: lastCategory || '미분류',
      subcategory: lastSubcategory,
      indicator_name: name,
      manager: lastManager,
      target: parseNumberCell_(row[COL.TARGET]),
      actual: parseNumberCell_(row[COL.ACTUAL]),
      note: String(row[COL.NOTE] || '').trim(),
    });
  });

  return rows;
}

/** 강원대학교 탭 순서를 기준으로 지표 ID·대분류를 확정한다 */
function getCanonicalIndicators_() {
  const rows = readUniversitySheetRows_(CANONICAL_SHEET);
  return rows.map((r, idx) => ({
    indicator_id: 'IND' + String(idx + 1).padStart(2, '0'),
    indicator_name: r.indicator_name,
    category: r.category,
  }));
}

function getIndicatorNameMap_() {
  const canonical = getCanonicalIndicators_();
  const idToName = {};
  const nameToId = {};
  canonical.forEach((c) => {
    idToName[c.indicator_id] = c.indicator_name;
    nameToId[c.indicator_name] = c.indicator_id;
  });
  return { idToName, nameToId, canonical };
}

/** 5개 대학 탭을 모두 읽어 지표별·대학별 실적 배열로 결합한다 */
function buildAllUniversityResults_() {
  const { nameToId } = getIndicatorNameMap_();
  const results = [];

  UNIVERSITY_SHEET_NAMES.forEach((sheetName) => {
    const displayName = SHEET_TO_DISPLAY_NAME[sheetName];
    const rows = readUniversitySheetRows_(sheetName);
    rows.forEach((r) => {
      const indicatorId = nameToId[r.indicator_name];
      if (!indicatorId) return; // 기준 탭(강원대학교)에 없는 지표명은 구조 불일치로 간주해 제외

      const allocated = r.target || 0;
      const actual = r.actual;
      const rate = calculateAchievementRate_(actual, allocated);

      results.push({
        result_id: sheetName + '__' + indicatorId,
        year: DEFAULT_YEAR,
        indicator_id: indicatorId,
        university_name: displayName,
        allocated_target: allocated,
        actual_result: actual,
        achievement_rate: rate,
        evidence_status: '해당없음', // 증빙 제출 여부는 이 시트에서 추적하지 않음
        note: r.note,
        manager_name: r.manager,
        updated_by: r.manager || '',
        updated_at: '',
      });
    });
  });

  return results;
}

function buildIndicatorSummaries_() {
  const { canonical } = getIndicatorNameMap_();
  const results = buildAllUniversityResults_();

  return canonical.map((ind) => {
    const related = results.filter((r) => r.indicator_id === ind.indicator_id);
    const hasAnyActual = related.some((r) => r.actual_result !== null && r.actual_result !== undefined);
    const totalTarget = related.reduce((sum, r) => sum + (r.allocated_target || 0), 0);
    const totalActual = related.reduce((sum, r) => sum + (r.actual_result || 0), 0);
    const rate = hasAnyActual ? calculateAchievementRate_(totalActual, totalTarget) : null;
    const status = getAchievementStatus_(rate, hasAnyActual);
    const notes = related.map((r) => r.note).filter(Boolean);

    return {
      indicator_id: ind.indicator_id,
      year: DEFAULT_YEAR,
      category: ind.category,
      indicator_name: ind.indicator_name,
      unit: '',
      description: '',
      total_target: totalTarget,
      total_actual: totalActual,
      achievement_rate: rate,
      status: status,
      evidence_status: '해당없음',
      note: notes[0] || '',
      updated_at: nowTimestamp_(),
      universityResults: related,
    };
  });
}

// ---------------------------------------------------------------------------
// 1. getDashboardData
// ---------------------------------------------------------------------------
function getDashboardData_() {
  const summaries = buildIndicatorSummaries_();
  const results = buildAllUniversityResults_();

  const rates = summaries.map((s) => s.achievement_rate).filter((r) => r !== null);
  const categories = Array.from(new Set(summaries.map((s) => s.category)));
  const categoryBreakdown = categories.map((category) => {
    const items = summaries.filter((s) => s.category === category);
    const catRates = items.map((s) => s.achievement_rate).filter((r) => r !== null);
    return { category: category, count: items.length, averageRate: average_(catRates) };
  });

  const universityNames = Array.from(new Set(results.map((r) => r.university_name)));
  const universityRates = universityNames.map((uni) => {
    const uniResults = results.filter((r) => r.university_name === uni && r.achievement_rate !== null);
    return { university_name: uni, rate: average_(uniResults.map((r) => r.achievement_rate)) };
  });

  const indicatorRanking = summaries
    .filter((s) => s.achievement_rate !== null)
    .map((s) => ({ indicator_name: s.indicator_name, rate: s.achievement_rate, category: s.category }))
    .sort((a, b) => b.rate - a.rate);

  const evidenceStatusCounts = ['제출', '미제출', '해당없음'].map((status) => ({
    status: status,
    count: status === '해당없음' ? results.length : 0,
  }));

  return {
    totalIndicators: summaries.length,
    categoryCount: categories.length,
    averageAchievementRate: average_(rates),
    underAchievedCount: summaries.filter((s) => s.status === '미달').length,
    evidenceMissingCount: 0,
    categoryBreakdown: categoryBreakdown,
    universityRates: universityRates,
    indicatorRanking: indicatorRanking,
    evidenceStatusCounts: evidenceStatusCounts,
  };
}

// ---------------------------------------------------------------------------
// 2. getIndicators
// ---------------------------------------------------------------------------
function getIndicators_(params) {
  const summaries = buildIndicatorSummaries_();
  if (params && params.category) {
    return summaries.filter((s) => s.category === params.category);
  }
  return summaries;
}

// ---------------------------------------------------------------------------
// 3. getUniversityResults (권한별 범위 제한)
// ---------------------------------------------------------------------------
function getUniversityResults_(params) {
  let results = buildAllUniversityResults_();
  if (params && params.role === 'university' && params.university_name) {
    results = results.filter((r) => r.university_name === params.university_name);
  }
  return results;
}

// ---------------------------------------------------------------------------
// 4. updateUniversityResult — 대학별 탭의 G열(실적)에 직접 반영
// ---------------------------------------------------------------------------
function findIndicatorRowNumber_(sheet, indicatorName) {
  const lastRow = sheet.getLastRow();
  if (lastRow < DATA_START_ROW) return null;
  const names = sheet.getRange(DATA_START_ROW, COL.NAME + 1, lastRow - DATA_START_ROW + 1, 1).getValues();
  for (let i = 0; i < names.length; i++) {
    if (String(names[i][0] || '').trim() === indicatorName) return DATA_START_ROW + i;
  }
  return null;
}

function parseResultId_(resultId) {
  const sheetName = UNIVERSITY_SHEET_NAMES.filter((s) => resultId.indexOf(s + '__') === 0)[0];
  if (!sheetName) return null;
  const indicatorId = resultId.substring(sheetName.length + 2);
  return { sheetName: sheetName, indicatorId: indicatorId };
}

function updateUniversityResult_(payload) {
  if (payload.actual_result !== undefined && payload.actual_result !== null && Number(payload.actual_result) < 0) {
    return { success: false, message: '음수는 입력할 수 없습니다.' };
  }
  if (payload.allocated_target !== undefined && Number(payload.allocated_target) < 0) {
    return { success: false, message: '음수는 입력할 수 없습니다.' };
  }

  const parsed = parseResultId_(payload.result_id);
  if (!parsed) return { success: false, message: '대상 실적 데이터를 찾을 수 없습니다.' };

  const { idToName } = getIndicatorNameMap_();
  const indicatorName = idToName[parsed.indicatorId];
  if (!indicatorName) return { success: false, message: '지표를 찾을 수 없습니다.' };

  const sheet = getSpreadsheet_().getSheetByName(parsed.sheetName);
  const rowNumber = findIndicatorRowNumber_(sheet, indicatorName);
  if (!rowNumber) return { success: false, message: '해당 대학 탭에서 지표 행을 찾을 수 없습니다.' };

  const timestamp = nowTimestamp_();
  const displayName = SHEET_TO_DISPLAY_NAME[parsed.sheetName];

  if (payload.actual_result !== undefined) {
    const before = sheet.getRange(rowNumber, COL.ACTUAL + 1).getValue();
    sheet.getRange(rowNumber, COL.ACTUAL + 1).setValue(payload.actual_result === null ? '' : Number(payload.actual_result));
    appendLog_({
      timestamp: timestamp, user_id: payload.updated_by, user_name: payload.user_name, university_name: displayName,
      action: 'update', sheet_name: parsed.sheetName, row_id: indicatorName,
      field_name: '실적(G열)', old_value: before, new_value: payload.actual_result,
    });
  }

  if (payload.allocated_target !== undefined) {
    const before = sheet.getRange(rowNumber, COL.TARGET + 1).getValue();
    sheet.getRange(rowNumber, COL.TARGET + 1).setValue(Number(payload.allocated_target));
    appendLog_({
      timestamp: timestamp, user_id: payload.updated_by, user_name: payload.user_name, university_name: displayName,
      action: 'update', sheet_name: parsed.sheetName, row_id: indicatorName,
      field_name: '목표값(F열)', old_value: before, new_value: payload.allocated_target,
    });
  }

  // 비고(I열)는 대학마다 위치·존재 여부가 달라 병합 셀을 잘못 건드릴 위험이 있어 쓰기를 지원하지 않는다.
  // 증빙 제출 여부 역시 이 시트에서 관리하지 않으므로 저장 요청이 와도 무시한다.

  return { success: true };
}

// ---------------------------------------------------------------------------
// 5. updateTarget — 실제 시트에는 "전체 목표값" 단일 셀이 없고, 대학별 배부 목표값의
//    합계가 곧 전체 목표값이므로 전체 목표값 직접 수정은 지원하지 않는다.
//    (대학별 배부 목표값 수정은 updateUniversityResult_의 allocated_target으로 처리)
// ---------------------------------------------------------------------------
function updateTarget_() {
  return {
    success: false,
    message: '전체 목표값은 대학별 배부 목표값의 합계로 자동 계산됩니다. 대학별 배부·달성 관리 화면 또는 대학별 배부 목표값 수정 기능을 이용해 주세요.',
  };
}

// ---------------------------------------------------------------------------
// 6. getPriorityIndicators
// ---------------------------------------------------------------------------
function getPriorityIndicators_() {
  const summaries = buildIndicatorSummaries_();
  const priorities = [];

  summaries.forEach((summary) => {
    summary.universityResults.forEach((r) => {
      const reasons = [];
      const hasActual = r.actual_result !== null && r.actual_result !== undefined;
      if (!hasActual) reasons.push('실적값 미입력');
      else if (r.achievement_rate !== null && r.achievement_rate < 80) reasons.push('목표 대비 실적 부족');
      if (reasons.length === 0) return;

      const rate = hasActual ? r.achievement_rate : null;
      let risk = '낮음';
      if (!hasActual || (rate !== null && rate < 60)) risk = '높음';
      else if (rate !== null && rate < 80) risk = '보통';

      priorities.push({
        risk_level: risk,
        indicator_id: summary.indicator_id,
        indicator_name: summary.indicator_name,
        university_name: r.university_name,
        target: r.allocated_target,
        actual: r.actual_result,
        achievement_rate: r.achievement_rate,
        reason: reasons.join(', '),
        action_needed: !hasActual ? '실적값 입력 요청' : '실적 개선 계획 수립 요청',
        manager: r.manager_name || '-',
        note: r.note,
      });
    });
  });

  const riskOrder = { 높음: 0, 보통: 1, 낮음: 2 };
  return priorities.sort((a, b) => riskOrder[a.risk_level] - riskOrder[b.risk_level]);
}

// ---------------------------------------------------------------------------
// 7. login — users 시트가 없으면 최초 실행 시 관리자/대학 담당자 기본 계정으로 자동 생성
// ---------------------------------------------------------------------------
function ensureUsersSheet_() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(SHEET_NAMES.USERS);
  if (sheet) return sheet;

  sheet = ss.insertSheet(SHEET_NAMES.USERS);
  sheet.appendRow(['user_id', 'name', 'email', 'role', 'university_name', 'password', 'status']);
  sheet.appendRow(['U001', '관리자', 'admin@coss.kangwon.ac.kr', 'admin', '전체', 'admin1234', '사용']);
  sheet.appendRow(['U002', '강원대학교 담당자', 'kw@coss.kangwon.ac.kr', 'university', '강원대학교', 'kw1234', '사용']);
  sheet.appendRow(['U003', '아주대학교 담당자', 'ajou@coss.kangwon.ac.kr', 'university', '아주대학교', 'ajou1234', '사용']);
  sheet.appendRow(['U004', '충남대학교 담당자', 'cnu@coss.kangwon.ac.kr', 'university', '충남대학교', 'cnu1234', '사용']);
  sheet.appendRow(['U005', '한양대학교 ERICA 담당자', 'hyu@coss.kangwon.ac.kr', 'university', '한양대학교 ERICA', 'hyu1234', '사용']);
  sheet.appendRow(['U006', '영남이공대학교 담당자', 'ync@coss.kangwon.ac.kr', 'university', '영남이공대학교', 'ync1234', '사용']);
  return sheet;
}

function ensureLogsSheet_() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(SHEET_NAMES.LOGS);
  if (sheet) return sheet;

  sheet = ss.insertSheet(SHEET_NAMES.LOGS);
  sheet.appendRow([
    'log_id', 'timestamp', 'user_id', 'user_name', 'university_name',
    'action', 'sheet_name', 'row_id', 'field_name', 'old_value', 'new_value',
  ]);
  return sheet;
}

function readUsersSheet_() {
  const sheet = ensureUsersSheet_();
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  return values.slice(1)
    .filter((row) => row.some((cell) => cell !== '' && cell !== null))
    .map((row) => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = row[i]));
      return obj;
    });
}

function login_(payload) {
  const users = readUsersSheet_();
  const user = users.find(
    (u) => String(u.email).toLowerCase() === String(payload.email).toLowerCase() && String(u.password) === String(payload.password)
  );
  if (!user) return { success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' };
  if (user.status !== '사용') return { success: false, message: '사용이 중지된 계정입니다. 관리자에게 문의하세요.' };

  return {
    success: true,
    user: {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
      university_name: user.university_name,
    },
  };
}

// ---------------------------------------------------------------------------
// 사용자 관리 / 수정 이력
// ---------------------------------------------------------------------------
function appendLog_(entry) {
  const sheet = ensureLogsSheet_();
  const logId = 'L' + String(sheet.getLastRow()).padStart(4, '0');
  sheet.appendRow([
    logId,
    entry.timestamp || nowTimestamp_(),
    entry.user_id || '',
    entry.user_name || '',
    entry.university_name || '',
    entry.action || 'update',
    entry.sheet_name || '',
    entry.row_id || '',
    entry.field_name || '',
    entry.old_value === undefined || entry.old_value === null ? '' : String(entry.old_value),
    entry.new_value === undefined || entry.new_value === null ? '' : String(entry.new_value),
  ]);
}

function getUsers_() {
  return readUsersSheet_().map((u) => {
    const copy = Object.assign({}, u);
    delete copy.password;
    return copy;
  });
}

function upsertUser_(payload) {
  const user = payload.user;
  const sheet = ensureUsersSheet_();
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf('user_id');

  let rowNumber = null;
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][idCol]) === String(user.user_id)) {
      rowNumber = r + 1;
      break;
    }
  }

  if (rowNumber) {
    headers.forEach((h, i) => {
      if (h === 'password' && !user.password) return;
      if (user[h] !== undefined) sheet.getRange(rowNumber, i + 1).setValue(user[h]);
    });
  } else {
    sheet.appendRow(headers.map((h) => (user[h] !== undefined ? user[h] : '')));
  }

  return { success: true };
}

function getChangeLogs_() {
  const sheet = ensureLogsSheet_();
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const logs = values.slice(1)
    .filter((row) => row.some((cell) => cell !== '' && cell !== null))
    .map((row) => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = row[i]));
      return obj;
    });
  return logs.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
}

// ---------------------------------------------------------------------------
// 요청 라우팅
// ---------------------------------------------------------------------------
function jsonResponse_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function routeAction_(action, params) {
  switch (action) {
    case 'getDashboardData':
      return { success: true, data: getDashboardData_() };
    case 'getIndicators':
      return { success: true, data: getIndicators_(params) };
    case 'getUniversityResults':
      return { success: true, data: getUniversityResults_(params) };
    case 'updateUniversityResult':
      return { success: true, data: updateUniversityResult_(params) };
    case 'updateTarget':
      return { success: true, data: updateTarget_(params) };
    case 'getPriorityIndicators':
      return { success: true, data: getPriorityIndicators_(params) };
    case 'login':
      return { success: true, data: login_(params) };
    case 'getUsers':
      return { success: true, data: getUsers_() };
    case 'upsertUser':
      return { success: true, data: upsertUser_(params) };
    case 'getChangeLogs':
      return { success: true, data: getChangeLogs_() };
    default:
      return { success: false, message: '알 수 없는 요청입니다: ' + action };
  }
}

/** GET 요청: 조회성 API (?action=...&param=...) */
function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const action = params.action;
    const result = routeAction_(action, params);
    return jsonResponse_(result);
  } catch (err) {
    return jsonResponse_({ success: false, message: String(err) });
  }
}

/** POST 요청: 로그인/저장성 API (JSON body, text/plain 로 전송되어 CORS preflight 회피) */
function doPost(e) {
  try {
    const body = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    const action = body.action;
    const result = routeAction_(action, body);
    return jsonResponse_(result);
  } catch (err) {
    return jsonResponse_({ success: false, message: String(err) });
  }
}
