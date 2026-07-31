import { KnowledgeAdminView } from "@/components/knowledge/knowledge-admin";

export const metadata = {
  title: "Knowledge Base | CIPACA AI",
  description: "Manage hospital knowledge base",
};

export default function KnowledgePage() {
  return <KnowledgeAdminView />;
}
