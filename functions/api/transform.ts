import Anthropic from "@anthropic-ai/sdk";

type AxisKey =
  | "length"
  | "friendliness"
  | "euphemism"
  | "formality"
  | "punctuation";
type AxisState = Record<AxisKey, number>;

const REQUIRED_AXES: AxisKey[] = [
  "length",
  "friendliness",
  "euphemism",
  "formality",
  "punctuation",
];
const MAX_TEXT_LENGTH = 500;

const AXIS_LABELS: Record<string, string> = {
  length: "문장길이",
  friendliness: "친근감",
  euphemism: "완곡함",
  formality: "격식",
  punctuation: "문장부호",
};

const VALID_BUTTON_IDS = new Set([
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

interface Env {
  ANTHROPIC_API_KEY: string;
}

function validate(body: {
  originalText?: string;
  state?: AxisState;
}): string | null {
  if (
    !body.originalText ||
    typeof body.originalText !== "string" ||
    body.originalText.trim().length === 0
  ) {
    return "텍스트를 입력해주세요.";
  }
  if (body.originalText.length > MAX_TEXT_LENGTH) {
    return "최대 500자까지 입력할 수 있습니다.";
  }
  if (!body.state || typeof body.state !== "object") {
    return "잘못된 요청입니다.";
  }
  const stateKeys = Object.keys(body.state);
  if (
    stateKeys.length !== REQUIRED_AXES.length ||
    !REQUIRED_AXES.every((k) => k in body.state!)
  ) {
    return "잘못된 요청입니다.";
  }
  for (const key of REQUIRED_AXES) {
    const val = body.state[key];
    if (typeof val !== "number" || !Number.isInteger(val)) {
      return "잘못된 요청입니다.";
    }
  }
  return null;
}

function buildPrompt(originalText: string, state: AxisState): string {
  const stateLines = Object.entries(state)
    .map(
      ([key, val]) => `- ${AXIS_LABELS[key]}: ${val > 0 ? "+" : ""}${val}`,
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

const TRANSFORM_TOOL = {
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

async function callClaude(
  apiKey: string,
  originalText: string,
  state: AxisState,
) {
  const client = new Anthropic({ apiKey });
  const prompt = buildPrompt(originalText, state);

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    temperature: 0,
    tools: [TRANSFORM_TOOL],
    tool_choice: { type: "tool", name: "transform_result" },
    messages: [{ role: "user", content: prompt }],
  });

  const toolBlock = response.content.find((block) => block.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("No tool use in response");
  }

  const data = toolBlock.input as Record<string, unknown>;
  if (!data || typeof data.text !== "string") {
    throw new Error("Invalid tool result");
  }

  const disabled = Array.isArray(data.disabled)
    ? data.disabled.filter(
        (id) => typeof id === "string" && VALID_BUTTON_IDS.has(id),
      )
    : [];

  return { text: data.text, disabled };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: { originalText?: string; state?: AxisState };
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const validationError = validate(body);
  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 });
  }

  const apiKey = context.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "서버 설정 오류입니다." },
      { status: 500 },
    );
  }

  try {
    const result = await callClaude(apiKey, body.originalText!, body.state!);
    return Response.json(result);
  } catch {
    // Retry once
    try {
      const result = await callClaude(apiKey, body.originalText!, body.state!);
      return Response.json(result);
    } catch {
      return Response.json(
        { error: "문장 변환에 실패했습니다. 다시 시도해주세요." },
        { status: 500 },
      );
    }
  }
};
