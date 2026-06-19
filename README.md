# S3K Fuse

WhatsApp commerce hackathon MVP — AI-powered food ordering in a chat-style UI.

## Phase 1 — Foundation

Current scope: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui scaffold.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full plan.

## Scripts

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run typecheck  # TypeScript check
npm run lint       # ESLint
```

## Folder structure

```
src/
├── app/              # App Router (layout, globals, placeholder page)
├── components/
│   └── ui/           # shadcn/ui (button, input, skeleton)
├── lib/
│   └── utils.ts      # cn() helper
├── providers/        # (Phase 5)
└── types/            # (Phase 2)
```
