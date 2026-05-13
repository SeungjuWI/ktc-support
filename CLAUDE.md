# CLAUDE.md

> Claude Code가 이 프로젝트에서 작업할 때 반드시 따라야 할 규칙.
> 새 작업을 시작하기 전에 항상 이 문서를 먼저 읽는다.

---

## 1. 프로젝트 개요

- **서비스명**: TalentMarket (가칭) — 베트남 IT 인재 마켓플레이스
- **타겟 유저**: 한국 중소기업 인사담당자
- **핵심 컨셉**: KREAM 그리드 + FIFA 이적시장 능력치 카드. "이력서 읽지 않고 3초 안에 판단"
- **콘텐츠 공급**: KTC 인재 DB + FYI 자가등록 인재
- **MBO**: 인사담당자가 카드 그리드를 보고 "인터뷰 요청" 버튼을 누르게 만드는 것

## 2. 기술 스택

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS (TDS 커스텀 테마)
- **UI Library**: shadcn/ui (필요시), Radix Primitives
- **DB/Auth**: Supabase (Postgres + Row Level Security)
- **배포**: Vercel
- **상태관리**: React Server Components 우선, 클라이언트 상태는 Zustand (필요시만)
- **폰트**: Pretendard Variable (CDN)

## 3. 디자인 시스템 — TDS(토스 디자인 시스템) 기반

> **중요**: CLAUDE.md 초기 버전의 색상 토큰이 아닌, 아래 TDS 기반 토큰을 사용한다.
> 디자인 변경 시 반드시 이 섹션을 기준으로 한다.

핵심 원칙은 **"인사담당자가 50명을 스크롤해도 안 지치게"**.

### 3.1 색상 시스템

#### 키컬러
```
#3182F6 (토스 블루) — 로고, 로그인 버튼, 한국어 별점, 합류 가능 인원 강조
```

#### 그레이스케일 (Toss 10단계)
```
gray-50:  #F9FAFB   ← 페이지 배경
gray-100: #F2F4F6   ← 스킬 태그 배경, 더보기 버튼
gray-200: #E5E8EB   ← 보더, 별점 빈 별
gray-300: #D1D6DB
gray-400: #B0B8C1
gray-500: #8B95A1   ← 라벨, 캡션
gray-600: #6B7684   ← 스킬 태그 텍스트, 정렬 버튼
gray-700: #4E5968   ← 필터 칩 비활성 텍스트
gray-800: #333D4B
gray-900: #191F28   ← 본문, 강조 숫자, 필터 칩 활성 배경
```

#### 블루
```
blue-50:  #E8F3FF   ← 아바타 배경, A등급 뱃지 배경
blue-500: #3182F6   ← 키컬러
blue-600: #2272EB   ← 호버
```

#### 등급 색상
```
S등급: bg #FFF8F0, text #E8590C (따뜻한 오렌지)
A등급: bg #E8F3FF, text #3182F6 (토스 블루)
B·C등급: bg #F2F4F6, text #6B7684 (그레이)
```

#### 상태 색상
```
즉시 합류: #1D9E75
협의 가능: #8B95A1
현직:     #D1D6DB
```

### 3.2 헤더
- sticky 고정, 흰 배경, 높이 56px
- 왼쪽: 블루 체크 아이콘(20x20, rounded-6) + "TalentMarket" (18px, font-medium)
- 오른쪽: "로그인" 블루 텍스트 버튼
- 하단 구분선: 0.5px, gray-200/80

### 3.3 카드 디자인
- **아바타**: 42x42 원형, `blue-50` 배경에 `blue-500` 이니셜 텍스트 (직무 구분 없이 통일)
- **OVR 뱃지**: rounded-full, 12px font-medium, 등급별 배경/텍스트 색상 (예: "S 89")
- **스킬 표시**: 태그(pill) 형태 — `gray-100` 배경, `gray-600` 텍스트, rounded-full, 11px
- **한국어 별점**: SVG 별 아이콘 10x10, 채워진 별 `#3182F6`(토스 블루), 빈 별 `#E5E8EB`
- **연봉**: `$2,500` 형식 (toLocaleString), 13px font-medium
- **상태 점**: 5x5 원형 + 11px 라벨 텍스트
- **구분선**: 하단 영역만 `border-t border-gray-100`
- **hover**: `border-gray-300`으로 살짝 진해짐 + `active:scale-[0.98]` 눌림 피드백
- **employed 카드**: `opacity-[0.72]`
- **카드 자체**: padding 16px, radius 16px (`rounded-2xl`), border `0.5px solid gray-200/60`

### 3.4 필터 칩
- 활성: `gray-900` 배경 + 흰 텍스트
- 비활성: 흰 배경 + `0.5px border-gray-200` + `gray-700` 텍스트, hover 시 보더 진해짐
- 모두 `rounded-full`, 13px, padding `7px 14px`

