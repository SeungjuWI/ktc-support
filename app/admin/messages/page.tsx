"use client";

import { useEffect, useState, useCallback } from "react";
import { useAdminI18n } from "@/lib/admin-i18n";
import { supabase } from "@/lib/supabase";

interface Thread {
  thread_id: string;
  subject: string;
  to_email: string;
  to_name: string | null;
  last_message_at: string;
  message_count: number;
  unread_count: number;
  last_direction: string;
  last_body_text: string | null;
}

interface Message {
  id: string;
  thread_id: string;
  direction: "outbound" | "inbound";
  from_email: string;
  to_email: string;
  to_name: string | null;
  subject: string;
  body_text: string | null;
  body_html: string;
  read_at: string | null;
  created_at: string;
}

export default function MessagesPage() {
  const { t } = useAdminI18n();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // 새 메시지 작성
  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeToName, setComposeToName] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);

  // 답장 작성
  const [replyBody, setReplyBody] = useState("");
  const [replying, setReplying] = useState(false);

  const loadThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/messages");
      const data = await res.json();
      setThreads(data.threads || []);
    } catch {
      console.error("Failed to load threads");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  async function loadThread(threadId: string) {
    setSelectedThread(threadId);
    setLoadingMessages(true);
    setReplyBody("");
    try {
      const res = await fetch(`/api/admin/messages/${threadId}`);
      const data = await res.json();
      setMessages(data.messages || []);
      // 읽음 처리 반영
      setThreads((prev) =>
        prev.map((t) => (t.thread_id === threadId ? { ...t, unread_count: 0 } : t))
      );
    } catch {
      console.error("Failed to load thread");
    } finally {
      setLoadingMessages(false);
    }
  }

  async function handleSend() {
    if (!composeTo || !composeSubject || !composeBody) return;
    setSending(true);

    const { data: { session } } = await supabase.auth.getSession();

    try {
      const res = await fetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: composeTo,
          toName: composeToName || undefined,
          subject: composeSubject,
          bodyText: composeBody,
          sentBy: session?.user?.id || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed");

      setShowCompose(false);
      setComposeTo("");
      setComposeToName("");
      setComposeSubject("");
      setComposeBody("");
      loadThreads();
    } catch {
      alert("발송 실패");
    } finally {
      setSending(false);
    }
  }

  async function handleReply() {
    if (!replyBody.trim() || !selectedThread) return;
    setReplying(true);

    const { data: { session } } = await supabase.auth.getSession();
    const thread = threads.find((t) => t.thread_id === selectedThread);

    try {
      const res = await fetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: thread?.to_email,
          toName: thread?.to_name || undefined,
          subject: `Re: ${thread?.subject || ""}`,
          bodyText: replyBody,
          threadId: selectedThread,
          sentBy: session?.user?.id || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed");

      setReplyBody("");
      loadThread(selectedThread);
      loadThreads();
    } catch {
      alert("답장 실패");
    } finally {
      setReplying(false);
    }
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "방금";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  }

  function formatFullTime(iso: string) {
    return new Date(iso).toLocaleString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const totalUnread = threads.reduce((sum, t) => sum + t.unread_count, 0);

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <h1 className="text-[22px] font-medium text-[#191F28]">{t("nav.messages")}</h1>
          {totalUnread > 0 && (
            <span className="bg-[#E8590C] text-white text-[11px] font-medium px-2 py-0.5 rounded-full">
              {totalUnread}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowCompose(true)}
          className="px-4 py-2 bg-[#3182F6] text-white text-[13px] font-medium rounded-xl hover:bg-[#2272EB] transition-colors"
        >
          {t("messages.compose")}
        </button>
      </div>

      <div className="flex gap-4 min-h-[600px]">
        {/* 스레드 목록 */}
        <div className="w-[340px] flex-shrink-0 bg-white rounded-2xl border border-[#E5E8EB]/60 overflow-hidden">
          {loading ? (
            <div className="p-6 text-center text-[13px] text-[#8B95A1]">{t("common.loading")}</div>
          ) : threads.length === 0 ? (
            <div className="p-6 text-center text-[13px] text-[#8B95A1]">{t("messages.empty")}</div>
          ) : (
            <div className="divide-y divide-[#F2F4F6]">
              {threads.map((thread) => (
                <button
                  key={thread.thread_id}
                  onClick={() => loadThread(thread.thread_id)}
                  className={`w-full text-left px-4 py-3.5 transition-colors ${
                    selectedThread === thread.thread_id
                      ? "bg-[#F2F4F6]"
                      : "hover:bg-[#F9FAFB]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[13px] truncate max-w-[200px] ${
                      thread.unread_count > 0 ? "font-medium text-[#191F28]" : "text-[#4E5968]"
                    }`}>
                      {thread.to_name || thread.to_email}
                    </span>
                    <span className="text-[11px] text-[#B0B8C1] flex-shrink-0">
                      {formatTime(thread.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] text-[#8B95A1] truncate max-w-[240px]">
                      {thread.last_direction === "inbound" && (
                        <span className="text-[#3182F6] mr-1">●</span>
                      )}
                      {thread.subject}
                    </p>
                    {thread.unread_count > 0 && (
                      <span className="bg-[#3182F6] text-white text-[10px] font-medium w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0">
                        {thread.unread_count}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 스레드 상세 */}
        <div className="flex-1 bg-white rounded-2xl border border-[#E5E8EB]/60 flex flex-col overflow-hidden">
          {!selectedThread ? (
            <div className="flex-1 flex items-center justify-center text-[13px] text-[#B0B8C1]">
              {t("messages.selectThread")}
            </div>
          ) : loadingMessages ? (
            <div className="flex-1 flex items-center justify-center text-[13px] text-[#8B95A1]">
              {t("common.loading")}
            </div>
          ) : (
            <>
              {/* 메시지 목록 */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.direction === "outbound"
                          ? "bg-[#3182F6] text-white"
                          : "bg-[#F2F4F6] text-[#191F28]"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[11px] ${
                          msg.direction === "outbound" ? "text-white/70" : "text-[#8B95A1]"
                        }`}>
                          {msg.direction === "outbound" ? "VTM" : (msg.to_name || msg.from_email)}
                        </span>
                        <span className={`text-[10px] ${
                          msg.direction === "outbound" ? "text-white/50" : "text-[#B0B8C1]"
                        }`}>
                          {formatFullTime(msg.created_at)}
                        </span>
                      </div>
                      <p className="text-[13px] leading-relaxed whitespace-pre-wrap">
                        {msg.body_text || ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* 답장 입력 */}
              <div className="border-t border-[#F2F4F6] p-4">
                <div className="flex gap-2">
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder={t("messages.replyPlaceholder")}
                    rows={2}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-[#E5E8EB] text-[13px] text-[#191F28] outline-none focus:border-[#3182F6] transition-colors resize-none"
                  />
                  <button
                    onClick={handleReply}
                    disabled={replying || !replyBody.trim()}
                    className="px-4 py-2 bg-[#3182F6] text-white text-[13px] font-medium rounded-xl hover:bg-[#2272EB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
                  >
                    {replying ? "..." : t("messages.send")}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 새 메시지 작성 모달 */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-5">
          <div className="bg-white rounded-2xl w-full max-w-[520px] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-medium text-[#191F28]">{t("messages.newMessage")}</h2>
              <button
                onClick={() => setShowCompose(false)}
                className="text-[#8B95A1] hover:text-[#4E5968] transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[11px] text-[#8B95A1] mb-1 block">{t("messages.toEmail")} *</label>
                  <input
                    type="email"
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E5E8EB] text-[13px] text-[#191F28] outline-none focus:border-[#3182F6] transition-colors"
                    placeholder="email@example.com"
                  />
                </div>
                <div className="w-[140px]">
                  <label className="text-[11px] text-[#8B95A1] mb-1 block">{t("messages.toName")}</label>
                  <input
                    type="text"
                    value={composeToName}
                    onChange={(e) => setComposeToName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E5E8EB] text-[13px] text-[#191F28] outline-none focus:border-[#3182F6] transition-colors"
                    placeholder="Name"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-[#8B95A1] mb-1 block">{t("messages.subject")} *</label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E5E8EB] text-[13px] text-[#191F28] outline-none focus:border-[#3182F6] transition-colors"
                  placeholder="Subject"
                />
              </div>

              <div>
                <label className="text-[11px] text-[#8B95A1] mb-1 block">{t("messages.body")} *</label>
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E5E8EB] text-[13px] text-[#191F28] outline-none focus:border-[#3182F6] transition-colors resize-none"
                  placeholder="Type your message..."
                />
              </div>

              <button
                onClick={handleSend}
                disabled={sending || !composeTo || !composeSubject || !composeBody}
                className="w-full py-3 rounded-xl text-[14px] font-medium text-white bg-[#3182F6] hover:bg-[#2272EB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? t("messages.sending") : t("messages.send")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
