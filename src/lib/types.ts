export type AxisKey =
  | "length"
  | "friendliness"
  | "euphemism"
  | "formality"
  | "punctuation";

export type Direction = "+" | "-";

export type ButtonId = `${AxisKey}${Direction}`;

export type AxisState = Record<AxisKey, number>;

export interface TransformRequest {
  originalText: string;
  state: AxisState;
}

export interface TransformResponse {
  text: string;
  disabled: ButtonId[];
}

export interface AxisDefinition {
  key: AxisKey;
  label: string;
  plusLabel: string;
  minusLabel: string;
  disabledTooltipPlus: string;
  disabledTooltipMinus: string;
}
