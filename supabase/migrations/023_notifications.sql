-- ============================================
-- 023: 알림 시스템
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'task_assigned', 'task_comment', 'task_status', 'invite_accepted'
  title text NOT NULL,
  body text,
  link text, -- 클릭 시 이동할 경로
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 본인 알림만 읽기/수정
CREATE POLICY "notifications_self_read" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_self_update" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- 시스템(서비스 키) 또는 같은 회사 멤버가 insert 가능
CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT WITH CHECK (true);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, is_read) WHERE is_read = false;
