import type {
  ChangeLog,
  Indicator,
  Target,
  UniversityResult,
  User,
} from '@/types';
import { UNIVERSITIES } from '@/types';
import { calculateAchievementRate } from '@/utils/calculations';

/**
 * 구글시트 연동 전, 화면이 비어 보이지 않도록 제공하는 샘플 데이터.
 * VITE_GAS_API_URL 환경변수가 설정되면 이 데이터 대신 실제 구글시트 데이터를 사용한다.
 *
 * 지표 대분류·지표명은 실제 COSS 사업단 성과지표 시트(총괄/대학별 탭)의 체계를 그대로 반영했다.
 */

const YEAR = 2026;

interface IndicatorConfig {
  id: string;
  category: string;
  name: string;
  unit: string;
  description: string;
  totalTarget: number;
  isRateType?: boolean;
  factor: number; // 전체 목표 대비 실적 달성 비율(기본값)
  noResult?: boolean;
  missingEvidenceUniversities?: string[];
  nullActualUniversities?: string[];
  note?: string;
}

const CONFIGS: IndicatorConfig[] = [
  // 교원확보지수 > 전임
  { id: 'IND01', category: '교원확보지수', name: '전임 일반교원 수', unit: '명', description: '전임 일반교원 확보 현황', totalTarget: 74, factor: 0.9 },
  { id: 'IND02', category: '교원확보지수', name: '전임 JA교원 수', unit: '명', description: '전임 JA(산학협력중점) 교원 확보 현황', totalTarget: 5, factor: 0.8 },
  { id: 'IND03', category: '교원확보지수', name: '전임 산업체 경력 교원 수', unit: '명', description: '전임 산업체 경력 보유 교원 확보 현황', totalTarget: 10, factor: 0.95 },
  // 교원확보지수 > 비전임
  { id: 'IND04', category: '교원확보지수', name: '비전임 일반교원 수', unit: '명', description: '비전임 일반교원 확보 현황', totalTarget: 12, factor: 1.0 },
  { id: 'IND05', category: '교원확보지수', name: '비전임 JA교원 수', unit: '명', description: '비전임 JA(산학협력중점) 교원 확보 현황', totalTarget: 10, factor: 0.7, missingEvidenceUniversities: ['충남대학교'] },
  { id: 'IND06', category: '교원확보지수', name: '비전임 산업체 경력 교원 수', unit: '명', description: '비전임 산업체 경력 보유 교원 확보 현황', totalTarget: 30, factor: 1.05 },
  // 교육과정 및 교과목 개발/개선 지수 > 교육과정
  { id: 'IND07', category: '교육과정 및 교과목 개발/개선 지수', name: '마이크로디그리 개발건수', unit: '건', description: '신규 마이크로디그리 과정 개발 건수', totalTarget: 12, factor: 1.1 },
  { id: 'IND08', category: '교육과정 및 교과목 개발/개선 지수', name: '연계·융합 전공 개발건수', unit: '건', description: '학과 간 연계·융합 전공 개발 건수', totalTarget: 6, factor: 0.6, note: '개발 일정 지연' },
  // 교육과정 및 교과목 개발/개선 지수 > 교과목
  { id: 'IND09', category: '교육과정 및 교과목 개발/개선 지수', name: '신규 교과목 개발건수', unit: '건', description: '신규 개설 교과목 개발 건수', totalTarget: 24, factor: 0.95 },
  { id: 'IND10', category: '교육과정 및 교과목 개발/개선 지수', name: '기존 교과목 개선건수', unit: '건', description: '기존 교과목 내용 개선 건수', totalTarget: 20, factor: 1.15 },
  // 교육과정 및 교과목 운영지수 > 교육과정
  { id: 'IND11', category: '교육과정 및 교과목 운영지수', name: '마이크로디그리 운영건수', unit: '건', description: '마이크로디그리 과정 운영 건수', totalTarget: 45, factor: 0.9 },
  { id: 'IND12', category: '교육과정 및 교과목 운영지수', name: '연계·융합 전공 운영건수', unit: '건', description: '연계·융합 전공 운영 건수', totalTarget: 34, factor: 0.7, missingEvidenceUniversities: ['영남이공대학교'] },
  // 교육과정 및 교과목 운영지수 > 교과목
  { id: 'IND13', category: '교육과정 및 교과목 운영지수', name: '교과목 운영건수', unit: '건', description: '전체 교과목 운영 건수', totalTarget: 323, factor: 0.95 },
  // 제도화 운영지수
  { id: 'IND14', category: '제도화 운영지수', name: '인사제도 수혜인원', unit: '명', description: '사업단 인사제도 수혜 인원 수', totalTarget: 81, factor: 0.9 },
  { id: 'IND15', category: '제도화 운영지수', name: '학사제도 수혜인원', unit: '명', description: '사업단 학사제도 수혜 인원 수', totalTarget: 3620, factor: 0.95 },
  // 인프라 운영 지수
  { id: 'IND16', category: '인프라 운영 지수', name: '대학별 인프라 활용인원', unit: '명', description: '참여대학 자체 인프라 활용 인원 수', totalTarget: 12000, factor: 0.6, note: '활용 실적 저조, 홍보 강화 필요' },
  { id: 'IND17', category: '인프라 운영 지수', name: '컨소시엄 내 대학간 인프라 활용인원', unit: '명', description: '컨소시엄 참여대학 간 인프라 공동 활용 인원 수', totalTarget: 7500, factor: 0.65, missingEvidenceUniversities: ['한양대학교 ERICA'] },
  { id: 'IND18', category: '인프라 운영 지수', name: '컨소시엄 외 인프라 활용인원', unit: '명', description: '컨소시엄 외부 기관 대상 인프라 활용 인원 수', totalTarget: 15000, factor: 0.7 },
  // 지·산·학 프로젝트 교과 운영 건
  { id: 'IND19', category: '지·산·학 프로젝트 교과 운영 건', name: '산업연계 현장실습운영건수', unit: '건', description: '산업체 연계 현장실습 운영 건수', totalTarget: 6, factor: 1.0 },
  { id: 'IND20', category: '지·산·학 프로젝트 교과 운영 건', name: 'We-Meet 교과목운영건수', unit: '건', description: 'We-Meet 프로그램 교과목 운영 건수', totalTarget: 6, factor: 1.1 },
  { id: 'IND21', category: '지·산·학 프로젝트 교과 운영 건', name: '기타 지·산·학 프로젝트 교과 건수', unit: '건', description: '기타 지역·산업·학교 연계 프로젝트 교과 건수', totalTarget: 6, factor: 1.05 },
  // 일반학습자 교육콘텐츠 공유지수
  { id: 'IND22', category: '일반학습자 교육콘텐츠 공유지수', name: '온라인 교육 콘텐츠운영', unit: '건', description: '일반학습자 대상 온라인 교육 콘텐츠 운영 건수', totalTarget: 16, factor: 1.0 },
  { id: 'IND23', category: '일반학습자 교육콘텐츠 공유지수', name: '오프라인 교육 콘텐츠운영', unit: '건', description: '일반학습자 대상 오프라인 교육 콘텐츠 운영 건수', totalTarget: 12, factor: 0.85 },
  // 교육과정 및 교과목 이수지수 > 교육과정 / 교과목
  { id: 'IND24', category: '교육과정 및 교과목 이수지수', name: '마이크로디그리 이수자 수', unit: '명', description: '마이크로디그리 과정 이수자 수', totalTarget: 310, factor: 0.4, note: '이수 절차 안내 필요', noResult: false },
  { id: 'IND25', category: '교육과정 및 교과목 이수지수', name: '연계·융합전공 이수자 수', unit: '명', description: '연계·융합전공 이수자 수', totalTarget: 230, factor: 0, noResult: true, note: '3차년도 하반기 집계 예정' },
  { id: 'IND26', category: '교육과정 및 교과목 이수지수', name: '교과목 이수자 수', unit: '명', description: '전체 교과목 이수자 수', totalTarget: 780, factor: 0.35, note: '이수자 집계 지연' },
  // 공유교과목 이수지수
  { id: 'IND27', category: '공유교과목 이수지수', name: '컨소 내 대학 간 연계 교과목 이수자 수', unit: '명', description: '컨소시엄 내 대학 간 연계 교과목 이수자 수', totalTarget: 923, factor: 0.85 },
  { id: 'IND28', category: '공유교과목 이수지수', name: '컨소 간 대학 간 연계 교과목 이수자 수', unit: '명', description: '컨소시엄 간 대학 연계 교과목 이수자 수', totalTarget: 30, factor: 1.2 },
  { id: 'IND29', category: '공유교과목 이수지수', name: '공동활용대학 간 연계 교과목 이수자 수', unit: '명', description: '공동활용대학 간 연계 교과목 이수자 수', totalTarget: 40, factor: 0.75, nullActualUniversities: ['영남이공대학교'] },
];

