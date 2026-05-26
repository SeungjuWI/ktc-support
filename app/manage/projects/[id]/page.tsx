"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getUserProfile } from "@/lib/supabase-auth";
import { createNotification } from "@/lib/notifications";

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assignee_id: string | null;
  created_at: string;
};

type Employee = {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
};

type Comment = {
  id: string;
  content: string;
  created_at: string;
  user_profiles: { name: string; avatar_url: string } | null;
  user_id: string;
};

const PRIORITY_LABELS: Record<string, string> = { low: "낮음", medium: "보통", high: "높음", urgent: "긴급" };
const PRIORITY_DOT: Record<string, string> = { low: "bg-gray-300", medium: "bg-[#3182F6]", high: "bg-[#E8590C]", urgent: "bg-red-500" };
const STATUS_LABELS: Record<string, string> = { todo: "대기", in_progress: "진행 중", done: "완료" };
const STATUS_BADGE: Record<string, string> = { todo: "text-gray-500 bg-gray-100", in_progress: "text-[#3182F6] bg-[#E8F3FF]", done: "text-[#1D9E75] bg-[#E6F7F1]" };

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState("");
  const [filter, setFilter] = useState<"all" | "todo" | "in_progress" | "done">("all");

  // 태스크 생성 폼
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", assignee_id: "", priority: "medium", due_date: "" });
  const [creating, setCreating] = useState(false);

  // 태스크 수정
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", assignee_id: "", priority: "medium", due_date: "", status: "todo" });

  // 댓글
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const profile = await getUserProfile(session.user.id);
      if (!profile?.company_id) return;
      setCompanyId(profile.company_id);
      setCurrentUserId(session.user.id);

      // 프로젝트 정보
      const { data: proj } = await supabase.from("projects").select("*").eq("id", id).single();
      if (!proj) { router.push("/manage/projects"); return; }
      setProject(proj as Project);

      // 직원 목록
      const { data: emps } = await supabase
        .from("user_profiles")
        .select("id, name, email, avatar_url")
        .eq("company_id", profile.company_id)
        .eq("role", "employee");
      setEmployees((emps || []) as Employee[]);

      await loadTasks();
    }
    load();
  }, [id]);

  async function loadTasks() {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false });
    setTasks((data || []) as Task[]);
    setLoading(false);
  }

  async function handleCreate() {
    if (!form.title.trim() || !companyId) return;
    setCreating(true);
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from("tasks").insert({
      project_id: id,
      company_id: companyId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      assignee_id: form.assignee_id || null,
      priority: form.priority,
      due_date: form.due_date || null,
      created_by: session?.user.id,
    });
    // 담당자에게 알림
    if (form.assignee_id && form.assignee_id !== session?.user.id) {
      createNotification({
        userId: form.assignee_id,
        type: "task_assigned",
        title: "새 업무가 배정되었습니다",
        body: `[${project?.name}] ${form.title.trim()}`,
        link: "/work/projects",
      });
    }
    setForm({ title: "", description: "", assignee_id: "", priority: "medium", due_date: "" });
    setShowForm(false);
    setCreating(false);
    await loadTasks();
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      description: task.description || "",
      assignee_id: task.assignee_id || "",
      priority: task.priority,
      due_date: task.due_date || "",
      status: task.status,
    });
    loadComments(task.id);
  }

  async function loadComments(taskId: string) {
    setCommentsLoading(true);
    const { data } = await supabase
      .from("task_comments")
      .select("id, content, created_at, user_id, user_profiles:user_id(name, avatar_url)")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });
    setComments((data as unknown as Comment[]) || []);
    setCommentsLoading(false);
  }

  async function handleAddComment() {
    if (!commentText.trim() || !editingTask || !currentUserId) return;
    await supabase.from("task_comments").insert({
      task_id: editingTask.id,
      user_id: currentUserId,
      content: commentText.trim(),
    });
    // 담당자에게 댓글 알림 (자기 자신 제외)
    if (editingTask.assignee_id && editingTask.assignee_id !== currentUserId) {
      createNotification({
        userId: editingTask.assignee_id,
        type: "task_comment",
        title: "업무에 새 댓글이 달렸습니다",
        body: `[${editingTask.title}] ${commentText.trim().slice(0, 50)}`,
        link: "/work/projects",
      });
    }
    setCommentText("");
    await loadComments(editingTask.id);
  }

  async function handleDeleteComment(commentId: string) {
    await supabase.from("task_comments").delete().eq("id", commentId);
    if (editingTask) await loadComments(editingTask.id);
  }

  async function handleEdit() {
    if (!editingTask || !editForm.title.trim()) return;
    await supabase.from("tasks").update({
      title: editForm.title.trim(),
      description: editForm.description.trim() || null,
      assignee_id: editForm.assignee_id || null,
      priority: editForm.priority,
      due_date: editForm.due_date || null,
      status: editForm.status,
      updated_at: new Date().toISOString(),
    }).eq("id", editingTask.id);
    setEditingTask(null);
    await loadTasks();
  }

  async function handleDelete(taskId: string) {
    if (!confirm("이 업무를 삭제하시겠습니까?")) return;
    await supabase.from("tasks").delete().eq("id", taskId);
    await loadTasks();
  }

  async function quickStatus(taskId: string, status: string) {
    await supabase.from("tasks").update({ status, updated_at: new Date().toISOString() }).eq("id", taskId);
    await loadTasks();
  }

  function getEmployeeName(assigneeId: string | null) {
    if (!assigneeId) return null;
    const emp = employees.find((e) => e.id === assigneeId);
    return emp?.name || emp?.email || null;
  }

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);
  const counts = { all: tasks.length, todo: tasks.filter((t) => t.status === "todo").length, in_progress: tasks.filter((t) => t.status === "in_progress").length, done: tasks.filter((t) => t.status === "done").length };

  if (loading) return <p className="text-[14px] text-gray-500">로딩 중...</p>;
  if (!project) return null;

  return (
    <div>
      {/* 상단 */}
      <div className="flex items-center gap-2 mb-1">
        <Link href="/manage/projects" className="text-[13px] text-gray-400 hover:text-gray-600">프로젝트</Link>
        <span className="text-[13px] text-gray-300">/</span>
        <span className="text-[13px] text-gray-600">{project.name}</span>
      </div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-medium text-gray-900">{project.name}</h1>
          <span className={`text-[11px] px-2 py-0.5 rounded-full ${
            project.status === "active" ? "text-[#1D9E75] bg-[#E6F7F1]" : "text-[#3182F6] bg-[#E8F3FF]"
          }`}>
            {project.status === "active" ? "진행 중" : "완료"}
          </span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-[#3182F6] text-white rounded-xl text-[13px] font-medium hover:bg-[#2272EB] active:scale-[0.98] transition"
        >
          + 업무 추가
        </button>
      </div>

      {project.description && (
        <p className="text-[13px] text-gray-500 mb-4">{project.description}</p>
      )}

      {/* 업무 생성 폼 */}
      {showForm && (
        <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-5 mb-4">
          <input
            type="text"
            placeholder="업무 제목"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            className="w-full px-3.5 py-3 bg-white border-[0.5px] border-gray-200/60 rounded-xl text-[14px] text-gray-900 outline-none mb-3 placeholder:text-gray-400 focus:border-[#3182F6]"
          />
          <textarea
            placeholder="설명 (선택)"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            rows={2}
            className="w-full px-3.5 py-3 bg-white border-[0.5px] border-gray-200/60 rounded-xl text-[14px] text-gray-900 outline-none resize-none mb-3 placeholder:text-gray-400 focus:border-[#3182F6]"
          />
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-[12px] text-gray-500 mb-1 block">담당자</label>
              <select
                value={form.assignee_id}
                onChange={(e) => setForm((p) => ({ ...p, assignee_id: e.target.value }))}
                className="w-full px-3 py-2.5 border-[0.5px] border-gray-200/60 rounded-xl text-[13px] text-gray-700 outline-none bg-white focus:border-[#3182F6]"
              >
                <option value="">미배정</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name || e.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[12px] text-gray-500 mb-1 block">우선순위</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
                className="w-full px-3 py-2.5 border-[0.5px] border-gray-200/60 rounded-xl text-[13px] text-gray-700 outline-none bg-white focus:border-[#3182F6]"
              >
                <option value="low">낮음</option>
                <option value="medium">보통</option>
                <option value="high">높음</option>
                <option value="urgent">긴급</option>
              </select>
            </div>
            <div>
              <label className="text-[12px] text-gray-500 mb-1 block">마감일</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
                className="w-full px-3 py-2.5 border-[0.5px] border-gray-200/60 rounded-xl text-[13px] text-gray-700 outline-none bg-white focus:border-[#3182F6]"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-[13px] text-gray-500 hover:text-gray-700">취소</button>
            <button
              onClick={handleCreate}
              disabled={creating || !form.title.trim()}
              className="px-5 py-2 bg-[#3182F6] text-white rounded-xl text-[13px] font-medium hover:bg-[#2272EB] disabled:opacity-60"
            >
              {creating ? "추가 중..." : "추가"}
            </button>
          </div>
        </div>
      )}

      {/* 필터 */}
      <div className="flex gap-2 mb-4">
        {(["all", "todo", "in_progress", "done"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-full text-[13px] transition-colors ${
              filter === f ? "bg-gray-900 text-white" : "bg-white border-[0.5px] border-gray-200 text-gray-700 hover:border-gray-300"
            }`}
          >
            {f === "all" ? "전체" : STATUS_LABELS[f]} <span className="ml-0.5 opacity-60">{counts[f]}</span>
          </button>
        ))}
      </div>

      {/* 태스크 목록 */}
      {filtered.length === 0 ? (
        <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-8 text-center">
          <p className="text-[14px] text-gray-400">업무가 없습니다</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((task) => {
            const assignee = getEmployeeName(task.assignee_id);
            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";
            return (
              <div key={task.id} className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  {/* 상태 체크 */}
                  <button
                    onClick={() => quickStatus(task.id, task.status === "done" ? "todo" : task.status === "todo" ? "in_progress" : "done")}
                    className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                      task.status === "done" ? "border-[#1D9E75] bg-[#1D9E75]" : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {task.status === "done" && (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M3 6l2.5 2.5L9 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-[15px] font-medium ${task.status === "done" ? "text-gray-400 line-through" : "text-gray-900"}`}>
                        {task.title}
                      </p>
                      <div className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[task.priority]}`} title={PRIORITY_LABELS[task.priority]} />
                    </div>
                    {task.description && (
                      <p className="text-[12px] text-gray-500 mt-0.5 truncate">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${STATUS_BADGE[task.status]}`}>
                        {STATUS_LABELS[task.status]}
                      </span>
                      {assignee && (
                        <span className="text-[11px] text-gray-500">{assignee}</span>
                      )}
                      {task.due_date && (
                        <span className={`text-[11px] ${isOverdue ? "text-red-500" : "text-gray-400"}`}>
                          {isOverdue ? "기한초과 " : ""}{task.due_date}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(task)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(task.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 수정 모달 */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center px-5" onClick={() => { setEditingTask(null); setComments([]); setCommentText(""); }}>
          <div className="bg-white rounded-2xl w-full max-w-[480px] p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[18px] font-medium text-gray-900 mb-4">업무 수정</h2>
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
              className="w-full px-3.5 py-3 bg-white border-[0.5px] border-gray-200/60 rounded-xl text-[14px] text-gray-900 outline-none mb-3 focus:border-[#3182F6]"
            />
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              placeholder="설명"
              className="w-full px-3.5 py-3 bg-white border-[0.5px] border-gray-200/60 rounded-xl text-[14px] text-gray-900 outline-none resize-none mb-3 placeholder:text-gray-400 focus:border-[#3182F6]"
            />
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[12px] text-gray-500 mb-1 block">담당자</label>
                <select
                  value={editForm.assignee_id}
                  onChange={(e) => setEditForm((p) => ({ ...p, assignee_id: e.target.value }))}
                  className="w-full px-3 py-2.5 border-[0.5px] border-gray-200/60 rounded-xl text-[13px] text-gray-700 outline-none bg-white focus:border-[#3182F6]"
                >
                  <option value="">미배정</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name || e.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[12px] text-gray-500 mb-1 block">상태</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
                  className="w-full px-3 py-2.5 border-[0.5px] border-gray-200/60 rounded-xl text-[13px] text-gray-700 outline-none bg-white focus:border-[#3182F6]"
                >
                  <option value="todo">대기</option>
                  <option value="in_progress">진행 중</option>
                  <option value="done">완료</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="text-[12px] text-gray-500 mb-1 block">우선순위</label>
                <select
                  value={editForm.priority}
                  onChange={(e) => setEditForm((p) => ({ ...p, priority: e.target.value }))}
                  className="w-full px-3 py-2.5 border-[0.5px] border-gray-200/60 rounded-xl text-[13px] text-gray-700 outline-none bg-white focus:border-[#3182F6]"
                >
                  <option value="low">낮음</option>
                  <option value="medium">보통</option>
                  <option value="high">높음</option>
                  <option value="urgent">긴급</option>
                </select>
              </div>
              <div>
                <label className="text-[12px] text-gray-500 mb-1 block">마감일</label>
                <input
                  type="date"
                  value={editForm.due_date}
                  onChange={(e) => setEditForm((p) => ({ ...p, due_date: e.target.value }))}
                  className="w-full px-3 py-2.5 border-[0.5px] border-gray-200/60 rounded-xl text-[13px] text-gray-700 outline-none bg-white focus:border-[#3182F6]"
                />
              </div>
            </div>
            <div className="flex gap-2 mb-5">
              <button onClick={() => { setEditingTask(null); setComments([]); setCommentText(""); }} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl text-[14px] font-medium hover:bg-gray-200">취소</button>
              <button onClick={handleEdit} className="flex-1 py-3 bg-[#3182F6] text-white rounded-xl text-[14px] font-medium hover:bg-[#2272EB]">저장</button>
            </div>

            {/* 댓글 */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-[13px] font-medium text-gray-700 mb-3">댓글 {comments.length > 0 && `(${comments.length})`}</p>
              {commentsLoading ? (
                <p className="text-[12px] text-gray-400">로딩 중...</p>
              ) : (
                <>
                  {comments.length > 0 && (
                    <div className="flex flex-col gap-3 mb-3">
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
                              {c.user_id === currentUserId && (
                                <button onClick={() => handleDeleteComment(c.id)} className="text-[10px] text-gray-400 hover:text-red-500">삭제</button>
                              )}
                            </div>
                            <p className="text-[13px] text-gray-600 leading-relaxed">{c.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="댓글 입력..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                      className="flex-1 px-3 py-2 border-[0.5px] border-gray-200/60 rounded-xl text-[13px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#3182F6]"
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!commentText.trim()}
                      className="px-3 py-2 bg-gray-900 text-white rounded-xl text-[12px] font-medium hover:bg-gray-800 disabled:opacity-40"
                    >
                      전송
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
