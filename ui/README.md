# QuoteLab — UI

**Next.js frontend for QuoteLab**

- Sends prompts to the FastAPI model, streams completions from Groq, and supports voice I/O plus TXT/PDF export.

## Stack

- Next.js (App Router)
- Tailwind CSS
- Framer Motion
- Recharts
- Groq API
- Web Speech API

## Run

```bash
pnpm install
pnpm dev
```

# Env

.env.local:

- **NEXT_PUBLIC_GROQ_API_KEY=your_key**
- **NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:10000**

# Routes

/ — landing
/prediction-lab — main app
/colophon — build notes
