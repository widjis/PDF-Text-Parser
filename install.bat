@echo off
echo Installing PDF Text Parser dependencies...
echo.

echo Installing Node.js packages...
npm install

echo.
echo Installation complete!
echo.
echo Available commands:
echo   npm start          - Run CLI interface
echo   npm run server     - Start web server
echo   npm test           - Run test suite
echo   npm run dev        - Start with nodemon (development)
echo.
echo Examples:
echo   node index.js document.pdf
echo   node server.js
echo   node test.js
echo.
pause