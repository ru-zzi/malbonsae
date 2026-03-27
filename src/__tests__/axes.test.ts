import { describe, it, expect } from "vitest";
import { AXES, getButtonId, getDisabledTooltip } from "@/lib/axes";

describe("axes", () => {
  it("defines 5 axes", () => {
    expect(AXES).toHaveLength(5);
  });

  it("each axis has required fields", () => {
    for (const axis of AXES) {
      expect(axis.key).toBeTruthy();
      expect(axis.label).toBeTruthy();
      expect(axis.plusLabel).toBeTruthy();
      expect(axis.minusLabel).toBeTruthy();
      expect(axis.disabledTooltipPlus).toBeTruthy();
      expect(axis.disabledTooltipMinus).toBeTruthy();
    }
  });

  it("getButtonId returns correct format", () => {
    expect(getButtonId("length", "+")).toBe("length+");
    expect(getButtonId("friendliness", "-")).toBe("friendliness-");
  });

  it("getDisabledTooltip returns tooltip for disabled button", () => {
    const tooltip = getDisabledTooltip("length-");
    expect(tooltip).toBe("더 이상 짧아질 수 없습니다");
  });
});
