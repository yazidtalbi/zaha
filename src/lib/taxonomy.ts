// lib/taxonomy.ts
import { supabase } from "@/lib/supabaseClient";

export async function suggestCategoriesFromTitle(
  title: string,
  lang: "en" | "ar" | "fr" = "en"
) {
  if (!title || title.trim().length < 3) return [];
  const { data, error } = await supabase.rpc("suggest_categories", {
    title_text: title,
    lang,
    max_results: 6,
  });
  if (error) {
    console.error(error);
    return [];
  }
  return data as Array<{
    category_id: string;
    name: string;
    path: string;
    score: number;
  }>;
}
