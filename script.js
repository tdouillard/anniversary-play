const state = {
  config: null,
  entries: [],
  cells: new Map(),
  placements: [],
  activeEntry: null,
  errorsVisible: false,
  toastTimer: null,
};

const byId = (id) => document.getElementById(id);
const keyOf = (row, col) => `${row},${col}`;

function cleanAnswer(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z]/g, "");
}

function placePuzzle(entries) {
  function build(ordered, random) {
  const cells = new Map();
  const placements = [];
  const directions = ["across", "down"];

  const addPlacement = (entry, row, col, direction) => {
    const dr = direction === "down" ? 1 : 0;
    const dc = direction === "across" ? 1 : 0;
    placements.push({ entry, row, col, direction, dr, dc });
    [...entry.answer].forEach((letter, index) => {
      const cellKey = keyOf(row + dr * index, col + dc * index);
      const cell = cells.get(cellKey) ?? { row: row + dr * index, col: col + dc * index, letter, directions: new Set(), placements: [] };
      cell.directions.add(direction);
      cell.placements.push(entry.id);
      cells.set(cellKey, cell);
    });
  };

  const bounds = () => {
    const values = [...cells.values()];
    return {
      minRow: Math.min(...values.map((cell) => cell.row)),
      maxRow: Math.max(...values.map((cell) => cell.row)),
      minCol: Math.min(...values.map((cell) => cell.col)),
      maxCol: Math.max(...values.map((cell) => cell.col)),
    };
  };

  ordered.forEach((entry) => {
    if (placements.length === 0) {
      addPlacement(entry, 0, -Math.floor(entry.answer.length / 2), "across");
      return;
    }

    const candidates = [];
    directions.forEach((direction) => {
      const dr = direction === "down" ? 1 : 0;
      const dc = direction === "across" ? 1 : 0;
      const sideDr = dc;
      const sideDc = dr;

      [...cells.values()].forEach((crossingCell) => {
        if (crossingCell.directions.has(direction)) return;
        [...entry.answer].forEach((letter, index) => {
          if (letter !== crossingCell.letter) return;
          const row = crossingCell.row - dr * index;
          const col = crossingCell.col - dc * index;
          const beforeKey = keyOf(row - dr, col - dc);
          const afterKey = keyOf(row + dr * entry.answer.length, col + dc * entry.answer.length);
          if (cells.has(beforeKey) || cells.has(afterKey)) return;

          let intersections = 0;
          let valid = true;
          [...entry.answer].forEach((placedLetter, placedIndex) => {
            const placedRow = row + dr * placedIndex;
            const placedCol = col + dc * placedIndex;
            const current = cells.get(keyOf(placedRow, placedCol));
            if (current) {
              if (current.letter !== placedLetter || current.directions.has(direction)) valid = false;
              else intersections += 1;
            }
            for (const side of [-1, 1]) {
              const neighborKey = keyOf(placedRow + sideDr * side, placedCol + sideDc * side);
              if (cells.has(neighborKey) && !current) valid = false;
            }
          });
          if (!valid || intersections === 0) return;

          const oldBounds = bounds();
          const allRows = [row, row + dr * (entry.answer.length - 1), oldBounds.minRow, oldBounds.maxRow];
          const allCols = [col, col + dc * (entry.answer.length - 1), oldBounds.minCol, oldBounds.maxCol];
          const area = (Math.max(...allRows) - Math.min(...allRows) + 1) * (Math.max(...allCols) - Math.min(...allCols) + 1);
          candidates.push({ row, col, direction, intersections, area, tieBreak: random() });
        });
      });
    });

    candidates.sort((first, second) => second.intersections - first.intersections || first.area - second.area || first.tieBreak - second.tieBreak);
    if (candidates.length) {
      const chosen = candidates[0];
      addPlacement(entry, chosen.row, chosen.col, chosen.direction);
    }
  });

  return { cells, placements };
  }

  let best = { cells: new Map(), placements: [] };
  for (let attempt = 0; attempt < 160; attempt += 1) {
    let seed = (attempt + 1) * 2654435761;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const priorities = new Map(entries.map((entry) => [entry.id, random()]));
    const ordered = [...entries].sort((first, second) => {
      const firstScore = first.answer.length + priorities.get(first.id) * 2.5;
      const secondScore = second.answer.length + priorities.get(second.id) * 2.5;
      return secondScore - firstScore;
    });
    const result = build(ordered, random);
    if (result.placements.length > best.placements.length) best = result;
    if (best.placements.length === entries.length) break;
  }
  return best;
}

