import type { AxisKey, TransformRequest } from "./types.ts";

const MAX_TEXT_LENGTH = 500;
const REQUIRED_AXES: AxisKey[] = [
  "length",
  "friendliness",
  "euphemism",
  "formality",
  "punctuation",
];

type ValidationResult = { valid: true } | { valid: false; error: string };

export function validateTransformRequest(
  req: TransformRequest,
): ValidationResult {
  if (!req.originalText || req.originalText.trim().length === 0) {
    return { valid: false, error: "텍스트를 입력해주세요." };
  }

  if (req.originalText.length > MAX_TEXT_LENGTH) {
    return { valid: false, error: "최대 500자까지 입력할 수 있습니다." };
  }

  if (!req.state || typeof req.state !== "object") {
    return { valid: false, error: "잘못된 요청입니다." };
  }

  const stateKeys = Object.keys(req.state);
  if (
    stateKeys.length !== REQUIRED_AXES.length ||
    !REQUIRED_AXES.every((k) => k in req.state)
  ) {
    return { valid: false, error: "잘못된 요청입니다." };
  }

  for (const key of REQUIRED_AXES) {
    const val = req.state[key];
    if (typeof val !== "number" || !Number.isInteger(val)) {
      return { valid: false, error: "잘못된 요청입니다." };
    }
  }

  return { valid: true };
}
