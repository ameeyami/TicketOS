-- Semantic KB search: pgvector embeddings on knowledge articles + a cosine
-- similarity match function. Embeddings are optional — when no embeddings exist
-- (no Voyage key), Ask falls back to keyword retrieval. Re-runnable.

create extension if not exists vector;

alter table public.knowledge_articles
  add column if not exists embedding vector(1024);

create index if not exists knowledge_articles_embedding_idx
  on public.knowledge_articles using hnsw (embedding vector_cosine_ops);

create or replace function public.match_knowledge_articles(
  query_embedding vector(1024),
  match_org uuid,
  match_count int default 5
)
returns table (id uuid, title text, body text, category text, source_url text, similarity float)
language sql
stable
as $$
  select
    ka.id,
    ka.title,
    ka.body,
    ka.category,
    ka.source_url,
    1 - (ka.embedding <=> query_embedding) as similarity
  from public.knowledge_articles ka
  where ka.organization_id = match_org
    and ka.embedding is not null
    and (ka.status is null or ka.status = 'published')
  order by ka.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_knowledge_articles(vector, uuid, int) to authenticated;
