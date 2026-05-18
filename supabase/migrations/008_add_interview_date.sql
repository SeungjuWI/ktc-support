-- interview_requests에 면접 예정일 컬럼 추가
alter table interview_requests add column if not exists interview_date date;
