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
    const totalTarget = target?.total_target ?? 0;
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

    const rate = hasAnyActual ? calculateAchievementRate(displayActual, totalTarget) : null;
    const status: AchievementStatus = getAchievementStatus(rate, hasAnyActual);

    const evidenceSubmitted = relatedResults.filter((r) => r.evidence_status === '제출').length;
    const evidenceRequired = relatedResults.filter((r) => r.evidence_status !== '해당없음').length;
    const evidenceStatus =
      evidenceRequired === 0
        ? '해당없음'
        : evidenceSubmitted === evidenceRequired
          ? '제출'
          : '미제출';

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
  const coreSummaries = summaries.filter((s) => s.category === '핵심');
  const autoSummaries = summaries.filter((s) => s.category === '자율');

  const ratesWithValue = summaries
    .map((s) => s.achievement_rate)
    .filter((r): r is number => r !== null);

  const coreRates = coreSummaries.map((s) => s.achievement_rate).filter((r): r is number => r !== null);
  const autoRates = autoSummaries.map((s) => s.achievement_rate).filter((r): r is number => r !== null);

  const underAchievedCount = summaries.filter((s) => s.status === '미달').length;
  const evidenceMissingCount = results.filter((r) => r.evidence_status === '미제출').length;

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

  const evidenceStatusCounts = (['제출', '미제출', '해당없음'] as const).map((status) => ({
    status,
    count: results.filter((r) => r.evidence_status === status).length,
  }));

  return {
    totalIndicators: summaries.length,
    coreIndicators: coreSummaries.length,
    autonomousIndicators: autoSummaries.length,
    averageAchievementRate: average(ratesWithValue),
    underAchievedCount,
    evidenceMissingCount,
    coreAverageRate: average(coreRates),
    autonomousAverageRate: average(autoRates),
    universityRates,
    indicatorRanking,
    evidenceStatusCounts,
  };
}

export function buildPriorityIndicators(
  summaries: IndicatorSummary[]
): PriorityIndicator[] {
  const priorities: PriorityIndicator[] = [];

  summaries.forEach((summary) => {
    summary.universityResults.forEach((r) => {
      const reasons: string[] = [];
      if (r.actual_result === null || r.actual_result === undefined) {
        reasons.push('실적값 미입력');
      } else if (r.achievement_rate !== null && r.achievement_rate < 80) {
        reasons.push('목표 대비 실적 부족');
      }
      if (r.evidence_status === '미제출') {
        reasons.push('증빙 미제출');
      }

      if (reasons.length === 0) return;

      const rate = r.achievement_rate;
      let risk: PriorityIndicator['risk_level'] = '낮음';
      if (r.actual_result === null || (rate !== null && rate < 60) || reasons.length >= 2) {
        risk = '높음';
      } else if ((rate !== null && rate < 80) || r.evidence_status === '미제출') {
        risk = '보통';
      }

      priorities.push({
        risk_level: risk,
        indicator_id: summary.indicator_id,
        indicator_name: summary.indicator_name,
        university_name: r.university_name,
        target: r.allocated_target,
        actual: r.actual_result,
        achievement_rate: r.achievement_rate,
        reason: reasons.join(', '),
        action_needed:
          r.actual_result === null
            ? '실적값 입력 요청'
            : r.evidence_status === '미제출'
              ? '증빙자료 제출 요청'
              : '실적 개선 계획 수립 요청',
        manager: r.updated_by || '-',
        note: r.note,
      });
    });
  });

  const riskOrder: Record<string, number> = { 높음: 0, 보통: 1, 낮음: 2 };
  return priorities.sort((a, b) => riskOrder[a.risk_level] - riskOrder[b.risk_level]);
}
