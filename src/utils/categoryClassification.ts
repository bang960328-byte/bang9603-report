// 총괄 탭 원래 순서 — 지수 이름의 공백·줄바꿈을 정규화한 값으로 비교한다
// (병합 셀 forward-fill로 인해 실제 시트의 대분류 값에는 줄바꿈이 섞여 들어오는 경우가 있음)
export const CORE_CATEGORY_ORDER = [
  '교원확보지수',
  '교육과정및교과목개발/개선지수',
  '교육과정및교과목운영지수',
  '제도화운영지수',
  '인프라운영지수',
  '지·산·학프로젝트교과운영건수',
  '일반학습자교육콘텐츠공유지수',
  '교육과정및교과목이수지수',
  '공유교과목이수지수',
  '지·산·학프로젝트교과이수지수',
  '교육만족도',
  '진로성과지수',
];
// 자율지표 — 대학혁신부터가 자율지표, 그 앞은 전부 핵심지표
export const AUTONOMOUS_CATEGORY_ORDER = ['대학혁신', '지역혁신', '산업혁신', '글로벌혁신'];

export function normalizeCategoryKey(category: string): string {
  return category.replace(/\s+/g, '');
}

export function isAutonomousCategory(category: string): boolean {
  return AUTONOMOUS_CATEGORY_ORDER.includes(normalizeCategoryKey(category));
}

export function categoryOrderIndex(category: string): number {
  const key = normalizeCategoryKey(category);
  const list = isAutonomousCategory(category) ? AUTONOMOUS_CATEGORY_ORDER : CORE_CATEGORY_ORDER;
  const idx = list.indexOf(key);
  return idx === -1 ? list.length : idx;
}
