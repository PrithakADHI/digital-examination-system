# Digital Examination System

An offline-resilient digital examination platform built on a three-layer Edge-Proxy architecture, designed for educational institutions with unreliable internet connectivity.

## Overview

The Digital Examination System enables schools and universities to conduct both theoretical and programming-based examinations digitally, even under limited infrastructure conditions. The system uses a **Main Server → Edge-Proxy Server → React Kiosk Client** architecture where examination questions are encrypted using AES-256 and cached on local proxy servers before exam time, allowing examinations to proceed over a LAN without continuous internet access.

### Key Features

- **Offline-Resilient Architecture** — Exams run on LAN via Edge-Proxy servers after initial question sync
- **AES-256 Encrypted Questions** — Question papers remain inaccessible until token-based decryption at exam time
- **Docker Sandboxed Code Execution** — Automatic, impartial evaluation of programming answers (Python, C, C++, Java)
- **Anonymous Grading** — Student identities concealed from examiners during evaluation
- **Role-Based Access Control (RBAC)** — Distinct roles for Super Admins, Admins, Teachers, and Students
- **JWT Authentication** — Secure API communication with access + refresh token flow
- **HMAC-Signed Proxy Communication** — Tamper-proof sync between proxy and main server
- **Real-Time Terminal Monitoring** — Heartbeat system tracks online/offline status of exam PCs
- **Built-In Code Compiler** — Monaco editor with multi-language support and sandboxed execution

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend (Kiosk, Admin UI, Proxy UI) | React 19, Vite, TailwindCSS, DaisyUI |
| Backend (Main Server) | Node.js, Express 5, Sequelize ORM |
| Backend (Proxy Server) | Node.js, Express 5, SQLite |
| Database (Main) | PostgreSQL |
| Database (Proxy) | SQLite (local cache) |
| Containerization | Docker (Ubuntu 22.04, gcc, g++, JDK, Python3) |
| Encryption | AES-256-GCM, HMAC-SHA256 |
| Authentication | JWT (access + refresh tokens), Passport.js, Bcrypt |
| Email | Nodemailer (SMTP) |
| Image Storage | Cloudinary |
| Project Management | Scrum Agile (6 sprints), Trello, GitHub |

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    MAIN SERVER                        │
│              (PostgreSQL Database)                    │
│              Port: 8000                              │
│  • User management & RBAC                            │
│  • Examination lifecycle                             │
│  • Question encryption (AES-256)                     │
│  • HMAC-authenticated proxy routes                   │
└──────────────┬───────────────────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
┌──────────┐      ┌──────────────┐
│  MAIN    │      │  PROXY       │
│  SERVER  │      │  SERVER      │
│  CLIENT  │      │ (SQLite DB)  │
│  (React) │      │ Port: 8001   │
│  Port:   │      │ • Question   │
│  5173    │      │   caching    │
│          │      │ • Answer     │
│  Admin/  │      │   encryption │
│  Teacher │      │ • Docker     │
│  Dashboard│     │   sandbox    │
└──────────┘      └──────┬───────┘
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
       ┌──────────┐        ┌──────────────┐
       │  PROXY   │        │   CLIENT     │
       │  SERVER  │        │  (Kiosk UI)  │
       │  CLIENT  │        │  Port: 5173  │
       │  (React) │        │              │
       │  Port:   │        │  Student     │
       │  5173    │        │  Exam        │
       │          │        │  Terminal    │
       │  Proxy   │        └──────────────┘
       │  Admin   │               │
       │  Panel   │        ┌──────┴───────┐
       └──────────┘        │   Docker     │
                           │   Pool       │
                           │  (5 containers)│
                           │  Python, C,  │
                           │  C++, Java   │
                           └──────────────┘