function assignNumbers(placements) {
  const starts = new Map();
  [...placements]
    .sort((first, second) => first.row - second.row || first.col - second.col)
    .forEach((placement) => {
      const startKey = keyOf(placement.row, placement.col);
      if (!starts.has(startKey)) starts.set(startKey, starts.size + 1);
      placement.number = starts.get(startKey);
    });
}

function renderClues(direction) {
  const list = byId(`${direction}-clues`);
  list.replaceChildren();
  state.placements
    .filter((placement) => placement.direction === direction)
    .sort((first, second) => first.number - second.number)
    .forEach((placement) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "clue-button";
      button.dataset.entryId = placement.entry.id;
      const number = document.createElement("span");
      number.className = "clue-number";
      number.textContent = placement.number;
      const text = document.createElement("span");
      text.className = "clue-text";
      text.textContent = placement.entry.clue;
      button.append(number, text);
      button.addEventListener("click", () => selectEntry(placement.entry.id, true));
      item.append(button);
      list.append(item);
    });
}

function renderReveals() {
  const list = byId("reveal-list");
  list.replaceChildren();
  state.config.themes.forEach((theme, index) => {
    const item = document.createElement("div");
    item.className = "reveal-item";
    item.dataset.themeId = theme.id;
    const symbol = document.createElement("span");
    symbol.className = "reveal-symbol";
    symbol.textContent = String(index + 1).padStart(2, "0");
    const word = document.createElement("span");
    word.className = "reveal-word";
    word.textContent = "••••••••";
    item.append(symbol, word);
    list.append(item);
  });
}

function inputFor(cellKey) {
  return document.querySelector(`[data-cell="${cellKey}"] input`);
}

function selectEntry(entryId, focusInput) {
  const placement = state.placements.find((candidate) => candidate.entry.id === entryId);
  if (!placement) return;
  state.activeEntry = entryId;
  document.querySelectorAll(".clue-button").forEach((button) => button.classList.toggle("is-active", button.dataset.entryId === entryId));
  document.querySelectorAll(".cell").forEach((cell) => {
    cell.classList.toggle("is-active", cell.dataset.cell && state.cells.get(cell.dataset.cell)?.placements.includes(entryId));
  });
  byId("active-hint").textContent = `${placement.number} ${placement.direction === "across" ? "horizontale" : "verticale"}`;
  if (focusInput) {
    const firstEmpty = placement.entry.cells.find((cellKey) => !inputFor(cellKey).value);
    inputFor(firstEmpty || placement.entry.cells[0])?.focus();
  }
}

function setActiveFromCell(cell) {
  if (state.activeEntry && cell.placements.includes(state.activeEntry)) return;
  const placement = state.placements.find((candidate) => cell.placements.includes(candidate.entry.id));
  if (placement) selectEntry(placement.entry.id, false);
}

function onLetterInput(event) {
  const input = event.currentTarget;
  const letter = cleanAnswer(input.value).slice(-1);
  input.value = letter;
  state.errorsVisible = false;
  if (letter) {
    const placement = state.placements.find((candidate) => candidate.entry.id === state.activeEntry && candidate.entry.cells.includes(input.parentElement.dataset.cell));
    const nextCell = placement?.entry.cells[placement.entry.cells.indexOf(input.parentElement.dataset.cell) + 1];
    if (nextCell) inputFor(nextCell)?.focus();
  }
  updateDisplay();
}

