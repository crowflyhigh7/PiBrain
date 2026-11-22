export type SourceType = 'web' | 'pdf' | 'note';

export interface Document {
  id: string;
  title: string;
  source_type: SourceType;
  source_url: string | null;
  raw_content: string;
  summary: string | null;
  created_at: string;
  tags?: Tag[];
  backlinks_count?: number;
  linked_documents?: DocumentLinkInfo[];
}

export interface DocumentLinkInfo {
  link_id: string;
  linked_doc_id: string;
  title: string;
  source_type: SourceType;
  similarity_score: number | null;
  link_type: 'auto' | 'manual';
  is_outgoing: boolean;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  page_number: number | null;
  content: string;
  embedding?: number[];
}

export interface Tag {
  id: string;
  name: string;
  created_at?: string;
  count?: number;
}

export interface DocumentTag {
  document_id: string;
  tag_id: string;
}

export interface DocumentLink {
  id: string;
  source_doc_id: string;
  target_doc_id: string;
  similarity_score: number | null;
  link_type: 'auto' | 'manual';
  created_at: string;
  target_title?: string;
  target_type?: SourceType;
}

export interface MatchedChunk {
  id: string;
  document_id: string;
  title: string;
  chunk_index: number;
  page_number: number | null;
  content: string;
  similarity: number;
}

export interface GraphNode {
  id: string;
  name: string;
  title: string;
  source_type: SourceType;
  summary: string | null;
  val: number; // 노드 크기 (연결 수에 비례)
}

export interface GraphLink {
  source: string;
  target: string;
  similarity: number | null;
  type: 'auto' | 'manual';
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface Citation {
  docId: string;
  title: string;
  page?: number | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  created_at: string;
}
