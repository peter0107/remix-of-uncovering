import { supabase } from "@/integrations/supabase/client";

const BUCKET = "mission-materials";

function makePath(prefix: string, file: File) {
  const ext = file.name.split(".").pop() || "png";
  return `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

export async function uploadMissionContentImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("이미지 파일만 업로드할 수 있습니다.");
  }

  const path = makePath("rich-text-images", file);
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