### 3.5 그리드
- `grid-cols-2 sm:grid-cols-3 md:grid-cols-4`, gap `10px`
- 최대 너비 `1080px`, 좌우 패딩 `20px`

### 3.6 인터랙션
- 트랜지션: `duration-100`, `ease-in-out`
- 탭 하이라이트: `-webkit-tap-highlight-color: transparent`
- 그림자/그라데이션/애니메이션 없음

### 3.7 타이포그래피
- **폰트**: Pretendard Variable (CDN)
- **weight**: 400(기본), 500(medium)만 사용. **700 이상 금지**

| 용도 | 크기 | weight | 색상 |
|------|------|--------|------|
| 페이지 타이틀 | 22px | 500 | gray-900 |
| 카드 직무명 | 15px | 500 | gray-900 |
| OVR 숫자 | 13px | 500 | grade-color |
| 연봉 숫자 | 13px | 500 | gray-900 |
| 부가 정보 (연차/지역) | 12px | 400 | gray-500 |
| 라벨 ("핵심 스킬", "한국어") | 11px | 400 | gray-500 |
| 스킬 태그 | 11px | 400 | gray-600 |

## 4. UX 규칙

### 4.1 익명성 우선
- 이름은 이니셜만 (예: "T.N")
- 이전 소속은 티어로만 표기
- 사진은 V2 이후 (MVP는 이니셜 아바타)
- 실명/회사명은 인터뷰 요청 결제 후에만 공개

### 4.2 상태별 시각 처리
- **즉시 합류**: 정상 표시 + 초록 점
- **협의 가능**: 정상 표시 + 회색 점
- **현직 (Passive)**: `opacity: 0.72`로 흐리게

### 4.3 액션은 두 개뿐
- **찜(하트)**: 무료, 로컬 저장 → 로그인 시 동기화
- **인터뷰 요청**: 유료. MVP는 클릭 → Slack/이메일로 KTC 운영팀에 알림

## 5. 데이터 모델 (Supabase 스키마 초안)

```sql
create table talents (
  id uuid primary key default gen_random_uuid(),
  initials text not null,
  role text not null,
  years_exp int not null,
  location text not null,
  ovr_score int not null,
  ovr_grade text not null,
  top_skills text[] not null,
  korean_level int not null,
  english_level int,
  desired_salary_usd int not null,
  availability text not null,
  previous_tier text,
  detailed_skills jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table talent_favorites (
  user_id uuid references auth.users(id) not null,
  talent_id uuid references talents(id) not null,
  created_at timestamptz default now(),
  primary key (user_id, talent_id)
);

create table interview_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  talent_id uuid references talents(id) not null,
  company_name text not null,
  contact_email text not null,
  message text,
  status text default 'pending',
  created_at timestamptz default now()
);
```

## 6. Claude Code 작업 규칙

### 6.1 매 작업 시작 전
1. 이 CLAUDE.md를 다시 읽는다
2. 작업 범위를 한 문장으로 정의한다
3. **UI/UX-only 작업과 로직 작업을 절대 섞지 않는다**

### 6.2 디자인 충실도
- 위 3번 섹션(TDS 기반 디자인 시스템)의 토큰을 정확히 따른다
- 임의로 색/사이즈 바꾸지 않는다
- 새 색을 추가하기 전에 기존 토큰으로 가능한지 먼저 확인한다
- 그림자, 그라데이션, 애니메이션은 명시적 요청이 있을 때만

### 6.3 코드 구조
- 컴포넌트는 `app/components/` 아래에 기능별 폴더
- 데이터 fetching은 Server Component에서, 인터랙션만 `'use client'`
- 더미 데이터는 `lib/dummy-talents.ts`에 분리

### 6.4 금지 사항
- shadow 사용 금지
- font-weight 700 이상 사용 금지
- 카드에 이름/회사명/학력 노출 금지 (익명성 원칙)
- 영문 UI 카피 금지 — 이 프로젝트는 한국어 UI
- shadcn/ui 기본 색상 그대로 쓰지 않는다 (TDS 토큰으로 오버라이드)

### 6.5 작업 완료 보고
완료 시 다음을 명확히 보고한다:
- 만든/수정한 파일 경로
- 추가한 의존성 (있다면)
- 다음 작업으로 자연스럽게 이어질 후보 2-3개

## 7. MVP 범위

**1차 (2주):**
- [x] 메인 그리드 화면
- [ ] 필터 3개: 직무 / 경력 / 한국어 가능 여부
- [ ] 상세 페이지 (FIFA 능력치 카드)
- [ ] 찜 기능 (로컬 저장)
- [ ] 인터뷰 요청 모달 → 이메일 발송

**의도적으로 1차에서 빼는 것:**
- 결제 연동, 인재 자가 등록 폼, 실시간 채팅, AI 추천, 사진

## 8. 검증할 단 하나의 가설

> **한국 중소기업 인사담당자가 이 카드 그리드를 보고 "인터뷰 요청" 버튼을 누를 것인가.**
