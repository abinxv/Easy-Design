# Easy-Design
AI Based Interior Design Recommendation System 

Problem Statement:
Designing or redecorating a room requires professional expertise, aesthetic sense, and significant cost. Many individuals struggle to visualize how different furniture, color schemes, and interior styles would look in their own rooms. Existing interior design platforms often require paid consultations or advanced tools, making them inaccessible to students and budget-conscious users.

There is a need for an affordable and intelligent system that can analyze a user’s room image and provide personalized interior design recommendations using modern web technologies and artificial intelligence.

Objectives

The main objectives of this project are:
To build a web-based application that analyzes room images uploaded by users
To suggest suitable interior design ideas including furniture, color schemes, and décor styles
To implement a full-stack solution using the MERN stack
To integrate AI-based image analysis for intelligent recommendations
To provide an open-source and cost-free alternative to professional interior design tools

Technology Stack (MERN-Focused)
🔹 Frontend (React)
React.js
HTML, CSS

🔹 Backend (Node.js & Express)
Node.js
Express.js
RESTful APIs
Multer (image upload handling)

🔹 Database (MongoDB)
MongoDB Atlas (cloud database)

🔹 AI & Image Processing
Python (Flask / FastAPI microservice)
OpenCV (basic image processing)
Pretrained vision models (via HuggingFace or similar)
Locally hosted pretrained AI models deployed with Ollama to enable offline inference.

Project Overview
The AI-Based Interior Design Recommendation System is a web application that allows users to upload an image of their room and receive personalized interior design suggestions. The application analyzes the uploaded image to identify the room type, dominant colors, and visible objects such as furniture and lighting.
Based on the analysis, the system recommends appropriate color palettes, furniture types, and interior design styles such as modern, minimalist, Scandinavian, or bohemian. The platform aims to help users make informed design decisions without requiring professional interior design services.
The application is built using the MERN stack for seamless frontend-backend integration and uses AI-powered image analysis to generate intelligent suggestions. The system is designed to be scalable, modular, and open-source.

Core Features
User-friendly room image upload
AI-based room analysis
Interior design style recommendations
Furniture and color palette suggestions
Responsive web interface
Image analysis handled via backend AI service
Secure storage of user data and design history

System Workflow
User uploads a room image through the React frontend
Image is sent to the Node.js backend
Backend forwards image to AI microservice
AI analyzes the image and returns design insights
Backend formats the response
Frontend displays design recommendations

