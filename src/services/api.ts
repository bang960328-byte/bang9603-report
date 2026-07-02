import type {
  AuthUser,
  ChangeLog,
  DashboardData,
  IndicatorCategory,
  IndicatorSummary,
  LoginResponse,
  PriorityIndicator,
  User,
  UniversityResult,
} from '@/types';
import { buildDashboardData, buildIndicatorSummaries, buildPriorityIndicators } from './aggregate';
import { appendLog, localStore } from './localStore';
import { calculateAchievementRate, validateNumberInput } from '@/utils/calculations';
import { nowTimestamp } from '@/utils/format';

const GAS_API_URL = (import.meta.env.VITE_GAS_API_URL as string | undefined)?.trim();

/** 최근 데이터 호출이 실제 구글시트(live)인지 샘플(fallback)인지 표시용 */
export const dataSourceState: { mode: 'live' | 'sample'; lastError?: string } = {
  mode: GAS_API_URL ? 'live' : 'sample',
};

async function callGasGet<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  if (!GAS_API_URL) throw new Error('GAS API URL이 설정되지 않았습니다.');
  const url = new URL(GAS_API_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), { method: 'GET' });
  if (!res.ok) throw new Error(`API 요청 실패 (HTTP ${res.status})`);
  const json = await res.json();
  if (json.success === false) throw new Error(json.message || 'API 처리 실패');
  return json.data as T;
}

async function callGasPost<T>(action: string, payload: object): Promise<T> {
  if (!GAS_API_URL) throw new Error('GAS API URL이 설정되지 않았습니다.');
  const res = await fetch(GAS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) throw new Error(`API 요청 실패 (HTTP ${res.status})`);
  const json = await res.json();
  if (json.success === false) throw new Error(json.message || 'API 처리 실패');
  return json.data as T;
}

function markLive() {
  dataSourceState.mode = 'live';
  dataSourceState.lastError = undefined;
}
function markFallback(err: unknown) {
  dataSourceState.mode = 'sample';
  dataSourceState.lastError = err instanceof Error ? err.message : String(err);
  // eslint-disable-next-line no-console
  console.warn('[COSS 대시보드] 구글시트 API 연동 실패로 샘플 데이터를 표시합니다:', dataSourceState.lastError);
}

function currentSummaries(): IndicatorSummary[] {
  return buildIndicatorSummaries(localStore.indicators, localStore.targets, localStore.universityResults);
}

// ---------------------------------------------------------------------------
// 1. login
// ---------------------------------------------------------------------------
export async function login(email: string, password: string): Promise<LoginResponse> {
  try {
    const data = await callGasPost<LoginResponse>('login', { email, password });
    markLive();
    return data;
  } catch (err) {
    markFallback(err);
    const user = localStore.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!user) {
      return { success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' };
    }
    if (user.status !== '사용') {
      return { success: false, message: '사용이 중지된 계정입니다. 관리자에게 문의하세요.' };
    }
    const authUser: AuthUser = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
      university_name: user.university_name,
    };
    return { success: true, user: authUser };
  }
}

// ---------------------------------------------------------------------------
// 2. getDashboardData
// ---------------------------------------------------------------------------
export async function getDashboardData(year = 2026): Promise<DashboardData> {
  try {
    const data = await callGasGet<DashboardData>('getDashboardData', { year: String(year) });
    markLive();
    return data;
  } catch (err) {
    markFallback(err);
    const summaries = currentSummaries();
    return buildDashboardData(summaries, localStore.universityResults);
  }
}

// ---------------------------------------------------------------------------
// 3. getIndicators
// ---------------------------------------------------------------------------
export async function getIndicators(category?: IndicatorCategory): Promise<IndicatorSummary[]> {
  try {
    const data = await callGasGet<IndicatorSummary[]>('getIndicators', category ? { category } : {});
    markLive();
    return data;
  } catch (err) {
    markFallback(err);
    const summaries = currentSummaries();
    return category ? summaries.filter((s) => s.category === category) : summaries;
  }
}

