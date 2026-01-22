@echo off
echo Starting Centum Bob applications...
echo.
echo Backend: http://localhost:9101
echo Frontend: http://localhost:9102
echo Viewer: http://localhost:9103
echo.
echo Press Ctrl+C to stop all services
echo.

start "Backend" cmd /k "cd backend && npm start"
start "Frontend" cmd /k "cd frontend && npm run dev"
start "Viewer" cmd /k "cd viewer && npm run dev"

echo All services started in separate windows
