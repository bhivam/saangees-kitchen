#!/bin/bash
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <iterations>"
  exit 1
fi

for ((i=1; i<=$1; i++)); do
  echo "=============================="
  echo "Iteration $i"
  echo "=============================="

  tmpfile="$(mktemp)"

  docker sandbox run claude --permission-mode acceptEdits \
    -p "@PRD.md @progress.txt 1. Find the highest-priority task and implement it. 2. Run your tests and type checks with 'pnpm lint' in the backend and frontend repos. 3. Update the PRD with what was done. 4. Append your progress to progress.txt. 5. Commit your changes and keep the commit messages skimpy, no need to say that it is co-authored by claud opus. ONLY WORK ON A SINGLE TASK. If the PRD is complete, output <promise>COMPLETE</promise>." \
    | tee "$tmpfile"

  if grep -q "<promise>COMPLETE</promise>" "$tmpfile"; then
    echo
    echo "✅ PRD complete after $i iterations."
    rm -f "$tmpfile"
    exit 0
  fi

  rm -f "$tmpfile"
done
