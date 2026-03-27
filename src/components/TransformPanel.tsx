import { useState, useCallback, useRef } from "react";
import { AXES, DEFAULT_STATE } from "@/lib/axes.ts";
import type { AxisState, AxisKey, ButtonId, TransformResponse } from "@/lib/types.ts";
import { TransformCache } from "@/lib/cache.ts";


const cache = new TransformCache();

export default function TransformPanel() {
  const [originalText, setOriginalText] = useState("");
  const [currentText, setCurrentText] = useState("");
  const [state, setState] = useState<AxisState>({ ...DEFAULT_STATE });
  const [disabledButtons, setDisabledButtons] = useState<Set<ButtonId>>(
    new Set(),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasTransformed, setHasTransformed] = useState(false);
  const originalTextRef = useRef("");

  const isAllZero = Object.values(state).every((v) => v === 0);

  const handleTextChange = (text: string) => {
    if (text.length > 500) return;
    setOriginalText(text);
    setCurrentText(text);
    originalTextRef.current = text;
    setState({ ...DEFAULT_STATE });
    setDisabledButtons(new Set());
    setHasTransformed(false);
    setError(null);
  };

  const handleAxisClick = useCallback(
    async (axisKey: AxisKey, direction: "+" | "-") => {
      const source = originalTextRef.current;
      if (!source.trim()) return;

      const delta = direction === "+" ? 1 : -1;
      const newState = { ...state, [axisKey]: state[axisKey] + delta };

      if (Object.values(newState).every((v) => v === 0)) {
        setState(newState);
        setCurrentText(source);
        setDisabledButtons(new Set());
        setHasTransformed(false);
        setError(null);
        return;
      }

      const cached = await cache.get(source, newState);
      if (cached) {
        setState(newState);
        setCurrentText(cached.text);
        setDisabledButtons(new Set(cached.disabled));
        setHasTransformed(true);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/transform", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ originalText: source, state: newState }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(
            data.error || "문장 변환에 실패했습니다.",
          );
        }

        const data: TransformResponse = await res.json();
        await cache.set(source, newState, data);
        setState(newState);
        setCurrentText(data.text);
        setDisabledButtons(new Set(data.disabled));
        setHasTransformed(true);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "문장 변환에 실패했습니다. 다시 시도해주세요.",
        );
      } finally {
        setLoading(false);
      }
    },
    [state],
  );

  const charCount = originalText.length;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="relative">
        <textarea
          value={hasTransformed ? currentText : originalText}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="다듬고 싶은 문장을 입력하세요..."
          rows={4}
          maxLength={500}
          className="w-full p-4 border-2 border-gray-200 rounded-xl resize-none focus:outline-none focus:border-blue-400 text-gray-800"
          readOnly={loading}
        />
        <div className="absolute bottom-2 right-3 text-xs text-gray-400">
          {charCount}/500
        </div>
        {loading && (
          <div className="absolute inset-0 bg-white/60 rounded-xl flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

      <div className="flex flex-col gap-2">
        {AXES.map((axis) => {
          const val = state[axis.key];
          const noText = !originalText.trim();
          const minusDisabled =
            noText ||
            (isAllZero && !hasTransformed) ||
            disabledButtons.has(`${axis.key}-` as ButtonId);
          const plusDisabled =
            noText ||
            disabledButtons.has(`${axis.key}+` as ButtonId);

          return (
            <div
              key={axis.key}
              className="flex items-center gap-2"
            >
              <span className="w-12 text-sm text-gray-600 font-medium text-right shrink-0">
                {axis.label}
              </span>
              <button
                onClick={() => handleAxisClick(axis.key, "-")}
                disabled={minusDisabled || loading}
                title={minusDisabled ? axis.disabledTooltipMinus : undefined}
                className={`w-8 h-8 rounded-full text-lg font-bold flex items-center justify-center transition-all shrink-0 ${
                  minusDisabled || loading
                    ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300 active:bg-gray-400 cursor-pointer"
                }`}
              >
                -
              </button>
              <div className="flex-1 h-2 bg-gray-100 rounded-full relative overflow-hidden">
                {val !== 0 && (
                  <div
                    className={`absolute top-0 h-full rounded-full transition-all ${
                      val > 0 ? "bg-blue-400" : "bg-orange-400"
                    }`}
                    style={{
                      left: val > 0 ? "50%" : undefined,
                      right: val < 0 ? "50%" : undefined,
                      width: `${Math.min(Math.abs(val) * 10, 50)}%`,
                    }}
                  />
                )}
                <div className="absolute left-1/2 top-0 w-px h-full bg-gray-300" />
              </div>
              <button
                onClick={() => handleAxisClick(axis.key, "+")}
                disabled={plusDisabled || loading}
                title={plusDisabled ? axis.disabledTooltipPlus : undefined}
                className={`w-8 h-8 rounded-full text-lg font-bold flex items-center justify-center transition-all shrink-0 ${
                  plusDisabled || loading
                    ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300 active:bg-gray-400 cursor-pointer"
                }`}
              >
                +
              </button>
              <span className={`w-8 text-center text-sm font-mono shrink-0 ${
                val === 0 ? "text-gray-300" : val > 0 ? "text-blue-500" : "text-orange-500"
              }`}>
                {val > 0 ? "+" : ""}{val}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
