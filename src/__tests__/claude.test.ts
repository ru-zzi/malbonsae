import { describe, it, expect } from "vitest";
import { buildPrompt, parseToolResult } from "@/lib/claude";
import type { AxisState } from "@/lib/types";

describe("buildPrompt", () => {
  it("includes original text and state in prompt", () => {
    const state: AxisState = {
      length: 1,
      friendliness: -1,
      euphemism: 0,
      formality: 0,
      punctuation: 0,
    };
    const prompt = buildPrompt("회의 참석 부탁드립니다", state);
    expect(prompt).toContain("회의 참석 부탁드립니다");
    expect(prompt).toContain("문장길이: +1");
    expect(prompt).toContain("친근감: -1");
    expect(prompt).toContain("완곡함: 0");
  });

  it("all-zero state instructs to return original", () => {
    const state: AxisState = {
      length: 0,
      friendliness: 0,
      euphemism: 0,
      formality: 0,
      punctuation: 0,
    };
    const prompt = buildPrompt("안녕하세요", state);
    expect(prompt).toContain("안녕하세요");
  });
});

describe("parseToolResult", () => {
  it("parses valid tool result", () => {
    const toolInput = { text: "회의 참석해요~", disabled: ["length-"] };
    const result = parseToolResult(toolInput);
    expect(result).toEqual({ text: "회의 참석해요~", disabled: ["length-"] });
  });

  it("returns empty disabled array when none provided", () => {
    const toolInput = { text: "안녕", disabled: [] };
    const result = parseToolResult(toolInput);
    expect(result.disabled).toEqual([]);
  });

  it("throws on missing text field", () => {
    expect(() => parseToolResult({ disabled: [] })).toThrow();
  });
});
