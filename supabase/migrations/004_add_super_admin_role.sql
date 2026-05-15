-- role 체크 제약 조건 변경: super_admin 추가
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check CHECK (role IN ('user', 'admin', 'super_admin'));

-- wsj@likelion.net을 super_admin으로 변경
UPDATE user_profiles SET role = 'super_admin' WHERE email = 'wsj@likelion.net';

-- 트리거 함수 업데이트: wsj@likelion.net은 super_admin
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, name, avatar_url, role, status)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', ''),
    CASE WHEN new.email = 'wsj@likelion.net' THEN 'super_admin' ELSE 'user' END,
    CASE WHEN new.email = 'wsj@likelion.net' THEN 'approved' ELSE 'pending' END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS 정책 업데이트: admin + super_admin 모두 프로필 읽기/수정 가능
DROP POLICY IF EXISTS "user_profiles_admin_read" ON user_profiles;
CREATE POLICY "user_profiles_admin_read" ON user_profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "user_profiles_admin_update" ON user_profiles;
CREATE POLICY "user_profiles_admin_update" ON user_profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- talents RLS도 업데이트
DROP POLICY IF EXISTS "talents_admin_insert" ON talents;
CREATE POLICY "talents_admin_insert" ON talents
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "talents_admin_update" ON talents;
CREATE POLICY "talents_admin_update" ON talents
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "talents_admin_delete" ON talents;
CREATE POLICY "talents_admin_delete" ON talents
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );
