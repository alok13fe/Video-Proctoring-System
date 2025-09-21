# **Video Proctoring System**

This project is a sophisticated, AI-driven platform for conducting secure and proctored online interviews. It leverages real-time video communication and browser-based machine learning to monitor candidates for potential malpractice, ensuring the integrity of remote assessments.

The system features a monorepo architecture built with Turborepo and pnpm workspaces, encapsulating a frontend, multiple backend services, and shared packages.


## **Key Features**

* **Admin Dashboard:** Admins can create interview rooms, manage candidates, and view detailed post-interview proctoring reports.

* **Real-Time Video/Audio:** Low-latency, peer-to-peer video communication between the interviewer and candidate using WebRTC.

* **AI-Powered Proctoring:**

   * **Face Detection:** Ensures only one person is present. Flags events for no face detected or multiple faces detected.

   * **Gaze Detection:** Monitors if the candidate is frequently looking away from the screen.

   * **Object Detection:** Identifies prohibited items like cell phones, laptops, and books in the camera frame.

**Real-Time Event Logging:** All proctoring violations are logged with timestamps and sent to the interviewer's view in real-time.

**Scalable Architecture:** Decoupled services (HTTP, WebSocket, Worker) for handling API requests, real-time communication, and background processing efficiently.

**Containerized:** Fully containerized with Docker and Docker Compose for easy setup and deployment.

## **Tech Stack**
**Monorepo:** Turborepo, pnpm

* **Frontend:** Next.js, React, TypeScript, Redux Toolkit, Tailwind CSS

* **Backend:** Node.js, Express.js (HTTP), ws (WebSocket), TypeScript

* **Database:** PostgreSQL, Prisma (ORM)

* **AI / Machine Learning (Client-Side):**

   * MediaPipe (@mediapipe/tasks-vision) for Face Detection & Gaze Tracking.

   * TensorFlow.js (@tensorflow-models/coco-ssd) for Object Detection.

* **Real-Time Communication:** WebRTC

* **Messaging Queue:** Redis

* **Containerization:** Docker, Docker Compose

* **Shared Packages:** Zod (Schema Validation), ESLint, TypeScript configs

## **Architecture**
The application is built on a microservices-oriented architecture, where each service has a distinct responsibility.

1. **Frontend:** A Next.js application that provides the UI for both admins and candidates. It handles capturing video, running ML models in the browser, and communicating with the backend services.

2. **HTTP Backend:** An Express.js server that manages RESTful API endpoints for user authentication, room creation, and persisting proctoring logs to the database.

3. **WebSocket Backend:** Handles all real-time signaling required for WebRTC (offers, answers, ICE candidates) and receives proctoring logs from the frontend client.

4. **Redis:** Acts as a high-speed message broker. The WebSocket server pushes incoming logs to a Redis queue to avoid blocking.

5. **Worker:** A background service that listens to the Redis queue, dequeues log messages, and sends them to the HTTP Backend to be saved in the PostgreSQL database.

6. **PostgreSQL Database:** The primary data store for user information, interview rooms, and proctoring event logs, managed with Prisma ORM.

## **Overview**


## **Getting Started**

1. **Clone the repository:**  
   ```bash
   git clone https://github.com/alok13fe/collaborative-canvas.git 
   cd '.\Collaborative Canvas\'
   ```

2. **Set up environment variables:**  
   ```bash
   cp .env.example .env
   ```

   *Fill in the .env file with your database credentials, JWT secret, and other necessary variables.*  

3. **Run the Docker containers:**  
   ```bash 
   docker-compose up  
   ```
   
Open http://localhost:3000 in your browser to view the project.

## **Contact**
For queries or feedback, please contact [Alok](mailto:anandkumar19d@gmail.com).

---