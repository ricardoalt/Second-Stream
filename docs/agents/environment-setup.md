## Environment Setup

### Backend variables
```
# AI
OPENAI_API_KEY=sk-...

# Security
SECRET_KEY=<32+ char random string>

# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<secure password>
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_DB=h2o_allegiant

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Storage (dev)
USE_LOCAL_STORAGE=true
LOCAL_STORAGE_PATH=./storage
```

### Frontend variables
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```
