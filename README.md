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
- **Frontend:** ....
- **DevOps:** Docker, Docker Compose, Git

---

## 4. Local Setup Guide

### Prerequisites

- **Python 3.14+** installed and added to PATH.
- **Git** installed.
- **Docker Desktop** (Recommended for Frontend/DevOps) OR **PostgreSQL** installed natively.

### Step 1: Environment Variables (`.env`)

The application relies on environment variables for secure database connections.
Create a file named `.env` inside the `backend/` directory and add the following connection string:

```env
# backend/.env
# Note: We map to port 5433 locally to avoid conflicts with other default PostgreSQL instances.
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/mpi_db
```

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

---

## 5. Docker Setup (Recommended)

This is the simplest way to run the full stack (Backend + PostgreSQL) without any local configuration.

### Prerequisites

- **Docker Desktop** installed and running.

### Run the full stack

> **Note:** No `.env` file is needed for Docker Compose — the `DATABASE_URL` is injected automatically via `docker-compose.yml`. The PostgreSQL database is exposed on **host port 5433** (mapped from container port 5432) to avoid conflicts with any locally running PostgreSQL instance.

```bash
# Clone the repo and navigate to the root
git clone <repo-url>
cd mpi-app

# Build images and start all services
docker compose up --build
```

The first run will build the backend image and pull the PostgreSQL image. Subsequent runs will be faster.

### Access the application

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

> **Hot-Reload:** Any changes to files in `backend/` are immediately reflected inside the running container — no rebuild required.
