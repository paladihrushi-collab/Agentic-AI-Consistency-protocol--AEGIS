#!/bin/bash
CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
echo -e "${CYAN}${BOLD}\n  AEGIS v2.0 — Groq Edition (FREE · Llama 3.3 70B)\n${NC}"

[ -f "backend/.env" ] && source backend/.env 2>/dev/null || true

if [ -z "$GROQ_API_KEY" ]; then
  echo -e "${RED}  No GROQ_API_KEY found.${NC}"
  echo "  Get a FREE key → https://console.groq.com → API Keys → Create"
  read -p "  Paste your key here (or Enter for demo mode): " USER_KEY
  if [ ! -z "$USER_KEY" ]; then
    echo "GROQ_API_KEY=$USER_KEY" > backend/.env
    echo "VITE_GROQ_API_KEY=$USER_KEY" > frontend/.env
    export GROQ_API_KEY="$USER_KEY"
    echo -e "${GREEN}  ✓ Key saved!${NC}"
  else
    echo -e "${YELLOW}  Demo mode — agents use smart fallback responses${NC}"
  fi
else
  echo -e "${GREEN}  ✓ Groq API key found${NC}"
  echo "VITE_GROQ_API_KEY=$GROQ_API_KEY" > frontend/.env
fi

echo -e "\n${CYAN}  Setting up backend...${NC}"
cd backend
[ ! -d "venv" ] && (python3 -m venv venv 2>/dev/null || python -m venv venv)
source venv/bin/activate 2>/dev/null || . venv/Scripts/activate 2>/dev/null || true
pip install -r requirements.txt -q --disable-pip-version-check
echo -e "${GREEN}  ✓ Backend ready${NC}"
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..
sleep 2

echo -e "${CYAN}  Setting up frontend...${NC}"
cd frontend
[ ! -d "node_modules" ] && npm install -q
echo -e "${GREEN}  ✓ Frontend ready${NC}"
npm run dev &
FRONTEND_PID=$!
cd ..
sleep 2

echo -e "\n${GREEN}${BOLD}  ✓ AEGIS is running!${NC}"
echo -e "  App      →  http://localhost:5173"
echo -e "  API Docs →  http://localhost:8000/docs"
echo -e "  Model    →  llama-3.3-70b-versatile (Groq FREE)\n"
echo -e "  Press ${RED}Ctrl+C${NC} to stop\n"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
