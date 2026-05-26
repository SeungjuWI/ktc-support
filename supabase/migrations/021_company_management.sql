-- ============================================
-- 021: 기업 관리 시스템 (PM 확장)
-- ============================================

-- 1) role 체크 제약 조건 확장: company_admin, employee 추가
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('user', 'admin', 'super_admin', 'company_admin', 'employee'));

-- 2) companies 테이블
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- 3) user_profiles에 company_id 추가
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);

-- 4) projects 테이블
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 5) tasks 테이블
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assignee_id uuid REFERENCES user_profiles(id),
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date date,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 6) attendance 출퇴근 테이블
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  check_in timestamptz NOT NULL DEFAULT now(),
  check_out timestamptz,
  note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- 7) daily_reports 일일 보고
CREATE TABLE IF NOT EXISTS daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, report_date)
);

ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS 정책
-- ============================================

-- companies: 같은 회사 멤버만 읽기, company_admin만 수정
CREATE POLICY "companies_member_read" ON companies
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND company_id = companies.id)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "companies_admin_insert" ON companies
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "companies_admin_update" ON companies
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND (
      (role = 'company_admin' AND company_id = companies.id)
      OR role IN ('admin', 'super_admin')
    ))
  );

-- projects: 같은 회사 멤버만 읽기, company_admin만 생성/수정
CREATE POLICY "projects_member_read" ON projects
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND company_id = projects.company_id)
  );

CREATE POLICY "projects_company_admin_write" ON projects
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'company_admin' AND company_id = projects.company_id)
  );

CREATE POLICY "projects_company_admin_update" ON projects
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'company_admin' AND company_id = projects.company_id)
  );

CREATE POLICY "projects_company_admin_delete" ON projects
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'company_admin' AND company_id = projects.company_id)
  );

-- tasks: 같은 회사 멤버 읽기, company_admin + 본인 태스크 수정
CREATE POLICY "tasks_member_read" ON tasks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND company_id = tasks.company_id)
  );

CREATE POLICY "tasks_company_admin_write" ON tasks
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'company_admin' AND company_id = tasks.company_id)
  );

CREATE POLICY "tasks_update" ON tasks
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND company_id = tasks.company_id
      AND (role = 'company_admin' OR id = tasks.assignee_id))
  );

CREATE POLICY "tasks_company_admin_delete" ON tasks
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'company_admin' AND company_id = tasks.company_id)
  );

-- attendance: 본인 기록 + company_admin은 같은 회사 전체
CREATE POLICY "attendance_self_read" ON attendance
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'company_admin' AND company_id = attendance.company_id)
  );

CREATE POLICY "attendance_self_insert" ON attendance
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

CREATE POLICY "attendance_self_update" ON attendance
  FOR UPDATE USING (
    auth.uid() = user_id
  );

-- daily_reports: 본인 기록 + company_admin은 같은 회사 전체
CREATE POLICY "daily_reports_read" ON daily_reports
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'company_admin' AND company_id = daily_reports.company_id)
  );

CREATE POLICY "daily_reports_self_insert" ON daily_reports
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

CREATE POLICY "daily_reports_self_update" ON daily_reports
  FOR UPDATE USING (
    auth.uid() = user_id
  );
