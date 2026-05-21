-- 이메일 메시지 테이블 (어드민 메시지 센터)
create table email_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null,
  direction text not null check (direction in ('outbound', 'inbound')),
  from_email text not null,
  to_email text not null,
  to_name text,
  subject text not null,
  body_html text not null,
  body_text text,
  sent_by uuid references auth.users(id),
  read_at timestamptz,
  created_at timestamptz default now()
);

create index idx_email_messages_thread on email_messages(thread_id);
create index idx_email_messages_created on email_messages(created_at desc);
create index idx_email_messages_direction on email_messages(direction);
