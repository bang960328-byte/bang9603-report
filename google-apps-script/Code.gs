/**
 * COSS 성과지표 총괄관리 시스템 - Google Apps Script API
 * 강원대학교 데이터보안·활용 혁신융합대학사업단
 *
 * 구글시트를 데이터베이스로, 이 스크립트를 API 서버로 사용한다.
 * 배포: 배포 > 새 배포 > 유형: 웹 앱
 *   - 실행 계정: 나(스프레드시트 소유자)
 *   - 액세스 권한: 전체 공개(익명 사용자 포함) — React 앱에서 fetch로 호출하기 위함
 * 배포 후 발급되는 웹 앱 URL을 프론트엔드 .env 파일의 VITE_GAS_API_URL 에 설정한다.
 *
 * 시트 구성
 *  - indicators:        indicator_id, year, category, indicator_name, unit, description, status
 *  - targets:           target_id, year, indicator_id, total_target, note, updated_at
 *  - university_results: result_id, year, indicator_id, university_name, allocated_target,
 *                        actual_result, achievement_rate, evidence_status, note, updated_by, updated_at
 *  - users:             user_id, name, email, role, university_name, password, status
 *  - logs:              log_id, timestamp, user_id, user_name, university_name, action,
 *                        sheet_name, row_id, field_name, old_value, new_value
 */

const SHEET_NAMES = {
  INDICATORS: 'indicators',
  TARGETS: 'targets',
  RESULTS: 'university_results',
  USERS: 'users',
  LOGS: 'logs',
};

const DEFAULT_YEAR = 2026;

// ---------------------------------------------------------------------------
// 공통 유틸
// ---------------------------------------------------------------------------

function getSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('시트를 찾을 수 없습니다: ' + name);
  return sheet;
}

/** 시트를 [{컬럼명: 값}, ...] 형태의 객체 배열로 변환 */
function readSheet_(name) {
  const sheet = getSheet_(name);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1)
    .filter((row) => row.some((cell) => cell !== '' && cell !== null))
    .map((row) => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = row[i]));
      return obj;
    });
}

/** id 컬럼 값으로 시트에서 행 번호(1-based, 헤더 포함)를 찾는다 */
function findRowIndexByColumn_(sheet, columnName, value) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const colIdx = headers.indexOf(columnName);
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][colIdx]) === String(value)) return { rowNumber: r + 1, headers };
  }
  return null;
}

function nowTimestamp_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Seoul', 'yyyy-MM-dd HH:mm');
}

