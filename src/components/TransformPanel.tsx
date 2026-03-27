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

  const [activeTab, setActiveTab] = useState<AxisKey>("length");
  const isAllZero = Object.values(state).every((v) => v === 0);
  const activeAxis = AXES.find((a) => a.key === activeTab)!;

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

      {/* 축 탭 */}
      <div className="flex gap-1 justify-center">
        {AXES.map((axis) => {
          const val = state[axis.key];
          const isActive = activeTab === axis.key;
          return (
            <button
              key={axis.key}
              onClick={() => setActiveTab(axis.key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                isActive
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {axis.label}
              {val !== 0 && (
                <span className={`ml-1 ${isActive ? "text-blue-100" : "text-blue-400"}`}>
                  {val > 0 ? "+" : ""}{val}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 선택된 축의 +/- 버튼 */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => handleAxisClick(activeAxis.key, "-")}
          disabled={
            !originalText.trim() ||
            (isAllZero && !hasTransformed) ||
            disabledButtons.has(`${activeAxis.key}-` as ButtonId) ||
            loading
          }
          title={
            disabledButtons.has(`${activeAxis.key}-` as ButtonId)
              ? activeAxis.disabledTooltipMinus
              : undefined
          }
          className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 disabled:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed cursor-pointer"
        >
          {activeAxis.minusLabel}
        </button>
        <button
          onClick={() => handleAxisClick(activeAxis.key, "+")}
          disabled={
            !originalText.trim() ||
            disabledButtons.has(`${activeAxis.key}+` as ButtonId) ||
            loading
          }
          title={
            disabledButtons.has(`${activeAxis.key}+` as ButtonId)
              ? activeAxis.disabledTooltipPlus
              : undefined
          }
          className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer"
        >
          {activeAxis.plusLabel}
        </button>
      </div>
    </div>
  );
}
