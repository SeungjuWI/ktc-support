export type OvrGrade = "S" | "A" | "B" | "C";
export type Availability = "immediate" | "negotiable" | "employed";
export type PreviousTier = "tier1_kr" | "tier2_kr" | "tier1_vn" | "tier2_vn";

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
  english_level?: number;
  desired_salary_usd: number;
  availability: Availability;
  previous_tier?: PreviousTier;
  detailed_skills?: Record<string, number>;
  created_at: string;
  updated_at: string;
}
