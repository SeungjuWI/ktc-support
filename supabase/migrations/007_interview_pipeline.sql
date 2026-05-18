-- 1. 기존 constraint 제거
alter table interview_requests drop constraint if exists interview_requests_status_check;

-- 2. 기존 데이터를 새 상태값으로 변환 (constraint 없는 상태에서)
update interview_requests set status = 'received' where status = 'pending';
update interview_requests set status = 'received' where status = 'contacted';
update interview_requests set status = 'onboarded' where status = 'completed';

-- 3. 새 constraint 적용
alter table interview_requests add constraint interview_requests_status_check
  check (status in ('received', 'candidate_check', 'scheduling', 'interviewed', 'offer_accepted', 'onboarded', 'cancelled'));

-- 4. 히스토리/메모 테이블
create table if not exists interview_request_logs (
  id uuid primary key default gen_random_uuid(),
  actor_email text,  request_id uuid references interview_requests(id) on delete cascade not null,

  action text not null,
  note text,
  created_at timestamptz default now()
);

alter table interview_request_logs enable row level security;

create policy "interview_request_logs_admin_read" on interview_request_logs
  for select using (
    exists (select 1 from user_profiles where id = auth.uid() and role in ('admin', 'super_admin'))
  );

create policy "interview_request_logs_admin_insert" on interview_request_logs
  for insert with check (
    exists (select 1 from user_profiles where id = auth.uid() and role in ('admin', 'super_admin'))
  );
