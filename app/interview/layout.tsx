import "../globals.css";

export default function InterviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b-[0.5px] border-gray-200/80">
        <div className="max-w-[720px] mx-auto px-5 h-[56px] flex items-center gap-2">
          <img src="/logo.png" alt="VTM" width={24} height={24} className="rounded-[4px]" />
          <span className="text-[16px] text-gray-900 tracking-tight" style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>
            Vtm
          </span>
          <span className="text-[12px] text-gray-500 ml-2">AI Interview</span>
        </div>
      </header>
      {children}
    </div>
  );
}
