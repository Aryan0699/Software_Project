export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export function normalizeCode(value) {
  return value.trim().replace(/\s+/g, " ");
}

export function parseCredits(value) {
  if (!value || String(value).trim() === "") return null;
  return String(value).trim();
}

export function parseRegisteredCount(value) {
  if (value == null) return null;
  const str = String(value).trim();
  if (!str) return null;
  const num = Number(str);
  return Number.isNaN(num) ? null : num;
}

export function normalizeDepartmentName(name) {
  return normalizeCode(name);
}

export function deriveDepartmentCode(name) {
  const manual = {
    "Computer Science and Engineering": "CSE",
    "Mechanical Engineering": "ME",
    "Materials Engineering": "MT",
    Chemistry: "CY",
    Physics: "PH",
    Mathematics: "MA",
    "Chemical Engineering": "CH",
    "School of Liberal Arts (SoLA)": "SOLA",
    "School of Liberal Arts (SOLA)": "SOLA",
  };

  return manual[name] || name.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

export function getCanonicalCourseName(name) {
  return normalizeCode(name)
    .replace(/\s*-\s*Non English\s*\(.*?\)\s*$/i, "")
    .trim();
}

export function detectVariantLabel(courseName, explicitLabel) {
  if (explicitLabel && String(explicitLabel).trim()) {
    return String(explicitLabel).trim().toUpperCase().replace(/\s+/g, "_");
  }

  const lowered = String(courseName).toLowerCase();
  if (lowered.includes("non english")) return "NON_ENGLISH";
  if (lowered.includes("english")) return "ENGLISH";

  return null;
}

export function extractBuildingAndRoom(fullClassroom) {
  const value = String(fullClassroom || "").trim();
  if (!value) return { buildingCode: null, roomNumber: null, fullCode: null };

  const parts = value.split(/\s+/);
  if (parts.length < 2) {
    return { buildingCode: value, roomNumber: null, fullCode: value };
  }

  const roomNumber = parts.pop();
  const buildingCode = parts.join(" ").toUpperCase().replace(/\s+/g, " ").trim();

  return {
    buildingCode,
    roomNumber: roomNumber.trim(),
    fullCode: `${buildingCode} ${roomNumber.trim()}`,
  };
}
