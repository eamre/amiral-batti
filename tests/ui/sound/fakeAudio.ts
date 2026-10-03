import type { AudioContextPort } from "../../../src/ui/sound/speaker";

interface ParamEvent {
  readonly kind: "set" | "ramp";
  readonly value: number;
  readonly time: number;
}

export class FakeParam {
  readonly events: ParamEvent[] = [];
  setValueAtTime(value: number, time: number): void {
    this.events.push({ kind: "set", value, time });
  }
  exponentialRampToValueAtTime(value: number, time: number): void {
    this.events.push({ kind: "ramp", value, time });
  }
}

export class FakeNode {
  readonly connections: object[] = [];
  connect(destination: object): void {
    this.connections.push(destination);
  }
}

export class FakeOscillator extends FakeNode {
  type: OscillatorType = "sine";
  readonly frequency = new FakeParam();
  startedAt: number | undefined;
  stoppedAt: number | undefined;
  start(time: number): void {
    this.startedAt = time;
  }
  stop(time: number): void {
    this.stoppedAt = time;
  }
}

export class FakeGain extends FakeNode {
  readonly gain = new FakeParam();
}

export class FakeFilter extends FakeNode {
  type: BiquadFilterType = "allpass";
  readonly frequency = new FakeParam();
}

export class FakeBuffer {
  readonly data: Float32Array;
  constructor(
    readonly channels: number,
    readonly length: number,
    readonly sampleRate: number,
  ) {
    this.data = new Float32Array(length);
  }
  getChannelData(): Float32Array {
    return this.data;
  }
}

export class FakeBufferSource extends FakeNode {
  buffer: FakeBuffer | null = null;
  startedAt: number | undefined;
  stoppedAt: number | undefined;
  start(time: number): void {
    this.startedAt = time;
  }
  stop(time: number): void {
    this.stoppedAt = time;
  }
}

/** An audio context that only writes down what it was asked to make. */
export class FakeAudioContext implements AudioContextPort {
  currentTime = 10;
  readonly sampleRate = 8000;
  state: string = "running";
  readonly destination = new FakeNode();
  readonly oscillators: FakeOscillator[] = [];
  readonly gains: FakeGain[] = [];
  readonly filters: FakeFilter[] = [];
  readonly buffers: FakeBuffer[] = [];
  readonly sources: FakeBufferSource[] = [];
  resumed = 0;

  resume(): Promise<void> {
    this.resumed += 1;
    this.state = "running";
    return Promise.resolve();
  }
  createOscillator(): FakeOscillator {
    const oscillator = new FakeOscillator();
    this.oscillators.push(oscillator);
    return oscillator;
  }
  createGain(): FakeGain {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }
  createBiquadFilter(): FakeFilter {
    const filter = new FakeFilter();
    this.filters.push(filter);
    return filter;
  }
  createBuffer(channels: number, length: number, sampleRate: number): FakeBuffer {
    const buffer = new FakeBuffer(channels, length, sampleRate);
    this.buffers.push(buffer);
    return buffer;
  }
  createBufferSource(): FakeBufferSource {
    const source = new FakeBufferSource();
    this.sources.push(source);
    return source;
  }
}
