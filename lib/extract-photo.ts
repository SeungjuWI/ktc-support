import type { SupabaseClient } from "@supabase/supabase-js";

// PDF에서 JPEG 이미지 추출 (프로필 사진은 보통 첫 번째 JPEG)
function extractJpegFromPdf(pdfBuffer: Buffer): Buffer | null {

  let startIdx = -1;
  let found: Buffer | null = null;

  for (let i = 0; i < pdfBuffer.length - 3; i++) {
    if (
      pdfBuffer[i] === 0xff &&
      pdfBuffer[i + 1] === 0xd8 &&
      pdfBuffer[i + 2] === 0xff
    ) {
      startIdx = i;
      break;
    }
  }

  if (startIdx === -1) return null;

  // JPEG 끝 찾기
  for (let i = startIdx + 3; i < pdfBuffer.length - 1; i++) {
    if (pdfBuffer[i] === 0xff && pdfBuffer[i + 1] === 0xd9) {
      found = pdfBuffer.subarray(startIdx, i + 2);
      break;
    }
  }

  if (!found) return null;

  // 너무 작으면(아이콘 등) 스킵, 너무 크면(페이지 전체 이미지) 스킵
  // 프로필 사진은 보통 5KB ~ 500KB
  if (found.length < 5000 || found.length > 500000) {
    // 첫 번째가 아이콘이면 다음 JPEG 찾기
    for (let i = startIdx + found.length; i < pdfBuffer.length - 3; i++) {
      if (
        pdfBuffer[i] === 0xff &&
        pdfBuffer[i + 1] === 0xd8 &&
        pdfBuffer[i + 2] === 0xff
      ) {
        for (let j = i + 3; j < pdfBuffer.length - 1; j++) {
          if (pdfBuffer[j] === 0xff && pdfBuffer[j + 1] === 0xd9) {
            const nextJpeg = pdfBuffer.subarray(i, j + 2);
            if (nextJpeg.length >= 5000 && nextJpeg.length <= 500000) {
              return nextJpeg;
            }
            break;
          }
        }
      }
    }
    // 적절한 크기 못 찾으면 원래 것이라도 반환 (5KB 이상이면)
    if (found.length >= 5000) return found;
    return null;
  }

  return found;
}

export async function extractAndUploadPhoto(
  supabase: SupabaseClient,
  pdfBuffer: Buffer,
  talentId: string
): Promise<string | null> {
  const jpeg = extractJpegFromPdf(pdfBuffer);
  if (!jpeg) return null;

  const fileName = `${talentId}.jpg`;
  const { error } = await supabase.storage
    .from("talent-photos")
    .upload(fileName, jpeg, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (error) {
    console.error("Photo upload failed:", error.message);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from("talent-photos")
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}
