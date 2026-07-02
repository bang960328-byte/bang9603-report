import type {
  ChangeLog,
  Indicator,
  IndicatorCategory,
  Target,
  UniversityResult,
  User,
} from '@/types';
import { UNIVERSITIES } from '@/types';
import { calculateAchievementRate } from '@/utils/calculations';

/**
 * 구글시트 연동 전, 화면이 비어 보이지 않도록 제공하는 샘플 데이터.
 * VITE_GAS_API_URL 환경변수가 설정되면 이 데이터 대신 실제 구글시트 데이터를 사용한다.
 */

const YEAR = 2026;

interface IndicatorConfig {
  id: string;
  category: IndicatorCategory;
  name: string;
  unit: string;
  description: string;
  totalTarget: number;
  isRateType?: boolean; // %, 점수 등 대학별로 동일 목표를 적용하는 지표
  factor: number; // 전체 목표 대비 실적 달성 비율(기본값), 대학별 가중치가 곱해짐
  noResult?: boolean; // 실적 자체가 입력되지 않은 지표(미제출 상태 데모용)
  missingEvidenceUniversities?: string[];
  nullActualUniversities?: string[];
  note?: string;
}

const CORE_CONFIGS: IndicatorConfig[] = [
  {
    id: 'IND001',
    category: '핵심',
    name: '데이터보안 융합전공 이수학생 수',
    unit: '명',
    description: 'COSS 데이터보안 융합전공 교육과정 이수 학생 수',
    totalTarget: 500,
    factor: 1.02,
  },
  {
    id: 'IND002',
    category: '핵심',
    name: '마이크로전공 개설 과목 수',
    unit: '개',
    description: '사업단 마이크로전공 개설 교과목 수',
    totalTarget: 20,
    factor: 0.95,
  },
  {
    id: 'IND003',
    category: '핵심',
    name: '산업체 연계 캡스톤디자인 과제 수',
    unit: '건',
    description: '산업체 수요 기반 캡스톤디자인 과제 수행 건수',
    totalTarget: 30,
    factor: 0.88,
  },
  {
    id: 'IND004',
    category: '핵심',
    name: '재직자 재교육과정 이수자 수',
    unit: '명',
    description: '재직자 대상 데이터 활용 재교육과정 이수자 수',
    totalTarget: 200,
    factor: 0.72,
    missingEvidenceUniversities: ['충남대학교'],
    note: '실적 저조로 원인 파악 중',
  },
  {
    id: 'IND005',
    category: '핵심',
    name: '취업연계형 계약학과 입학생 수',
    unit: '명',
    description: '참여기업 계약학과 입학생 수',
    totalTarget: 50,
    factor: 0.97,
  },
  {
    id: 'IND006',
    category: '핵심',
    name: '데이터보안 관련 자격증 취득자 수',
    unit: '명',
    description: '정보보안기사 등 관련 자격증 취득 학생 수',
    totalTarget: 150,
    factor: 1.05,
  },
  {
    id: 'IND007',
    category: '핵심',
    name: '산학협력 공동연구과제 수',
    unit: '건',
    description: '산업체와의 공동연구과제 수행 건수',
    totalTarget: 15,
    factor: 0.68,
    note: '하반기 신규 과제 발굴 필요',
  },
  {
    id: 'IND008',
    category: '핵심',
    name: '사업단 참여학생 취업률',
    unit: '%',
    description: '사업단 참여학생의 취업률',
    totalTarget: 85,
    isRateType: true,
    factor: 0.93,
  },
  {
    id: 'IND009',
    category: '핵심',
    name: '참여대학 간 학점교류 이수학생 수',
    unit: '명',
    description: '참여대학 공동교육과정 학점교류 이수 학생 수',
    totalTarget: 100,
    factor: 0.99,
    nullActualUniversities: ['영남이공대학교'],
  },
  {
    id: 'IND010',
    category: '핵심',
    name: '현장실습 참여학생 수',
    unit: '명',
    description: '산업체 현장실습 참여 학생 수',
    totalTarget: 120,
    factor: 0.9,
  },
  {
    id: 'IND011',
    category: '핵심',
    name: '데이터 활용 경진대회 참가팀 수',
    unit: '팀',
    description: '데이터 활용 경진대회 참가팀 수',
    totalTarget: 40,
    factor: 1.1,
  },
  {
    id: 'IND012',
    category: '핵심',
    name: '산업체 자문위원 위촉 수',
    unit: '명',
    description: '교육과정 자문 산업체 위원 위촉 수',
    totalTarget: 20,
    factor: 0.9,
  },
];

