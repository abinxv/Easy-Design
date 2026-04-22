# Easy-Design

Easy-Design is a full-stack interior design assistant that helps users explore room ideas, analyze room photos, find visually similar shopping matches, and save design progress in a personal dashboard.

The app combines a guided design flow with AI-powered chat, image analysis, and room-shopping tools. Users can browse design styles, generate inspiration links for selected rooms and furniture, upload a room photo to detect objects, save product links to a room cart, and ask the AI chatbot for practical interior design advice.

## Features

- Landing page with project overview, hero section, workflow, and style previews.
- Guided room design flow for Bedroom, Kitchen, Living Room, Bathroom, and Home Office.
- Furniture and decor item selection for each room type.
- Pinterest inspiration search generation based on room and selected items.
- User signup, login, logout, JWT authentication, and session restore.
- Dashboard with saved design history, uploaded room photos, and user stats.
- Style guide with interior design styles, images, color palettes, and keywords.
- AI chatbot for layout, furniture, color, lighting, material, and decor guidance.
- Room photo upload with object detection and visual shopping matches.
- Room cart for saving product links from detected objects.
- AI-generated add-on suggestions based on room cart items.
- MongoDB persistence with local file fallback for development reliability.

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Radix UI / shadcn-style components
- lucide-react icons
- framer-motion animations
- Vitest

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT authentication
- bcryptjs password hashing
- dotenv
- CORS

### AI and Image Services

- Gemini API for AI chatbot, cart suggestions, and optional object recovery.
- Cloudinary for image upload and crop URLs.
- Roboflow YOLO-World for room object detection.
- Google Cloud Vision for fallback object/web detection.
- SerpApi Google Lens for product and visual matches.
- OpenRouter support for optional guided design assistant copy.

## Project Structure

```text
Easy-Design/
  backend/
    config/          MongoDB connection and fallback status
    data/            Room catalog and local JSON store
    middleware/      Auth and optional-auth middleware
    models/          Mongoose models
    routes/          Express API routes
    utils/           AI, room analysis, tokens, and recommendation helpers
    server.js        Backend entry point

  frontend/
    src/
      assets/        Interior images
      components/    Reusable UI and feature components
      hooks/         Custom React hooks
      lib/           API clients and frontend utilities
      pages/         App pages/routes
      main.tsx       Frontend entry point
```

## Main Pages

- `/` - Home page
- `/analyze` - Guided room inspiration generator
- `/styles` - Interior design style guide
- `/room-shop` - Upload room photo and find object/product matches
- `/room-cart` - Saved product links and AI add-on suggestions
- `/ai-chatbot` - AI interior design chatbot
- `/login` - User login
- `/signup` - User registration
- `/dashboard` - Saved designs and uploaded room history

## Backend API Overview

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Backend and database status |
| `POST /api/auth/register` | Create account |
| `POST /api/auth/login` | Login |
| `GET /api/auth/me` | Restore current user |
| `GET /api/designs/catalog` | Room catalog |
| `POST /api/designs/inspirations/search` | Generate inspiration links |
| `GET /api/designs` | Saved design history |
| `POST /api/chatbot/message` | AI chatbot response |
| `GET /api/room-analysis/config` | Room analysis service status |
| `POST /api/room-analysis/analyze` | Detect room objects and match products |
| `GET /api/room-analysis/uploads` | Saved uploaded room photos |
| `GET /api/room-analysis/cart` | Load room cart |
| `PUT /api/room-analysis/cart` | Save room cart |
| `DELETE /api/room-analysis/cart` | Clear room cart |
| `POST /api/room-analysis/cart/suggestions` | Generate AI cart add-ons |

## Local Setup

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

The backend runs on:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/api/health
```

Create `backend/.env` with the variables you need:

```bash
PORT=5000
MONGO_URI=
JWT_SECRET=
JWT_EXPIRES_IN=30d
CLIENT_URL=http://localhost:8080
BCRYPT_SALT_ROUNDS=12

GEMINI_KEY=
GEMINI_CHAT_MODEL=gemini-2.5-flash

CLOUDINARY_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

ROBOFLOW_PRIVATE_KEY=
SERP_PRIVATE_KEY=
GOOGLE_VISION_API_KEY=
OPEN_ROUTER=
```

If `MONGO_URI` is missing or unavailable, the backend falls back to a local JSON file store for development.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on:

```text
http://localhost:8080
```

Optional frontend environment variable:

```bash
VITE_API_BASE_URL=http://localhost:5000/api
```

## Scripts

### Frontend

```bash
npm run dev       # start Vite dev server
npm run build     # build production frontend
npm run preview   # preview production build
npm run lint      # run ESLint
npm run test      # run Vitest tests
```

### Backend

```bash
npm run dev       # start backend with nodemon
npm start         # start backend with node
```

## Notes

- Room inspiration search works with only the backend and room catalog.
- AI chatbot requires a Gemini API key.
- Room photo analysis requires Cloudinary and Roboflow, with SerpApi or Google Vision for better matching.
- Logged-in users can save design searches, room uploads, and room cart data.
- Guest users can still browse, use some flows, and keep a temporary room cart in browser storage.