```

## Project Structure

```
digital-examination-system/
├── main-server/              # Central backend (Express + PostgreSQL)
│   ├── controllers/          # Route handlers (auth, admin, teacher, student, proxy)
│   ├── middleware/            # JWT auth, HMAC verification, validation
│   ├── models/               # Sequelize models (User, Examination, Paper, etc.)
│   ├── routes/               # API routes
│   ├── utils/                # Encryption (AES-256), mailer, helpers
│   ├── validations/          # Express-validator rules
│   └── index.js              # Server entry point
│
├── main-server-client/       # React admin/teacher/student dashboard
│   ├── src/
│   │   ├── api/              # Axios instance with token refresh
│   │   ├── components/       # UI components (centers, dashboard, examinations, etc.)
│   │   ├── pages/            # 20 page components (admin, teacher, student views)
│   │   └── App.jsx           # Route definitions
│   └── vite.config.js
│
├── proxy-server/             # Edge-proxy backend (Express + SQLite + Docker)
│   ├── controllers/          # Examination, client, answer, code execution controllers
│   ├── models/               # SQLite models (User, StudentAnswer, Question, Client)
│   ├── routes/               # Proxy API routes
│   ├── utils/                # DockerPool, encryption, main server client
│   ├── Dockerfile            # Code runner container image
│   ├── Dockerfile.runner
│   └── index.js              # Server entry point
│
├── proxy-server-client/      # React proxy management UI
│   ├── src/
│   │   ├── api/              # Axios instance
│   │   ├── components/       # Proxy UI components
│   │   ├── pages/            # Registration, examinations, monitor, clients, sync
│   │   └── App.jsx           # Route definitions
│   └── vite.config.js
│
├── client/                   # React exam terminal (Kiosk client)
│   ├── src/
│   │   ├── components/       # ExaminationView, CodeCompiler, StudentSelection
│   │   ├── hooks/            # useQuestionFetcher (polls every 60s)
│   │   ├── context/          # ThemeContext (light/dark)
│   │   └── App.jsx           # Terminal state machine
│   └── vite.config.js
│
└── Final defense.pdf         # Project report
```

## Prerequisites

- **Node.js** v22.x
- **pnpm** v9.x (or npm)
- **PostgreSQL** (for Main Server)
- **Docker** (for code execution sandbox)
- A **Cloudinary** account (for image uploads)
- An **SMTP** email service (for password reset OTPs)

## Environment Variables

### Main Server (`main-server/.env`)

```env
# PostgreSQL
POSTGRES_DB=your_db_name
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Server
PORT=8000

# JWT & Encryption
SECRET_KEY=your_jwt_secret_key
REFRESH_TOKEN_SECRET=your_refresh_token_secret
AES_MASTER_KEY=your_aes_master_key

# Cloudinary (for question images)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# SMTP (for password reset emails)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password
SMTP_FROM=your_email@example.com
```

### Main Server Client (`main-server-client/.env`)

```env
VITE_API_BASE_URL=http://localhost:8000
```

### Proxy Server (`proxy-server/.env`)

```env
PORT=8001
SECRET_KEY=your_jwt_secret_key
PROXY_SECRET_KEY=your_proxy_encryption_key
MAIN_SERVER_URL=http://localhost:8000
```

### Proxy Server Client (`proxy-server-client/.env`)

```env
VITE_API_BASE_URL=http://localhost:8001
```

### Client (`client/.env`)

```env
VITE_API_BASE_URL=http://localhost:8001
```

## Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-org/digital-examination-system.git
cd digital-examination-system
```

### 2. Start PostgreSQL

Ensure PostgreSQL is running and create a database matching the `POSTGRES_DB` value in your `.env`.

### 3. Set up and start the Main Server

```bash
cd main-server
pnpm install
# Create .env file with required variables (see above)
pnpm dev
```

The server starts on `http://localhost:8000`.

### 4. Set up and start the Main Server Client

```bash
cd main-server-client
pnpm install
# Create .env file
pnpm dev
```

