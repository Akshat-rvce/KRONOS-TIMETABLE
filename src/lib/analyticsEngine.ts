import { DailyEntry, Subject } from './types';

// Define the 8 time blocks of 3 hours each
export const TIME_BLOCKS = [
  { label: '00:00 - 03:00', name: 'Late Night' },
  { label: '03:00 - 06:00', name: 'Early Morning' },
  { label: '06:00 - 09:00', name: 'Morning 1' },
  { label: '09:00 - 12:00', name: 'Morning 2' },
  { label: '12:00 - 15:00', name: 'Afternoon 1' },
  { label: '15:00 - 18:00', name: 'Afternoon 2' },
  { label: '18:00 - 21:00', name: 'Evening 1' },
  { label: '21:00 - 00:00', name: 'Evening 2' }
];

export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

interface TimeBlockOverlap {
  blockIndex: number;
  overlapMinutes: number;
}

// Distribute hours completed to blocks based on start/end times
function getBlockOverlaps(startTimeStr: string, endTimeStr: string): TimeBlockOverlap[] {
  const parseTimeToMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  try {
    let startMins = parseTimeToMinutes(startTimeStr);
    let endMins = parseTimeToMinutes(endTimeStr);

    if (endMins < startMins) {
      // Wraps around midnight
      endMins += 24 * 60;
    }

    const totalMinutes = endMins - startMins;
    if (totalMinutes <= 0) return [];

    const overlaps: TimeBlockOverlap[] = [];

    // Check overlaps for 16 blocks (covers 2 days to handle midnight wrap-around)
    for (let b = 0; b < 16; b++) {
      const blockIndex = b % 8;
      const blockStart = b * 180; // 3 hours = 180 mins
      const blockEnd = (b + 1) * 180;

      const overlapStart = Math.max(startMins, blockStart);
      const overlapEnd = Math.min(endMins, blockEnd);
      const overlap = Math.max(0, overlapEnd - overlapStart);

      if (overlap > 0) {
        const existing = overlaps.find(o => o.blockIndex === blockIndex);
        if (existing) {
          existing.overlapMinutes += overlap;
        } else {
          overlaps.push({ blockIndex, overlapMinutes: overlap });
        }
      }
    }

    return overlaps;
  } catch (e) {
    return [];
  }
}

