export interface ScaleThenTranslate {
  /** Scale factor s: y = s * x + t */
  scale: number;
  /** Translation amount t: y = s * x + t */
  translate: number;
}

export interface TranslateThenScale {
  /** Scale factor s: y = s * (x + preTranslate) */
  scale: number;
  /** Pre-translation amount T: y = s * (x + T) */
  preTranslate: number;
}

/**
 * Convert "scale then translate" (y = s * x + t)
 * to equivalent "translate then scale" (y = s * (x + T)).
 */
export function toTranslateThenScale(params: ScaleThenTranslate): TranslateThenScale {
  const { scale, translate } = params;

  if (scale === 0) {
    throw new Error('scale must be non-zero to convert parameterization.');
  }

  return {
    scale,
    preTranslate: translate / scale, // T = t / s
  };
}

/**
 * Convert "translate then scale" (y = s * (x + T))
 * to equivalent "scale then translate" (y = s * x + t).
 */
export function toScaleThenTranslate(params: TranslateThenScale): ScaleThenTranslate {
  const { scale, preTranslate } = params;

  return {
    scale,
    translate: scale * preTranslate, // t = s * T
  };
}

/**
 * Given s, t (scale then translate), return T (translate then scale).
 */
export function translateFromScaleThenTranslate(scale: number, translate: number): number {
  if (scale === 0) {
    throw new Error('scale must be non-zero to convert parameterization.');
  }
  return translate / scale;
}

/**
 * Given s, T (translate then scale), return t (scale then translate).
 */
export function translateFromTranslateThenScale(scale: number, preTranslate: number): number {
  return scale * preTranslate;
}
