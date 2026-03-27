import { useState, useCallback, useRef } from "react";
import { AXES, DEFAULT_STATE } from "@/lib/axes.ts";
import type {
  AxisState,
  AxisKey,
  ButtonId,
  TransformResponse,
} from "@/lib/types.ts";
import { TransformCache } from "@/lib/cache.ts";

const cache = new TransformCache();

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ClearIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function TransformPanel() {
  const [originalText, setOriginalText] = useState("");
  const [currentText, setCurrentText] = useState("");
  const [state, setState] = useState<AxisState>({ ...DEFAULT_STATE });
  const [disabledButtons, setDisabledButtons] = useState<Set<ButtonId>>(
    new Set(),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasTransformed, setHasTransformed] = useState(false);
  const originalTextRef = useRef("");

  const [activeTab, setActiveTab] = useState<AxisKey>("length");
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
          throw new Error(data.error || "문장 변환에 실패했습니다.");
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

  const displayedText = hasTransformed ? currentText : originalText;
  const charCount = originalText.length;
  const noText = !originalText.trim();

  return (
    <div className="w-full space-y-5">
      {/* 텍스트 영역 */}
      <div className="relative group">
        <textarea
          value={displayedText}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="다듬고 싶은 문장을 입력하세요..."
          rows={5}
          maxLength={500}
          className="w-full p-5 pb-10 bg-white border border-slate-200 rounded-2xl resize-none shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-slate-700 text-base leading-relaxed placeholder:text-slate-300 transition-all"
          readOnly={loading}
        />
        <div className="absolute bottom-3 left-5 right-5 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {displayedText && (
              <>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(displayedText);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="p-1.5 rounded-md text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
                  title="복사하기"
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                </button>
                <button
                  onClick={() => handleTextChange("")}
                  className="p-1.5 rounded-md text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
                  title="모두 지우기"
                >
                  <ClearIcon />
                </button>
              </>
            )}
          </div>
          <span className="text-xs text-slate-300 tabular-nums">
            {charCount}/500
          </span>
        </div>
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* 에러 */}
      {error && (
        <p className="text-red-500 text-sm text-center bg-red-50 rounded-xl py-2 px-4">
          {error}
        </p>
      )}

      {/* 축 탭 */}
      <div className="flex gap-1.5 justify-center flex-wrap">
        {AXES.map((axis) => {
          const val = state[axis.key];
          const isActive = activeTab === axis.key;
          return (
            <button
              key={axis.key}
              onClick={() => setActiveTab(axis.key)}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                isActive
                  ? "bg-slate-800 text-white shadow-md"
                  : "bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-slate-150"
              }`}
            >
              {axis.label}
              {val !== 0 && (
                <span
                  className={`ml-1 text-xs ${isActive ? "text-slate-400" : "text-blue-400"}`}
                >
                  {val > 0 ? "+" : ""}
                  {val}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 선택된 축의 +/- 버튼 */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => handleAxisClick(activeAxis.key, "-")}
          disabled={
            noText ||
            disabledButtons.has(`${activeAxis.key}-` as ButtonId) ||
            loading
          }
          title={
            disabledButtons.has(`${activeAxis.key}-` as ButtonId)
              ? activeAxis.disabledTooltipMinus
              : undefined
          }
          className="flex-1 max-w-48 py-3 rounded-xl text-sm font-semibold transition-all bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-slate-200 disabled:active:scale-100 cursor-pointer shadow-sm"
        >
          {activeAxis.minusLabel}
        </button>
        <button
          onClick={() => handleAxisClick(activeAxis.key, "+")}
          disabled={
            noText ||
            disabledButtons.has(`${activeAxis.key}+` as ButtonId) ||
            loading
          }
          title={
            disabledButtons.has(`${activeAxis.key}+` as ButtonId)
              ? activeAxis.disabledTooltipPlus
              : undefined
          }
          className="flex-1 max-w-48 py-3 rounded-xl text-sm font-semibold transition-all bg-slate-800 text-white hover:bg-slate-700 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-slate-800 disabled:active:scale-100 cursor-pointer shadow-sm"
        >
          {activeAxis.plusLabel}
        </button>
      </div>
    </div>
  );
}