// ---------------------------------------------------------------------------
// 4. getUniversityResults (권한에 따라 범위 제한)
// ---------------------------------------------------------------------------
export async function getUniversityResults(user: AuthUser): Promise<UniversityResult[]> {
  try {
    const data = await callGasGet<UniversityResult[]>('getUniversityResults', {
      role: user.role,
      university_name: user.university_name,
    });
    markLive();
    return data;
  } catch (err) {
    markFallback(err);
    if (user.role === 'admin') return localStore.universityResults;
    return localStore.universityResults.filter((r) => r.university_name === user.university_name);
  }
}

// ---------------------------------------------------------------------------
// 5. updateUniversityResult
// ---------------------------------------------------------------------------
export interface UpdateUniversityResultPayload {
  result_id: string;
  actual_result?: number | null;
  allocated_target?: number;
  evidence_status?: UniversityResult['evidence_status'];
  note?: string;
  updated_by: string;
  user_name: string;
  university_name: string;
}

export async function updateUniversityResult(
  payload: UpdateUniversityResultPayload
): Promise<{ success: boolean; message?: string }> {
  if (payload.actual_result !== undefined && payload.actual_result !== null) {
    const check = validateNumberInput(payload.actual_result);
    if (!check.valid) return { success: false, message: check.message };
  }

  try {
    const data = await callGasPost<{ success: boolean; message?: string }>(
      'updateUniversityResult',
      payload
    );
    markLive();
    return data;
  } catch (err) {
    markFallback(err);
    const row = localStore.universityResults.find((r) => r.result_id === payload.result_id);
    if (!row) return { success: false, message: '대상 실적 데이터를 찾을 수 없습니다.' };

    const timestamp = nowTimestamp();

    if (payload.allocated_target !== undefined && row.allocated_target !== payload.allocated_target) {
      appendLog({
        timestamp,
        user_id: payload.updated_by,
        user_name: payload.user_name,
        university_name: payload.university_name,
        action: 'update',
        sheet_name: 'university_results',
        row_id: row.result_id,
        field_name: 'allocated_target',
        old_value: String(row.allocated_target),
        new_value: String(payload.allocated_target),
      });
      row.allocated_target = payload.allocated_target;
      row.achievement_rate = calculateAchievementRate(row.actual_result, row.allocated_target);
    }

    if (payload.actual_result !== undefined && row.actual_result !== payload.actual_result) {
      appendLog({
        timestamp,
        user_id: payload.updated_by,
        user_name: payload.user_name,
        university_name: payload.university_name,
        action: 'update',
        sheet_name: 'university_results',
        row_id: row.result_id,
        field_name: 'actual_result',
        old_value: String(row.actual_result ?? ''),
        new_value: String(payload.actual_result ?? ''),
      });
      row.actual_result = payload.actual_result;
      row.achievement_rate = calculateAchievementRate(row.actual_result, row.allocated_target);
    }

    if (payload.evidence_status && row.evidence_status !== payload.evidence_status) {
      appendLog({
        timestamp,
        user_id: payload.updated_by,
        user_name: payload.user_name,
        university_name: payload.university_name,
        action: 'update',
        sheet_name: 'university_results',
        row_id: row.result_id,
        field_name: 'evidence_status',
        old_value: row.evidence_status,
        new_value: payload.evidence_status,
      });
      row.evidence_status = payload.evidence_status;
    }

    if (payload.note !== undefined && row.note !== payload.note) {
      appendLog({
        timestamp,
        user_id: payload.updated_by,
        user_name: payload.user_name,
        university_name: payload.university_name,
        action: 'update',
        sheet_name: 'university_results',
        row_id: row.result_id,
        field_name: 'note',
        old_value: row.note,
        new_value: payload.note,
      });
      row.note = payload.note;
    }

    row.updated_by = payload.updated_by;
    row.updated_at = timestamp;

    return { success: true };
  }
}

