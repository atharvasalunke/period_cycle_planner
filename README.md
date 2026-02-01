# 🌙 LunaFlow - Period Cycle Planner

> **Plan with your rhythm** - A cycle-aware task planning application that helps you organize your life in harmony with your natural menstrual cycle.

LunaFlow is a full-stack web application that combines AI-powered task organization with menstrual cycle tracking to provide personalized planning insights. Built with privacy-first principles, all health data stays on your device.

## ✨ Features

### 🗓️ Cycle-Aware Planning
- **Visual Cycle Calendar**: Interactive calendar showing your cycle phases (Period, Follicular, Ovulation, Luteal)
- **Daily Insights**: Personalized recommendations based on your current cycle phase
- **Phase Indicators**: Visual badges on tasks showing which cycle phase they're scheduled for

### 🧠 Brain Dump with AI
- **Voice or Text Input**: Speak or type your thoughts, tasks, and reminders
- **AI Organization**: Google Gemini AI automatically extracts:
  - Tasks with due dates and categories
  - Notes (non-actionable items)
  - Suggestions and follow-up questions
- **Smart Task Extraction**: Understands natural language and assigns appropriate categories

### 📋 Task Management
- **Mind Map**: Organize tasks in Todo, In Progress, and Done columns
- **Cycle-Aware Scheduling**: Tasks can be assigned to specific cycle phases

### 🎤 Voice Features
- **Speech-to-Text**: Transcribe voice recordings using ElevenLabs API
- **Personalized Welcome Messages**: AI-generated, cycle-phase-aware audio greetings
- **Real-time Transcription**: Convert voice input to text instantly


## 🛠️ Tech Stack

### Frontend
- **React 18** with **TypeScript** - Type-safe UI development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives

### Backend
- **Python** + **FastAPI** - AI-powered API endpoints
- **Node.js** + **Express** + **TypeScript** - Authentication and Google Calendar integration
- **Uvicorn** - ASGI server for FastAPI

### Database
- **PostgreSQL** - Persistent data storage
- **Prisma ORM** - Type-safe database access

### External APIs
- **Google Gemini AI** (gemini-2.5-flash) - Text organization and personalized messages
- **ElevenLabs API** - Speech-to-text transcription and text-to-speech synthesis
- **Google Calendar API** - External event synchronization
- **Google Tasks API** - Task management integration

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)
- **PostgreSQL** (v16 or higher) or Docker
- **npm** or **yarn**
- **pip** (Python package manager)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/atharvasalunke/period_cycle_planner.git
cd period_cycle_planner
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Setup PostgreSQL Database

#### Option A: Using Docker (Recommended)

```bash
docker run --name cycle-postgres \
  -e POSTGRES_USER=cycle \
  -e POSTGRES_PASSWORD=cyclepass \
  -e POSTGRES_DB=cycleplanner \
  -p 5432:5432 \
  -d postgres:16
```

#### Option B: Local PostgreSQL

Create a database named `cycleplanner` and update the connection string in `backend/.env`.

### 4. Setup Backend

#### Node.js Backend (Authentication & Google Calendar)

```bash
cd backend
npm install
npm run generate  # Generate Prisma client
npm run migrate   # Run database migrations
```

#### Python Backend (AI Features)

```bash
cd backend
pip install -r requirements.txt
```

### 5. Environment Variables

#### Frontend (`.env` in root)

```env
VITE_API_URL=http://localhost:8000
```

#### Backend (`.env` in `backend/`)

```env
# Database
DATABASE_URL="postgresql://cycle:cyclepass@localhost:5432/cycleplanner"

# AI Services
GEMINI_API_KEY=your_gemini_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Google OAuth (for Calendar integration)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:4000/auth/google/callback

# JWT Secret
JWT_SECRET=your_jwt_secret_here

# Server
PORT=4000
CORS_ORIGIN=http://localhost:5173
```

