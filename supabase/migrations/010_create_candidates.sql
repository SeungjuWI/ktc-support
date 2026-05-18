-- 후보자 파이프라인 테이블 (구글 시트에서 유입된 원본 데이터)
create table candidates (
  id uuid primary key default gen_random_uuid(),

  -- 기본 정보 (시트에서 매핑)
  full_name text not null,
  email text,
  phone text,
  city text,
  university text,
  graduation_year text,
  position text,
  yoe text,
  cv_url text,
  portfolio_url text,
  skills text,

  -- 지원 정보
  source text not null,            -- glint, ITviec-api, landing-page, LinkedIn, top-dev, YBOX 등
  applied_date text,
  applied_job text,
  applied_company text,

  -- 파이프라인 상태
  pipeline_status text not null default 'new',
  -- new: 신규 지원
  -- reviewing: 서류 검토중
  -- phone_interview_pending: 폰인터뷰 대기
  -- phone_interview_done: 폰인터뷰 완료
  -- passed: 합격 (인재 카드 생성 대상)
  -- rejected: 불합격

  -- 폰인터뷰 관련
  phone_interview_date timestamptz,
  phone_interview_note text,
  phone_interviewer text,
  rejection_reason text,

  -- LLM 스크리닝 (나중에 사용)
  llm_score int,
  llm_summary text,

  -- 인재 카드 연결 (검증 완료 후 생성된 talent id)
  talent_id uuid references talents(id),

  -- 시트 원본 식별 (중복 방지)
  sheet_source text,               -- 탭 이름
  sheet_row_identifier text,       -- email 또는 고유 ID

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 중복 유입 방지 인덱스
create unique index candidates_sheet_unique on candidates(sheet_source, sheet_row_identifier) where sheet_row_identifier is not null;

-- 파이프라인 상태 조회 인덱스
create index candidates_pipeline_status on candidates(pipeline_status);
