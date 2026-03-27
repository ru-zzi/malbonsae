import TransformPanel from "./components/TransformPanel.tsx";

export default function App() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 sm:py-16 bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-800 mb-2">
            말본새
          </h1>
          <p className="text-slate-400 text-sm sm:text-base">
            문장을 원하는 톤으로 다듬어보세요
          </p>
        </div>

        <TransformPanel />
      </div>
    </main>
  );
}
