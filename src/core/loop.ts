export interface FixedStepLoopOptions {
  tickMs?: number;
  maxStepsPerFrame?: number;
  now?: () => number;
  requestFrame?: (callback: FrameRequestCallback) => number;
}

export interface FixedStepLoopSnapshot {
  tick: number;
  alpha: number;
}

export type SimulateStep = (dtMs: number, tick: number) => void;
export type RenderFrame = (snapshot: FixedStepLoopSnapshot) => void;

export class FixedStepLoop {
  private readonly tickMs: number;
  private readonly maxStepsPerFrame: number;
  private readonly now: () => number;
  private readonly requestFrame: (callback: FrameRequestCallback) => number;
  private acc = 0;
  private last = 0;
  private running = false;
  private tick = 0;

  constructor(
    private readonly simulate: SimulateStep,
    private readonly render: RenderFrame,
    options: FixedStepLoopOptions = {},
  ) {
    this.tickMs = options.tickMs ?? 1000 / 30;
    this.maxStepsPerFrame = options.maxStepsPerFrame ?? 5;
    this.now = options.now ?? (() => performance.now());
    this.requestFrame =
      options.requestFrame ?? ((callback) => requestAnimationFrame(callback));
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = this.now();
    this.requestFrame(this.frame);
  }

  stop(): void {
    this.running = false;
  }

  step(elapsedMs: number): FixedStepLoopSnapshot {
    this.acc += elapsedMs;
    let steps = 0;

    while (this.acc >= this.tickMs && steps < this.maxStepsPerFrame) {
      this.tick += 1;
      this.simulate(this.tickMs, this.tick);
      this.acc -= this.tickMs;
      steps += 1;
    }

    if (steps === this.maxStepsPerFrame && this.acc >= this.tickMs) {
      this.acc = this.acc % this.tickMs;
    }

    const snapshot = { tick: this.tick, alpha: this.acc / this.tickMs };
    this.render(snapshot);
    return snapshot;
  }

  private readonly frame = (now: number): void => {
    if (!this.running) return;
    this.step(now - this.last);
    this.last = now;
    this.requestFrame(this.frame);
  };
}
