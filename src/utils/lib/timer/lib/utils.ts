import * as d3 from "d3";

export interface TimerInstanceArgs {
  onTick?: () => void;
  onCompletion?: () => void;
  timeout: number;
}

export type TimeoutInstanceArgs = Required<
  Pick<TimerInstanceArgs, "onCompletion" | "timeout">
>;

export function startTimerInstance({
  onCompletion,
  onTick,
  timeout,
}: TimerInstanceArgs) {
  function handler(elapsed: number) {
    const boundedTimeStep = Math.min(elapsed / timeout, 1);

    if (onTick) onTick();

    if (boundedTimeStep === 1) {
      if (onCompletion) onCompletion();
    }
  }

  const timer = d3.timer(handler);

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
