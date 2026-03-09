## Code Style

### Principles
- **DRY**: Don't Repeat Yourself
- **Fail fast**: Code should reveal bugs as early as possible
- **One purpose per variable**: Each variable serves exactly one role
- **Good names over comments**: Prefer clear naming; comment only where code can't explain itself
- **Functions return results**: Don't print from functions
- **No magic numbers**: Use named constants
- **No special-case code**: Generalize where possible
- **No global variables**
- **Use whitespace**: Aid readability with formatting

### TypeScript/React
- Compose small components; avoid massive JSX blocks
- Avoid `useEffect` unless absolutely necessary
- Linting/formatting handled by Biome (`bun run check`)

### Python
- Linting/formatting handled by Ruff + ty (`make check`)
- Avoid unnecessary try/catch blocks
