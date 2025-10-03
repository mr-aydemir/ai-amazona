import { RecursiveKeyValuePair } from "tailwindcss/types/config";

// Renklerin RGB değerlerini tutmak için bir arayüz (interface) tanımlıyoruz.
interface RGBColor {
  r: number;
  g: number;
  b: number;
}


export function generateColorPalette(defaultColor: string): RecursiveKeyValuePair<string, string> {
  // Rengi RGB bileşenlerine ayırır.
  // Dönen değer ya bir RGBColor objesi ya da geçersizse null'dır.
  const hexToRgb = (hex: string): RGBColor | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // RGB değerini HEX formatına çevirir.
  const rgbToHex = (r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };

  // Rengi verilen faktöre göre açıklaştırır veya koyulaştırır.
  const adjustColor = (rgb: RGBColor, factor: number): RGBColor => {
    // Renk değerlerinin 0-255 aralığında kalmasını sağlıyoruz.
    const clamp = (value: number) => Math.min(255, Math.max(0, value));

    // Açıklaştırma (factor > 0) veya koyulaştırma (factor < 0) işlemi
    if (factor > 0) {
      return {
        r: clamp(rgb.r + (255 - rgb.r) * factor),
        g: clamp(rgb.g + (255 - rgb.g) * factor),
        b: clamp(rgb.b + (255 - rgb.b) * factor)
      };
    } else {
      return {
        r: clamp(rgb.r + rgb.r * factor),
        g: clamp(rgb.g + rgb.g * factor),
        b: clamp(rgb.b + rgb.b * factor)
      };
    }
  };

  const baseRgb = hexToRgb(defaultColor);

  // baseRgb null ise hata fırlat. TypeScript bu kontrolden sonra baseRgb'nin null olmadığını anlar.
  if (!baseRgb) {
    throw new Error('Geçersiz renk kodu formatı. Örnek: #RRGGBB');
  }

  // Renk paletini oluştur.
  const palette: RecursiveKeyValuePair<string, string> = {
    "foreground": "#FFFFFF",
    "DEFAULT": defaultColor,
    "50": rgbToHex(adjustColor(baseRgb, 0.9).r, adjustColor(baseRgb, 0.9).g, adjustColor(baseRgb, 0.9).b),
    "100": rgbToHex(adjustColor(baseRgb, 0.7).r, adjustColor(baseRgb, 0.7).g, adjustColor(baseRgb, 0.7).b),
    "200": rgbToHex(adjustColor(baseRgb, 0.5).r, adjustColor(baseRgb, 0.5).g, adjustColor(baseRgb, 0.5).b),
    "300": rgbToHex(adjustColor(baseRgb, 0.2).r, adjustColor(baseRgb, 0.2).g, adjustColor(baseRgb, 0.2).b),
    "400": rgbToHex(adjustColor(baseRgb, 0.1).r, adjustColor(baseRgb, 0.1).g, adjustColor(baseRgb, 0.1).b),
    "500": defaultColor,
    "600": rgbToHex(adjustColor(baseRgb, -0.1).r, adjustColor(baseRgb, -0.1).g, adjustColor(baseRgb, -0.1).b),
    "700": rgbToHex(adjustColor(baseRgb, -0.2).r, adjustColor(baseRgb, -0.2).g, adjustColor(baseRgb, -0.2).b),
    "800": rgbToHex(adjustColor(baseRgb, -0.3).r, adjustColor(baseRgb, -0.3).g, adjustColor(baseRgb, -0.3).b),
    "900": rgbToHex(adjustColor(baseRgb, -0.4).r, adjustColor(baseRgb, -0.4).g, adjustColor(baseRgb, -0.4).b)
  };

  return palette;
}

// Kullanım örneği:
// const colorPalette = generateColorPalette("#2f67b1");
// console.log(colorPalette);