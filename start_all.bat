@echo off
echo Starting Abhimata Cafe Management System...
echo.
echo Starting Backend Server...
start "Backend Server" cmd /k "cd backend && python -m venv venv && call venv\Scripts\activate && pip install -r requirements.txt && python app.py"
timeout /t 5 /nobreak >nul
echo.
echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd frontend && npm install && npm run dev"
echo.
echo Both servers are starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Default login credentials:
echo Username: admin
echo Password: admin123
echo.
pause