The dashboard starts on `http://localhost:5173`.

### 5. Build the Docker code runner image

```bash
cd proxy-server
docker build -t code-runner .
```

### 6. Set up and start the Proxy Server

```bash
cd proxy-server
pnpm install
# Create .env file with required variables
pnpm dev
```

The proxy server starts on `http://localhost:8001`.

### 7. Set up and start the Proxy Server Client

```bash
cd proxy-server-client
pnpm install
# Create .env file
pnpm dev
```

### 8. Set up and start the Kiosk Client

```bash
cd client
pnpm install
# Create .env file
pnpm dev
```

## Usage Workflow

### Administration

1. **Super Admin** creates examination centers and admin accounts
2. **Admin** creates examinations, assigns subjects, and schedules exam times
3. **Admin** registers proxy servers for each exam center using provision keys
4. **Admin** assigns teachers as question setters and examiners

### Question Setting

1. **Teacher** logs in and creates question papers (MCQ, short answer, long answer)
2. **Admin** reviews and approves question papers
3. Questions are encrypted with AES-256 and pushed to proxy servers

### Examination

1. **Proxy Admin** selects the active exam, which triggers cron-based question fetching
2. **Exam terminals** (Kiosk clients) register with the proxy server and assign students
3. At exam time, proxy server decrypts questions using a token
4. **Students** log in, answer questions, and optionally use the built-in code compiler
5. Answers are encrypted locally and stored in SQLite

### Grading & Results

1. **Proxy server** syncs encrypted answers to the main server via HMAC-signed API calls
2. **Admin** assigns students to examiners for anonymous grading
3. **Teachers** grade answers without seeing student identities
4. Results are compiled and made available to students

## User Roles

| Role | Capabilities |
|------|-------------|
| **Super Admin** | Resolve student identities post-grading, system configuration |
| **Admin** | Manage users, examinations, centers, assign teachers, approve questions |
| **Teacher** | Set questions (if assigned), grade answers (if assigned), view results |
| **Student** | View exams, answer questions, use code compiler, submit answers |

## Security Features

- **AES-256-GCM** encryption for question papers and student answers
- **HMAC-SHA256** signed communication between proxy and main server (5-minute replay window)
- **JWT** access tokens (1 day) + refresh tokens (7 day)
- **Bcrypt** password hashing with temporary password flow
- **OTP-based** password reset (4-digit, SHA-256 hashed, 10-minute expiry)
- **Docker sandbox** — code execution with 128MB memory limit, 0.5 CPU, no network, 5s timeout
- **UUID-based** terminal authentication for exam PCs

## Development Methodology

The project follows **Scrum Agile** with 6 two-week sprints:

| Sprint | Focus | Deliverables |
|--------|-------|-------------|
| 1 | Architecture & Requirements | Architecture diagram, requirements doc, tech selection |
| 2 | Main Server & RBAC | REST APIs, RBAC middleware, PostgreSQL schema, JWT auth |
| 3 | Proxy Server & Encryption | Proxy setup, AES-256 module, Docker feasibility |
| 4 | Docker Compiler | Code execution integration, exam editing module |
| 5 | Grading & Integration | Answer grading, user login with email notifications, Main Server UI |
| 6 | Kiosk Client | React Kiosk client with exam terminal interface |

## Future Enhancements

- **AI-based grading** for subjective and theory-based answers
- **Mobile application** for exam schedules, notifications, and results access
- **Enhanced analytics** dashboards for institutional performance tracking

## License

This project was developed as a final year B.Sc. CSIT project at Birendra Multiple Campus, Bharatpur, Chitwan, under Tribhuvan University.

## Authors

- **Shesh Raj Paudel** (79011773)
- **Prithak Adhikari** (79011761)
- **Suraj Jaisi** (79011784)

Under the supervision of **Mr. Binod Sharma**, Department of Computer Science and Information Technology, Birendra Multiple Campus.