export function computeAdvancedAnalytics(entries: DailyEntry[], subjects: Subject[]) {
  // 1. Time-based Productivity
  // Hour-of-day blocks (hours completed per block)
  const hoursPerBlock = Array(8).fill(0);
  const focusSumPerBlock = Array(8).fill(0);
  const focusCountPerBlock = Array(8).fill(0);

  // Day-of-week metrics
  const hoursPerDayOfWeek = Array(7).fill(0);
  const focusSumPerDayOfWeek = Array(7).fill(0);
  const focusCountPerDayOfWeek = Array(7).fill(0);

  // Hour-of-day x Day-of-week matrix (7 rows for days, 8 columns for blocks)
  const matrix = Array(7).fill(null).map(() => 
    Array(8).fill(null).map(() => ({ hours: 0, avgFocus: 0, count: 0, focusSum: 0 }))
  );

  // Process all entries for time and day groups
  for (const entry of entries) {
    if (entry.status === 'skipped') continue;

    // Determine Day of week
    const dateObj = new Date(entry.date);
    // Note: JS Date constructor might parse YYYY-MM-DD as UTC, which can shift the day.
    // We should parse it as local time.
    const [year, month, day] = entry.date.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    const dayOfWeek = localDate.getDay(); // 0 is Sunday, 6 is Saturday

    const hours = entry.hours_completed;
    const focus = entry.focus_rating;

    // Add to day-of-week
    hoursPerDayOfWeek[dayOfWeek] += hours;
    if (focus !== undefined && focus !== null) {
      focusSumPerDayOfWeek[dayOfWeek] += focus;
      focusCountPerDayOfWeek[dayOfWeek] += 1;
    }

    // Add to hour blocks
    if (entry.start_time && entry.end_time) {
      const overlaps = getBlockOverlaps(entry.start_time, entry.end_time);
      const totalOverlapMins = overlaps.reduce((sum, o) => sum + o.overlapMinutes, 0);

      if (totalOverlapMins > 0) {
        for (const overlap of overlaps) {
          const proportion = overlap.overlapMinutes / totalOverlapMins;
          const allocatedHours = hours * proportion;
          
          hoursPerBlock[overlap.blockIndex] += allocatedHours;
          
          // Add to matrix
          matrix[dayOfWeek][overlap.blockIndex].hours += allocatedHours;

          if (focus !== undefined && focus !== null) {
            focusSumPerBlock[overlap.blockIndex] += focus * proportion;
            focusCountPerBlock[overlap.blockIndex] += proportion;

            matrix[dayOfWeek][overlap.blockIndex].focusSum += focus * proportion;
            matrix[dayOfWeek][overlap.blockIndex].count += proportion;
          }
        }
      }
    } else {
      // Fallback: if no times specified, place in "Afternoon 1" or based on created_at hour
      const fallbackBlock = 4; // Afternoon 1 (12:00 - 15:00)
      hoursPerBlock[fallbackBlock] += hours;
      matrix[dayOfWeek][fallbackBlock].hours += hours;
      if (focus !== undefined && focus !== null) {
        focusSumPerBlock[fallbackBlock] += focus;
        focusCountPerBlock[fallbackBlock] += 1;
        
        matrix[dayOfWeek][fallbackBlock].focusSum += focus;
        matrix[dayOfWeek][fallbackBlock].count += 1;
      }
    }
  }

  // Calculate averages for blocks, days, and matrix
  const blockAnalytics = TIME_BLOCKS.map((tb, idx) => ({
    label: tb.label,
    name: tb.name,
    totalHours: Number(hoursPerBlock[idx].toFixed(1)),
    avgFocus: focusCountPerBlock[idx] > 0 ? Number((focusSumPerBlock[idx] / focusCountPerBlock[idx]).toFixed(1)) : 0
  }));

  const dayOfWeekAnalytics = DAYS_OF_WEEK.map((day, idx) => ({
    day,
    totalHours: Number(hoursPerDayOfWeek[idx].toFixed(1)),
    avgFocus: focusCountPerDayOfWeek[idx] > 0 ? Number((focusSumPerDayOfWeek[idx] / focusCountPerDayOfWeek[idx]).toFixed(1)) : 0
  }));

  const matrixAnalytics = matrix.map((row, dayIdx) => 
    row.map((cell, blockIdx) => ({
      day: DAYS_OF_WEEK[dayIdx],
      block: TIME_BLOCKS[blockIdx].label,
      hours: Number(cell.hours.toFixed(1)),
      avgFocus: cell.count > 0 ? Number((cell.focusSum / cell.count).toFixed(1)) : 0
    }))
  );

  // 2. Consistency & Variance
  // Target vs Actual completed hours variance per subject over trailing 7/30 days
  const getSubjectVariance = (days: number) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const filtered = entries.filter(e => e.date >= cutoffStr);
    
    return subjects.map(sub => {
      const subEntries = filtered.filter(e => e.subject_id === sub.id);
      const targetSum = subEntries.reduce((sum, e) => sum + e.target_hours, 0);
      const actualSum = subEntries.reduce((sum, e) => sum + e.hours_completed, 0);
      return {
        subjectId: sub.id,
        subjectName: sub.name,
        color: sub.color,
        targetHours: Number(targetSum.toFixed(1)),
        actualHours: Number(actualSum.toFixed(1)),
        variance: Number((actualSum - targetSum).toFixed(1))
      };
    });
  };

  const variance7Days = getSubjectVariance(7);
  const variance30Days = getSubjectVariance(30);

  // Rolling consistency score: % of active days in last 30 days where actual completed hours >= 80% of target
  // Active day = has at least one entry with target > 0
  const calculateConsistencyScore = (days: number) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const filtered = entries.filter(e => e.date >= cutoffStr);
    
    // Group by date
    const dateGroups: Record<string, { target: number; completed: number }> = {};
    for (const entry of filtered) {
      if (!dateGroups[entry.date]) {
        dateGroups[entry.date] = { target: 0, completed: 0 };
      }
      dateGroups[entry.date].target += entry.target_hours;
      dateGroups[entry.date].completed += entry.hours_completed;
    }

    const daysList = Object.values(dateGroups).filter(d => d.target > 0);
    if (daysList.length === 0) return 100; // Default if no targets set

    const consistentDays = daysList.filter(d => d.completed >= 0.8 * d.target).length;
    return Math.round((consistentDays / daysList.length) * 100);
  };

  const rollingConsistency30Days = calculateConsistencyScore(30);

  // Session-length distribution correlation
  const shortSessions = entries.filter(e => e.status !== 'skipped' && e.hours_completed > 0 && e.hours_completed < 0.5);
  const avgFocusShortSessions = shortSessions.length > 0
    ? shortSessions.reduce((sum, e) => sum + (e.focus_rating || 0), 0) / shortSessions.filter(e => e.focus_rating).length
    : 0;

  const longSessions = entries.filter(e => e.status !== 'skipped' && e.hours_completed >= 3);
  const avgFocusLongSessions = longSessions.length > 0
    ? longSessions.reduce((sum, e) => sum + (e.focus_rating || 0), 0) / longSessions.filter(e => e.focus_rating).length
    : 0;

  const normalSessions = entries.filter(e => e.status !== 'skipped' && e.hours_completed >= 0.5 && e.hours_completed < 3);
  const avgFocusNormalSessions = normalSessions.length > 0
    ? normalSessions.reduce((sum, e) => sum + (e.focus_rating || 0), 0) / normalSessions.filter(e => e.focus_rating).length
    : 0;

  // 3. Correlation Surfacing
  const correlationInsights: string[] = [];

  // Focus vs Interruptions
  const withInterruptions = entries.filter(e => e.status !== 'skipped' && e.interruptions !== undefined && e.interruptions > 0 && e.focus_rating !== null && e.focus_rating !== undefined);
  const noInterruptions = entries.filter(e => e.status !== 'skipped' && (e.interruptions === undefined || e.interruptions === 0) && e.focus_rating !== null && e.focus_rating !== undefined);

  const avgFocusInterrupted = withInterruptions.length > 0
    ? Number((withInterruptions.reduce((sum, e) => sum + (e.focus_rating || 0), 0) / withInterruptions.length).toFixed(1))
    : null;
  const avgFocusUninterrupted = noInterruptions.length > 0
    ? Number((noInterruptions.reduce((sum, e) => sum + (e.focus_rating || 0), 0) / noInterruptions.length).toFixed(1))
    : null;

  if (avgFocusInterrupted !== null && avgFocusUninterrupted !== null) {
    const diff = avgFocusUninterrupted - avgFocusInterrupted;
    if (diff > 0.3) {
      correlationInsights.push(
        `Your focus rating drops from ${avgFocusUninterrupted} to ${avgFocusInterrupted} (${Math.round((diff / avgFocusUninterrupted) * 100)}% decrease) on sessions with distractions.`
      );
    } else {
      correlationInsights.push(
        `Distractions impact your sessions, maintaining an average focus rating of ${avgFocusInterrupted} compared to ${avgFocusUninterrupted} when uninterrupted.`
      );
    }
  }

  // Session length insight
  if (shortSessions.length > 0 && avgFocusShortSessions > 0 && avgFocusNormalSessions > 0) {
    if (avgFocusShortSessions < avgFocusNormalSessions - 0.5) {
      correlationInsights.push(
        `Short study bursts under 30 mins correlate with a lower focus rating (${avgFocusShortSessions.toFixed(1)} vs ${avgFocusNormalSessions.toFixed(1)} for standard sessions).`
      );
    }
  }
  if (longSessions.length > 0 && avgFocusLongSessions > 0 && avgFocusNormalSessions > 0) {
    if (avgFocusLongSessions < avgFocusNormalSessions - 0.5) {
      correlationInsights.push(
        `Deep sessions extending beyond 3 hours show declining returns, averaging a focus rating of ${avgFocusLongSessions.toFixed(1)}.`
      );
    }
  }

  // Best time slot per subject
  const bestSlotsPerSubject = subjects.map(sub => {
    const subEntries = entries.filter(e => e.subject_id === sub.id && e.status !== 'skipped');
    const slotHours = Array(8).fill(0);
    const slotFocusSum = Array(8).fill(0);
    const slotFocusCount = Array(8).fill(0);

    for (const entry of subEntries) {
      const focus = entry.focus_rating;
      if (entry.start_time && entry.end_time) {
        const overlaps = getBlockOverlaps(entry.start_time, entry.end_time);
        const totalOverlap = overlaps.reduce((s, o) => s + o.overlapMinutes, 0);
        if (totalOverlap > 0) {
          for (const overlap of overlaps) {
            const prop = overlap.overlapMinutes / totalOverlap;
            slotHours[overlap.blockIndex] += entry.hours_completed * prop;
            if (focus !== undefined && focus !== null) {
              slotFocusSum[overlap.blockIndex] += focus * prop;
              slotFocusCount[overlap.blockIndex] += prop;
            }
          }
        }
      }
    }

    // Find block index with max focus rating (requiring at least some study hours)
    let bestBlockIdx = -1;
    let maxFocus = 0;
    for (let i = 0; i < 8; i++) {
      if (slotHours[i] > 0.5) {
        const avgF = slotFocusCount[i] > 0 ? slotFocusSum[i] / slotFocusCount[i] : 0;
        if (avgF > maxFocus) {
          maxFocus = avgF;
          bestBlockIdx = i;
        }
      }
    }

    // Fallback: find block index with max hours
    if (bestBlockIdx === -1) {
      let maxHours = 0;
      for (let i = 0; i < 8; i++) {
        if (slotHours[i] > maxHours) {
          maxHours = slotHours[i];
          bestBlockIdx = i;
        }
      }
    }

    return {
      subjectId: sub.id,
      subjectName: sub.name,
      bestSlot: bestBlockIdx !== -1 ? TIME_BLOCKS[bestBlockIdx].name : 'No data yet',
      bestSlotLabel: bestBlockIdx !== -1 ? TIME_BLOCKS[bestBlockIdx].label : ''
    };
  });

  // Co-skipping subject pairs: find conditional co-occurrence of status = 'skipped' on the same day
  const skippedEntries = entries.filter(e => e.status === 'skipped');
  const skippedDates = Array.from(new Set(skippedEntries.map(e => e.date)));
  const skipCoOccurrences: { subA: string; subB: string; count: number }[] = [];

  for (let i = 0; i < subjects.length; i++) {
    for (let j = i + 1; j < subjects.length; j++) {
      const subA = subjects[i];
      const subB = subjects[j];
      let count = 0;
      for (const d of skippedDates) {
        const hasASkipped = entries.some(e => e.date === d && e.subject_id === subA.id && e.status === 'skipped');
        const hasBSkipped = entries.some(e => e.date === d && e.subject_id === subB.id && e.status === 'skipped');
        if (hasASkipped && hasBSkipped) {
          count++;
        }
      }
      if (count > 0) {
        skipCoOccurrences.push({ subA: subA.name, subB: subB.name, count });
      }
    }
  }
  skipCoOccurrences.sort((a, b) => b.count - a.count);
  if (skipCoOccurrences.length > 0) {
    const top = skipCoOccurrences[0];
    correlationInsights.push(
      `Subject correlation: You tend to skip "${top.subA}" and "${top.subB}" on the same day (happened ${top.count} time${top.count > 1 ? 's' : ''}).`
    );
  }

  // 4. Forecasting & Warnings
  // Target pacing: Linear projection from days-elapsed in the current week vs. total weekly hours logged
  // Find current week boundary (Monday to Sunday)
  const today = new Date();
  const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
  const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - distanceToMonday);
  const mondayStr = monday.toISOString().split('T')[0];

  const thisWeeksEntries = entries.filter(e => e.date >= mondayStr);
  const elapsedDays = Math.max(1, distanceToMonday + 1); // 1 to 7

  const weekProjections = subjects.map(sub => {
    const subEntries = thisWeeksEntries.filter(e => e.subject_id === sub.id);
    const completedThisWeek = subEntries.reduce((sum, e) => sum + e.hours_completed, 0);
    const targetThisWeek = subEntries.reduce((sum, e) => sum + e.target_hours, 0);

    const projectedCompleted = (completedThisWeek / elapsedDays) * 7;
    const isBehind = targetThisWeek > 0 && projectedCompleted < targetThisWeek;

    return {
      subjectId: sub.id,
      subjectName: sub.name,
      color: sub.color,
      targetThisWeek: Number(targetThisWeek.toFixed(1)),
      completedThisWeek: Number(completedThisWeek.toFixed(1)),
      projectedCompleted: Number(projectedCompleted.toFixed(1)),
      isBehind,
      deficit: Number(Math.max(0, targetThisWeek - projectedCompleted).toFixed(1))
    };
  });

  // Cumulative deficit warnings
  const deficitWarnings = subjects.map(sub => {
    const subEntries = entries.filter(e => e.subject_id === sub.id);
    const totalTarget = subEntries.reduce((sum, e) => sum + e.target_hours, 0);
    const totalCompleted = subEntries.reduce((sum, e) => sum + e.hours_completed, 0);
    const totalDeficit = Math.max(0, totalTarget - totalCompleted);

    return {
      subjectId: sub.id,
      subjectName: sub.name,
      color: sub.color,
      totalDeficit: Number(totalDeficit.toFixed(1)),
      needsAttention: totalDeficit > 5.0
    };
  }).filter(d => d.needsAttention);

  return {
    blockAnalytics,
    dayOfWeekAnalytics,
    matrixAnalytics,
    variance7Days,
    variance30Days,
    rollingConsistency30Days,
    correlationInsights,
    bestSlotsPerSubject,
    weekProjections,
    deficitWarnings
  };
}
