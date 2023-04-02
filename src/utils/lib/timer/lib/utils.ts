import * as d3 from "d3";

export interface TimerInstanceArgs {
  onTick?: (timeStep?: number) => void;
  onCompletion?: () => void;
  delay?: number;
  timeout: number;
}

export interface IntervalInstanceArgs {
  onTick?: (timeStep?: number) => void;
  onCompletion?: () => void;
  interval?: number;
  timeout: number;
}

export type TimeoutInstanceArgs = Required<
  Pick<TimerInstanceArgs, "onCompletion" | "timeout">
>;

export function startTimerInstance({
  onCompletion,
  onTick,
  timeout,
  delay,
}: TimerInstanceArgs) {
  function handler(elapsed: number) {
    const boundedTimeStep = Math.min(elapsed / timeout, 1);

    if (onTick) onTick(boundedTimeStep);

    if (boundedTimeStep === 1) {
      if (onCompletion) onCompletion();
    }
  }

  const timer = d3.timer(handler, delay);

  return timer;
}

export function startIntervalInstance({
  onCompletion,
  onTick,
  timeout,
  interval,
}: IntervalInstanceArgs) {
  function handler(elapsed: number) {
    const boundedTimeStep = Math.min(elapsed / timeout, 1);

    if (onTick) onTick();

    if (boundedTimeStep === 1) {
      if (onCompletion) onCompletion();
    }
  }

  const timer = d3.interval(handler, interval);

  return timer;
}

export function startTimeoutInstance({
  onCompletion,
  timeout,
}: TimeoutInstanceArgs) {
  function handler() {
    onCompletion();
  }
  const timer = d3.timeout(handler, timeout);

  return timer;
}