**Get API Keys:**
- **Gemini API**: [Google AI Studio](https://makersuite.google.com/app/apikey)
- **ElevenLabs API**: [ElevenLabs Dashboard](https://elevenlabs.io/app/settings/api-keys)
- **Google OAuth**: [Google Cloud Console](https://console.cloud.google.com/)

### 6. Run the Application

#### Start Node.js Backend (Terminal 1)

```bash
cd backend
npm run dev
```

Backend API will be available at `http://localhost:4000`

#### Start Python Backend (Terminal 2)

```bash
cd backend
uvicorn main:app --reload --port 8000
```

AI API will be available at `http://localhost:8000`

#### Start Frontend (Terminal 3)

```bash
npm run dev
```

Frontend will be available at `http://localhost:5173`

## 📖 Usage

### Initial Setup

1. **Sign Up**: Create a new account
2. **Cycle Setup**: Enter your cycle information:
   - Last period start date
   - Average cycle length (default: 28 days)
   - Average period length (default: 5 days)

### Using Brain Dump

1. Navigate to **Brain Dump** from the header
2. **Type or Speak**: Enter your thoughts, tasks, and reminders
3. **Organize with AI**: Click "Organize with AI" to extract structured tasks
4. **Review & Edit**: Review the AI-organized tasks, edit as needed
5. **Apply to Board**: Add tasks to your Kanban board

### Managing Tasks

- **Kanban Board**: Drag and drop tasks between columns
- **Quick Todos**: Add simple reminders in the sidebar
- **Cycle Phase Badges**: See which phase tasks are scheduled for

## 🔌 API Documentation

### Python Backend (FastAPI)

#### Health Check
```http
GET /health
```

#### Organize Text
```http
POST /organize
Content-Type: application/json

{
  "text": "I need to finish the project by Friday and call mom tomorrow",
  "todayISO": "2024-01-15",
  "timezone": "UTC",
  "cyclePhaseCalendar": [
    {
      "date": "2024-01-15",
      "phase": "follicular",
      "dayOfCycle": 5
    }
  ]
}
```

#### Transcribe Audio
```http
POST /transcribe
Content-Type: multipart/form-data

Body: audio file (WAV, MP3, M4A, OGG, etc.)
```

#### Welcome Message
```http
GET /welcome-message?cycle_phase=follicular&day_of_cycle=5
```

### Node.js Backend (Express)

#### Authentication
- `POST /auth/signup` - Create new account
- `POST /auth/login` - Login
- `GET /auth/me` - Get current user

#### Google Calendar
- `GET /api/google/events` - Get calendar events
- `GET /api/google/tasks` - Get Google Tasks
- `POST /api/google/tasks` - Create Google Task

## 📁 Project Structure

```
period_cycle_planner/
├── backend/
│   ├── src/              # Node.js backend (Express)
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   └── db/          # Database setup
│   ├── prisma/          # Database schema
│   ├── main.py          # FastAPI application
│   ├── gemini_client.py # Gemini AI integration
│   ├── elevenlabs_client.py # ElevenLabs integration
│   └── requirements.txt # Python dependencies
├── src/
│   ├── components/      # React components
│   ├── pages/          # Page components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utilities and API clients
│   └── types/          # TypeScript types
├── public/              # Static assets
└── package.json         # Frontend dependencies
```

## 🚢 Deployment

### Backend Deployment (Vultr)

See [Backend Deployment Guide](./README.md#backend-deployment-vultr-compute--managed-postgres) in the README for detailed instructions.

### Frontend Deployment

Build the frontend:

```bash
npm run build
```

Deploy the `dist/` folder to your hosting provider (Vercel, Netlify, etc.).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **Google Gemini** for AI-powered text organization
- **ElevenLabs** for speech-to-text and text-to-speech capabilities
- **Cursor IDE** for Developement
- **ChatGPT** for Ideation and Devpost
- **Lovable** for Prototype UI
- **Tailwind CSS** for styling utilities

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Made with ❤️ for better cycle-aware planning**
