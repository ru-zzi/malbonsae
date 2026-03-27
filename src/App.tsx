import TransformPanel from "./components/TransformPanel.tsx";

export default function App() {
  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8 bg-gray-50">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">malbonsae</h1>
      <p className="text-gray-500 mb-6">
        문장을 원하는 톤으로 다듬어보세요
      </p>

      <div className="w-full">
        <TransformPanel />
      </div>
    </main>
  );
}
