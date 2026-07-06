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

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const categoryCell = String(row[COL.CATEGORY] || '').trim();

    // 지표표 아래에 붙어있는 "달성지표 / 건명 / 증빙제출여부" 저장용 표를 만나면 읽기를 멈춘다.
    // (이 아래 행들은 실제 성과지표가 아니라 세부 내용 입력란이므로 집계에서 제외)
    if (categoryCell === '달성지표') break;

    const name = String(row[COL.NAME] || '').trim();
    if (!name) continue; // 지표명이 없는 행(구분선 등)은 건너뜀

    if (categoryCell) lastCategory = categoryCell;
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
  }

  return rows;
}

/** 강원대학교 탭 순서를 기준으로 지표 ID·대분류를 확정한다 */
function getCanonicalIndicators_() {
  const rows = readUniversitySheetRows_(CANONICAL_SHEET);
  return rows.map((r, idx) => ({
    indicator_id: 'IND' + String(idx + 1).padStart(2, '0'),
    indicator_name: r.indicator_name,
    category: r.category,
    subcategory: r.subcategory,
  }));
}

function getIndicatorNameMap_() {
  const canonical = getCanonicalIndicators_();
  const idToName = {};
  const nameToId = {};
  canonical.forEach((c) => {
    idToName[c.indicator_id] = c.indicator_name;
    // 대학별 탭마다 같은 지표를 표기하는 방식이 미묘하게 달라(공백, 화살표 기호 등) 완전
    // 일치 비교로는 다른 대학 탭의 행을 못 찾는 경우가 많으므로 정규화한 이름을 키로 쓴다.
    nameToId[normalizeIndicatorName_(c.indicator_name)] = c.indicator_id;
  });
  return { idToName, nameToId, canonical };
}

// 증빙 제출 여부(예/아니오)를 저장하는 시트. 실제 시트에는 이 값이 없어 별도 관리하며,
// 최초 호출 시 자동 생성된다.
function ensureEvidenceSheet_() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName('evidence_status');
  if (sheet) return sheet;
  sheet = ss.insertSheet('evidence_status');
  sheet.appendRow(['result_id', 'university_name', 'indicator_name', 'evidence_status', 'updated_by', 'updated_at']);
  return sheet;
}

function readEvidenceStatuses_() {
  const sheet = ensureEvidenceSheet_();
  const values = sheet.getDataRange().getValues();
  const map = {};
  for (let r = 1; r < values.length; r++) {
    const id = String(values[r][0] || '').trim();
    if (id) map[id] = String(values[r][3] || '아니오');
  }
  return map;
}

function writeEvidenceStatus_(payload) {
  const sheet = ensureEvidenceSheet_();
  const values = sheet.getDataRange().getValues();
  const timestamp = nowTimestamp_();
  let rowNumber = null;
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][0]) === String(payload.result_id)) {
      rowNumber = r + 1;
      break;
    }
  }
  if (rowNumber) {
    sheet.getRange(rowNumber, 4).setValue(payload.evidence_status);
    sheet.getRange(rowNumber, 5).setValue(payload.updated_by || '');
    sheet.getRange(rowNumber, 6).setValue(timestamp);
  } else {
    sheet.appendRow([
      payload.result_id,
      payload.university_name || '',
      payload.indicator_name || '',
      payload.evidence_status,
      payload.updated_by || '',
      timestamp,
    ]);
  }
}

// ---------------------------------------------------------------------------
// 총괄 탭: 지표별 "3차년도 전체 목표값"의 유일한 기준.
// 대학별 탭의 F열(배부값) 합계는 배분 참고용일 뿐, 실제 3차 목표는 총괄 탭에서 가져온다.
// 헤더 열 위치를 하드코딩하지 않고 "3차"라는 헤더 텍스트를 찾아 그 열을 사용한다
// (숨김 열 등으로 실제 위치가 달라져도 안전하게 동작하도록).
// ---------------------------------------------------------------------------
const OVERVIEW_SHEET_NAME = '총괄';
const OVERVIEW_SUBCATEGORY_COL = 1; // B열 = 지표 중분류 (병합 셀 — forward-fill로 복원)
const OVERVIEW_NAME_COL = 2; // C열 = 지표명 (총괄 탭 공통 구조)
const OVERVIEW_DATA_START_ROW = 3; // 1-indexed, 총괄 탭 데이터 시작 행

