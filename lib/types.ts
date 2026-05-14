export type OvrGrade = "S" | "A" | "B" | "C";
export type Availability = "immediate" | "negotiable" | "employed";

export interface DetailedSkill {
  name: string;
  score: number;
  type: "core" | "sub";
}

export interface CareerEntry {
  tier: string;
  position: string;
  startDate: string;
  endDate: string | "current";
  current: boolean;
}

export interface Abilities {
  technical: number;
  korean: number;
  english: number;
  collaboration: number;
  stability: number;
  growth: number;
}

export interface Talent {
  id: string;
  initials: string;
  role: string;
  years_exp: number;
  location: string;
  ovr_score: number;
  ovr_grade: OvrGrade;
  top_skills: [string, string];
  korean_level: 1 | 2 | 3 | 4 | 5;
  desired_salary_krw: number; // 만원 단위 (월급)
  availability: Availability;
  ktc_comment: string;
  abilities: Abilities;
  detailed_skills: DetailedSkill[];
  career_history: CareerEntry[];
  tags: string[];
}
