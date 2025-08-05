# Notedly - Frontend-Backend Integration

This document explains how to set up and run the integrated Notedly application with the React frontend and FastAPI backend.

## Project Structure

```
Notedly/
├── src/                    # React frontend
│   ├── pages/
│   │   └── LearningHub.tsx # Main learning interface
│   └── ...
├── backend/
│   └── Notedly/           # FastAPI backend
│       ├── main.py        # Main FastAPI application
│       ├── requirements.txt # Python dependencies
│       └── start_backend.py # Backend startup script
└── vite.config.ts         # Vite configuration with proxy
```

## Backend Setup

### 1. Install Python Dependencies

Navigate to the backend directory and install the required packages:

```bash
cd backend/Notedly
pip install -r requirements.txt
```

### 2. Environment Variables

The backend requires several environment variables. Create a `.env` file in the `backend/Notedly/` directory:

```bash
# Create .env file
touch backend/Notedly/.env
```

Add the following variables to your `.env` file (you'll need to get API keys for these services):

```env
# OpenAI API Key (for LLM responses)
OPENAI_API_KEY=your_openai_api_key_here

# Nomic API Key (for embeddings)
NOMIC_API_KEY=your_nomic_api_key_here

# Other required API keys based on your backend implementation
```

### 3. Start the Backend Server

You can start the backend in two ways:

**Option A: Using the startup script**
```bash
cd backend/Notedly
python start_backend.py
```

**Option B: Direct uvicorn command**
```bash
cd backend/Notedly
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

The backend will be available at: `http://127.0.0.1:8000`

## Frontend Setup

### 1. Install Node.js Dependencies

From the project root:

```bash
npm install
```

### 2. Start the Frontend Development Server

```bash
npm run dev
```

The frontend will be available at: `http://localhost:8080`

## Integration Details

### API Endpoints

The frontend communicates with the backend through these endpoints:

- `POST /api/doc` - Process a document URL
- `POST /api/get_response` - Get AI responses to questions

### Proxy Configuration

The Vite development server is configured to proxy API requests:

- Frontend requests to `/api/*` are proxied to `http://127.0.0.1:8000/*`
- CORS is configured on the backend to allow requests from the frontend

### How It Works

1. **Document Processing**: When a user uploads a file, the frontend sends the document URL to the backend for processing
2. **Chat Interface**: Users can ask questions about the processed document through the chat interface
3. **Session Management**: The backend maintains chat history using session IDs
4. **AI Responses**: The backend uses LLM and embeddings to provide contextual responses

## Usage

1. Start both the backend and frontend servers
2. Open `http://localhost:8080` in your browser
3. Navigate to the Learning Hub page
4. Upload a document (currently expects a URL - you may need to modify for file uploads)
5. Use the chat interface to ask questions about the document
6. Generate flashcards and quizzes (currently shows sample data)

## Troubleshooting

### Backend Issues

1. **Missing Dependencies**: Run `pip install -r requirements.txt`
2. **API Key Errors**: Check your `.env` file and ensure all required API keys are set
3. **Port Already in Use**: Change the port in `main.py` or kill the process using port 8000

### Frontend Issues

1. **Proxy Errors**: Check that the backend is running on port 8000
2. **CORS Errors**: Ensure the backend CORS configuration includes the frontend URL
3. **Build Errors**: Run `npm install` to ensure all dependencies are installed

### Integration Issues

1. **API Calls Failing**: Check the browser's Network tab for detailed error messages
2. **Session Issues**: The backend maintains session state - restart the backend to clear sessions
3. **Document Processing**: The backend expects document URLs, not file uploads. You may need to implement file upload functionality

## Development Notes

- The backend uses in-memory storage for document processing and chat history
- The frontend uses sample data for flashcards and quizzes since these features aren't implemented in the backend
- File upload functionality needs to be implemented to handle actual file uploads instead of URLs
- The audio generation feature connects to a separate Flask backend on port 5555

## Next Steps

1. Implement file upload functionality in the backend
2. Add flashcard and quiz generation endpoints
3. Implement proper file storage instead of in-memory caching
4. Add user authentication and persistent sessions
5. Implement the audio generation feature in the FastAPI backend 