# Easy-Design
AI-based interior design recommendation system

Problem Statement:
Many people want to improve the look of their rooms, but they do not know where to start, what style fits their space, or how different furniture and decor choices will work together. Professional interior design help can be expensive, and many existing tools are either too complex, too costly, or not personalized enough for everyday users.

There is a need for a simple and affordable platform that helps users explore room design ideas, discover suitable furniture and decor combinations, and gradually move toward AI-assisted recommendations based on their own space.


Objectives:
To build a web-based platform that helps users explore room design ideas in a simple guided flow

To recommend room inspiration based on room type and selected furniture or decor items

To allow users to create accounts and save their design history for later use

To evolve the platform into an AI-assisted room analysis system using uploaded room images

To provide an accessible and low-cost alternative for early-stage interior design planning


Technology Stack (MERN-Focused)


Frontend (React)

React with Vite and TypeScript

Tailwind CSS and shadcn/ui components

React Router for page navigation


Backend (Node.js & Express)


Node.js

Express.js

REST APIs 

JWT-based authentication


Database (MongoDB)


AI & Image Processing

Current status:

The current build does not yet perform real computer vision or room-image analysis. Instead, it uses a guided recommendation flow where users choose a room type and preferred items, and the backend generates Pinterest inspiration searches from those selections.

Planned next phase:

Image upload support

Room-photo analysis

Color and object understanding

Smarter recommendation generation using AI 


Project Overview

Easy-Design is a web application that helps users discover interior design inspiration for different room types. Instead of starting from a blank page, users choose a room, select the furniture or decor items they want, and receive curated inspiration links that help them explore layouts, styling ideas, and color directions.

The platform also supports authentication and a personal dashboard. When users are signed in, their design searches are saved so they can revisit previous ideas later. This makes the current project a practical guided recommendation system, while also serving as the foundation for a future AI-powered room analysis product.


Core Features

User signup, login, logout, and session restore

Room selection for multiple room categories

Furniture and decor item selection inside each room flow

Generated Pinterest inspiration links based on user choices

Saved design history for logged-in users

Responsive web interface with landing page, analyze page, styles page, and dashboard

Backend API for auth, room catalog, inspiration generation, and history storage


Local setup

1. Create `backend/.env` from [`backend/.env.example`](/c:/Users/abina/OneDrive/Desktop/AbinavVSCode/Easy-Design/backend/.env.example).

2. In MongoDB Atlas, create a database user and add your current IP address under Network Access.

3. Paste your Atlas connection string into `backend/.env` as `MONGO_URI`.

4. Start the backend with `cd backend` and `npm run dev`.

5. Open `http://localhost:5000/api/health` and confirm you see `"status":"ok"` with `"persistence":"mongodb"`.


System Workflow

User opens the web app and explores the landing page or design flow

User selects a room type such as bedroom, kitchen, living room, bathroom, or office

User chooses the furniture or decor items they want in that room

Frontend sends the selection to the Node.js and Express backend

Backend builds relevant inspiration results and returns them to the frontend

If the user is logged in, the design session is stored in MongoDB

Frontend displays inspiration cards and the user can revisit saved searches from the dashboard


Identified Stakeholders


1. End Users (Students, homeowners, renters, and anyone redesigning a room)

Need quick, affordable design inspiration without hiring a professional at the start.


2. Interior Designers or Mentors

Can use the platform as a lightweight idea-generation or consultation support tool.


3. Project Team / System Administrators

Responsible for maintaining the frontend, backend, database, and future AI pipeline.
