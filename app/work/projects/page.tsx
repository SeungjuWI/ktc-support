"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { createNotification } from "@/lib/notifications";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  created_by: string | null;
  projects: { name: string } | null;
};

type Comment = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user_profiles: { name: string; avatar_url: string } | null;
};

const STATUS_LABELS: Record<string, string> = { todo: "대기", in_progress: "진행 중", done: "완료" };
const PRIORITY_LABELS: Record<string, string> = { low: "낮음", medium: "보통", high: "높음", urgent: "긴급" };

export default function WorkProjectsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "todo" | "in_progress" | "done">("all");
  const [userId, setUserId] = useState("");

  // 상세 모달
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserId(session.user.id);

      const { data } = await supabase
        .from("tasks")
        .select("id, title, description, status, priority, due_date, created_by, projects(name)")
        .eq("assignee_id", session.user.id)
        .order("created_at", { ascending: false });

      setTasks((data as unknown as Task[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  async function updateStatus(taskId: string, newStatus: string) {
    await supabase.from("tasks").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", taskId);
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
    if (selectedTask?.id === taskId) setSelectedTask((prev) => prev ? { ...prev, status: newStatus } : null);
  }

  async function openDetail(task: Task) {
    setSelectedTask(task);
    setCommentsLoading(true);
    const { data } = await supabase
      .from("task_comments")
      .select("id, content, created_at, user_id, user_profiles:user_id(name, avatar_url)")
      .eq("task_id", task.id)
      .order("created_at", { ascending: true });
    setComments((data as unknown as Comment[]) || []);
    setCommentsLoading(false);
  }

  async function handleAddComment() {
    if (!commentText.trim() || !selectedTask || !userId) return;
    await supabase.from("task_comments").insert({
      task_id: selectedTask.id,
      user_id: userId,
      content: commentText.trim(),
    });
    // 태스크 생성자에게 알림 (자기 자신 제외)
    if (selectedTask.created_by && selectedTask.created_by !== userId) {
      createNotification({
        userId: selectedTask.created_by,
        type: "task_comment",
        title: "업무에 새 댓글이 달렸습니다",
        body: `[${selectedTask.title}] ${commentText.trim().slice(0, 50)}`,
        link: `/manage/projects`,
      });
    }
    setCommentText("");
    // 리로드 댓글
    const { data } = await supabase
      .from("task_comments")
      .select("id, content, created_at, user_id, user_profiles:user_id(name, avatar_url)")
      .eq("task_id", selectedTask.id)
      .order("created_at", { ascending: true });
    setComments((data as unknown as Comment[]) || []);
  }

  async function handleDeleteComment(commentId: string) {
    await supabase.from("task_comments").delete().eq("id", commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  const filters = [
    { key: "all", label: "전체" },
    { key: "todo", label: "대기" },
    { key: "in_progress", label: "진행 중" },
    { key: "done", label: "완료" },
  ] as const;

  if (loading) return <p className="text-[14px] text-gray-500">로딩 중...</p>;

  return (
    <div>
      <h1 className="text-[22px] font-medium text-gray-900 mb-4">내 프로젝트 / 업무</h1>

      <div className="flex gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3.5 py-1.5 rounded-full text-[13px] transition-colors ${
              filter === f.key
                ? "bg-gray-900 text-white"
                : "bg-white border-[0.5px] border-gray-200 text-gray-700 hover:border-gray-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-8 text-center">
          <p className="text-[14px] text-gray-400">업무가 없습니다</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((task) => (
            <div
              key={task.id}
              className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-4 hover:border-gray-300 transition-colors cursor-pointer"
              onClick={() => openDetail(task)}
            >
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  task.priority === "urgent" ? "bg-red-500" :
                  task.priority === "high" ? "bg-[#E8590C]" :
                  task.priority === "medium" ? "bg-[#3182F6]" :
                  "bg-gray-300"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-[15px] font-medium ${task.status === "done" ? "text-gray-400 line-through" : "text-gray-900"}`}>{task.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {task.projects?.name && (
                      <span className="text-[11px] text-gray-500">{task.projects.name}</span>
                    )}
                    {task.due_date && (
                      <span className={`text-[11px] ${task.due_date && new Date(task.due_date) < new Date() && task.status !== "done" ? "text-red-500" : "text-gray-400"}`}>{task.due_date}</span>
                    )}
                  </div>
                </div>
                <select
                  value={task.status}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => updateStatus(task.id, e.target.value)}
                  className="text-[12px] px-2 py-1 rounded-lg border-[0.5px] border-gray-200 text-gray-600 bg-white outline-none"
                >
                  <option value="todo">대기</option>
                  <option value="in_progress">진행 중</option>
                  <option value="done">완료</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 태스크 상세 모달 */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-end sm:items-center justify-center" onClick={() => { setSelectedTask(null); setComments([]); setCommentText(""); }}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-[480px] max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* 헤더 */}
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                  selectedTask.status === "done" ? "text-[#1D9E75] bg-[#E6F7F1]" :
                  selectedTask.status === "in_progress" ? "text-[#3182F6] bg-[#E8F3FF]" :
                  "text-gray-500 bg-gray-100"
                }`}>
                  {STATUS_LABELS[selectedTask.status]}
                </span>
                <button onClick={() => { setSelectedTask(null); setComments([]); setCommentText(""); }} className="text-[13px] text-gray-400 hover:text-gray-600">닫기</button>
              </div>
              <h2 className="text-[18px] font-medium text-gray-900">{selectedTask.title}</h2>
              <div className="flex items-center gap-3 mt-2">
                {selectedTask.projects?.name && (
                  <span className="text-[12px] text-gray-500">{selectedTask.projects.name}</span>
                )}
                <span className="text-[12px] text-gray-400">{PRIORITY_LABELS[selectedTask.priority]}</span>
                {selectedTask.due_date && (
                  <span className={`text-[12px] ${selectedTask.due_date && new Date(selectedTask.due_date) < new Date() && selectedTask.status !== "done" ? "text-red-500" : "text-gray-400"}`}>
                    마감: {selectedTask.due_date}
                  </span>
                )}
              </div>
              {selectedTask.description && (
                <p className="text-[13px] text-gray-600 mt-3 leading-relaxed">{selectedTask.description}</p>
              )}
              {/* 상태 변경 */}
              <div className="flex gap-2 mt-4">
                {(["todo", "in_progress", "done"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(selectedTask.id, s)}
                    className={`flex-1 py-2 rounded-xl text-[12px] font-medium transition-colors ${
                      selectedTask.status === s ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* 댓글 영역 */}
            <div className="flex-1 overflow-y-auto p-5">
              <p className="text-[13px] font-medium text-gray-700 mb-3">댓글 {comments.length > 0 && `(${comments.length})`}</p>
              {commentsLoading ? (
                <p className="text-[12px] text-gray-400">로딩 중...</p>
              ) : comments.length === 0 ? (
                <p className="text-[12px] text-gray-400">아직 댓글이 없습니다</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {comments.map((c) => (
                    <div key={c.id} className="flex gap-2">
                      {c.user_profiles?.avatar_url ? (
                        <img src={c.user_profiles.avatar_url} alt="" className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[#F2F4F6] flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-[9px] text-gray-500">{c.user_profiles?.name?.charAt(0) || "?"}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-medium text-gray-700">{c.user_profiles?.name || "-"}</span>
                          <span className="text-[10px] text-gray-400">{new Date(c.created_at).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                          {c.user_id === userId && (
                            <button onClick={() => handleDeleteComment(c.id)} className="text-[10px] text-gray-400 hover:text-red-500">삭제</button>
                          )}
                        </div>
                        <p className="text-[13px] text-gray-600 leading-relaxed">{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 댓글 입력 */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="댓글 입력..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                  className="flex-1 px-3 py-2.5 border-[0.5px] border-gray-200/60 rounded-xl text-[13px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#3182F6]"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!commentText.trim()}
                  className="px-4 py-2.5 bg-gray-900 text-white rounded-xl text-[12px] font-medium hover:bg-gray-800 disabled:opacity-40"
                >
                  전송
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
