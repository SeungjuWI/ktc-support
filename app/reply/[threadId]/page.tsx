"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

export default function ReplyPage() {
  const { threadId } = useParams();
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    setSending(true);
    setError("");

    try {
      const res = await fetch(`/api/reply/${threadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromEmail: email || undefined,
          fromName: name || undefined,
          bodyText: message.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send");
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center px-5">
        <div className="bg-white rounded-2xl p-8 max-w-[480px] w-full text-center">
          <div className="w-12 h-12 bg-[#E8F3FF] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3182F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-[18px] font-medium text-[#191F28] mb-2">Message sent!</h1>
          <p className="text-[14px] text-[#8B95A1]">
            Thank you for your reply. We will get back to you soon.
          </p>
          <p className="text-[13px] text-[#B0B8C1] mt-1">
            Cảm ơn bạn đã trả lời. Chúng tôi sẽ phản hồi sớm.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center px-5 py-10">
      <div className="bg-white rounded-2xl p-8 max-w-[480px] w-full">
        <div className="flex items-center gap-2 mb-6">
          <img src="/logo.png" alt="VTM" width={28} height={28} className="rounded-[4px]" />
          <span className="text-[16px] text-[#191F28] font-medium" style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>
            Vtm
          </span>
        </div>

        <h1 className="text-[18px] font-medium text-[#191F28] mb-1">Reply to VTM</h1>
        <p className="text-[13px] text-[#8B95A1] mb-6">
          Send your message below. / Gửi tin nhắn của bạn bên dưới.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-[12px] text-[#8B95A1] mb-1 block">Name / Tên (optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E5E8EB] text-[14px] text-[#191F28] outline-none focus:border-[#3182F6] transition-colors"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="text-[12px] text-[#8B95A1] mb-1 block">Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E5E8EB] text-[14px] text-[#191F28] outline-none focus:border-[#3182F6] transition-colors"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="text-[12px] text-[#8B95A1] mb-1 block">Message / Tin nhắn *</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={5}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E5E8EB] text-[14px] text-[#191F28] outline-none focus:border-[#3182F6] transition-colors resize-none"
              placeholder="Type your message here..."
            />
          </div>

          {error && (
            <p className="text-[13px] text-[#E8590C]">{error}</p>
          )}

          <button
            type="submit"
            disabled={sending || !message.trim()}
            className="w-full py-3 rounded-xl text-[14px] font-medium text-white bg-[#3182F6] hover:bg-[#2272EB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? "Sending..." : "Send Reply / Gửi"}
          </button>
        </form>
      </div>
    </div>
  );
}
