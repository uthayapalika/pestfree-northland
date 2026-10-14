# Pest-Free Northland Tracker (backend)

1. Create an environment and install:  python -m venv .venv
   then activate it and run:  pip install -r requirements.txt
2. Create sample data:  python -m app.seed
3. Start the server:  uvicorn app.main:app
   Open http://127.0.0.1:8000/docs

Demo logins:
  coordinator@example.com / Coord1234
  volunteer@example.com   / Volun1234

Run tests:  python -m pytest

