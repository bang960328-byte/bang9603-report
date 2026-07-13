// 성과지표 대분류 (예: 교원확보지수, 교육과정 및 교과목 운영지수 등 — 사업단 시트의 실제 분류 체계를 그대로 사용)
export type IndicatorCategory = string;

// 지표 사용 여부
export type IndicatorStatus = '사용' | '미사용';

// 달성 상태 (3차년도 목표값 자체가 없는 지표는 달성률을 계산하지 않고 '미제출'로 표시)
export type AchievementStatus = '정상' | '주의' | '미달' | '미제출';

// 증빙 제출 여부 (예/아니오)
export type EvidenceStatus = '예' | '아니오' | '해당없음';

// 사용자 권한
export type UserRole = 'admin' | 'university';

// 계정 사용 여부
export type UserAccountStatus = '사용' | '중지';

// 위험도
export type RiskLevel = '높음' | '보통' | '낮음';

// 참여대학 목록
export const UNIVERSITIES = [
  '강원대학교',
  '아주대학교',
  '충남대학교',
  '한양대학교 ERICA',
  '영남이공대학교',
] as const;
export type UniversityName = (typeof UNIVERSITIES)[number];

// 시트 1: indicators
export interface Indicator {
  indicator_id: string;
  year: number;
  category: IndicatorCategory;
  indicator_name: string;
  unit: string;
  description: string;
  status: IndicatorStatus;
}

// 시트 2: targets
export interface Target {
  target_id: string;
  year: number;
  indicator_id: string;
  total_target: number | null; // null이면 3차년도 목표값 자체가 없는 경우
  note: string;
  updated_at: string;
}

// 시트 3: university_results
export interface UniversityResult {
  result_id: string;
  year: number;
  indicator_id: string;
  university_name: string;
  allocated_target: number;
  actual_result: number | null;
  achievement_rate: number | null;
  evidence_status: EvidenceStatus;
  note: string;
  manager_name: string;
  updated_by: string;
  updated_at: string;
}

// 시트 4: users
export interface User {
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  university_name: string;
  password: string;
  status: UserAccountStatus;
}

// 로그인 시 클라이언트에 보관하는 사용자 세션 (비밀번호 제외)
export interface AuthUser {
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  university_name: string;
}

// 시트 5: logs
export interface ChangeLog {
  log_id: string;
  timestamp: string;
  user_id: string;
  user_name: string;
  university_name: string;
  action: string;
  sheet_name: string;
  row_id: string;
  field_name: string;
  old_value: string;
  new_value: string;
}

// 성과지표 총괄 현황 화면용 결합 데이터
export interface IndicatorSummary {
  indicator_id: string;
  year: number;
  category: IndicatorCategory;
  indicator_name: string;
  unit: string;
  description: string;
  total_target: number | null;
  total_actual: number;
  achievement_rate: number | null;
  status: AchievementStatus;
  evidence_status: EvidenceStatus;
  note: string;
  updated_at: string;
  universityResults: UniversityResult[];
}

// 대시보드 데이터
export interface DashboardData {
  totalIndicators: number;
  averageAchievementRate: number;
  underAchievedCount: number;
  coreAverageRate: number;
  autonomousAverageRate: number;
  evidenceSubmittedRate: number;
  categoryBreakdown: { category: string; count: number; averageRate: number | null }[];
  universityRates: { university_name: string; rate: number }[];
  indicatorRanking: { indicator_name: string; rate: number; category: IndicatorCategory }[];
}

// 우선 관리 지표 (지표별 집계 — 5개 대학 목표값·실적값 합산)
export interface PriorityIndicator {
  risk_level: RiskLevel;
  indicator_id: string;
  indicator_name: string;
  category: string;
  total_target: number;
  total_actual: number | null;
  achievement_rate: number | null;
  reason: string;
  action_needed: string; // 담당자가 직접 입력·저장하는 조치 필요사항
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  user?: AuthUser;
}

export interface ApiResult<T> {
  success: boolean;
  message?: string;
  data?: T;
}
