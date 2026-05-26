-- ============================================
-- 022: 직원 초대 + 태스크 댓글
-- ============================================

-- 1) company_invites 테이블
CREATE TABLE IF NOT EXISTS company_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('company_admin', 'employee')),
  invited_by uuid REFERENCES user_profiles(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (company_id, email)
);

ALTER TABLE company_invites ENABLE ROW LEVEL SECURITY;

-- company_admin은 자기 회사 초대 읽기/생성
CREATE POLICY "invites_company_admin_read" ON company_invites
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'company_admin' AND company_id = company_invites.company_id)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "invites_company_admin_insert" ON company_invites
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'company_admin' AND company_id = company_invites.company_id)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "invites_company_admin_update" ON company_invites
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'company_admin' AND company_id = company_invites.company_id)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "invites_company_admin_delete" ON company_invites
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'company_admin' AND company_id = company_invites.company_id)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- 2) task_comments 테이블
CREATE TABLE IF NOT EXISTS task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- 같은 회사 멤버만 읽기/쓰기
CREATE POLICY "task_comments_read" ON task_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN user_profiles up ON up.id = auth.uid()
      WHERE t.id = task_comments.task_id AND up.company_id = t.company_id
    )
  );

CREATE POLICY "task_comments_insert" ON task_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM tasks t
      JOIN user_profiles up ON up.id = auth.uid()
      WHERE t.id = task_comments.task_id AND up.company_id = t.company_id
    )
  );

CREATE POLICY "task_comments_delete" ON task_comments
  FOR DELETE USING (
    auth.uid() = user_id
  );
