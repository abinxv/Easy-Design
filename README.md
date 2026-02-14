# Easy-Design
AI Based Interior Design Recommendation System


Problem Statement:
Designing or redecorating a room requires professional expertise, aesthetic sense, and significant cost. Many individuals struggle to visualize how different furniture, color schemes, and interior styles would look in their own rooms. Existing interior design platforms often require paid consultations or advanced tools, making them inaccessible to students and budget-conscious users.


There is a need for an affordable and intelligent system that can analyze a user’s room image and provide personalized interior design recommendations using modern web technologies and artificial intelligence.


Objectives:
To build a web-based application that analyzes room images uploaded by users
To suggest suitable interior design ideas including furniture, color schemes, and décor styles
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
MongoDB


🔹 AI & Image Processing
Python (Flask / FastAPI microservice)


OpenCV (image preprocessing and color extraction)


Pretrained computer vision models for scene and object understanding


Multimodal llms for semantic interpretation and recommendation generation

Locally hosted pretrained AI models deployed using Ollama for offline inference




🔹Project Overview

The AI-Based Interior Design Recommendation System is a web application that allows users to upload an image of their room and receive personalized interior design suggestions. The application analyzes the uploaded image to identify the room type, dominant colors, and visible objects such as furniture and lighting.


Based on the analysis, the system recommends appropriate color palettes, furniture types, and interior design styles such as modern, minimalist, etc. The platform aims to help users make informed design decisions without requiring professional interior design services and visualize beforehand.


🔹Core Features


User-friendly room image upload


AI-based room analysis


Interior design style recommendations


Furniture and color palette suggestions


Responsive web interface


Image analysis handled via backend AI service


Secure storage of user data and design history


🔹System Workflow


User uploads a room image through the React frontend


Image is sent to the Node.js backend


Backend forwards image to AI microservice


AI analyzes the image and returns design insights


Backend formats the response


Frontend displays design recommendations


🔹Identified Stakeholders
1. End Users (Clients / Homeowners)


Role:
Individuals who want interior design ideas for their rooms without professional consultation.


Responsibilities & Actions:


Upload room images


View AI-generated interior design suggestions


Browse recommended furniture, color palettes, and styles


Save or revisit previous design recommendations


Interaction with System:


Interacts through the web interface (React frontend)


Sends room images to the backend for analysis


Receives AI-based design recommendations


2. Interior Designers


Role:
Professional or semi-professional designers who use the platform to analyze rooms, provide enhanced suggestions, or assist clients digitally.


Responsibilities & Actions:


Analyze room images uploaded by users


Preview AI-generated recommendations


Provide custom design advice or improvements


Use the platform as a decision-support tool


Interaction with System:


Access uploaded images and AI insights


Add or modify design recommendations


Suggest professional design alternatives


3. System Administrator (us)


Role:
Manages system functionality and ensures smooth operation.


Responsibilities & Actions:


Manage user and designer accounts


Monitor system performance


Maintain AI service and database


Interaction with System:


Backend access for configuration and monitoring


No direct interaction with design features