// 총괄 탭의 지표명(예: "기존 교과목 개선건수(↓)", "취업률(WU 이수 학생 중 60%이상)(↓)")과
// 대학별 탭의 지표명(예: "기존 교과목 개선건수", "취업률")은 증감방향 표시(↓,↑ 등)·괄호로 묶인
// 부가설명·공백 유무가 서로 달라 그대로는 매칭되지 않는 경우가 많다. 괄호는 문자만 지우면
// 안의 부가설명 글자가 그대로 남아버리므로, 괄호와 그 안의 내용을 통째로 제거해야 한다.
// 두 이름을 비교할 때는 이 함수로 정규화한 값을 키로 사용한다.
function normalizeIndicatorName_(name) {
  return String(name || '')
    .replace(/[(（][^)）]*[)）]/g, '')
    .replace(/[\[［][^\]］]*[\]］]/g, '')
    .replace(/[↑↓⇅↔→←]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

/** 총괄 탭에서 실제로 읽은 원본 행을 그대로 반환한다 (디버그 겸용) */
function readOverviewRawRows_() {
  const sheet = getSpreadsheet_().getSheetByName(OVERVIEW_SHEET_NAME);
  if (!sheet) return { rows: [], thirdYearCol: -1, lastRow: 0, lastCol: 0 };

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return { rows: [], thirdYearCol: -1, lastRow: lastRow, lastCol: lastCol };

  const headerRows = Math.min(lastRow, 5);
  const headerValues = sheet.getRange(1, 1, headerRows, lastCol).getValues();

  let thirdYearCol = -1; // 0-based
  for (let r = 0; r < headerValues.length && thirdYearCol === -1; r++) {
    for (let c = 0; c < headerValues[r].length; c++) {
      if (String(headerValues[r][c] || '').trim() === '3차') {
        thirdYearCol = c;
        break;
      }
    }
  }
  if (thirdYearCol === -1 || lastRow < OVERVIEW_DATA_START_ROW) {
    return { rows: [], thirdYearCol: thirdYearCol, lastRow: lastRow, lastCol: lastCol };
  }

  const numCols = Math.max(thirdYearCol + 1, OVERVIEW_NAME_COL + 1);
  const numRows = lastRow - OVERVIEW_DATA_START_ROW + 1;
  const values = sheet.getRange(OVERVIEW_DATA_START_ROW, 1, numRows, numCols).getValues();

  // 총괄 탭은 "핵심지표" 구간(대분류/중분류/지표명 3단, B=중분류·C=지표명)과 이어지는
  // "자율지표" 구간(중분류 없이 대분류/지표명 2단, B=지표명·C는 비어있음)이 한 표 안에 섞여
  // 있다. C열이 채워진 행은 기존대로 B열을 중분류로 쓰고, C열이 비어있는데 B열에 값이 있는
  // 행은 그 B열 값을 지표명 자체로 취급한다(이 구간은 중분류 개념이 없음).
  let lastSubcategory = '';
  const rows = [];
  values.forEach((row, idx) => {
    const cVal = String(row[OVERVIEW_NAME_COL] || '').trim();
    const bVal = String(row[OVERVIEW_SUBCATEGORY_COL] || '').trim();
    let name, subcategory;
    if (cVal) {
      if (bVal) lastSubcategory = bVal;
      name = cVal;
      subcategory = lastSubcategory;
    } else if (bVal) {
      name = bVal;
      subcategory = '';
    } else {
      return;
    }
    rows.push({
      sheet_row: OVERVIEW_DATA_START_ROW + idx,
      subcategory: subcategory,
      name: name,
      raw_third_year_value: row[thirdYearCol],
      target: parseNumberCell_(row[thirdYearCol]),
    });
  });

  return { rows: rows, thirdYearCol: thirdYearCol, lastRow: lastRow, lastCol: lastCol };
}

function getOverviewTargetMap_() {
  const map = {};
  // 대학별 탭은 지표명에 중분류를 이미 포함해 쓰기도 한다(예: "전임 일반교원 수"/"비전임 일반교원 수").
  // 총괄 탭은 중분류(B열, 병합 셀)와 지표명(C열)이 분리돼 있어 이름만으로는 두 "일반교원 수" 행이
  // 구분되지 않으므로, 중분류를 forward-fill로 복원해 "중분류+지표명" 조합 키도 함께 등록한다.
  readOverviewRawRows_().rows.forEach((r) => {
    const plainKey = normalizeIndicatorName_(r.name);
    const combinedKey = normalizeIndicatorName_(r.subcategory + r.name);
    if (plainKey) map[plainKey] = r.target;
    if (combinedKey) map[combinedKey] = r.target;
  });
  return map;
}

/** 5개 대학 탭을 모두 읽어 지표별·대학별 실적 배열로 결합한다 */
function buildAllUniversityResults_() {
  const { nameToId } = getIndicatorNameMap_();
  const evidenceMap = readEvidenceStatuses_();
  const results = [];

  UNIVERSITY_SHEET_NAMES.forEach((sheetName) => {
    const displayName = SHEET_TO_DISPLAY_NAME[sheetName];
    const rows = readUniversitySheetRows_(sheetName);
    rows.forEach((r) => {
      const indicatorId = nameToId[normalizeIndicatorName_(r.indicator_name)];
      if (!indicatorId) return; // 기준 탭(강원대학교)에 없는 지표명은 구조 불일치로 간주해 제외

      const allocated = r.target || 0;
      const actual = r.actual;
      const rate = calculateAchievementRate_(actual, allocated);
      const resultId = sheetName + '__' + indicatorId;

      results.push({
        result_id: resultId,
        year: DEFAULT_YEAR,
        indicator_id: indicatorId,
        university_name: displayName,
        allocated_target: allocated,
        actual_result: actual,
        achievement_rate: rate,
        evidence_status: evidenceMap[resultId] || '아니오',
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
  const overviewTargets = getOverviewTargetMap_();

  return canonical.map((ind) => {
    const related = results.filter((r) => r.indicator_id === ind.indicator_id);
    const hasAnyActual = related.some((r) => r.actual_result !== null && r.actual_result !== undefined);
    const allocatedSum = related.reduce((sum, r) => sum + (r.allocated_target || 0), 0);
    const totalActual = related.reduce((sum, r) => sum + (r.actual_result || 0), 0);

    // 총괄 탭에 이 지표의 3차 목표가 있으면 그 값을 유일한 기준으로 쓰고,
    // 없으면(총괄에 없는 지표명) 대학별 배부값 합계로 대체한다.
    // 대학별 탭의 지표명은 "전임 일반교원 수"처럼 중분류를 이미 포함하기도 하는데, 이 경우
    // 정규화한 지표명 자체가 총괄 탭에서 만든 "중분류+지표명" 조합 키와 그대로 일치하므로
    // 별도로 다시 조합하지 않고 지표명 하나만 정규화해 조회한다.
    const overviewTarget = overviewTargets[normalizeIndicatorName_(ind.indicator_name)];
    const hasNoTarget = overviewTarget === null; // 총괄에 3차 목표가 '-'/공란으로 명시된 경우
    const totalTarget = overviewTarget === undefined ? allocatedSum : (overviewTarget === null ? null : overviewTarget);

    const rate = !hasNoTarget && hasAnyActual ? calculateAchievementRate_(totalActual, totalTarget || 0) : null;
    // 목표값이 없는 지표는 rate가 항상 null이므로 getAchievementStatus_가 자동으로 '미제출'을 반환한다.
    const status = getAchievementStatus_(rate, hasAnyActual);
    const notes = related.map((r) => r.note).filter(Boolean);
    const submittedCount = related.filter((r) => r.evidence_status === '예').length;
    const evidenceStatus = related.length === 0 ? '해당없음' : submittedCount === related.length ? '예' : '아니오';

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
      evidence_status: evidenceStatus,
      note: notes[0] || '',
      updated_at: nowTimestamp_(),
      universityResults: related,
    };
  });
}

// 총괄 탭 이름 매칭 진단용. 브라우저에서 배포 URL 뒤에 ?action=debugNameMatch 를 붙여 열면
// 어떤 지표가 총괄 3차 값을 못 찾고 배부값 합계로 대체됐는지 바로 확인할 수 있다.
function debugNameMatch_() {
  const { canonical } = getIndicatorNameMap_();
  const overviewTargets = getOverviewTargetMap_();
  const overviewRaw = readOverviewRawRows_();
  const results = buildAllUniversityResults_();

  const rows = canonical.map((ind) => {
    const key = normalizeIndicatorName_(ind.indicator_name);
    const matched = Object.prototype.hasOwnProperty.call(overviewTargets, key);
    const allocatedSum = results
      .filter((r) => r.indicator_id === ind.indicator_id)
      .reduce((sum, r) => sum + (r.allocated_target || 0), 0);
    return {
      indicator_id: ind.indicator_id,
      indicator_name: ind.indicator_name,
      category: ind.category,
      subcategory: ind.subcategory,
      normalized_name: key,
      matched_overview: matched,
      overview_target: matched ? overviewTargets[key] : null,
      allocated_sum_fallback: allocatedSum,
    };
  });

  return {
    overview_last_row: overviewRaw.lastRow,
    overview_last_col: overviewRaw.lastCol,
    overview_third_year_col_0based: overviewRaw.thirdYearCol,
    overview_row_count_read: overviewRaw.rows.length,
    overview_raw_rows: overviewRaw.rows,
    overview_key_count: Object.keys(overviewTargets).length,
    unmatched_count: rows.filter((r) => !r.matched_overview).length,
    unmatched: rows.filter((r) => !r.matched_overview),
    all: rows,
  };
}

function columnIndexToLetter_(index0based) {
  let n = index0based + 1;
  let letters = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

// "자율지표" 구간처럼 핵심지표(A~M열)와 다른 열 배치를 쓰는 부분을 찾기 위해,
// 지정한 행 범위의 비어있지 않은 셀만 열 위치와 함께 그대로 보여준다.
// ?action=debugOverviewWide&startRow=29&endRow=80 형태로 호출한다(생략 시 기본값 사용).
function debugOverviewWide_(params) {
  const sheet = getSpreadsheet_().getSheetByName(OVERVIEW_SHEET_NAME);
  if (!sheet) return { message: '총괄 시트를 찾을 수 없습니다.' };

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const startRow = params && params.startRow ? Number(params.startRow) : 1;
  const endRow = Math.min(lastRow, params && params.endRow ? Number(params.endRow) : lastRow);
  if (startRow < 1 || endRow < startRow) return { message: '유효하지 않은 행 범위입니다.', lastRow: lastRow, lastCol: lastCol };

  const numRows = endRow - startRow + 1;
  const values = sheet.getRange(startRow, 1, numRows, lastCol).getValues();

  const rows = values.map((row, idx) => {
    const cells = [];
    row.forEach((cell, c) => {
      const str = String(cell === null || cell === undefined ? '' : cell).trim();
      if (str !== '') cells.push({ col: columnIndexToLetter_(c), value: cell });
    });
    return { sheet_row: startRow + idx, cells: cells };
  });

  return { last_row: lastRow, last_col: lastCol, start_row: startRow, end_row: endRow, rows: rows };
}

// 특정 지표의 대학별 실적 합산 과정을 그대로 보여준다. 총괄 탭의 대학별 배부값·달성값과
// 대조해서 어느 대학 탭에서 실적/목표가 잘못 읽히는지 찾을 때 쓴다.
// ?action=debugIndicatorDetail&indicatorId=IND28 또는 &name=컨소 간 대학 간 연계 교과목 이수자 수
function debugIndicatorDetail_(params) {
  const { canonical, nameToId } = getIndicatorNameMap_();
  let indicatorId = params && params.indicatorId;
  if (!indicatorId && params && params.name) {
    indicatorId = nameToId[String(params.name).trim()];
  }
  if (!indicatorId) return { message: 'indicatorId 또는 name 파라미터가 필요합니다.', example: '?action=debugIndicatorDetail&indicatorId=IND28' };

  const ind = canonical.filter((c) => c.indicator_id === indicatorId)[0];
  if (!ind) return { message: '해당 지표를 찾을 수 없습니다: ' + indicatorId };

  const perUniversityRaw = UNIVERSITY_SHEET_NAMES.map((sheetName) => {
    const rows = readUniversitySheetRows_(sheetName);
    const targetKey = normalizeIndicatorName_(ind.indicator_name);
    const row = rows.filter((r) => normalizeIndicatorName_(r.indicator_name) === targetKey)[0];
    return {
      sheet_name: sheetName,
      display_name: SHEET_TO_DISPLAY_NAME[sheetName],
      found_in_sheet: !!row,
      raw_target: row ? row.target : null,
      raw_actual: row ? row.actual : null,
    };
  });

  const results = buildAllUniversityResults_().filter((r) => r.indicator_id === indicatorId);
  const overviewTargets = getOverviewTargetMap_();

  return {
    indicator_id: ind.indicator_id,
    indicator_name: ind.indicator_name,
    normalized_name: normalizeIndicatorName_(ind.indicator_name),
    overview_target: overviewTargets[normalizeIndicatorName_(ind.indicator_name)],
    per_university_raw_from_own_tab: perUniversityRaw,
    per_university_after_join: results,
    allocated_sum: results.reduce((sum, r) => sum + (r.allocated_target || 0), 0),
    actual_sum: results.reduce((sum, r) => sum + (r.actual_result || 0), 0),
  };
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
    return { category: category, count: items.length, averageRate: catRates.length > 0 ? average_(catRates) : null };
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

  const evidenceStatusCounts = ['예', '아니오', '해당없음'].map((status) => ({
    status: status,
    count: results.filter((r) => r.evidence_status === status).length,
  }));

  return {
    totalIndicators: summaries.length,
    categoryCount: categories.length,
    averageAchievementRate: average_(rates),
    underAchievedCount: summaries.filter((s) => s.status === '미달').length,
    evidenceMissingCount: results.filter((r) => r.evidence_status === '아니오').length,
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
  const targetKey = normalizeIndicatorName_(indicatorName);
  for (let i = 0; i < names.length; i++) {
    if (normalizeIndicatorName_(String(names[i][0] || '')) === targetKey) return DATA_START_ROW + i;
  }
  return null;
}

function parseResultId_(resultId) {
  const sheetName = UNIVERSITY_SHEET_NAMES.filter((s) => resultId.indexOf(s + '__') === 0)[0];
  if (!sheetName) return null;
  const indicatorId = resultId.substring(sheetName.length + 2);
  return { sheetName: sheetName, indicatorId: indicatorId };
}

// 목표값(F열)·실적값(G열)은 대시보드에서 더 이상 수정할 수 없다 — 구글시트에서 직접 입력해야
// 하며, 이 함수는 비고(I열)와 증빙 제출 여부만 저장한다.
function updateUniversityResult_(payload) {
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

  // 비고(I열) 저장 — 화면에서 읽어오는 것과 같은 열에 그대로 기록한다.
  if (payload.note !== undefined) {
    const before = sheet.getRange(rowNumber, COL.NOTE + 1).getValue();
    if (String(before) !== String(payload.note)) {
      sheet.getRange(rowNumber, COL.NOTE + 1).setValue(payload.note);
      appendLog_({
        timestamp: timestamp, user_id: payload.updated_by, user_name: payload.user_name, university_name: displayName,
        action: 'update', sheet_name: parsed.sheetName, row_id: indicatorName,
        field_name: '비고(I열)', old_value: before, new_value: payload.note,
      });
    }
  }

  // 증빙 제출 여부(예/아니오) — 실제 시트에는 없는 값이라 별도의 evidence_status 시트에 저장한다.
  if (payload.evidence_status !== undefined) {
    writeEvidenceStatus_({
      result_id: payload.result_id,
      university_name: displayName,
      indicator_name: indicatorName,
      evidence_status: payload.evidence_status,
      updated_by: payload.updated_by,
    });
    appendLog_({
      timestamp: timestamp, user_id: payload.updated_by, user_name: payload.user_name, university_name: displayName,
      action: 'update', sheet_name: 'evidence_status', row_id: indicatorName,
      field_name: '증빙 제출 여부', old_value: '', new_value: payload.evidence_status,
    });
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// 5. getPriorityIndicators — 지표별(5개 대학 합산)로 집계
// ---------------------------------------------------------------------------
function getPriorityIndicators_() {
  const summaries = buildIndicatorSummaries_();
  const actions = readPriorityActions_();
  const priorities = [];

  summaries.forEach((summary) => {
    if (summary.total_target === null) return; // 3차 목표가 없는 지표는 우선 관리 대상에서 제외

    const hasActual = summary.universityResults.some(
      (r) => r.actual_result !== null && r.actual_result !== undefined
    );
    const rate = summary.achievement_rate;

    // 우선 관리 대상: 실적 미입력 또는 달성률 80% 미만
    if (hasActual && rate !== null && rate >= 80) return;

    let risk, reason;
    if (!hasActual) {
      risk = '높음';
      reason = '실적값 미입력';
    } else if (rate !== null && rate < 60) {
      risk = '높음';
      reason = '목표 대비 실적 부족';
    } else {
      risk = '보통';
      reason = '목표 대비 실적 부족';
    }

    priorities.push({
      risk_level: risk,
      indicator_id: summary.indicator_id,
      indicator_name: summary.indicator_name,
      category: summary.category,
      total_target: summary.total_target,
      total_actual: hasActual ? summary.total_actual : null,
      achievement_rate: rate,
      reason: reason,
      action_needed: actions[summary.indicator_id] || '',
    });
  });

  const riskOrder = { 높음: 0, 보통: 1, 낮음: 2 };
  return priorities.sort(function (a, b) {
    return (riskOrder[a.risk_level] - riskOrder[b.risk_level]) ||
      ((a.achievement_rate === null ? -1 : a.achievement_rate) - (b.achievement_rate === null ? -1 : b.achievement_rate));
  });
}

// 우선 관리 지표의 "조치 필요사항"을 저장하는 시트 (최초 호출 시 자동 생성)
function ensurePriorityActionsSheet_() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName('priority_actions');
  if (sheet) return sheet;
  sheet = ss.insertSheet('priority_actions');
  sheet.appendRow(['indicator_id', 'indicator_name', 'action_needed', 'updated_by', 'updated_at']);
  return sheet;
}

function readPriorityActions_() {
  const sheet = ensurePriorityActionsSheet_();
  const values = sheet.getDataRange().getValues();
  const map = {};
  for (let r = 1; r < values.length; r++) {
    const id = String(values[r][0] || '').trim();
    if (id) map[id] = String(values[r][2] || '');
  }
  return map;
}

function updatePriorityAction_(payload) {
  const sheet = ensurePriorityActionsSheet_();
  const values = sheet.getDataRange().getValues();
  const timestamp = nowTimestamp_();
  let rowNumber = null;
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][0]) === String(payload.indicator_id)) {
      rowNumber = r + 1;
      break;
    }
  }
  if (rowNumber) {
    sheet.getRange(rowNumber, 3).setValue(payload.action_needed || '');
    sheet.getRange(rowNumber, 4).setValue(payload.updated_by || '');
    sheet.getRange(rowNumber, 5).setValue(timestamp);
  } else {
    sheet.appendRow([
      payload.indicator_id,
      payload.indicator_name || '',
      payload.action_needed || '',
      payload.updated_by || '',
      timestamp,
    ]);
  }
  return { success: true };
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
    case 'getPriorityIndicators':
      return { success: true, data: getPriorityIndicators_(params) };
    case 'updatePriorityAction':
      return { success: true, data: updatePriorityAction_(params) };
    case 'login':
      return { success: true, data: login_(params) };
    case 'getUsers':
      return { success: true, data: getUsers_() };
    case 'upsertUser':
      return { success: true, data: upsertUser_(params) };
    case 'getChangeLogs':
      return { success: true, data: getChangeLogs_() };
    case 'debugNameMatch':
      return { success: true, data: debugNameMatch_() };
    case 'debugOverviewWide':
      return { success: true, data: debugOverviewWide_(params) };
    case 'debugIndicatorDetail':
      return { success: true, data: debugIndicatorDetail_(params) };
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
