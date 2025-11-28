import { formatDuration, intervalToDuration } from 'date-fns';

export function formatMillis(ms: number) {
  const duration = intervalToDuration({ start: 0, end: ms });
  return formatDuration(duration, { delimiter: ', ' }) || '0 Sekunden';
}
