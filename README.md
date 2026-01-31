## Installation

1. Clone the project.

```bash
git clone https://github.com/atharvasalunke/period_cycle_planner.git
```

2. Go to project directory.
```bash
cd period_cycle_planner
```

3. Install the dependencies.
```bash
npm install
```

4. Run the project
```bash
npm run dev
```

## Setup PostgreSQL
1. Start Docker Desktop.
2. Run the following
```bash
docker run --name cycle-postgres \
  -e POSTGRES_USER=cycle \
  -e POSTGRES_PASSWORD=cyclepass \
  -e POSTGRES_DB=cycleplanner \
  -p 5432:5432 \
  -d postgres:16
```

## Backend Installation
1. Go to backend directory.
```bash
cd backend
```

2. Install the dependencies and create migrations.
```bash
npm install && npm run generate && npm run migrate
```

3. Run the project
```bash
npm run dev
```