function onLetterKeydown(event) {
  const input = event.currentTarget;
  const placement = state.placements.find((candidate) => candidate.entry.id === state.activeEntry && candidate.entry.cells.includes(input.parentElement.dataset.cell));
  if (event.key === "Backspace" && input.value === "") {
    const previousCell = placement?.entry.cells[placement.entry.cells.indexOf(input.parentElement.dataset.cell) - 1];
    if (previousCell) {
      event.preventDefault();
      inputFor(previousCell)?.focus();
    }
    return;
  }
  if (event.key === "Enter" && placement) {
    const firstEmpty = placement.entry.cells.find((cellKey) => !inputFor(cellKey).value);
    inputFor(firstEmpty || placement.entry.cells[0])?.focus();
    event.preventDefault();
    return;
  }
  const moves = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
  if (moves[event.key]) {
    const [rowDelta, colDelta] = moves[event.key];
    const cell = state.cells.get(input.parentElement.dataset.cell);
    const neighbor = inputFor(keyOf(cell.row + rowDelta, cell.col + colDelta));
    if (neighbor) {
      event.preventDefault();
      neighbor.focus();
    }
  }
}

function isSolved(placement) {
  return placement.entry.cells.every((cellKey) => inputFor(cellKey)?.value === state.cells.get(cellKey).letter);
}

function updateDisplay() {
  const solved = state.placements.filter(isSolved);
  const solvedIds = new Set(solved.map((placement) => placement.entry.id));
  const solvedCells = new Set(solved.flatMap((placement) => placement.entry.cells));
  document.querySelectorAll(".cell[data-cell]").forEach((wrapper) => {
    const input = wrapper.querySelector("input");
    wrapper.classList.toggle("is-highlighted", solvedCells.has(wrapper.dataset.cell));
    wrapper.classList.toggle("is-incorrect", state.errorsVisible && input.value && input.value !== input.dataset.answer);
  });
  document.querySelectorAll(".clue-button").forEach((button) => button.classList.toggle("is-solved", solvedIds.has(button.dataset.entryId)));

  const total = state.placements.length;
  byId("progress-count").textContent = `${solved.length} / ${total}`;
  byId("progress-bar").style.width = `${total ? (solved.length / total) * 100 : 0}%`;
  document.querySelector(".progress-track").setAttribute("aria-valuemax", total);
  document.querySelector(".progress-track").setAttribute("aria-valuenow", solved.length);

  let revealedCount = 0;
  state.config.themes.forEach((theme) => {
    const themeEntries = state.placements.filter((placement) => Array.isArray(placement.entry.theme)
      ? placement.entry.theme.includes(theme.id)
      : placement.entry.theme === theme.id);
    const revealed = themeEntries.length > 0 && themeEntries.every((placement) => solvedIds.has(placement.entry.id));
    const item = document.querySelector(`[data-theme-id="${theme.id}"]`);
    item.classList.toggle("is-revealed", revealed);
    item.querySelector(".reveal-word").textContent = revealed ? theme.reveal : "••••••••";
    if (revealed) revealedCount += 1;
  });
  byId("reveal-count").textContent = `${revealedCount} / ${state.config.themes.length}`;
  const allThemesRevealed = state.config.themes.length > 0 && revealedCount === state.config.themes.length;
  byId("completion-image").hidden = !allThemesRevealed;

  if (solved.length === total && total > 0) {
    byId("reveal-note").textContent = state.config.completionMessage || "Tout est trouve. A toi de jouer !";
  } else if (revealedCount) {
    byId("reveal-note").textContent = `${revealedCount} surprise${revealedCount > 1 ? "s" : ""} revelee${revealedCount > 1 ? "s" : ""}. Continue pour trouver les autres.`;
  } else {
    byId("reveal-note").textContent = "Trouve tous les mots d'une famille pour reveler son theme.";
  }
}

