# RewardsHub - Employee Rewards & Recognition System

A modern fullstack application for employee rewards and recognition management, built with FastAPI and React.

## 🚀 Features

- **User Management**: Secure authentication and user profiles
- **Rewards Catalog**: Browse and redeem various rewards
- **Recognition System**: Give and receive peer recognition
- **Personalized Recommendations**: AI-powered reward suggestions
- **User Preferences**: Customizable reward preferences
- **Modern UI**: Responsive design with Tailwind CSS

## 🛠️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **MongoDB** - NoSQL database with Motor async driver
- **JWT Authentication** - Secure token-based authentication
- **Pydantic** - Data validation and serialization

### Frontend
- **React 19** - Modern UI library
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Axios** - HTTP client for API communication

## 📁 Project Structure

```
├── backend/           # FastAPI backend application
│   ├── app/          # Application modules
│   │   ├── api/      # API routes and endpoints
│   │   ├── core/     # Core configuration and security
│   │   ├── database/ # Database connection and models
│   │   ├── models/   # Pydantic models
│   │   └── services/ # Business logic services
│   ├── main.py       # Application entry point
│   └── requirements.txt
├── frontend/         # React frontend application
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── contexts/   # React contexts
│   │   ├── pages/      # Page components
│   │   └── index.tsx   # Application entry point
│   └── package.json
└── tests/            # Test suite
    └── backend_test.py
```

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- MongoDB instance
- Yarn package manager

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB URL and other configurations
   ```

5. Start the backend server:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

3. Start the development server:
   ```bash
   yarn start
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## 🧪 Testing

Run the comprehensive backend test suite:
```bash
cd tests
python backend_test.py
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔧 Configuration

The application supports the following environment variables:

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=rewards_system
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=24
```

### Frontend
```
REACT_APP_BACKEND_URL=http://localhost:8000
```

## 📚 API Documentation

Once the backend is running, visit http://localhost:8000/docs for interactive API documentation powered by Swagger/OpenAPI.

## 🎯 Development

### Code Style
- Backend: Follow PEP 8 guidelines
- Frontend: Use Prettier and ESLint configurations
- TypeScript: Strict mode enabled

### Project Guidelines
- Use meaningful commit messages
- Write tests for new features
- Update documentation for API changes
- Follow the existing project structure
