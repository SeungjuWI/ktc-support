export default function AbandonedPage() {
  return (
    <div className="min-h-[calc(100vh-57px)] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border-[0.5px] border-gray-200/60 p-10 text-center max-w-md">
        <div className="w-12 h-12 rounded-full bg-red-400/10 flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F04452" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h1 className="text-[20px] font-medium text-gray-900 mb-3">Interview Ended</h1>
        <p className="text-gray-600 text-[14px] mb-4">
          This interview session has been terminated. The access code can no longer be used.
        </p>
        <p className="text-gray-500 text-[13px] mb-4">
          If you have any questions, please contact your recruiter.
        </p>
        <p className="text-gray-400 text-[12px] italic">
          Buoi phong van da ket thuc. Ma truy cap khong the su dung lai. Neu co thac mac, vui long lien he nguoi tuyen dung.
        </p>
      </div>
    </div>
  );
}
