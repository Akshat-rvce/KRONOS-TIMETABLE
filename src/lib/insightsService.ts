import { computeAdvancedAnalytics } from './analyticsEngine';
import { DailyEntry, Subject } from './types';

export function generateInsights(entries: DailyEntry[], subjects: Subject[]) {
  const metrics = computeAdvancedAnalytics(entries, subjects);
  const rebalancingSuggestions: string[] = [];
  const alerts: string[] = [];

  // 1. Deficit alert
  for (const warning of metrics.deficitWarnings) {
    alerts.push(
      `Subject "${warning.subjectName}" is falling behind schedule with a total deficit of ${warning.totalDeficit} hours. Plan additional study sessions to catch up.`
    );
  }

  // 2. Week pacing rebalancing suggestions
  for (const proj of metrics.weekProjections) {
    if (proj.isBehind && proj.deficit > 1.0) {
      rebalancingSuggestions.push(
        `Based on your pace this week, you are projected to fall short of your weekly target for "${proj.subjectName}" by ${proj.deficit} hours. Consider shifting 30-60 mins of study time from subjects you are ahead in.`
      );
    }
  }

  // 3. Overall study patterns summary (heuristic-based)
  let weeklySummary = '';
  const activeEntriesLast7Days = entries.filter(e => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return e.date >= cutoff.toISOString().split('T')[0] && e.status !== 'skipped' && e.hours_completed > 0;
  });

  const totalHoursLast7Days = activeEntriesLast7Days.reduce((sum, e) => sum + e.hours_completed, 0);
  const avgFocusLast7Days = activeEntriesLast7Days.filter(e => e.focus_rating).length > 0
    ? activeEntriesLast7Days.reduce((sum, e) => sum + (e.focus_rating || 0), 0) /
      activeEntriesLast7Days.filter(e => e.focus_rating).length
    : null;

  if (totalHoursLast7Days === 0) {
    weeklySummary =
      "No study logs detected in the last 7 days. Let's kickstart a streak today! Pick a subject and log at least a 20-minute session to build momentum.";
  } else {
    const focusStr = avgFocusLast7Days
      ? ` with a solid average focus rating of ${avgFocusLast7Days.toFixed(1)}/5`
      : '';
    weeklySummary = `You logged a total of ${totalHoursLast7Days.toFixed(1)} hours of study over the past 7 days${focusStr}. `;

    // Find favorite subject this week
    const subjectHours: Record<string, number> = {};
    for (const e of activeEntriesLast7Days) {
      const sub = subjects.find(s => s.id === e.subject_id);
      if (sub) {
        subjectHours[sub.name] = (subjectHours[sub.name] || 0) + e.hours_completed;
      }
    }
    const sortedSubHours = Object.entries(subjectHours).sort((a, b) => b[1] - a[1]);
    if (sortedSubHours.length > 0) {
      weeklySummary += `Your efforts were heavily focused on "${sortedSubHours[0][0]}" (${sortedSubHours[0][1].toFixed(1)} hours). `;
    }

    // Add correlation highlights
    if (metrics.correlationInsights.length > 0) {
      weeklySummary += `Key pattern spotted: ${metrics.correlationInsights[0]} `;
    }
  }

  return {
    weeklySummary,
    alerts,
    rebalancingSuggestions,
    correlations: metrics.correlationInsights,
    bestSlots: metrics.bestSlotsPerSubject
  };
}
