import type { AxisDefinition, Direction } from "@/lib/types.ts";

interface AxisButtonProps {
  axis: AxisDefinition;
  direction: Direction;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}

export default function AxisButton({
  axis,
  direction,
  disabled,
  loading,
  onClick,
}: AxisButtonProps) {
  const label = direction === "+" ? axis.plusLabel : axis.minusLabel;
  const tooltip =
    direction === "+" ? axis.disabledTooltipPlus : axis.disabledTooltipMinus;
  const isDisabled = disabled || loading;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      title={disabled ? tooltip : undefined}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
        isDisabled
          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
          : "bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700"
      }`}
    >
      {label}
    </button>
  );
}
