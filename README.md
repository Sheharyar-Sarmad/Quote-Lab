<div align="center">

# 📜 QuoteLab

**A full-stack AI lab where an LSTM predicts, Groq completes, and your browser talks back.**

[![Next.js](https://img.shields.io/badge/Next.js-App%20Router-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-LSTM-FF6F00?logo=tensorflow)](https://www.tensorflow.org/)
[![Groq](https://img.shields.io/badge/Groq-LLM%20API-F55036)](https://groq.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](#-license)

</div>

---

## 🧠 Overview

QuoteLab is an end-to-end AI application that blends a **custom-trained LSTM language model** with a **hosted LLM (Groq)** to turn a fragment of a quote into a fully-formed, spoken thought. Type or say the start of a quote, watch the LSTM guess the next word in real time, then let Groq stream a natural completion — read aloud by the browser. Ask follow-ups, export the whole session, and see the model's predictions charted live.

What makes it interesting:

- 🔤 **Own the first word, borrow the rest** — a from-scratch LSTM predicts the next token before handing off to an LLM for fluent completion
- 🎙️ **Voice in, voice out** — Web Speech API powers both dictation and text-to-speech, no third-party voice service needed
- 📊 **Transparent predictions** — LSTM output probabilities are visualized live with Recharts, not hidden behind a black box
- 📄 **Take it with you** — one-click export to TXT or PDF, complete with a colophon page
- ⚡ **Lightweight inference** — the trained model is served as TensorFlow Lite for fast, low-overhead predictions

---

## ✨ Features

- 🔮 LSTM-based next-word prediction from a partial quote
- 🚀 Groq-powered streaming sentence completion
- 🎤 Voice input via speech-to-text
- 🔊 Voice output with an animated waveform while speaking
- 💬 Follow-up chat — ask questions about the completed quote, by voice or text
- 📤 Export sessions as **TXT** or **PDF**
- 📈 Live bar chart of LSTM prediction probabilities
- 📖 Colophon page in exported PDFs (model + generation details)

---

## 🛠️ Tech Stack

| Layer          | Technology                              | Purpose                                       |
|----------------|------------------------------------------|------------------------------------------------|
| Frontend       | Next.js (App Router) + TypeScript        | UI framework and routing                       |
| Styling        | Tailwind CSS                             | Utility-first styling                          |
| Animation      | Framer Motion                            | UI transitions and voice waveform animation    |
| Charts         | Recharts                                 | LSTM prediction probability bar chart          |
| PDF Export     | jsPDF + jspdf-autotable                  | Client-side TXT/PDF generation                 |
| LLM            | Groq API (streaming)                     | Natural-language sentence completion           |
| Voice          | Web Speech API                           | Voice input (STT) and voice output (TTS)       |
| Backend        | FastAPI + Uvicorn                        | Model-serving REST API                         |
| ML Framework   | TensorFlow / Keras                       | LSTM model training                            |
| Inference      | TensorFlow Lite                          | Lightweight, fast model inference              |
| Data Handling  | NumPy, Pandas, Pydantic                  | Preprocessing and request/response validation  |

---

## 🏗️ Architecture

```
┌─────────┐      ┌───────────────┐      ┌─────────────┐      ┌───────────────┐
│ Browser │ ───▶ │  Next.js UI   │ ───▶ │   FastAPI   │ ───▶ │  TFLite Model │
│ (Voice/ │      │ (App Router)  │      │  (/predict) │      │  (LSTM)       │
│  Text)  │      └───────────────┘      └─────────────┘      └───────┬───────┘
└────┬────┘              │                                           │
     │                   ▼                                           │
     │           ┌───────────────┐                                   │
     │           │   Groq API    │◀──────────────────────────────────┘
     │           │ (Streaming    │        predicted next word
     │           │  Completion)  │
     │           └───────┬───────┘
     │                   │
     ▼                   ▼
┌─────────────────────────────────┐
│   Browser (TTS playback, chat,  │
│   charts, PDF/TXT export)       │
└──────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- Python ≥ 3.10
- A [Groq API key](https://console.groq.com/)

### 1. Clone the repo

```bash
git clone https://github.com/Sheharyar-Sarmad/Quote-Lab.git
cd Quote-Lab
```

### 2. Backend setup (`model/`)

```bash
cd model
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend setup (`ui/`)

```bash
cd ui
npm install
cp .env.local.example .env.local   # then fill in your keys
npm run dev
```

The app will be available at `http://localhost:3000`, with the API running at `http://localhost:8000`.

---

## 🔑 Environment Variables

| Variable                     | Location | Description                                      |
|-------------------------------|----------|---------------------------------------------------|
| `NEXT_PUBLIC_GROQ_API_KEY`    | `ui/`    | Client-side Groq API key for streaming completions |
| `NEXT_PUBLIC_API_BASE_URL`    | `ui/`    | Base URL of the FastAPI backend                    |
| `GROQ_API_KEY`                | `model/` | Server-side Groq API key (if used by backend)      |

> ⚠️ Never commit your `.env` files. Use the provided `.env.example` files as templates.

---

## 📡 API Reference

### `POST /predict`

Predicts the most likely next word(s) given a partial quote using the trained LSTM model.

**Request**

```json
{
  "text": "the only way to do great work is to"
}
```

**Response**

```json
{
  "predicted_word": "love",
  "top_k": [
    { "word": "love", "probability": 0.42 },
    { "word": "believe", "probability": 0.18 },
    { "word": "keep", "probability": 0.11 }
  ]
}
```

---

## 🧬 Model Details

| Aspect              | Details                                                      |
|---------------------|----------------------------------------------------------------|
| Architecture        | Embedding (10,000 × 50) → LSTM (128 units) → Dropout → Dense (10,000, softmax) |
| Training Data       | 3,038 quotes                                                  |
| Vocabulary Size     | 8,979 unique words                                            |
| Training Sequences  | 85,271                                                        |
| Test Accuracy       | 11.44%                                                        |

> 📝 Next-word prediction over a ~9K-word vocabulary is a genuinely hard multi-class problem — the LSTM's role here is to bias and inform the completion, with Groq's LLM handling fluent, coherent generation.

---

## 🌐 Live Demo

**Frontend:**
> **https://quote-lab-dun.vercel.app/prediction-lab**

**Backend:**
> **https://quote-lab.onrender.com**
---

## 🗺️ Roadmap

- [x] LSTM model training pipeline
- [x] TFLite model conversion
- [x] FastAPI `/predict` endpoint
- [x] Groq streaming integration
- [x] Voice input (speech-to-text)
- [x] Voice output (text-to-speech) with waveform animation
- [x] Follow-up chat with voice/text
- [x] TXT/PDF export with colophon page
- [x] Live LSTM prediction chart
- [ ] Deploy frontend and backend
- [ ] Add screenshots and demo GIF
- [ ] Improve LSTM accuracy with a larger training corpus
- [ ] Add user authentication and saved sessions

---

## 👤 Author

**Sheharyar Sarmad**

- GitHub: [@Sheharyar-Sarmad](https://github.com/Sheharyar-Sarmad)
- Repo: [Quote-Lab](https://github.com/Sheharyar-Sarmad/Quote-Lab)
- LinkedIn: [Post For The Functionality Of App](https://www.linkedin.com/feed/update/urn:li:ugcPost:7506221918711132160/)
- Email: [developersheharyar2010@gmail.com](https://mail.google.com/mail/u/0/?view=cm&fs=1&to=developersheharyar2010@gmail.com&su=&body=)

---

## 📄 License

This project is licensed under the **MIT License**. See [LICENSE](./LICENSE) for details.

---

<div align="center">

Built with ❤️ by **Sheharyar Sarmad**

</div>#