function showToast(message) {
  const toast = byId("toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function checkAnswers() {
  state.errorsVisible = true;
  updateDisplay();
  const solvedCount = state.placements.filter(isSolved).length;
  if (solvedCount === state.placements.length) showToast("Bravo, toutes les surprises sont revelees !");
  else showToast("Les cases vertes sont justes. Revois les cases roses.");
}

function resetPuzzle() {
  document.querySelectorAll(".cell input").forEach((input) => { input.value = ""; });
  state.errorsVisible = false;
  state.activeEntry = null;
  document.querySelectorAll(".clue-button").forEach((button) => button.classList.remove("is-active"));
  document.querySelectorAll(".cell").forEach((cell) => cell.classList.remove("is-active"));
  byId("active-hint").textContent = "Choisis un mot";
  updateDisplay();
  showToast("La grille est prete a recommencer.");
}

function renderPuzzle(generated) {
  state.cells = generated.cells;
  state.placements = generated.placements;
  assignNumbers(state.placements);
  const rowValues = [...state.cells.values()].map((cell) => cell.row);
  const colValues = [...state.cells.values()].map((cell) => cell.col);
  const minRow = Math.min(...rowValues);
  const minCol = Math.min(...colValues);
  const maxRow = Math.max(...rowValues);
  const maxCol = Math.max(...colValues);
  const rows = maxRow - minRow + 1;
  const cols = maxCol - minCol + 1;
  const grid = byId("crossword");
  grid.style.gridTemplateColumns = `repeat(${cols}, var(--cell-size))`;
  grid.style.gridTemplateRows = `repeat(${rows}, var(--cell-size))`;
  grid.replaceChildren();

  const numberAt = new Map();
  state.placements.forEach((placement) => {
    placement.entry.cells = [...placement.entry.answer].map((_, index) => keyOf(placement.row + placement.dr * index, placement.col + placement.dc * index));
    numberAt.set(keyOf(placement.row, placement.col), placement.number);
  });
  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      const cell = state.cells.get(keyOf(row, col));
      const wrapper = document.createElement("div");
      wrapper.className = "cell";
      if (!cell) {
        wrapper.setAttribute("aria-hidden", "true");
      } else {
        wrapper.dataset.cell = keyOf(row, col);
        if (numberAt.has(keyOf(row, col))) {
          const number = document.createElement("span");
          number.className = "cell-number";
          number.textContent = numberAt.get(keyOf(row, col));
          wrapper.append(number);
        }
        const input = document.createElement("input");
        input.type = "text";
        input.maxLength = 1;
        input.autocomplete = "off";
        input.autocapitalize = "characters";
        input.spellcheck = false;
        input.dataset.answer = cell.letter;
        input.setAttribute("aria-label", `Ligne ${row - minRow + 1}, colonne ${col - minCol + 1}`);
        input.addEventListener("input", onLetterInput);
        input.addEventListener("keydown", onLetterKeydown);
        input.addEventListener("focus", () => setActiveFromCell(cell));
        wrapper.append(input);
      }
      grid.append(wrapper);
    }
  }

  renderClues("across");
  renderClues("down");
  renderReveals();
  byId("puzzle-credit").textContent = state.config.credit || "Une grille a resoudre";
  byId("loading-state").hidden = true;
  updateDisplay();
}

async function start() {
  try {
    const response = await fetch(`./puzzle.json?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Chargement JSON impossible (${response.status})`);
    state.config = await response.json();
    byId("theme-count").textContent = state.config.themes.length;
    byId("page-description").content = `Une grille de mots croises interactive pour decouvrir ${state.config.themes.length} surprises.`;
    state.entries = state.config.words.map((word, index) => ({
      ...word,
      id: word.id || `word-${index + 1}`,
      answer: cleanAnswer(word.answer),
      cells: [],
    }));
    const generated = placePuzzle(state.entries);
    const placedIds = new Set(generated.placements.map((placement) => placement.entry.id));
    const missing = state.entries.filter((entry) => !placedIds.has(entry.id));
    if (missing.length) throw new Error(`Impossible de croiser ces mots : ${missing.map((entry) => entry.answer).join(", ")}`);
    renderPuzzle(generated);
  } catch (error) {
    byId("loading-state").textContent = `Impossible de charger la grille : ${error.message}`;
    console.error(error);
  }
}

byId("check-button").addEventListener("click", checkAnswers);
byId("reset-button").addEventListener("click", resetPuzzle);
start();