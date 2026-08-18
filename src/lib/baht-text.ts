// Thai amount-in-words, e.g. 42800 -> "สี่หมื่นสองพันแปดร้อยบาทถ้วน".
// Verified against real quotation/invoice amounts pulled from Drive.

const THAI_DIGIT = [
  "ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่",
  "ห้า", "หก", "เจ็ด", "แปด", "เก้า",
];
const THAI_PLACE = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];

function convertSixDigitGroup(group: string): string {
  const n = String(Number(group));
  if (n === "0") return "";
  const len = n.length;
  let out = "";
  for (let i = 0; i < len; i++) {
    const digit = Number(n[i]);
    if (digit === 0) continue;
    const placeIndex = len - i - 1;
    if (placeIndex === 0) {
      // Units place: "1" is "เอ็ด" when preceded by other digits, "หนึ่ง" alone.
      out += digit === 1 && len > 1 ? "เอ็ด" : THAI_DIGIT[digit];
    } else if (placeIndex === 1 && digit === 1) {
      out += "สิบ";
    } else if (placeIndex === 1 && digit === 2) {
      out += "ยี่สิบ";
    } else {
      out += THAI_DIGIT[digit] + THAI_PLACE[placeIndex];
    }
  }
  return out;
}

function integerToThaiWords(value: number): string {
  if (value === 0) return "ศูนย์";
  const groups: string[] = [];
  let s = String(Math.trunc(value));
  while (s.length > 0) {
    groups.unshift(s.slice(-6));
    s = s.slice(0, -6);
  }
  let out = "";
  for (let i = 0; i < groups.length; i++) {
    const word = convertSixDigitGroup(groups[i]);
    if (!word) continue;
    out += word;
    if (i < groups.length - 1) out += "ล้าน";
  }
  return out;
}

export function bahtText(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const baht = Math.trunc(rounded);
  const satang = Math.round((rounded - baht) * 100);
  let text = integerToThaiWords(baht) + "บาท";
  text += satang === 0 ? "ถ้วน" : integerToThaiWords(satang) + "สตางค์";
  return text;
}
