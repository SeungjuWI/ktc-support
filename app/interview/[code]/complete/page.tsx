"use client";

import { useEffect } from "react";

export default function CompletePage() {
  useEffect(() => {
    const block = () => window.history.pushState(null, "", window.location.href);
    block();
    window.addEventListener("popstate", block);

    const timer = setTimeout(() => {
      window.location.href = "/interview";
    }, 3000);

    return () => {
      window.removeEventListener("popstate", block);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="min-h-[calc(100vh-57px)] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border-[0.5px] border-gray-200/60 p-12 text-center max-w-md">
        <div className="text-[64px] mb-6">&#127881;</div>
        <h1 className="text-[22px] font-medium text-gray-900 mb-3">Interview Complete!</h1>
        <p className="text-gray-600 text-[15px] mb-4">Thank you for completing your KTC interview.</p>
        <p className="text-gray-500 text-[13px] mb-6">
          The KTC team will review your responses and contact you via email within 5 business days.
        </p>
        <p className="text-gray-400 text-[12px] italic">
          Cam on ban. Doi KTC se lien he voi ban qua email trong vong 5 ngay lam viec.
        </p>
        <p className="text-gray-400 text-[11px] mt-6">Redirecting in 3 seconds...</p>
      </div>
    </div>
  );
}
