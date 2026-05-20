-- interview_sessions에 abandoned 상태 추가
ALTER TABLE interview_sessions DROP CONSTRAINT IF EXISTS interview_sessions_status_check;
ALTER TABLE interview_sessions ADD CONSTRAINT interview_sessions_status_check
  CHECK (status IN ('pending','in_progress','completed','scored','failed','abandoned'));
