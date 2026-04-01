import { SlotKind } from "../src/generated/prisma/client.js";

export function inferSlotKind(slotCode) {
  if (/^L\d+$/i.test(slotCode)) return SlotKind.LAB;
  if (/^M\d+$/i.test(slotCode)) return SlotKind.LAB;
  return SlotKind.LECTURE;
}

export function getBaseSlotCode(rawCode) {
  const code = String(rawCode || "").trim().toUpperCase();

  // Pure base slot
  if (/^[A-Z]\d?$/.test(code) || /^[LM]\d+$/i.test(code) || /^[A-Z]$/.test(code)) {
    // But avoid alias forms below first
  }

  // Sequential variants like C1, C2, C3 -> C
  if (/^[A-Z]\d+$/.test(code)) {
    return code[0];
  }

  // Sectional aliases like CA, CB, CK, CU, CN -> A, B, K, U, N
  if (/^[A-Z]{2}$/.test(code)) {
    return code[1];
  }

  return code;
}

export function buildAliasPairs(slotSystemKey, slotMap) {
  const aliases = [];
  for (const rawCode of Object.keys(slotMap)) {
    const raw = rawCode.trim().toUpperCase();
    const effective = getBaseSlotCode(raw);

    if (raw !== effective) {
      aliases.push({
        slotSystemKey,
        rawCode: raw,
        effectiveCode: effective,
      });
    }
  }
  return aliases;
}
