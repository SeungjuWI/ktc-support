"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getUserProfile } from "@/lib/supabase-auth";

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
};

export default function ManageProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const profile = await getUserProfile(session.user.id);
      if (!profile) return;
      const cid = profile.company_id;
      setCompanyId(cid || "");
      if (!cid) { setLoading(false); return; }

      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("company_id", cid)
        .order("created_at", { ascending: false });

      setProjects(data || []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleCreate() {
    if (!form.name.trim() || !companyId) return;
    setCreating(true);

    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase
      .from("projects")
      .insert({
        company_id: companyId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        created_by: session?.user.id,
      })
      .select()
      .single();

    if (!error && data) {
      setProjects((prev) => [data, ...prev]);
      setForm({ name: "", description: "" });
      setShowForm(false);
    }
    setCreating(false);
  }

  async function toggleStatus(project: Project) {
    const newStatus = project.status === "active" ? "completed" : "active";
    await supabase.from("projects").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", project.id);
    setProjects((prev) => prev.map((p) => p.id === project.id ? { ...p, status: newStatus } : p));
  }

  if (loading) return <p className="text-[14px] text-gray-500">로딩 중...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-medium text-gray-900">프로젝트</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-[#3182F6] text-white rounded-xl text-[13px] font-medium hover:bg-[#2272EB] active:scale-[0.98] transition"
        >
          + 새 프로젝트
        </button>
      </div>

      {showForm && (
        <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-5 mb-4">
          <input
            type="text"
            placeholder="프로젝트 이름"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className="w-full px-3.5 py-3 bg-white border-[0.5px] border-gray-200/60 rounded-xl text-[14px] text-gray-900 outline-none mb-3 placeholder:text-gray-400 focus:border-[#3182F6]"
          />
          <textarea
            placeholder="설명 (선택)"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            rows={3}
            className="w-full px-3.5 py-3 bg-white border-[0.5px] border-gray-200/60 rounded-xl text-[14px] text-gray-900 outline-none resize-none mb-3 placeholder:text-gray-400 focus:border-[#3182F6]"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-[13px] text-gray-500 hover:text-gray-700">
              취소
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !form.name.trim()}
              className="px-4 py-2 bg-[#3182F6] text-white rounded-xl text-[13px] font-medium hover:bg-[#2272EB] disabled:opacity-60"
            >
              {creating ? "생성 중..." : "생성"}
            </button>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-8 text-center">
          <p className="text-[14px] text-gray-400">프로젝트가 없습니다</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {projects.map((proj) => (
            <div key={proj.id} className="bg-white border-[0.5px] border-gray-200/60 rounded-2xl p-4 hover:border-gray-300 transition-colors">
              <div className="flex items-center justify-between">
                <Link href={`/manage/projects/${proj.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[15px] font-medium text-gray-900">{proj.name}</p>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                      proj.status === "active" ? "text-[#1D9E75] bg-[#E6F7F1]" :
                      proj.status === "completed" ? "text-[#3182F6] bg-[#E8F3FF]" :
                      "text-gray-500 bg-gray-100"
                    }`}>
                      {proj.status === "active" ? "진행 중" : proj.status === "completed" ? "완료" : "보관"}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B0B8C1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                  {proj.description && (
                    <p className="text-[12px] text-gray-500 mt-1 truncate">{proj.description}</p>
                  )}
                </Link>
                <button
                  onClick={() => toggleStatus(proj)}
                  className="text-[12px] text-gray-400 hover:text-gray-600 ml-3"
                >
                  {proj.status === "active" ? "완료 처리" : "다시 활성화"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
