import { noiseSamples } from "./noise";
import type { Tone } from "./tones";

// The parts of the Web Audio API that are used here, and no more. The real `AudioContext` fits them,
// and a test can write down what it was asked to do without a browser.

type NodePort = object;

export interface ParamPort {
  setValueAtTime(value: number, time: number): unknown;
  exponentialRampToValueAtTime(value: number, time: number): unknown;
}

interface ConnectablePort {
  connect(destination: NodePort): unknown;
}

export interface OscillatorPort extends ConnectablePort {
  type: OscillatorType;
  readonly frequency: ParamPort;
  start(time: number): void;
  stop(time: number): void;
}

export interface GainPort extends ConnectablePort {
  readonly gain: ParamPort;
}

export interface FilterPort extends ConnectablePort {
  type: BiquadFilterType;
  readonly frequency: ParamPort;
}

export interface BufferPort {
  getChannelData(channel: number): Float32Array;
}

export interface BufferSourcePort extends ConnectablePort {
  buffer: BufferPort | null;
  start(time: number): void;
  stop(time: number): void;
}

export interface AudioContextPort {
  readonly currentTime: number;
  readonly sampleRate: number;
  readonly state: string;
  readonly destination: NodePort;
  resume(): Promise<unknown>;
  createOscillator(): OscillatorPort;
  createGain(): GainPort;
  createBiquadFilter(): FilterPort;
  createBuffer(channels: number, length: number, sampleRate: number): BufferPort;
  createBufferSource(): BufferSourcePort;
}

/** A volume cannot fade to exactly zero (an exponential curve never gets there), so it fades to this. */
const SILENCE = 0.0001;

/** Plays the tones, each from its own start time counted from now. */
export function playTones(context: AudioContextPort, tones: readonly Tone[]): void {
  for (const tone of tones) {
    playTone(context, tone);
  }
}

function playTone(context: AudioContextPort, tone: Tone): void {
  const begin = context.currentTime + tone.start;
  const end = begin + tone.length;
  const volume = context.createGain();

  volume.gain.setValueAtTime(tone.volume, begin);
  volume.gain.exponentialRampToValueAtTime(SILENCE, end);
  volume.connect(context.destination);

  if (tone.wave === "noise") {
    playNoise(context, tone, volume, begin, end);
  } else {
    playWave(context, tone, tone.wave, volume, begin, end);
  }
}

function playWave(
  context: AudioContextPort,
  tone: Tone,
  wave: OscillatorType,
  volume: GainPort,
  begin: number,
  end: number,
): void {
  const oscillator = context.createOscillator();

  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(tone.from, begin);
  oscillator.frequency.exponentialRampToValueAtTime(tone.to, end);
  oscillator.connect(volume);
  oscillator.start(begin);
  oscillator.stop(end);
}

function playNoise(context: AudioContextPort, tone: Tone, volume: GainPort, begin: number, end: number): void {
  const count = Math.ceil(context.sampleRate * tone.length);
  const buffer = context.createBuffer(1, count, context.sampleRate);
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();

  buffer.getChannelData(0).set(noiseSamples(count));
  source.buffer = buffer;
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(tone.from, begin);
  filter.frequency.exponentialRampToValueAtTime(tone.to, end);
  source.connect(filter);
  filter.connect(volume);
  source.start(begin);
  source.stop(end);
}
