# MPI-App: Leave Management System

> A centralized, automated project management tool designed to simplify the process of requesting, tracking, and approving employee time-off within software development teams.

## 1. Description and Objectives

Managing employee leave requests through disparate channels (emails, direct messages, spreadsheets) leads to miscommunication, payroll errors, and a lack of transparency. **MPI-App** centralizes this workflow, providing a robust and transparent system for both employees and managers.

- **Objective 1:** Automate the leave request and approval workflow with clear status indicators (Pending / Approved / Rejected).
- **Objective 2:** Enforce business logic reliably (e.g., preventing balance overdrafts, role-based access control).
- **Objective 3:** Provide an intuitive dashboard and chronological leave history for easy tracking and auditing.
- **Target audience:** Software Engineers (Users) and Engineering/Project Managers.

## 2. Team and Roles

| Name                  | Main Role | GitHub Username |
| --------------------- | --------- | --------------- |
| Ghiujan Costin-Daniel | Backend   | @costinghiujan  |
| [Student 2 Name]      | DevOps    | @username       |
| [Student 3 Name]      | Frontend  | @username       |
| [Student 4 Name]      | Frontend  | @username       |

## 3. Architecture and Technologies

- **Backend:** Python 3.14+, FastAPI, Pydantic (Data Validation)
- **Database:** PostgreSQL, SQLAlchemy (ORM)
- **Frontend:** React, TypeScript, Vite
- **DevOps:** Docker, Docker Compose, Git

---

## 4. Local Setup Guide

### Prerequisites

- **Python 3.14+** installed and added to PATH.
- **Node.js 20+** installed (includes `npm`) for running the frontend **natively** (not required when using Docker).
- **Git** installed.
- **Docker Desktop** (Recommended for the full stack) OR **PostgreSQL** installed natively.

### Step 1: Environment Variables (`.env`)

The application relies on environment variables for secure database connections.
Copy the example file from the repo root and fill in your credentials:

```bash
# Linux / macOS
cp .env.example .env

# Windows (PowerShell)
copy .env.example .env
```

Then edit `.env`:

```env
# .env (repo root)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password_here
POSTGRES_DB=mpi_db

# Used when running the backend natively (outside Docker)
DATABASE_URL=postgresql://postgres:your_password_here@localhost:5433/mpi_db
```

> **Important:** Never commit `.env` to Git. It is already listed in `.gitignore`.

### Step 2: Database Setup

The backend requires a PostgreSQL database named `mpi_db` accessible on port 5433 with the default `postgres:postgres` credentials. Choose ONE of the options below:

#### Option A: Using Docker (Fastest - Recommended for All)

Open your terminal (Command Prompt, PowerShell, or bash) and run this single command to spin up an isolated database container:

```bash
docker run --name mpi_postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=mpi_db -p 5433:5432 -d postgres:15-alpine
```

#### Option B: Using Native PostgreSQL (For Backend Developers)

If you prefer not to use Docker and have PostgreSQL installed locally on your OS, ensure it is configured to run on port 5433 and run the following SQL commands to set up the environment.

**For Linux/Mac:**

```bash
sudo systemctl start postgresql
sudo -u postgres psql -p 5433
```

**For Windows:**
Open SQL Shell (psql) from your Start Menu, connect to port 5433 as user `postgres`, or use pgAdmin.

Run these SQL commands in the console:

```sql
ALTER USER postgres WITH PASSWORD 'postgres';
CREATE DATABASE mpi_db;
ALTER DATABASE mpi_db OWNER TO postgres;
\q
```

### Step 3: Backend Setup & Running the Server

Once your database is up and running, open a new terminal window and follow these OS-specific steps to start the API.

1. Clone the repository and navigate to the backend

```bash
git clone <repo-url>
cd mpi-app/backend
```

2. Create the virtual environment

```bash
# On Windows:
python -m venv venv
# On Linux/Mac:
python3 -m venv venv
```

3. Activate the virtual environment

```bash
# On Windows (Command Prompt):
venv\Scripts\activate.bat
# On Windows (PowerShell):
venv\Scripts\Activate.ps1
# On Linux/Mac:
source venv/bin/activate
```

4. Install dependencies and run the server

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

🎉 **Success!** The API documentation (Swagger UI) is automatically generated and available at: http://localhost:8000/docs.

### Step 4: Frontend Setup & Running the App

Open a new terminal and run the frontend locally with Vite.

