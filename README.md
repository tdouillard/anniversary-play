# Les mots surprises

Static French crossword game, designed to run directly on GitHub Pages. The board is generated in the browser from `puzzle.json`; no build step or server-side code is required.

## Run locally

Serve the project directory over HTTP so the browser can load the JSON file:

```sh
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Publish with GitHub Pages

Push the project files to a GitHub repository. In **Settings > Pages**, choose **Deploy from a branch**, select the branch and the repository root (`/`), then save. The published page uses `index.html` and loads `puzzle.json` from the same directory.

## Edit the puzzle

Update `puzzle.json`:

- `themes` defines each reveal. Every theme needs a unique `id` and a `reveal` string.
- `words` defines the answer, clue, and owning theme for each entry. Each word's `theme` must match a theme `id`.
- `answer` values may contain spaces or accents; the grid removes them when placing letters.
- Answers are placed as a connected crossword. If the generator cannot place every word, the page reports the unplaced answers; try changing the word list.

The theme is revealed after all its answers have been completed. Correctly completed words and their shared letters are highlighted in green.