// 강원대학교가 주관대학이므로 배부 비중과 평균 실적 수준이 상대적으로 높게 설정됨
const UNIVERSITY_WEIGHT: Record<string, number> = {
  강원대학교: 0.36,
  아주대학교: 0.18,
  충남대학교: 0.16,
  '한양대학교 ERICA': 0.15,
  영남이공대학교: 0.15,
};

const UNIVERSITY_PERFORMANCE_ADJUST: Record<string, number> = {
  강원대학교: 1.08,
  아주대학교: 1.0,
  충남대학교: 0.95,
  '한양대학교 ERICA': 0.92,
  영남이공대학교: 0.9,
};

// 실제 시트처럼 대학별로 담당자 몇 명이 지표 그룹을 나눠 맡는 형태를 흉내낸 샘플 담당자 목록
const UNIVERSITY_MANAGERS: Record<string, string[]> = {
  강원대학교: ['김동현', '방주희', '허아름', '황승재', '이은실'],
  아주대학교: ['신영웅'],
  충남대학교: ['김상형', '안도아', '최향창'],
  '한양대학교 ERICA': ['김보옥', '금인희', '정유라', '송진주'],
  영남이공대학교: ['박서연', '오지훈'],
};

function pickManager(university: string, seed: number): string {
  const pool = UNIVERSITY_MANAGERS[university] ?? ['담당자'];
  return pool[seed % pool.length];
}

