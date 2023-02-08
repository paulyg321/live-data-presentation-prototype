import * as d3 from "d3";

export interface TimerInstanceArgs {
  execute: {
    onTick?: () => void;
    onCompletion?: () => void;
  };
  timeout: number;
}

export function startTimerInstance({ execute, timeout }: TimerInstanceArgs) {
  const timer = d3.timer((elapsed: number) => {
    const boundedTimeStep = Math.min(elapsed / timeout, 1);

    if (execute.onTick) execute.onTick();

    if (boundedTimeStep) {
      if (execute.onCompletion) execute.onCompletion();
      timer.stop();
    }
  });

  return timer;
}
