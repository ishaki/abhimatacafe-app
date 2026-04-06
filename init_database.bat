@echo off
echo Initializing Abhimata Cafe Database...
cd backend
python init_db.py
echo.
echo Database initialization complete!
echo You can now start the application using start_all.bat
pause