const AUTONOMOUS_CONFIGS: IndicatorConfig[] = [
  {
    id: 'IND013',
    category: '자율',
    name: '비교과 프로그램 운영 횟수',
    unit: '회',
    description: '학생 역량강화 비교과 프로그램 운영 횟수',
    totalTarget: 30,
    factor: 0.96,
  },
  {
    id: 'IND014',
    category: '자율',
    name: '학생 만족도 조사 평균 점수',
    unit: '점',
    description: '사업단 교육과정 만족도 조사 평균 점수(5점 만점)',
    totalTarget: 4.5,
    isRateType: true,
    factor: 0.99,
  },
  {
    id: 'IND015',
    category: '자율',
    name: '국제교류 프로그램 참여학생 수',
    unit: '명',
    description: '해외 대학 및 기관과의 국제교류 프로그램 참여 학생 수',
    totalTarget: 30,
    factor: 0.91,
  },
  {
    id: 'IND016',
    category: '자율',
    name: '창업동아리 등록팀 수',
    unit: '팀',
    description: '데이터 기반 창업동아리 등록 팀 수',
    totalTarget: 15,
    factor: 0.75,
    missingEvidenceUniversities: ['영남이공대학교'],
    note: '동아리 등록 실적 취합 지연',
  },
  {
    id: 'IND017',
    category: '자율',
    name: '데이터보안 세미나 개최 횟수',
    unit: '회',
    description: '데이터보안 관련 세미나 및 특강 개최 횟수',
    totalTarget: 12,
    factor: 1.0,
  },
  {
    id: 'IND018',
    category: '자율',
    name: '우수사례 확산 건수',
    unit: '건',
    description: '사업단 우수 교육사례 확산 건수',
    totalTarget: 10,
    factor: 0.88,
  },
  {
    id: 'IND019',
    category: '자율',
    name: '교원 역량강화 연수 참여 수',
    unit: '명',
    description: '참여대학 교원 역량강화 연수 참여 인원',
    totalTarget: 40,
    factor: 0.93,
  },
  {
    id: 'IND020',
    category: '자율',
    name: '산업체 초청 특강 횟수',
    unit: '회',
    description: '산업체 전문가 초청 특강 개최 횟수',
    totalTarget: 20,
    factor: 1.06,
  },
  {
    id: 'IND021',
    category: '자율',
    name: '지역사회 연계 프로그램 수',
    unit: '건',
    description: '지역사회 연계 데이터 활용 프로그램 운영 건수',
    totalTarget: 15,
    factor: 0.7,
    missingEvidenceUniversities: ['한양대학교 ERICA'],
    note: '2학기 계획 수립 중',
  },
  {
    id: 'IND022',
    category: '자율',
    name: '성과 홍보 콘텐츠 제작 수',
    unit: '건',
    description: '사업단 성과 홍보용 콘텐츠 제작 건수',
    totalTarget: 12,
    factor: 0.95,
  },
  {
    id: 'IND023',
    category: '자율',
    name: '참여대학 공동워크숍 개최 수',
    unit: '회',
    description: '참여대학 공동 워크숍 개최 횟수',
    totalTarget: 8,
    factor: 0,
    noResult: true,
    note: '하반기 개최 예정',
  },
  {
    id: 'IND024',
    category: '자율',
    name: '졸업생 추적조사 응답률',
    unit: '%',
    description: '사업단 졸업생 추적조사 응답률',
    totalTarget: 70,
    isRateType: true,
    factor: 0.65,
    note: '응답률 제고 방안 마련 필요',
  },
];

const ALL_CONFIGS = [...CORE_CONFIGS, ...AUTONOMOUS_CONFIGS];

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

export const sampleIndicators: Indicator[] = ALL_CONFIGS.map((c) => ({
  indicator_id: c.id,
  year: YEAR,
  category: c.category,
  indicator_name: c.name,
  unit: c.unit,
  description: c.description,
  status: '사용',
}));

export const sampleTargets: Target[] = ALL_CONFIGS.map((c, idx) => ({
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

  ALL_CONFIGS.forEach((c) => {
    UNIVERSITIES.forEach((uni) => {
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
    old_value: '170',
    new_value: '184',
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
    old_value: '12',
    new_value: '15',
  },
  {
    log_id: 'L004',
    timestamp: '2026-06-29 11:22',
    user_id: 'U006',
    user_name: '영남이공대학교 담당자',
    university_name: '영남이공대학교',
    action: 'update',
    sheet_name: 'university_results',
    row_id: 'R080',
    field_name: 'note',
    old_value: '',
    new_value: '동아리 등록 실적 취합 지연',
  },
  {
    log_id: 'L005',
    timestamp: '2026-06-28 14:03',
    user_id: 'U005',
    user_name: '한양대학교 ERICA 담당자',
    university_name: '한양대학교 ERICA',
    action: 'update',
    sheet_name: 'university_results',
    row_id: 'R104',
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
