/**
 * Reanimated rejects colors like `${'#fff'}22` (5-digit hex) since shorthand
 * 3-digit hex doesn't support an appended alpha suffix. This expands either
 * form to rgba() so alpha overlays are always valid.
 */
export function withAlpha(hex: string, alpha: number): string {
  let normalized = hex.replace('#', '');
  if (normalized.length === 3) {
    normalized = normalized
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
