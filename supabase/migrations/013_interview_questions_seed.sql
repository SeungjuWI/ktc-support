-- ============================================================================
-- Interview Questions Seed - 7 questions based on R3 Phone Interview Scorecard
-- ============================================================================

insert into interview_questions (id, order_num, category, question_text_en, question_text_vi, question_text_ko, max_duration_seconds, rubric, is_active)
values
-- Q1: Language
(
  'q1_language',
  1,
  'Language',
  'Please briefly introduce yourself in English. Include your name, education, recent work or study experience, and why you are interested in working at a Korean company.',
  'Vui lòng giới thiệu bản thân ngắn gọn bằng tiếng Anh. Bao gồm tên, học vấn, kinh nghiệm làm việc hoặc học tập gần đây, và lý do bạn quan tâm đến việc làm tại công ty Hàn Quốc.',
  '영어로 간단히 자기소개 (이름, 학력, 최근 경험, 한국 기업에 관심 있는 이유)',
  90,
  '{
    "1-3": "Cannot speak English, or only 1 sentence introduction",
    "4-6": "2-3 sentences but unclear pronunciation, not fluent",
    "7-10": "Concise, complete information, confident and fluent"
  }'::jsonb,
  true
),

-- Q2: Motivation
(
  'q2_motivation',
  2,
  'Motivation',
  'How did you hear about the KTC program (which channel)? What is your reason or expectation when applying? Please answer in Vietnamese.',
  'Bạn biết đến chương trình KTC qua kênh nào? Lý do và kỳ vọng của bạn khi ứng tuyển là gì? Vui lòng trả lời bằng tiếng Việt.',
  'KTC 인지 경로 + 지원 동기/기대 (베트남어 답변)',
  60,
  '{
    "1-3": "No direction, vague answer, lack of seriousness",
    "4-6": "Basic direction, mentions desired role/skill but not specific",
    "7-10": "Clear career goal, fits the position/company, shows long-term thinking"
  }'::jsonb,
  true
),

-- Q3: Role Fit / Skill
(
  'q3_role_fit',
  3,
  'Role Fit / Skill',
  'Tell me about a recent project or task you worked on. What specifically did you do in it? Please share the context, your role, your tasks, and the result with specific examples. Answer in Vietnamese.',
  'Hãy kể về một project hoặc task gần đây bạn đã làm. Bạn đã làm gì cụ thể trong đó? Hãy chia sẻ bối cảnh, vai trò, nhiệm vụ và kết quả với ví dụ cụ thể. Trả lời bằng tiếng Việt.',
  '최근 프로젝트/태스크 — 본인 역할 + 구체적 결과 (베트남어 답변)',
  90,
  '{
    "1-3": "Cannot describe project/role clearly, vague about what they did",
    "4-6": "Describes project/task but unclear contribution, no result/impact",
    "7-10": "Clear context, specific role, concrete tasks, results/impact, explains why"
  }'::jsonb,
  true
),

-- Q4: Achievement
(
  'q4_achievement',
  4,
  'Achievement',
  'Could you share an achievement you are most proud of in your work or study? Please describe what you did, your role, the result, and what you learned. Answer in Vietnamese.',
  'Hãy chia sẻ điều bạn tự hào nhất trong công việc hoặc học tập. Mô tả bạn đã làm gì, vai trò của bạn, kết quả, và bạn đã học được gì. Trả lời bằng tiếng Việt.',
  '가장 자랑스러운 성취 — 역할 + 결과 + 배운 점 (베트남어 답변)',
  90,
  '{
    "1-3": "No achievement (even school projects)",
    "4-6": "Describes achievement but unclear personal role and details",
    "7-10": "Detailed achievement with personal role, results, and lessons learned"
  }'::jsonb,
  true
),

-- Q5: Culture Fit / Teamwork
(
  'q5_culture_fit',
  5,
  'Culture Fit / Teamwork',
  'Have you worked in an international environment, especially with Korean colleagues? If YES, what differences did you notice between Vietnamese and Korean work culture? If NO, what do you think the differences might be, and how would you adapt? Answer in Vietnamese.',
  'Bạn đã từng làm việc trong môi trường quốc tế, đặc biệt với đồng nghiệp Hàn Quốc chưa? Nếu CÓ, bạn nhận thấy sự khác biệt giữa văn hóa làm việc Việt Nam và Hàn Quốc là gì? Nếu CHƯA, bạn nghĩ sự khác biệt có thể là gì và bạn sẽ thích nghi như thế nào? Trả lời bằng tiếng Việt.',
  '한국-베트남 문화 차이 경험 또는 이해 + 적응 방법 (베트남어 답변)',
  90,
  '{
    "1-3": "No specific differences mentioned, generic answer like ''I don''t know''",
    "4-6": "Mentions 1-2 differences with examples but not deep, or has basic understanding",
    "7-10": "Clear analysis with real experience and adaptation strategy, OR shows preparation, multiple perspectives, open mindset, and adaptation approach"
  }'::jsonb,
  true
),

-- Q6: Certificates
(
  'q6_certificates',
  6,
  'Certificates',
  'Do you have any English or Korean language certificates? Please mention the certificate name and score if applicable. You may also briefly mention other relevant qualifications.',
  'Bạn có chứng chỉ tiếng Anh hoặc tiếng Hàn nào không? Vui lòng nói tên chứng chỉ và điểm số nếu có. Bạn cũng có thể đề cập ngắn gọn các bằng cấp liên quan khác.',
  '영어/한국어 자격증 정보 (영어 답변, 짧게)',
  45,
  '{
    "1-3": "No answer or cannot understand the question",
    "4-6": "Answers but unclear or incomplete information",
    "7-10": "Clear answer with specific certificates/scores, confident delivery"
  }'::jsonb,
  true
),

-- Q7: Strength & Growth
(
  'q7_strength_weakness',
  7,
  'Self-awareness / Communication',
  'What is your biggest strength that would help you succeed at KTC, and what is one area you want to improve? Please give specific examples. Answer in Vietnamese.',
  'Điểm mạnh lớn nhất giúp bạn thành công tại KTC là gì, và một điểm bạn muốn cải thiện là gì? Vui lòng đưa ra ví dụ cụ thể. Trả lời bằng tiếng Việt.',
  '강점 + 개선하고 싶은 점 (베트남어 답변)',
  75,
  '{
    "1-3": "Shy, unclear, generic platitudes only",
    "4-6": "Clear answer with adequate information",
    "7-10": "Confident, fluent, specific examples, shows self-awareness and growth mindset"
  }'::jsonb,
  true
)
on conflict (id) do update set
  question_text_en = excluded.question_text_en,
  question_text_vi = excluded.question_text_vi,
  question_text_ko = excluded.question_text_ko,
  rubric = excluded.rubric,
  max_duration_seconds = excluded.max_duration_seconds,
  category = excluded.category,
  order_num = excluded.order_num;
