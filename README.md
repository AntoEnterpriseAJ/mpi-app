# mpi-app

> Short pitch that describes the value of the product.

# 1. Description and Objectives

Describe the problem you are solving.

- **Objective 1:** ...
- **Target audience:** ...

# 2. Team and Roles

| Name                  | Main Role | GitHub Username |
| --------------------- | --------- | --------------- |
| Ghiujan Costin-Daniel | Backend   | @costinghiujan  |
| Student 2             | DevOps    | @username       |
| Student 3             | Frontend  | @username       |
| Student 4             | Frontend  | @username       |

## 3. Architecture and Technologies

- **Backend:** Python 3.14+, FastAPI, Pydantic (Data Validation)
- **Database:** PostgreSQL, SQLAlchemy (ORM)
- **Frontend:** [Adaugă framework-ul colegilor: ex. React / Vue / Angular]
- **DevOps:** Docker, Docker Compose, Git

## 4. Local Setup

### Prerequisites

- Python 3.14+
- Docker & Docker Compose
- Git

### Backend Native Setup (Development)

```bash
# 1. Clone the repository
git clone <repo-url>
cd mpi-app/backend

# 2. Create and activate the virtual environment
python -m venv venv
# On Windows: venv\Scripts\activate
# On Linux/Mac: source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the development server
uvicorn main:app --reload
```
