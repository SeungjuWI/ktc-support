-- rejected(불합격) 상태 추가
alter table interview_requests drop constraint if exists interview_requests_status_check;
alter table interview_requests add constraint interview_requests_status_check
  check (status in ('received', 'candidate_check', 'scheduling', 'interviewed', 'offer_accepted', 'onboarded', 'cancelled', 'rejected'));
