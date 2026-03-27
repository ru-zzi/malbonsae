import type {
  AxisDefinition,
  AxisKey,
  ButtonId,
  Direction,
} from "./types.ts";

export const AXES: AxisDefinition[] = [
  {
    key: "length",
    label: "길이",
    plusLabel: "더 길게",
    minusLabel: "더 짧게",
    disabledTooltipPlus: "더 이상 길어질 수 없습니다",
    disabledTooltipMinus: "더 이상 짧아질 수 없습니다",
  },
  {
    key: "friendliness",
    label: "친근",
    plusLabel: "더 친근하게",
    minusLabel: "더 담담하게",
    disabledTooltipPlus: "더 이상 친근해질 수 없습니다",
    disabledTooltipMinus: "더 이상 담담해질 수 없습니다",
  },
  {
    key: "euphemism",
    label: "완곡",
    plusLabel: "더 완곡하게",
    minusLabel: "더 직접적으로",
    disabledTooltipPlus: "더 이상 완곡해질 수 없습니다",
    disabledTooltipMinus: "더 이상 직접적일 수 없습니다",
  },
  {
    key: "formality",
    label: "격식",
    plusLabel: "더 격식있게",
    minusLabel: "더 캐주얼하게",
    disabledTooltipPlus: "더 이상 격식을 갖출 수 없습니다",
    disabledTooltipMinus: "더 이상 캐주얼해질 수 없습니다",
  },
  {
    key: "punctuation",
    label: "부호",
    plusLabel: "더 풍부하게",
    minusLabel: "더 간결하게",
    disabledTooltipPlus: "더 이상 풍부해질 수 없습니다",
    disabledTooltipMinus: "더 이상 간결해질 수 없습니다",
  },
];

export function getButtonId(key: AxisKey, direction: Direction): ButtonId {
  return `${key}${direction}`;
}

export function getDisabledTooltip(buttonId: ButtonId): string {
  const key = buttonId.slice(0, -1) as AxisKey;
  const direction = buttonId.slice(-1) as Direction;
  const axis = AXES.find((a) => a.key === key);
  if (!axis) throw new Error(`Unknown axis: ${key}`);
  return direction === "+"
    ? axis.disabledTooltipPlus
    : axis.disabledTooltipMinus;
}

export const DEFAULT_STATE: Record<AxisKey, number> = {
  length: 0,
  friendliness: 0,
  euphemism: 0,
  formality: 0,
  punctuation: 0,
};
