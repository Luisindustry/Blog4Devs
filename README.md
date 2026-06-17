# Blog4Devs — Junior Senior QA

Plataforma comunitaria de preguntas y respuestas técnicas para desarrolladores.
Los seniors validados responden; el contenido se indexa en Google con Schema.org.

## Arquitectura

```
Blog4Devs/
├── backend-fastapi/   FastAPI + MongoDB (Motor async)
├── frontend-next/     Next.js 15 con ISR y microdata SEO
├── docker-compose.yml Orquestación completa (mongo + backend + frontend)
└── .github/workflows/ CI con lint, type-check y tests
```

## Levantar el proyecto (Docker)

```bash
cp backend-fastapi/.env.example backend-fastapi/.env   # ajusta las variables
docker compose up --build
```

| Servicio   | URL                        |
|------------|----------------------------|
| Frontend   | http://localhost:3000      |
| Backend    | http://localhost:8000      |
| API docs   | http://localhost:8000/docs |

## Desarrollo local

### Backend

Requiere Python 3.11+ y MongoDB corriendo en `localhost:27017`.

```bash
cd backend-fastapi
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
cp .env.example .env
uvicorn app.main:app --reload
```

### Frontend

Requiere Node.js 22+.

```bash
cd frontend-next
npm install
cp .env.local.example .env.local
npm run dev
```

## Variables de entorno

### Backend (`backend-fastapi/.env`)

| Variable | Default | Descripción |
|---|---|---|
| `APP_NAME` | `blog4devs API` | Nombre mostrado en /docs |
| `ENVIRONMENT` | `local` | `local` / `production` |
| `MONGODB_URI` | `mongodb://localhost:27017` | Cadena de conexión MongoDB |
| `MONGODB_DATABASE` | `community_qa` | Nombre de la base de datos |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | Origen permitido por CORS |
| `N8N_QUESTION_CREATED_WEBHOOK_URL` | _(vacío)_ | Webhook n8n opcional |
| `N8N_WEBHOOK_TIMEOUT_SECONDS` | `5` | Timeout del webhook en segundos |

### Frontend (`frontend-next/.env.local`)

| Variable | Default | Descripción |
|---|---|---|
| `API_BASE_URL` | `http://localhost:8000` | URL del backend (server-side) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | URL pública del sitio |

## API

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/healthz` | Estado del servidor |
| `POST` | `/questions/` | Crear una pregunta |
| `GET` | `/questions/{slug}` | Obtener pregunta por slug |
| `POST` | `/questions/{slug}/answers` | Agregar respuesta a una pregunta |

Documentación interactiva: `http://localhost:8000/docs`

## Tests

```bash
cd backend-fastapi

# Requiere MongoDB en localhost:27017
pytest tests/ -v

# Con base de datos alternativa
MONGODB_DATABASE=community_qa_test pytest tests/ -v
```

## CI

Cada push a `main` y cada PR ejecuta:

- **Backend:** `ruff check` + `pytest` con MongoDB de servicio
- **Frontend:** `tsc --noEmit` + `next lint`
