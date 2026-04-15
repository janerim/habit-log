// 그룹 색상 기반 습관 색상 파생.
// 같은 그룹 안에서 인덱스별로 hue/lightness를 살짝 변조해 비슷한 색을 만든다.

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const m = hex.replace('#', '');
  const r = parseInt(m.substring(0, 2), 16) / 255;
  const g = parseInt(m.substring(2, 4), 16) / 255;
  const b = parseInt(m.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** 그룹 색상과 해당 그룹 내 인덱스로 비슷한 계열 색 생성. */
export function shadeFromGroupColor(groupColor: string, index: number): string {
  const { h, s, l } = hexToHsl(groupColor);
  // hue ±12°, lightness ±8% 범위에서 변조
  const offsets = [0, -10, 12, -6, 8, -14, 14, -4, 6, -12];
  const hOff = offsets[index % offsets.length];
  const lOff = ((index % 4) - 1) * 6; // -6, 0, 6, 12 순환
  const nh = (h + hOff + 360) % 360;
  const ns = Math.max(35, Math.min(90, s));
  const nl = Math.max(35, Math.min(72, l + lOff));
  return hslToHex(nh, ns, nl);
}
