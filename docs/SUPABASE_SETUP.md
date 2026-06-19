# Supabase Setup — Phase 2

1. Create a project at https://supabase.com
2. Open SQL Editor → paste contents of `supabase/schema.sql` → Run
3. Verify: Table Editor shows `businesses` (1 row) and `products` (5 rows)
4. Copy `.env.example` → `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` from Project Settings → API
   - `SUPABASE_SERVICE_ROLE_KEY` from Project Settings → API (keep secret)
5. Run `npm run typecheck && npm run build` to confirm no regressions

## Seed UUIDs

| Entity | UUID |
|--------|------|
| S3K Dhaba | `a1000000-0000-4000-8000-000000000001` |
| Rajma Chawal | `a2000000-0000-4000-8000-000000000001` |
| Dal Fry | `a2000000-0000-4000-8000-000000000002` |
| Paneer Butter Masala | `a2000000-0000-4000-8000-000000000003` |
| Butter Naan | `a2000000-0000-4000-8000-000000000004` |
| Mango Lassi | `a2000000-0000-4000-8000-000000000005` |
