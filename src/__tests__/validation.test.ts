import { describe, it, expect } from "vitest";
import { validateTransformRequest } from "@/lib/validation";

describe("validateTransformRequest", () => {
  it("accepts valid request", () => {
    const result = validateTransformRequest({
      originalText: "안녕하세요",
      state: {
        length: 0,
        friendliness: 1,
        euphemism: 0,
        formality: 0,
        punctuation: 0,
      },
    });
    expect(result).toEqual({ valid: true });
  });

  it("rejects empty text", () => {
    const result = validateTransformRequest({
      originalText: "",
      state: {
        length: 0,
        friendliness: 0,
        euphemism: 0,
        formality: 0,
        punctuation: 0,
      },
    });
    expect(result).toEqual({ valid: false, error: "텍스트를 입력해주세요." });
  });

  it("rejects text over 500 characters", () => {
    const result = validateTransformRequest({
      originalText: "a".repeat(501),
      state: {
        length: 0,
        friendliness: 0,
        euphemism: 0,
        formality: 0,
        punctuation: 0,
      },
    });
    expect(result).toEqual({
      valid: false,
      error: "최대 500자까지 입력할 수 있습니다.",
    });
  });

  it("rejects non-integer state values", () => {
    const result = validateTransformRequest({
      originalText: "안녕하세요",
      state: {
        length: 1.5,
        friendliness: 0,
        euphemism: 0,
        formality: 0,
        punctuation: 0,
      },
    });
    expect(result).toEqual({ valid: false, error: "잘못된 요청입니다." });
  });

  it("rejects missing axis keys", () => {
    const result = validateTransformRequest({
      originalText: "안녕하세요",
      state: { length: 0, friendliness: 0 } as never,
    });
    expect(result).toEqual({ valid: false, error: "잘못된 요청입니다." });
  });
});