// ---------------------------------------------------------------------------
// 6. updateTarget (관리자 전용)
// ---------------------------------------------------------------------------
export interface UpdateTargetPayload {
  indicator_id: string;
  total_target: number;
  note?: string;
  updated_by: string;
  user_name: string;
}

export async function updateTarget(
  payload: UpdateTargetPayload
): Promise<{ success: boolean; message?: string }> {
  const check = validateNumberInput(payload.total_target);
  if (!check.valid) return { success: false, message: check.message };

  try {
    const data = await callGasPost<{ success: boolean; message?: string }>('updateTarget', payload);
    markLive();
    return data;
  } catch (err) {
    markFallback(err);
    const target = localStore.targets.find((t) => t.indicator_id === payload.indicator_id);
    if (!target) return { success: false, message: '대상 목표값을 찾을 수 없습니다.' };

    const timestamp = nowTimestamp();
    appendLog({
      timestamp,
      user_id: payload.updated_by,
      user_name: payload.user_name,
      university_name: '전체',
      action: 'update',
      sheet_name: 'targets',
      row_id: target.target_id,
      field_name: 'total_target',
      old_value: String(target.total_target),
      new_value: String(payload.total_target),
    });

    target.total_target = payload.total_target;
    if (payload.note !== undefined) target.note = payload.note;
    target.updated_at = timestamp;

    return { success: true };
  }
}

// ---------------------------------------------------------------------------
// 7. getPriorityIndicators
// ---------------------------------------------------------------------------
export async function getPriorityIndicators(year = 2026): Promise<PriorityIndicator[]> {
  try {
    const data = await callGasGet<PriorityIndicator[]>('getPriorityIndicators', { year: String(year) });
    markLive();
    return data;
  } catch (err) {
    markFallback(err);
    const summaries = currentSummaries();
    return buildPriorityIndicators(summaries);
  }
}

// ---------------------------------------------------------------------------
// 사용자 관리 (관리자 전용) — 스펙 상 GAS API 목록엔 없으나 화면 요구사항 충족을 위해
// 동일한 fallback 패턴으로 시트 CRUD를 흉내낸다.
// ---------------------------------------------------------------------------
export async function getUsers(): Promise<User[]> {
  try {
    const data = await callGasGet<User[]>('getUsers');
    markLive();
    return data;
  } catch (err) {
    markFallback(err);
    return localStore.users;
  }
}

export async function upsertUser(
  user: User,
  actor: { user_id: string; user_name: string }
): Promise<{ success: boolean; message?: string }> {
  try {
    const data = await callGasPost<{ success: boolean; message?: string }>('upsertUser', { user });
    markLive();
    return data;
  } catch (err) {
    markFallback(err);
    const existingIdx = localStore.users.findIndex((u) => u.user_id === user.user_id);
    const timestamp = nowTimestamp();
    if (existingIdx >= 0) {
      appendLog({
        timestamp,
        user_id: actor.user_id,
        user_name: actor.user_name,
        university_name: '전체',
        action: 'update',
        sheet_name: 'users',
        row_id: user.user_id,
        field_name: '-',
        old_value: '-',
        new_value: `${user.name} 정보 수정`,
      });
      localStore.users[existingIdx] = user;
    } else {
      appendLog({
        timestamp,
        user_id: actor.user_id,
        user_name: actor.user_name,
        university_name: '전체',
        action: 'create',
        sheet_name: 'users',
        row_id: user.user_id,
        field_name: '-',
        old_value: '-',
        new_value: `${user.name} 계정 생성`,
      });
      localStore.users.push(user);
    }
    return { success: true };
  }
}

// ---------------------------------------------------------------------------
// 수정 이력
// ---------------------------------------------------------------------------
export async function getChangeLogs(): Promise<ChangeLog[]> {
  try {
    const data = await callGasGet<ChangeLog[]>('getChangeLogs');
    markLive();
    return data;
  } catch (err) {
    markFallback(err);
    return localStore.logs;
  }
}
