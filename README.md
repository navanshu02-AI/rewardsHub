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

## 🗂️ Project Structure

-   `backend/`: FastAPI service, Pydantic models, and MongoDB data access helpers.
-   `frontend/`: React app with Tailwind styling, shared UI components, and API client utilities.
-   `docs/`: Release and QA playbooks, including the manual regression checklist.
-   `tests/`: Cross-cutting test assets used by both backend and frontend suites.

If you are exploring a specific feature, start in the corresponding folder above; most domain logic lives under `backend/app` and `frontend/src`.


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

### Seed role hierarchies & reporting lines

Recognition permissions depend on accurate reporting structures. After the database connection is configured:

1. Normalise legacy role labels and ensure the `manager_id` field exists by running the helper script:

   ```bash
   cd backend
   python -m scripts.backfill_roles_and_managers
   ```

2. Seed at least one hierarchy that covers every role. The snippet below upserts an HR admin, a people manager, and two employees so the test matrix has real data (check this):

   ```bash
   cd backend
   python - <<'PY'
   import asyncio
   from datetime import datetime

   from app.database.connection import connect_to_mongo, close_mongo_connection, get_database
   from app.models.enums import UserRole

   async def seed_hierarchy() -> None:
       await connect_to_mongo()
       db = await get_database()
       timestamp = datetime.utcnow()
       users = [
           {
               "id": "hr-1",
               "email": "hr.admin@example.com",
               "password_hash": "not-used-in-seed",
               "first_name": "Harper",
               "last_name": "Rowe",
               "role": UserRole.HR_ADMIN.value,
               "points_balance": 0,
               "total_points_earned": 0,
               "recognition_count": 0,
               "created_at": timestamp,
               "updated_at": timestamp,
               "is_active": True,
           },
           {
               "id": "manager-1",
               "email": "maria.manager@example.com",
               "password_hash": "not-used-in-seed",
               "first_name": "Maria",
               "last_name": "Diaz",
               "role": UserRole.MANAGER.value,
               "manager_id": "hr-1",
               "department": "Engineering",
               "points_balance": 0,
               "total_points_earned": 0,
               "recognition_count": 0,
               "created_at": timestamp,
               "updated_at": timestamp,
               "is_active": True,
           },
           {
               "id": "employee-1",
               "email": "eli.employee@example.com",
               "password_hash": "not-used-in-seed",
               "first_name": "Eli",
               "last_name": "Nguyen",
               "role": UserRole.EMPLOYEE.value,
               "manager_id": "manager-1",
               "department": "Engineering",
               "points_balance": 0,
               "total_points_earned": 0,
               "recognition_count": 0,
               "created_at": timestamp,
               "updated_at": timestamp,
               "is_active": True,
           },
           {
               "id": "employee-2",
               "email": "pat.peer@example.com",
               "password_hash": "not-used-in-seed",
               "first_name": "Pat",
               "last_name": "Peer",
               "role": UserRole.EMPLOYEE.value,
               "manager_id": "manager-1",
               "department": "Engineering",
               "points_balance": 0,
               "total_points_earned": 0,
               "recognition_count": 0,
               "created_at": timestamp,
               "updated_at": timestamp,
               "is_active": True,
           },
       ]

       for user in users:
           await db.users.update_one({"id": user["id"]}, {"$set": user}, upsert=True)

       await close_mongo_connection()

   asyncio.run(seed_hierarchy())
   PY
   ```

3. Repeat the pattern for additional departments or executives as needed. The backend tests expect `manager_id` values to be populated for managers and their reports.

4. Use the privileged provisioning endpoints to keep hierarchy maintenance in HR/admin hands:

   - `POST /api/v1/users/provision` (requires HR/Admin/Executive token) creates a user and lets you set `role` and `manager_id` in one step.
   - `PUT /api/v1/users/{user_id}/reporting` (requires HR/Admin/Executive token) updates a user's `role` or `manager_id` when teams change.

   Public signup remains employee-only; only privileged actors can assign managers or elevated roles.

5. Bootstrap your first HR/Admin account (needed to call the privileged endpoints) with the helper script:

   ```bash
   cd backend
   python -m scripts.create_admin hr.admin@example.com "StrongPassword123" Harper Rowe --role hr_admin
   ```

   The script will create or update the user with a hashed password and the selected privileged role (`hr_admin` by default; pass `--role executive` or `--role c_level` for other elevated roles). Log in with this account via `POST /api/v1/auth/login` to obtain a token, then use `POST /api/v1/users/provision` to create additional HR/Admin/Manager users with their reporting lines.

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

## 🧭 Role-Based Recognition Matrix

| Role                | Peer scope eligibility                                      | Direct report scope                      | Company-wide scope | Points control                 |
| ------------------- | ----------------------------------------------------------- | ---------------------------------------- | ------------------ | ------------------------------ |
| Employee            | ✅ Same `manager_id` or, when unset, same `department`       | ❌                                        | ❌                  | Fixed at 10 points             |
| Manager             | ✅ Same `manager_id` or `department` fallback                | ✅ Direct reports only                    | ❌                  | Fixed at 10 points             |
| HR Admin            | ✅                                                            | ✅                                        | ✅                  | Custom 10–10,000 points        |
| Executive / C-Level | ✅                                                            | ✅                                        | ✅                  | Custom 10–10,000 points        |

### Recognition API payload examples

**Peer recognition from an employee**

```json
POST /api/v1/recognitions
{
  "to_user_id": "employee-2",
  "message": "Jumped in to unblock the release train!",
  "scope": "peer",
  "recognition_type": "peer_to_peer"
}
```

**Company-wide recognition from HR with custom points**

```json
POST /api/v1/recognitions
{
  "to_user_id": "employee-1",
  "message": "Delivered the customer summit flawlessly",
  "scope": "global",
  "recognition_type": "company_wide",
  "points_awarded": 250
}
```

The backend enforces the matrix above and responds with HTTP 403 whenever a user selects a scope outside their role or targets a teammate who is not eligible.

## 🧪 Running Tests

```bash
# Backend role and balance rules
cd backend
pytest backend/tests

# Frontend recognition modal interactions (watch mode disabled for CI)
cd ../frontend
yarn test --watchAll=false
```

Each command can be run independently; the backend suite mocks MongoDB while the frontend suite uses Jest and React Testing Library.

## ✅ Release QA

Manual regression steps for the recognition permissions live in [`docs/manual-qa-checklist.md`](docs/manual-qa-checklist.md). Run through the checklist before cutting a release to confirm that forbidden scenarios return HTTP 403 and that privileged roles can still complete positive recognition flows.

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