function appendLog_(entry) {
  const sheet = getSheet_(SHEET_NAMES.LOGS);
  const lastRow = sheet.getLastRow();
  const logId = 'L' + String(lastRow).padStart(3, '0');
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

function calculateAchievementRate_(actual, target) {
  if (actual === null || actual === undefined || actual === '') return null;
  if (!target || Number(target) <= 0) return null;
  return Math.round((Number(actual) / Number(target)) * 1000) / 10;
}

function getAchievementStatus_(rate, hasAnyActual) {
  if (!hasAnyActual || rate === null) return '미제출';
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
// 지표 요약 생성 (indicators + targets + university_results 결합)
// ---------------------------------------------------------------------------

function buildIndicatorSummaries_(year) {
  const indicators = readSheet_(SHEET_NAMES.INDICATORS).filter(
    (i) => Number(i.year) === Number(year) && i.status === '사용'
  );
  const targets = readSheet_(SHEET_NAMES.TARGETS).filter((t) => Number(t.year) === Number(year));
  const results = readSheet_(SHEET_NAMES.RESULTS).filter((r) => Number(r.year) === Number(year));

  return indicators.map((ind) => {
    const target = targets.find((t) => t.indicator_id === ind.indicator_id);
    const totalTarget = target ? Number(target.total_target) : 0;
    const related = results.filter((r) => r.indicator_id === ind.indicator_id);

    const hasAnyActual = related.some((r) => r.actual_result !== '' && r.actual_result !== null && r.actual_result !== undefined);
    const isRateType = ind.unit === '%' || ind.unit === '점';

    let displayActual;
    if (isRateType) {
      const vals = related
        .filter((r) => r.actual_result !== '' && r.actual_result !== null && r.actual_result !== undefined)
        .map((r) => Number(r.actual_result));
      displayActual = average_(vals);
    } else {
      displayActual = related.reduce((sum, r) => sum + (Number(r.actual_result) || 0), 0);
    }

    const rate = hasAnyActual ? calculateAchievementRate_(displayActual, totalTarget) : null;
    const status = getAchievementStatus_(rate, hasAnyActual);

    const evidenceRequired = related.filter((r) => r.evidence_status !== '해당없음').length;
    const evidenceSubmitted = related.filter((r) => r.evidence_status === '제출').length;
    const evidenceStatus =
      evidenceRequired === 0 ? '해당없음' : evidenceSubmitted === evidenceRequired ? '제출' : '미제출';

    const updatedAt = related.map((r) => r.updated_at).sort().reverse()[0] || (target && target.updated_at) || '-';
    const note = (related.map((r) => r.note).filter(Boolean)[0]) || '';

    return {
      indicator_id: ind.indicator_id,
      year: ind.year,
      category: ind.category,
      indicator_name: ind.indicator_name,
      unit: ind.unit,
      description: ind.description,
      total_target: totalTarget,
      total_actual: displayActual,
      achievement_rate: rate,
      status: status,
      evidence_status: evidenceStatus,
      note: note,
      updated_at: updatedAt,
      universityResults: related,
    };
  });
}

// ---------------------------------------------------------------------------
// 1. getDashboardData
// ---------------------------------------------------------------------------
function getDashboardData_(params) {
  const year = params.year || DEFAULT_YEAR;
  const summaries = buildIndicatorSummaries_(year);
  const results = readSheet_(SHEET_NAMES.RESULTS).filter((r) => Number(r.year) === Number(year));

  const core = summaries.filter((s) => s.category === '핵심');
  const auto = summaries.filter((s) => s.category === '자율');
  const rates = summaries.map((s) => s.achievement_rate).filter((r) => r !== null);
  const coreRates = core.map((s) => s.achievement_rate).filter((r) => r !== null);
  const autoRates = auto.map((s) => s.achievement_rate).filter((r) => r !== null);

  const universityNames = Array.from(new Set(results.map((r) => r.university_name)));
  const universityRates = universityNames.map((uni) => {
    const uniResults = results.filter((r) => r.university_name === uni && r.achievement_rate !== '' && r.achievement_rate !== null);
    return { university_name: uni, rate: average_(uniResults.map((r) => Number(r.achievement_rate))) };
  });

  const indicatorRanking = summaries
    .filter((s) => s.achievement_rate !== null)
    .map((s) => ({ indicator_name: s.indicator_name, rate: s.achievement_rate, category: s.category }))
    .sort((a, b) => b.rate - a.rate);

  const evidenceStatusCounts = ['제출', '미제출', '해당없음'].map((status) => ({
    status: status,
    count: results.filter((r) => r.evidence_status === status).length,
  }));

  return {
    totalIndicators: summaries.length,
    coreIndicators: core.length,
    autonomousIndicators: auto.length,
    averageAchievementRate: average_(rates),
    underAchievedCount: summaries.filter((s) => s.status === '미달').length,
    evidenceMissingCount: results.filter((r) => r.evidence_status === '미제출').length,
    coreAverageRate: average_(coreRates),
    autonomousAverageRate: average_(autoRates),
    universityRates: universityRates,
    indicatorRanking: indicatorRanking,
    evidenceStatusCounts: evidenceStatusCounts,
  };
}

// ---------------------------------------------------------------------------
// 2. getIndicators
// ---------------------------------------------------------------------------
function getIndicators_(params) {
  const year = params.year || DEFAULT_YEAR;
  const summaries = buildIndicatorSummaries_(year);
  if (params.category) {
    return summaries.filter((s) => s.category === params.category);
  }
  return summaries;
}

// ---------------------------------------------------------------------------
// 3. getUniversityResults (권한별 범위 제한)
// ---------------------------------------------------------------------------
function getUniversityResults_(params) {
  const year = params.year || DEFAULT_YEAR;
  let results = readSheet_(SHEET_NAMES.RESULTS).filter((r) => Number(r.year) === Number(year));
  if (params.role === 'university' && params.university_name) {
    results = results.filter((r) => r.university_name === params.university_name);
  }
  return results;
}

// ---------------------------------------------------------------------------
// 4. updateUniversityResult
// ---------------------------------------------------------------------------
function updateUniversityResult_(payload) {
  if (payload.actual_result !== undefined && payload.actual_result !== null && Number(payload.actual_result) < 0) {
    return { success: false, message: '음수는 입력할 수 없습니다.' };
  }
  if (payload.allocated_target !== undefined && Number(payload.allocated_target) < 0) {
    return { success: false, message: '음수는 입력할 수 없습니다.' };
  }

  const sheet = getSheet_(SHEET_NAMES.RESULTS);
  const found = findRowIndexByColumn_(sheet, 'result_id', payload.result_id);
  if (!found) return { success: false, message: '대상 실적 데이터를 찾을 수 없습니다.' };

  const headers = found.headers;
  const rowNumber = found.rowNumber;
  const colIdx = (name) => headers.indexOf(name) + 1;
  const currentRow = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  const getCurrent = (name) => currentRow[headers.indexOf(name)];

  const timestamp = nowTimestamp_();
  const universityName = payload.university_name || getCurrent('university_name');

  if (payload.allocated_target !== undefined && String(getCurrent('allocated_target')) !== String(payload.allocated_target)) {
    appendLog_({
      timestamp, user_id: payload.updated_by, user_name: payload.user_name, university_name: universityName,
      action: 'update', sheet_name: SHEET_NAMES.RESULTS, row_id: payload.result_id,
      field_name: 'allocated_target', old_value: getCurrent('allocated_target'), new_value: payload.allocated_target,
    });
    sheet.getRange(rowNumber, colIdx('allocated_target')).setValue(Number(payload.allocated_target));
  }

  if (payload.actual_result !== undefined && String(getCurrent('actual_result')) !== String(payload.actual_result)) {
    appendLog_({
      timestamp, user_id: payload.updated_by, user_name: payload.user_name, university_name: universityName,
      action: 'update', sheet_name: SHEET_NAMES.RESULTS, row_id: payload.result_id,
      field_name: 'actual_result', old_value: getCurrent('actual_result'), new_value: payload.actual_result,
    });
    sheet.getRange(rowNumber, colIdx('actual_result')).setValue(payload.actual_result === null ? '' : Number(payload.actual_result));
  }

  if (payload.evidence_status && getCurrent('evidence_status') !== payload.evidence_status) {
    appendLog_({
      timestamp, user_id: payload.updated_by, user_name: payload.user_name, university_name: universityName,
      action: 'update', sheet_name: SHEET_NAMES.RESULTS, row_id: payload.result_id,
      field_name: 'evidence_status', old_value: getCurrent('evidence_status'), new_value: payload.evidence_status,
    });
    sheet.getRange(rowNumber, colIdx('evidence_status')).setValue(payload.evidence_status);
  }

  if (payload.note !== undefined && getCurrent('note') !== payload.note) {
    appendLog_({
      timestamp, user_id: payload.updated_by, user_name: payload.user_name, university_name: universityName,
      action: 'update', sheet_name: SHEET_NAMES.RESULTS, row_id: payload.result_id,
      field_name: 'note', old_value: getCurrent('note'), new_value: payload.note,
    });
    sheet.getRange(rowNumber, colIdx('note')).setValue(payload.note);
  }

  // 달성률 자동 계산
  const finalActual = payload.actual_result !== undefined ? payload.actual_result : getCurrent('actual_result');
  const finalTarget = payload.allocated_target !== undefined ? payload.allocated_target : getCurrent('allocated_target');
  const rate = calculateAchievementRate_(finalActual, finalTarget);
  sheet.getRange(rowNumber, colIdx('achievement_rate')).setValue(rate === null ? '' : rate);

  sheet.getRange(rowNumber, colIdx('updated_by')).setValue(payload.updated_by || '');
  sheet.getRange(rowNumber, colIdx('updated_at')).setValue(timestamp);

  return { success: true };
}

// ---------------------------------------------------------------------------
// 5. updateTarget (관리자 전용 — 프론트엔드에서 role 검증 후 호출)
// ---------------------------------------------------------------------------
function updateTarget_(payload) {
  if (Number(payload.total_target) < 0) {
    return { success: false, message: '음수는 입력할 수 없습니다.' };
  }

  const sheet = getSheet_(SHEET_NAMES.TARGETS);
  const found = findRowIndexByColumn_(sheet, 'indicator_id', payload.indicator_id);
  if (!found) return { success: false, message: '대상 목표값을 찾을 수 없습니다.' };

  const headers = found.headers;
  const rowNumber = found.rowNumber;
  const colIdx = (name) => headers.indexOf(name) + 1;
  const currentRow = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  const oldTarget = currentRow[headers.indexOf('total_target')];
  const timestamp = nowTimestamp_();

  appendLog_({
    timestamp, user_id: payload.updated_by, user_name: payload.user_name, university_name: '전체',
    action: 'update', sheet_name: SHEET_NAMES.TARGETS, row_id: currentRow[headers.indexOf('target_id')],
    field_name: 'total_target', old_value: oldTarget, new_value: payload.total_target,
  });

  sheet.getRange(rowNumber, colIdx('total_target')).setValue(Number(payload.total_target));
  if (payload.note !== undefined) sheet.getRange(rowNumber, colIdx('note')).setValue(payload.note);
  sheet.getRange(rowNumber, colIdx('updated_at')).setValue(timestamp);

  return { success: true };
}

// ---------------------------------------------------------------------------
// 6. getPriorityIndicators
// ---------------------------------------------------------------------------
function getPriorityIndicators_(params) {
  const year = params.year || DEFAULT_YEAR;
  const summaries = buildIndicatorSummaries_(year);
  const priorities = [];

  summaries.forEach((summary) => {
    summary.universityResults.forEach((r) => {
      const reasons = [];
      const hasActual = r.actual_result !== '' && r.actual_result !== null && r.actual_result !== undefined;
      if (!hasActual) reasons.push('실적값 미입력');
      else if (r.achievement_rate !== '' && Number(r.achievement_rate) < 80) reasons.push('목표 대비 실적 부족');
      if (r.evidence_status === '미제출') reasons.push('증빙 미제출');
      if (reasons.length === 0) return;

      const rate = hasActual ? Number(r.achievement_rate) : null;
      let risk = '낮음';
      if (!hasActual || (rate !== null && rate < 60) || reasons.length >= 2) risk = '높음';
      else if ((rate !== null && rate < 80) || r.evidence_status === '미제출') risk = '보통';

      priorities.push({
        risk_level: risk,
        indicator_id: summary.indicator_id,
        indicator_name: summary.indicator_name,
        university_name: r.university_name,
        target: r.allocated_target,
        actual: hasActual ? Number(r.actual_result) : null,
        achievement_rate: rate,
        reason: reasons.join(', '),
        action_needed: !hasActual ? '실적값 입력 요청' : r.evidence_status === '미제출' ? '증빙자료 제출 요청' : '실적 개선 계획 수립 요청',
        manager: r.updated_by || '-',
        note: r.note,
      });
    });
  });

  const riskOrder = { 높음: 0, 보통: 1, 낮음: 2 };
  return priorities.sort((a, b) => riskOrder[a.risk_level] - riskOrder[b.risk_level]);
}

// ---------------------------------------------------------------------------
// 7. login (실제 운영 전까지 간단한 시트 기반 로그인)
// ---------------------------------------------------------------------------
function login_(payload) {
  const users = readSheet_(SHEET_NAMES.USERS);
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
// 사용자 관리 / 수정 이력 (화면 요구사항 지원용 보조 API)
// ---------------------------------------------------------------------------
function getUsers_() {
  return readSheet_(SHEET_NAMES.USERS).map((u) => {
    const copy = Object.assign({}, u);
    delete copy.password; // 목록 조회 시 비밀번호는 반환하지 않음
    return copy;
  });
}

function upsertUser_(payload) {
  const user = payload.user;
  const sheet = getSheet_(SHEET_NAMES.USERS);
  const found = findRowIndexByColumn_(sheet, 'user_id', user.user_id);

  if (found) {
    const headers = found.headers;
    const rowNumber = found.rowNumber;
    headers.forEach((h, i) => {
      if (h === 'password' && !user.password) return; // 비밀번호 미입력 시 기존 값 유지
      if (user[h] !== undefined) sheet.getRange(rowNumber, i + 1).setValue(user[h]);
    });
  } else {
    const headers = sheet.getDataRange().getValues()[0];
    sheet.appendRow(headers.map((h) => (user[h] !== undefined ? user[h] : '')));
  }

  return { success: true };
}

function getChangeLogs_() {
  return readSheet_(SHEET_NAMES.LOGS).sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
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
      return { success: true, data: getDashboardData_(params) };
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
