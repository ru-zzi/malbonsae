import type { AxisState, ButtonId, TransformResponse } from "./types.ts";

const AXIS_LABELS: Record<string, string> = {
  length: "문장길이",
  friendliness: "친근감",
  euphemism: "완곡함",
  formality: "격식",
  punctuation: "문장부호",
};

const VALID_BUTTON_IDS = new Set<string>([
  "length+",
  "length-",
  "friendliness+",
  "friendliness-",
  "euphemism+",
  "euphemism-",
  "formality+",
  "formality-",
  "punctuation+",
  "punctuation-",
]);

export function buildPrompt(originalText: string, state: AxisState): string {
  const stateLines = Object.entries(state)
    .map(
      ([key, val]) =>
        `- ${AXIS_LABELS[key]}: ${val > 0 ? "+" : ""}${val}`,
    )
    .join("\n");

  return `당신은 한국어 문장 스타일 조절 전문가입니다.

아래 원문을 주어진 조절 수준에 맞게 변환하세요.
각 축의 레벨이 0이면 원문 그대로, +N이면 N단계 강화, -N이면 N단계 약화합니다.
모든 축을 동시에 반영한 하나의 자연스러운 문장을 만드세요.

또한, 현재 상태에서 각 방향으로 한 단계 더 조절이 불가능한 버튼이 있다면 disabled 배열에 포함하세요.
예: 이미 최대한 짧은 문장이라 더 줄일 수 없으면 "length-"를 disabled에 포함합니다.

원문: ${originalText}

조절 수준:
${stateLines}`;
}

export const TRANSFORM_TOOL = {
  name: "transform_result" as const,
  description: "변환된 문장과 비활성 버튼 목록을 반환합니다.",
  input_schema: {
    type: "object" as const,
    properties: {
      text: { type: "string" as const, description: "변환된 문장" },
      disabled: {
        type: "array" as const,
        items: { type: "string" as const },
        description:
          "비활성화할 버튼 ID 목록 (예: length-, friendliness+)",
      },
    },
    required: ["text", "disabled"],
  },
};

export function parseToolResult(input: unknown): TransformResponse {
  const data = input as Record<string, unknown>;
  if (!data || typeof data.text !== "string") {
    throw new Error("Invalid tool result: missing text field");
  }
  const disabled = Array.isArray(data.disabled)
    ? (data.disabled.filter(
        (id) => typeof id === "string" && VALID_BUTTON_IDS.has(id),
      ) as ButtonId[])
    : [];
  return { text: data.text, disabled };
}
