import type {
  AchievementStatus,
  DashboardData,
  Indicator,
  IndicatorSummary,
  PriorityIndicator,
  Target,
  UniversityResult,
} from '@/types';
import { calculateAchievementRate, getAchievementStatus, average } from '@/utils/calculations';
import { isAutonomousCategory } from '@/utils/categoryClassification';

/**
 * indicators + targets + university_results 원본 시트 데이터를 결합해
 * 화면에서 사용하는 지표별 요약 데이터를 생성한다.
 * (구글시트 원본을 그대로 받아오는 경우와 샘플 데이터 fallback 모두에 사용)
 */
export function buildIndicatorSummaries(
  indicators: Indicator[],
  targets: Target[],
  results: UniversityResult[]
): IndicatorSummary[] {
  return indicators.map((ind) => {
    const target = targets.find((t) => t.indicator_id === ind.indicator_id);
    // total_target이 null이면 3차년도 목표값 자체가 없는 지표 — 달성률 계산 없이 '미제출'로 표시
    const hasNoTarget = !!target && target.total_target === null;
    const totalTarget = hasNoTarget ? null : (target?.total_target ?? 0);
    const relatedResults = results.filter((r) => r.indicator_id === ind.indicator_id);

    const hasAnyActual = relatedResults.some((r) => r.actual_result !== null && r.actual_result !== undefined);
    const totalActual = relatedResults.reduce(
      (sum, r) => sum + (r.actual_result ?? 0),
      0
    );

    const isRateType = ind.unit === '%' || ind.unit === '점';
    // %, 점수형 지표는 대학별 평균을, 그 외에는 합계를 전체 실적으로 사용
    const displayActual = isRateType
      ? average(
          relatedResults
            .filter((r) => r.actual_result !== null && r.actual_result !== undefined)
            .map((r) => r.actual_result as number)
        )
      : totalActual;

    const rate = !hasNoTarget && hasAnyActual ? calculateAchievementRate(displayActual, totalTarget ?? 0) : null;
    const status: AchievementStatus = getAchievementStatus(rate, hasAnyActual);

    const evidenceSubmitted = relatedResults.filter((r) => r.evidence_status === '예').length;
    const evidenceRequired = relatedResults.filter((r) => r.evidence_status !== '해당없음').length;
    const evidenceStatus =
      evidenceRequired === 0
        ? '해당없음'
        : evidenceSubmitted === evidenceRequired
          ? '예'
          : '아니오';

    const latestUpdatedAt = relatedResults
      .map((r) => r.updated_at)
      .sort()
      .reverse()[0];

    const notes = relatedResults.map((r) => r.note).filter(Boolean);

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
      status,
      evidence_status: evidenceStatus,
      note: notes[0] ?? '',
      updated_at: latestUpdatedAt ?? target?.updated_at ?? '-',
      universityResults: relatedResults,
    };
  });
}

export function buildDashboardData(
  summaries: IndicatorSummary[],
  results: UniversityResult[]
): DashboardData {
  const ratesWithValue = summaries
    .map((s) => s.achievement_rate)
    .filter((r): r is number => r !== null);

  const categories = Array.from(new Set(summaries.map((s) => s.category)));
  const categoryBreakdown = categories.map((category) => {
    const items = summaries.filter((s) => s.category === category);
    const rates = items.map((s) => s.achievement_rate).filter((r): r is number => r !== null);
    return { category, count: items.length, averageRate: rates.length > 0 ? average(rates) : null };
  });

  const underAchievedCount = summaries.filter((s) => s.status === '미달').length;

  const coreRates = summaries
    .filter((s) => !isAutonomousCategory(s.category))
    .map((s) => s.achievement_rate)
    .filter((r): r is number => r !== null);
  const autonomousRates = summaries
    .filter((s) => isAutonomousCategory(s.category))
    .map((s) => s.achievement_rate)
    .filter((r): r is number => r !== null);

  const evidenceApplicable = results.filter((r) => r.evidence_status !== '해당없음');
  const evidenceSubmittedRate =
    evidenceApplicable.length > 0
      ? Math.round((evidenceApplicable.filter((r) => r.evidence_status === '예').length / evidenceApplicable.length) * 1000) / 10
      : 100;

  const universityNames = Array.from(new Set(results.map((r) => r.university_name)));
  const universityRates = universityNames.map((uni) => {
    const uniResults = results.filter((r) => r.university_name === uni && r.achievement_rate !== null);
    const rate = average(uniResults.map((r) => r.achievement_rate as number));
    return { university_name: uni, rate };
  });

  const indicatorRanking = summaries
    .filter((s) => s.achievement_rate !== null)
    .map((s) => ({
      indicator_name: s.indicator_name,
      rate: s.achievement_rate as number,
      category: s.category,
    }))
    .sort((a, b) => b.rate - a.rate);

  return {
    totalIndicators: summaries.length,
    averageAchievementRate: average(ratesWithValue),
    underAchievedCount,
    coreAverageRate: coreRates.length > 0 ? average(coreRates) : 0,
    autonomousAverageRate: autonomousRates.length > 0 ? average(autonomousRates) : 0,
    evidenceSubmittedRate,
    categoryBreakdown,
    universityRates,
    indicatorRanking,
  };
}

export function buildPriorityIndicators(
  summaries: IndicatorSummary[],
  actions: Record<string, string> = {},
  scopeUniversity = '' // 값이 있으면 해당 대학의 목표·실적 기준으로만 판정
): PriorityIndicator[] {
  const priorities: PriorityIndicator[] = [];

  summaries.forEach((summary) => {
    if (summary.total_target === null) return; // 3차 목표가 없는 지표는 우선 관리 대상에서 제외

    // 대학 담당자: 본인 대학 실적만, 관리자: 5개 대학 합산
    const scopedResults = scopeUniversity
      ? summary.universityResults.filter((r) => r.university_name === scopeUniversity)
      : summary.universityResults;
    if (scopedResults.length === 0) return;

    const hasAnyActual = scopedResults.some(
      (r) => r.actual_result !== null && r.actual_result !== undefined
    );
    const totalTarget = scopedResults.reduce((sum, r) => sum + (r.allocated_target || 0), 0);
    const totalActual = scopedResults.reduce((sum, r) => sum + (r.actual_result ?? 0), 0);
    const rate = scopeUniversity
      ? calculateAchievementRate(hasAnyActual ? totalActual : null, totalTarget)
      : summary.achievement_rate;

    // 우선 관리 대상: 실적 미입력 또는 달성률 80% 미만
    if (hasAnyActual && rate !== null && rate >= 80) return;

    let risk: PriorityIndicator['risk_level'];
    let reason: string;
    if (!hasAnyActual) {
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
      total_target: totalTarget,
      total_actual: hasAnyActual ? totalActual : null,
      achievement_rate: rate,
      reason,
      action_needed: actions[summary.indicator_id] ?? '',
    });
  });

  const riskOrder: Record<string, number> = { 높음: 0, 보통: 1, 낮음: 2 };
  return priorities.sort(
    (a, b) =>
      riskOrder[a.risk_level] - riskOrder[b.risk_level] ||
      (a.achievement_rate ?? -1) - (b.achievement_rate ?? -1)
  );
}