export const sampleIndicators: Indicator[] = CONFIGS.map((c) => ({
  indicator_id: c.id,
  year: YEAR,
  category: c.category,
  indicator_name: c.name,
  unit: c.unit,
  description: c.description,
  status: '사용',
}));

export const sampleTargets: Target[] = CONFIGS.map((c, idx) => ({
  target_id: `T${String(idx + 1).padStart(3, '0')}`,
  year: YEAR,
  indicator_id: c.id,
  total_target: c.totalTarget,
  note: '3차년도 목표값',
  updated_at: '2026-06-01',
}));

function buildUniversityResults(): UniversityResult[] {
  const results: UniversityResult[] = [];
  let seq = 0;

  CONFIGS.forEach((c, cIdx) => {
    UNIVERSITIES.forEach((uni, uIdx) => {
      seq += 1;
      const weight = UNIVERSITY_WEIGHT[uni];
      const adjust = UNIVERSITY_PERFORMANCE_ADJUST[uni];

      const allocatedTarget = c.isRateType
        ? c.totalTarget
        : Math.round(c.totalTarget * weight);

      let actual: number | null;
      if (c.noResult || c.nullActualUniversities?.includes(uni)) {
        actual = null;
      } else if (c.isRateType) {
        actual = Math.round(allocatedTarget * c.factor * adjust * 10) / 10;
      } else {
        actual = Math.round(allocatedTarget * c.factor * adjust);
      }

      const rate = calculateAchievementRate(actual, allocatedTarget);

      const evidenceStatus = c.noResult
        ? '해당없음'
        : c.missingEvidenceUniversities?.includes(uni)
          ? '미제출'
          : '제출';

      results.push({
        result_id: `R${String(seq).padStart(3, '0')}`,
        year: YEAR,
        indicator_id: c.id,
        university_name: uni,
        allocated_target: allocatedTarget,
        actual_result: actual,
        achievement_rate: rate,
        evidence_status: evidenceStatus,
        note: actual === null ? '실적 미입력' : '',
        manager_name: pickManager(uni, cIdx + uIdx),
        updated_by: 'admin',
        updated_at: '2026-07-01',
      });
    });
  });

  return results;
}

