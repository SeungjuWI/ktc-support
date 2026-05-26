"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { getUnreadCount, getNotifications, markAsRead, markAllAsRead } from "@/lib/notifications";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

export function NotificationBell() {
  const [userId, setUserId] = useState("");
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserId(session.user.id);
      const count = await getUnreadCount(session.user.id);
      setUnread(count);
    }
    init();

    // 30초마다 폴링
    const interval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const count = await getUnreadCount(session.user.id);
        setUnread(count);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleOpen() {
    setOpen(!open);
    if (!open && userId) {
      setLoading(true);
      const data = await getNotifications(userId, 15);
      setItems(data as Notification[]);
      setLoading(false);
    }
  }

  async function handleClickItem(item: Notification) {
    if (!item.is_read) {
      await markAsRead(item.id);
      setUnread((p) => Math.max(0, p - 1));
      setItems((prev) => prev.map((n) => n.id === item.id ? { ...n, is_read: true } : n));
    }
    if (item.link) {
      window.location.href = item.link;
    }
    setOpen(false);
  }

  async function handleMarkAll() {
    if (!userId) return;
    await markAllAsRead(userId);
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  function timeAgo(dateStr: string) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return "방금";
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return `${Math.floor(diff / 86400)}일 전`;
  }

  const TYPE_ICON: Record<string, string> = {
    task_assigned: "📋",
    task_comment: "💬",
    task_status: "✅",
    invite_accepted: "👋",
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="w-8 h-8 rounded-full border-[1.5px] border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors relative"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B95A1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-[16px] h-[16px] bg-[#E8590C] text-white text-[9px] font-medium rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-[320px] bg-white border-[0.5px] border-gray-200/60 rounded-2xl overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-[14px] font-medium text-gray-900">알림</p>
            {unread > 0 && (
              <button onClick={handleMarkAll} className="text-[12px] text-[#3182F6] hover:text-[#2272EB]">모두 읽음</button>
            )}
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {loading ? (
              <p className="text-[13px] text-gray-400 text-center py-8">로딩 중...</p>
            ) : items.length === 0 ? (
              <p className="text-[13px] text-gray-400 text-center py-8">알림이 없습니다</p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleClickItem(item)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors ${
                    !item.is_read ? "bg-[#F9FAFB]" : ""
                  }`}
                >
                  <div className="flex gap-2.5">
                    <span className="text-[14px] mt-0.5">{TYPE_ICON[item.type] || "🔔"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-[13px] ${!item.is_read ? "font-medium text-gray-900" : "text-gray-700"}`}>{item.title}</p>
                        {!item.is_read && <div className="w-1.5 h-1.5 rounded-full bg-[#3182F6] flex-shrink-0" />}
                      </div>
                      {item.body && (
                        <p className="text-[12px] text-gray-500 truncate mt-0.5">{item.body}</p>
                      )}
                      <p className="text-[11px] text-gray-400 mt-1">{timeAgo(item.created_at)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
