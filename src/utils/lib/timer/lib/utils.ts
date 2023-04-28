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
  const timer = d3.timer((elapsed: number) => {
    const boundedTimeStep = Math.min(elapsed / timeout, 1);

    if (onTick) onTick(boundedTimeStep);

    if (boundedTimeStep === 1) {
      timer.stop();
      if (onCompletion) onCompletion();
    }
  }, delay);

  return timer;
}

export function startIntervalInstance({
  onCompletion,
  onTick,
  timeout,
  interval,
}: IntervalInstanceArgs) {
  const timer = d3.timer((elapsed: number) => {
    const boundedTimeStep = Math.min(elapsed / timeout, 1);

    if (onTick) onTick(boundedTimeStep);

    if (boundedTimeStep === 1) {
      timer.stop();
      if (onCompletion) onCompletion();
    }
  }, interval);

  return timer;
}

export function startTimeoutInstance({
  onCompletion,
  timeout,
}: TimeoutInstanceArgs) {
  const timer = d3.timeout(() => {
    timer.stop();
    onCompletion();
  }, timeout);

  return timer;
}