export const sampleUniversityResults: UniversityResult[] = buildUniversityResults();

export const sampleUsers: User[] = [
  {
    user_id: 'U001',
    name: '관리자',
    email: 'admin@coss.kangwon.ac.kr',
    role: 'admin',
    university_name: '전체',
    password: 'admin1234',
    status: '사용',
  },
  {
    user_id: 'U002',
    name: '강원대학교 담당자',
    email: 'kw@coss.kangwon.ac.kr',
    role: 'university',
    university_name: '강원대학교',
    password: 'kw1234',
    status: '사용',
  },
  {
    user_id: 'U003',
    name: '아주대학교 담당자',
    email: 'ajou@coss.kangwon.ac.kr',
    role: 'university',
    university_name: '아주대학교',
    password: 'ajou1234',
    status: '사용',
  },
  {
    user_id: 'U004',
    name: '충남대학교 담당자',
    email: 'cnu@coss.kangwon.ac.kr',
    role: 'university',
    university_name: '충남대학교',
    password: 'cnu1234',
    status: '사용',
  },
  {
    user_id: 'U005',
    name: '한양대학교 ERICA 담당자',
    email: 'hyu@coss.kangwon.ac.kr',
    role: 'university',
    university_name: '한양대학교 ERICA',
    password: 'hyu1234',
    status: '사용',
  },
  {
    user_id: 'U006',
    name: '영남이공대학교 담당자',
    email: 'ync@coss.kangwon.ac.kr',
    role: 'university',
    university_name: '영남이공대학교',
    password: 'ync1234',
    status: '사용',
  },
];

export const sampleLogs: ChangeLog[] = [
  {
    log_id: 'L001',
    timestamp: '2026-07-01 09:12',
    user_id: 'U002',
    user_name: '강원대학교 담당자',
    university_name: '강원대학교',
    action: 'update',
    sheet_name: 'university_results',
    row_id: 'R001',
    field_name: 'actual_result',
    old_value: '24',
    new_value: '27',
  },
  {
    log_id: 'L002',
    timestamp: '2026-07-01 10:05',
    user_id: 'U004',
    user_name: '충남대학교 담당자',
    university_name: '충남대학교',
    action: 'update',
    sheet_name: 'university_results',
    row_id: 'R018',
    field_name: 'evidence_status',
    old_value: '제출',
    new_value: '미제출',
  },
  {
    log_id: 'L003',
    timestamp: '2026-06-30 15:40',
    user_id: 'U001',
    user_name: '관리자',
    university_name: '전체',
    action: 'update',
    sheet_name: 'targets',
    row_id: 'T007',
    field_name: 'total_target',
    old_value: '10',
    new_value: '12',
  },
  {
    log_id: 'L004',
    timestamp: '2026-06-29 11:22',
    user_id: 'U006',
    user_name: '영남이공대학교 담당자',
    university_name: '영남이공대학교',
    action: 'update',
    sheet_name: 'university_results',
    row_id: 'R145',
    field_name: 'note',
    old_value: '',
    new_value: '집계 지연 사유 확인 중',
  },
  {
    log_id: 'L005',
    timestamp: '2026-06-28 14:03',
    user_id: 'U005',
    user_name: '한양대학교 ERICA 담당자',
    university_name: '한양대학교 ERICA',
    action: 'update',
    sheet_name: 'university_results',
    row_id: 'R085',
    field_name: 'actual_result',
    old_value: '1',
    new_value: '2',
  },
  {
    log_id: 'L006',
    timestamp: '2026-06-27 09:50',
    user_id: 'U001',
    user_name: '관리자',
    university_name: '전체',
    action: 'create',
    sheet_name: 'users',
    row_id: 'U006',
    field_name: '-',
    old_value: '-',
    new_value: '영남이공대학교 담당자 계정 생성',
  },
];
