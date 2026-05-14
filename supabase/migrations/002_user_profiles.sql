-- user_profiles 테이블: 가입 승인 관리
create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  avatar_url text,
  role text not null default 'user' check (role in ('admin', 'user')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS 활성화
alter table user_profiles enable row level security;

-- 본인 프로필 읽기
create policy "user_profiles_self_read" on user_profiles
  for select using (auth.uid() = id);

-- admin은 모든 프로필 읽기
create policy "user_profiles_admin_read" on user_profiles
  for select using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- admin은 프로필 업데이트 가능 (승인/거절)
create policy "user_profiles_admin_update" on user_profiles
  for update using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 신규 가입 시 자동 프로필 생성 트리거
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email, name, avatar_url, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', ''),
    case when new.email = 'wsj@likelion.net' then 'admin' else 'user' end,
    case when new.email = 'wsj@likelion.net' then 'approved' else 'pending' end
  );
  return new;
end;
$$ language plpgsql security definer;

-- 트리거 등록 (이미 있으면 교체)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
