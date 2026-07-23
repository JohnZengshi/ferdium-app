import type { MetricProcess, MetricUnit } from './types';

type Recorder = (
  name: string,
  value: number,
  unit: MetricUnit,
  process: MetricProcess,
  tags?: Record<string, string | number | boolean>,
) => void;

let recorder: Recorder | null = null;

export const setMetricRecorder = (next: Recorder | null): void => {
  recorder = next;
};

export const recordMetric = (
  name: string,
  value: number,
  unit: MetricUnit,
  process: MetricProcess,
  tags?: Record<string, string | number | boolean>,
): void => {
  recorder?.(name, value, unit, process, tags);
};
