if [ ! -f .env ]; then
  # -p     same as --preserve=mode,ownership,timestamps
  cp -p .env.example .env
fi
