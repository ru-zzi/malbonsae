import { useState, useCallback, useRef } from "react";
import { AXES, DEFAULT_STATE } from "@/lib/axes.ts";
import type { AxisState, AxisKey, ButtonId, TransformResponse } from "@/lib/types.ts";
import { TransformCache } from "@/lib/cache.ts";
import AxisButton from "./AxisButton.tsx";

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

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {AXES.map((axis) => (
          <div key={axis.key} className="flex flex-col items-center gap-1">
            <span className="text-xs text-gray-500 font-medium">
              {axis.label}
            </span>
            <div className="flex gap-1">
              <AxisButton
                axis={axis}
                direction="+"
                disabled={
                  !originalText.trim() ||
                  disabledButtons.has(`${axis.key}+` as ButtonId)
                }
                loading={loading}
                onClick={() => handleAxisClick(axis.key, "+")}
              />
              <AxisButton
                axis={axis}
                direction="-"
                disabled={
                  !originalText.trim() ||
                  (isAllZero && !hasTransformed) ||
                  disabledButtons.has(`${axis.key}-` as ButtonId)
                }
                loading={loading}
                onClick={() => handleAxisClick(axis.key, "-")}
              />
            </div>
          </div>
        ))}
      </div>

      {hasTransformed && (
        <div className="flex flex-wrap gap-2 justify-center">
          {AXES.map((axis) => {
            const val = state[axis.key];
            if (val === 0) return null;
            return (
              <span
                key={axis.key}
                className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs"
              >
                {axis.label} {val > 0 ? "+" : ""}
                {val}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
