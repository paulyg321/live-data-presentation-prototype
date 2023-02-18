import * as d3 from "d3";

export interface TimerInstanceArgs {
  execute: {
    onTick?: () => void;
    onCompletion?: () => void;
  };
  timeout: number;
}

export interface TimeoutInstanceArgs {
  onCompletion: () => void;
  timeout: number;
}

export function startTimerInstance({ execute, timeout }: TimerInstanceArgs) {
  function handler(elapsed: number) {
    const boundedTimeStep = Math.min(elapsed / timeout, 1);

    if (execute.onTick) execute.onTick();

    if (boundedTimeStep === 1) {
      if (execute.onCompletion) execute.onCompletion();
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
