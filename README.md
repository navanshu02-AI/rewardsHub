# RewardsHub - AI-Powered Employee Rewards & Recognition System

RewardsHub is a modern, full-stack application designed to manage employee rewards and recognition programs. It features a FastAPI backend and a React frontend, with AI-powered recommendations using Google's Gemini API.

![image](https://github.com/user-attachments/assets/615a1532-35e1-45cd-a51f-6d2c4e61f496)


## 🚀 Core Features

-   **Secure User Management**: JWT-based authentication with user profiles and roles.
-   **Dynamic Rewards Catalog**: Admins can manage a catalog of rewards for employees to redeem.
-   **Peer-to-Peer Recognition**: A system for employees to give and receive recognition.
-   **AI-Powered Smart Filters**: Users can describe what they're looking for in natural language and receive intelligent reward recommendations powered by Google's Gemini.
-   **Customizable User Preferences**: Users can set preferences to tailor their reward recommendations.
-   **Modern, Responsive UI**: A clean user interface built with React and Tailwind CSS.

## 🛠️ Tech Stack

| Area      | Technology                                                                                                |
| :-------- | :-------------------------------------------------------------------------------------------------------- |
| **Backend**   | [FastAPI](https://fastapi.tiangolo.com/), [Python 3.11+](https://www.python.org/)                          |
| **Frontend**  | [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/) |
| **Database**  | [MongoDB](https://www.mongodb.com/) (with `motor` for async access)                                       |
| **AI Model**  | [Google Gemini](https://ai.google.dev/)                                                                   |
| **Styling**   | [Tailwind CSS](https://tailwindcss.com/)                                                                  |
| **API Client**| [Axios](https://axios-http.com/)                                                                          |


## ⚙️ Getting Started

Follow these instructions to get the project running on your local machine for development and testing.

### 1. Prerequisites

Make sure you have the following installed on your system:

-   **Python** (version 3.11 or newer)
-   **Node.js** (version 18.x or newer)
-   **Yarn** package manager (`npm install -g yarn`)
-   **MongoDB**: A running instance, either locally or on a cloud service like MongoDB Atlas.
-   **Git** for cloning the repository.

### 2. Clone the Repository

```bash
git clone https://github.com/your-username/rewardsHub.git
cd rewardsHub
```

### 3. Backend Setup

The backend is powered by FastAPI.

**a. Navigate to the backend directory:**
```bash
cd backend
```

**b. Create and activate a virtual environment:**
This isolates the project's Python dependencies.
```bash
# For macOS/Linux
python3 -m venv venv
source venv/bin/activate

# For Windows
python -m venv venv
.\venv\Scripts\activate
```

**c. Install dependencies:**
```bash
pip install -r requirements.txt
```

**d. Set up environment variables:**
The backend requires a `.env` file for configuration. We've provided an example to get you started.

Create a `.env` file in the `backend` directory with the following content:

```ini
# --- .env file for backend ---

# Database Configuration
MONGO_URL=mongodb://localhost:27017
DB_NAME=rewards_db

# Security
SECRET_KEY=generate-a-super-secret-key-for-jwt
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Gemini API Key for Smart Recommendations
# Get your key from https://ai.google.dev/
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
```
> **IMPORTANT**: Replace `YOUR_GEMINI_API_KEY_HERE` with your actual Google Gemini API key. For `SECRET_KEY`, you can use a long, random string.

**e. Run the backend server:**
```bash
uvicorn main:app --reload
```
The backend API will be available at `http://127.0.0.1:8000`, and interactive documentation can be found at `http://127.0.0.1:8000/docs`.

### 4. Frontend Setup

The frontend is a React application.

**a. Open a new terminal** and navigate to the frontend directory:
```bash
cd frontend
```

**b. Install dependencies:**
```bash
yarn install
```

**c. Run the frontend development server:**
```bash
yarn start
```
The frontend application will be available at `http://localhost:3000`. It will automatically proxy API requests to the backend server running on port 8000.

---

## 🔒 Securing API Keys

For production deployments, **do not hardcode your `GEMINI_API_KEY`**. Use environment variables provided by your hosting service or a secrets management tool.

If deploying via **GitHub Actions**, you should:
1.  Store your key as a **Repository Secret** in your GitHub settings (e.g., `GEMINI_API_KEY`).
2.  Pass this secret to your deployment environment as an environment variable.

## 🧪 Running Tests

To run the backend test suite:
```bash
cd backend
# Make sure your virtual environment is active
pytest
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1.  Fork the repository.
2.  Create a new feature branch (`git checkout -b feature/my-amazing-feature`).
3.  Make your changes and commit them with a clear message (`git commit -m 'feat: Add some amazing feature'`).
4.  Push to the branch (`git push origin feature/my-amazing-feature`).
5.  Open a Pull Request.

Please read our `CONTRIBUTING.md` for more details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the `LICENSE` file for details.