The backend must be running before starting the frontend.

1. Navigate to the frontend folder

```bash
cd mpi-app/frontend
```

2. Install dependencies

```bash
npm install
```

3. Configure frontend environment variables

```bash
# Linux / macOS
cp .env.example .env

# Windows (PowerShell)
copy .env.example .env
```

Default value in `.env`:

```env
VITE_API_URL=http://localhost:8000
```

4. Start the development server

```bash
npm run dev
```

The frontend will be available at:
http://localhost:5173

Available Pages
/ → Home (Backend health check)
/users → Users list (fetched from backend API)

5. Optional: production build and preview

```bash
npm run build
npm run preview
```

---

## 5. Backend Code Quality

The backend uses [Ruff](https://docs.astral.sh/ruff/) for linting and formatting. Ruff is configured in `pyproject.toml` at the repo root.

### One-time setup (every team member)

**Step 1 — Create a virtual environment inside `backend/`**

```bash
cd backend

# Windows
python -m venv .venv

# Linux / macOS
python3 -m venv .venv
```

**Step 2 — Activate it**

```bash
# Windows (PowerShell)
.venv\Scripts\Activate.ps1

# Windows (Command Prompt)
.venv\Scripts\activate.bat

# Linux / macOS
source .venv/bin/activate
```

**Step 3 — Install all dependencies (including Ruff)**

```bash
pip install -r requirements.txt
```

**Step 4 — Point VS Code to the right interpreter**

Press `Ctrl+Shift+P` → **Python: Select Interpreter** → choose the one ending in `backend\.venv\Scripts\python.exe` (Windows) or `backend/.venv/bin/python` (Linux/macOS).

This step is required so that Pylance, Mypy, and the Ruff VS Code extension all use the same environment where dependencies are installed. Without it, you will see false "module not found" errors on every import.

**Step 5 — Install the Ruff VS Code extension**

In VS Code, open the Extensions panel (`Ctrl+Shift+X`), search for **Ruff** and install the one published by **Astral Software** (identifier: `charliermarsh.ruff`).

Once installed, the workspace settings in `.vscode/settings.json` already configure it so that on every Ctrl+S in a Python file VS Code will automatically:

- **Format** the file (spacing, line breaks, consistent style)
- **Fix** all auto-fixable lint issues (e.g. unused imports)
- **Sort imports** according to the project rules

No additional configuration is needed — the `.vscode/settings.json` file in the repo handles everything.

> **Note:** The `.venv` folder is already listed in `.gitignore` — do not commit it.

### Run checks

```bash
# From the repo root:

# Check for issues
ruff check backend

# Auto-fix what Ruff can
ruff check --fix backend

# Format code
ruff format backend
```

**Rules enabled:**

| Code      | Ruleset                | What it catches                                      |
| --------- | ---------------------- | ---------------------------------------------------- |
| `E` / `F` | pycodestyle + Pyflakes | Syntax errors, unused imports, undefined names       |
| `I`       | isort                  | Import ordering                                      |
| `UP`      | pyupgrade              | Outdated Python syntax (e.g. `typing.List` → `list`) |
| `B`       | flake8-bugbear         | Likely bugs and design issues                        |
| `C4`      | flake8-comprehensions  | Unnecessary list/dict/set comprehension patterns     |
| `SIM`     | flake8-simplify        | Simplifiable code constructs                         |
| `N`       | pep8-naming            | Naming conventions (classes, functions, variables)   |
| `ANN`     | flake8-annotations     | Missing type annotations on public functions         |
| `D`       | pydocstyle             | Missing or malformed docstrings (Google convention)  |
| `S`       | flake8-bandit          | Common security issues                               |
| `DTZ`     | flake8-datetimez       | Timezone-naive `datetime` calls                      |
| `PT`      | flake8-pytest-style    | pytest best practices                                |
| `TRY`     | tryceratops            | Exception handling anti-patterns                     |
| `PERF`    | Perflint               | Performance anti-patterns                            |
| `RUF`     | Ruff-native            | Ruff-specific rules and deprecations                 |

### Docstring convention

All public functions and classes must have a docstring following the **Google style**. For functions with parameters, returns, or exceptions, use the full format:

```python
def my_function(name: str, count: int) -> list[str]:
    """One-line summary of what the function does.

    Args:
        name: Description of the name parameter.
        count: Description of the count parameter.

    Returns:
        Description of the return value.

    Raises:
        ValueError: When count is negative.
    """
```

Simple functions with no parameters may use a single-line docstring:

```python
def health_check() -> dict[str, str]:
    """Verify the status of the application."""
```

---

## 6. Frontend Code Quality

The frontend uses [ESLint](https://eslint.org/) for linting and [Prettier](https://prettier.io/) for formatting. Both are configured in the `frontend/` folder and integrate with VS Code on save.

### One-time setup (every team member)

**Step 1 — Install dependencies**

From the `frontend/` folder (or from the repo root via Docker — see Section 7):

```bash
cd frontend
npm install
```

This installs ESLint, Prettier, and all plugins listed in `package.json`.

**Step 2 — Install the Prettier VS Code extension**

In VS Code, open the Extensions panel (`Ctrl+Shift+X`), search for **Prettier - Code formatter** and install the one published by **Prettier** (identifier: `esbenp.prettier-vscode`).

Once installed, the workspace settings in `.vscode/settings.json` already configure VS Code to use Prettier as the formatter for TypeScript, TSX, HTML, and JSON files. On every `Ctrl+S`, the file will be automatically formatted.

> **Note:** No additional VS Code configuration is needed — `.vscode/settings.json` is committed to the repo and handles everything.

### Run checks

```bash
# From the frontend/ folder:

# Check for lint issues
npm run lint

# Auto-fix lint issues
npm run lint:fix

# Check formatting (CI-safe, no writes)
npm run format:check

# Auto-format all files
npm run format
```

### Configuration files

| File                        | Purpose                                                                    |
| --------------------------- | -------------------------------------------------------------------------- |
| `frontend/eslint.config.js` | ESLint rules for React + TypeScript + Prettier integration                 |
| `frontend/.prettierrc`      | Prettier formatting rules (single quotes, 2-space indent, trailing commas) |
| `frontend/.prettierignore`  | Files excluded from Prettier formatting (`dist/`, `node_modules/`)         |

### Prettier rules

| Option          | Value   | Effect                                   |
| --------------- | ------- | ---------------------------------------- |
| `singleQuote`   | `true`  | Use `'` instead of `"` in JS/TS          |
| `semi`          | `true`  | Always add semicolons                    |
| `tabWidth`      | `2`     | 2-space indentation                      |
| `trailingComma` | `"all"` | Trailing commas in multi-line structures |
| `printWidth`    | `80`    | Wrap lines longer than 80 characters     |

---

## 7. Docker Setup (Recommended)

This is the simplest way to run the full stack (**Frontend + Backend + PostgreSQL**) without any local configuration. No Node.js or Python installation required on the host.

### Prerequisites

- **Windows / macOS:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.
- **Linux:** Docker Engine + Docker Compose plugin installed.
  ```bash
  sudo apt-get install docker.io docker-compose-plugin  # Debian/Ubuntu
  sudo systemctl start docker
  ```

### Step 1: Create your `.env` file

Copy the example file and fill in your credentials:

```bash
# Linux / macOS
cp .env.example .env

# Windows (PowerShell)
copy .env.example .env
```

Then edit `.env`:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password_here
POSTGRES_DB=mpi_db

# Used when running the backend natively (outside Docker)
DATABASE_URL=postgresql://postgres:your_password_here@localhost:5433/mpi_db
```

> **Important:** Never commit `.env` to Git. It is already listed in `.gitignore`.

### Step 2: Run the full stack

> **Note:** The `DATABASE_URL` is injected automatically from your `.env` via `docker-compose.yml` — no manual database setup needed. PostgreSQL is exposed on **host port 5433** to avoid conflicts with any locally running PostgreSQL instance.

```bash
# Clone the repo and navigate to the root
git clone <repo-url>
cd mpi-app

# Build images and start all services
docker compose up --build
```

The first run will build the backend image and pull the PostgreSQL image. Subsequent runs will be faster.

### Access the application

- **Frontend (React App):** http://localhost:5173
- **Swagger UI (API Docs):** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### Stop the stack

```bash
docker compose down
```

To also remove the database volume (reset all data):

```bash
docker compose down -v
```

> **Hot-Reload:** Any changes to files in `backend/` or `frontend/src/` are immediately reflected inside the running containers — no rebuild required.
> The frontend Vite dev server proxies API calls to the backend through the Docker internal network (`http://api:8000`), so no host-level CORS configuration is needed.
