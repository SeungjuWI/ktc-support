export interface InterviewRequest {
  id: string;
  talentId: string;
  talentSnapshot: {
    initials: string;
    role: string;
    yearsExp: number;
    ovrGrade: "S" | "A" | "B" | "C";
    ovrScore: number;
    desiredSalaryKrw: number;
  };
  requesterSnapshot: {
    companyName: string;
    contactName: string;
    contactEmail: string;
  };
  message: string;
  createdAt: string;
  status: "pending";
}

const STORAGE_KEY = "talent-market:interview-requests";

export function getAllRequests(): InterviewRequest[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function hasRequestedTalent(talentId: string): boolean {
  return getAllRequests().some((r) => r.talentId === talentId);
}

export function saveRequest(
  req: Omit<InterviewRequest, "id" | "createdAt" | "status">
): InterviewRequest {
  const newRequest: InterviewRequest = {
    ...req,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: "pending",
  };
  const all = getAllRequests();
  all.push(newRequest);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));

  console.log("[InterviewRequest]", {
    talentId: newRequest.talentId,
    talentOVR: newRequest.talentSnapshot.ovrScore,
    talentRole: newRequest.talentSnapshot.role,
    timestamp: newRequest.createdAt,
  });

  return newRequest;
}
