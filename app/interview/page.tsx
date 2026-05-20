"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InterviewLanding() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError("Please enter your access code.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/interview/validate?code=${encodeURIComponent(trimmed)}`);
      const json = await res.json();
      if (!json.success) {
        setError(json.message || "Invalid code");
        setLoading(false);
        return;
      }
      router.push(`/interview/${trimmed}/intro`);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-57px)] flex items-center justify-center p-4">
      <div className="w-full max-w-[420px] bg-white rounded-2xl border-[0.5px] border-gray-200/60 p-8">
        <div className="text-center mb-8">
          <h1 className="text-[22px] font-medium text-gray-900">KTC AI Interview</h1>
          <p className="text-gray-500 mt-2 text-[14px]">Please enter your access code</p>
          <p className="text-gray-400 text-[12px] italic">Vui long nhap ma truy cap cua ban</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="KTC-XXXXXX"
            className="w-full px-4 py-3 border-[0.5px] border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-[16px] font-mono uppercase text-center outline-none"
            autoComplete="off"
            autoCapitalize="characters"
            required
          />
          {error && (
            <div className="text-red-500 text-[13px] bg-red-400/10 px-3 py-2 rounded-xl">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-3 rounded-xl font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors duration-100"
          >
            {loading ? "Checking..." : "Continue / Tiep tuc"}
          </button>
        </form>
      </div>
    </div>
  );
}
