-- ============================================================================
-- VTM Interview System - Migration 012
-- Adds AI voice interview feature for KTC R3 phone interview replacement
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. interview_questions: 질문 마스터 (7개 row만 들어감, 사전 고정)
-- ----------------------------------------------------------------------------
create table if not exists interview_questions (
  id text primary key,                              -- "q1_language", "q2_motivation" ...
  order_num int not null unique,
  category text not null,                           -- "Language", "Motivation", ...
  question_text_en text,
  question_text_vi text,
  question_text_ko text,                            -- 어드민 표시용
  tts_audio_path text,                              -- Storage path (예: "tts/q1_language.mp3")
  max_duration_seconds int default 60,
  rubric jsonb not null,                            -- { "1-3": "...", "4-6": "...", "7-10": "..." }
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 2. interview_sessions: 지원자 1명 = 1 row
-- ----------------------------------------------------------------------------
create table if not exists interview_sessions (
  id uuid primary key default gen_random_uuid(),
  access_code text unique not null,
  candidate_name text,
  candidate_email text,
  candidate_phone text,
  status text default 'pending' check (status in ('pending','in_progress','completed','scored','failed')),
  created_by uuid references auth.users(id) on delete set null,   -- 발급한 어드민
  started_at timestamptz,
  completed_at timestamptz,
  total_score int,                                  -- 0~70 (7문항 × 10점)
  ai_summary text,                                  -- GPT 종합 코멘트
  human_review_note text,                           -- 어드민 직접 입력
  human_decision text check (human_decision in ('pass','fail','hold')),
  human_reviewed_by uuid references auth.users(id) on delete set null,
  human_reviewed_at timestamptz,
  user_agent text,
  ip_address text,
  created_at timestamptz default now()
);

create index if not exists idx_interview_sessions_status on interview_sessions(status);
create index if not exists idx_interview_sessions_access_code on interview_sessions(access_code);
create index if not exists idx_interview_sessions_created_by on interview_sessions(created_by);

-- ----------------------------------------------------------------------------
-- 3. interview_responses: 질문별 답변
-- ----------------------------------------------------------------------------
create table if not exists interview_responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references interview_sessions(id) on delete cascade,
  question_id text not null references interview_questions(id),
  question_order int not null,
  audio_storage_path text,                          -- "sessions/{session_id}/{question_id}.webm"
  transcript text,                                  -- Whisper 결과
  transcript_language text,                         -- 'vi' or 'en'
  score int check (score >= 1 and score <= 10),
  score_reasoning text,                             -- GPT 채점 사유
  duration_seconds int,
  submitted_at timestamptz default now(),
  unique(session_id, question_id)
);

create index if not exists idx_interview_responses_session on interview_responses(session_id);

-- ----------------------------------------------------------------------------
-- 4. updated_at 자동 갱신 트리거
-- ----------------------------------------------------------------------------
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_interview_questions_updated_at on interview_questions;
create trigger trg_interview_questions_updated_at
  before update on interview_questions
  for each row execute function update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 5. RLS 정책
-- ----------------------------------------------------------------------------
alter table interview_questions enable row level security;
alter table interview_sessions enable row level security;
alter table interview_responses enable row level security;

-- 질문은 anon에게 read 허용 (지원자 페이지에서 조회 필요)
drop policy if exists "Public read active questions" on interview_questions;
create policy "Public read active questions"
  on interview_questions for select
  using (is_active = true);

-- sessions, responses는 anon 차단 (service_role만 접근)

-- ----------------------------------------------------------------------------
-- 6. Storage Bucket 생성 (private)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('interviews', 'interviews', false)
on conflict (id) do nothing;
