"use server";

import { revalidatePath } from "next/cache";
import { getKnowledgeBase, saveKnowledgeBase } from "@/lib/notification-storage";
import { DEFAULT_KNOWLEDGE_BASE, searchKnowledgeBase } from "@/lib/knowledge-base";
import type { KnowledgeBase } from "@/types";

export async function getKnowledge(): Promise<KnowledgeBase> {
  return getKnowledgeBase();
}

export async function searchKnowledge(query: string): Promise<string> {
  const kb = await getKnowledgeBase();
  return searchKnowledgeBase(query, kb);
}

export async function updateKnowledge(kb: KnowledgeBase): Promise<{ success: boolean }> {
  await saveKnowledgeBase(kb);
  revalidatePath("/knowledge");
  return { success: true };
}

export async function resetKnowledge(): Promise<{ success: boolean; kb: KnowledgeBase }> {
  await saveKnowledgeBase(DEFAULT_KNOWLEDGE_BASE);
  revalidatePath("/knowledge");
  return { success: true, kb: DEFAULT_KNOWLEDGE_BASE };
}
