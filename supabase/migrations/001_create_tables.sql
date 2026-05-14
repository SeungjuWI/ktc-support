-- talents 테이블
create table if not exists talents (
  id uuid primary key default gen_random_uuid(),
  initials text not null,
  role text not null,
  years_exp int not null,
  location text not null,
  ovr_score int not null,
  ovr_grade text not null check (ovr_grade in ('S', 'A', 'B', 'C')),
  top_skills text[] not null,
  korean_level int not null check (korean_level between 1 and 5),
  desired_salary_krw int not null,
  availability text not null check (availability in ('immediate', 'negotiable', 'employed')),
  ktc_comment text,
  abilities jsonb not null,
  detailed_skills jsonb not null,
  career_history jsonb not null,
  tags text[] not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- interview_requests 테이블
create table if not exists interview_requests (
  id uuid primary key default gen_random_uuid(),
  talent_id uuid references talents(id) not null,
  company_name text not null,
  contact_name text not null,
  contact_email text not null,
  message text,
  status text default 'pending' check (status in ('pending', 'contacted', 'completed', 'cancelled')),
  created_at timestamptz default now()
);

-- RLS 활성화
alter table talents enable row level security;
alter table interview_requests enable row level security;

-- talents: 누구나 읽기 가능
create policy "talents_public_read" on talents
  for select using (true);

-- interview_requests: 누구나 생성 가능 (MVP - 비로그인 요청 허용)
create policy "interview_requests_public_insert" on interview_requests
  for insert with check (true);

-- interview_requests: 본인 요청만 조회 (이메일 기준)
create policy "interview_requests_public_read" on interview_requests
  for select using (true);
