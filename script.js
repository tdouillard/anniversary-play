const state = {
  config: null,
  entries: [],
  cells: new Map(),
  placements: [],
  activeEntry: null,
  errorsVisible: false,
  toastTimer: null,
  language: "fr",
};

const byId = (id) => document.getElementById(id);
const keyOf = (row, col) => `${row},${col}`;
const interfaceText = {
  fr: {
    brandSuffix: "petits mystères",
    homeLink: "Les mots surprises, accueil",
    edition: "ÉDITION ANNIVERSAIRE",
    eyebrow: "Une surprise à chaque croisement",
    titleFirst: "Les mots",
    titleSecond: "surprises.",
    introCopy: "Complète les définitions. Chaque famille de mots fera apparaître une nouvelle catégorie liée au cadeau.",
    gameLabel: "Grille de mots croisés interactive",
    checkLetters: "Vérifier les lettres",
    restart: "Recommencer",
    progress: "Progression",
    gridLabel: "Grille de mots croisés",
    loading: "Préparation de la grille...",
    boardNote: "Les cases vertes signalent un mot trouvé.",
    discover: "À découvrir",
    revealTitle: "Les surprises",
    completionImageAlt: "Illustration d'un parcours de golf au coucher du soleil, d'une raquette et d'un plat gastronomique",
    revealNote: "Les surprises se révèlent au fur et à mesure que tu complètes les mots de la grille.",
    cluesLabel: "Définitions",
    cluesTitle: "Définitions",
    chooseWord: "Choisis un mot",
    across: "Horizontales",
    down: "Verticales",
    footer: "UN MOT APRÈS L'AUTRE",
    languageSwitch: "Passer en anglais",
    singularFound: "mot trouvé",
    pluralFound: "mots trouvés",
    acrossHint: "horizontale",
    downHint: "verticale",
    mobileAcross: "Horizontale",
    mobileDown: "Verticale",
    completed: "Bravo, toutes les surprises sont révélées !",
    incorrect: "Les cases vertes sont justes. Revois les cases roses.",
    restartToast: "La grille est prête à recommencer.",
    noReveals: "Trouve tous les mots d'une famille pour révéler son thème.",
    continue: "Continue pour trouver les autres.",
    loadError: "Impossible de charger la grille. Vérifie ta connexion et réessaie.",
  },
  en: {
    brandSuffix: "little mysteries",
    homeLink: "Surprise Words, home",
    edition: "ANNIVERSARY EDITION",
    eyebrow: "A surprise at every crossing",
    titleFirst: "Surprise",
    titleSecond: "words.",
    introCopy: "Solve the clues. Each word family will reveal a new category connected to the gift.",
    gameLabel: "Interactive crossword grid",
    checkLetters: "Check letters",
    restart: "Start over",
    progress: "Progress",
    gridLabel: "Crossword grid",
    loading: "Preparing the grid...",
    boardNote: "Green squares mark a word you've found.",
    discover: "To discover",
    revealTitle: "The surprises",
    completionImageAlt: "Illustration of a golf course at sunset, a racket, and a gourmet dish",
    revealNote: "Surprises are revealed as you complete words in the grid.",
    cluesLabel: "Clues",
    cluesTitle: "Clues",
    chooseWord: "Choose a word",
    across: "Across",
    down: "Down",
    footer: "ONE WORD AT A TIME",
    languageSwitch: "Switch to French",
    singularFound: "word found",
    pluralFound: "words found",
    acrossHint: "across",
    downHint: "down",
    mobileAcross: "Across",
    mobileDown: "Down",
    completed: "Congratulations, all the surprises have been revealed!",
    incorrect: "Green squares are correct. Check the pink squares.",
    restartToast: "The grid is ready to start again.",
    noReveals: "Find every word in a family to reveal its theme.",
    continue: "Keep going to find the rest.",
    loadError: "Unable to load the puzzle. Check your connection and try again.",
  },
};

function puzzleTranslation(section, id, field, fallback) {
  const translated = state.config?.translations?.[state.language]?.[section]?.[id];
  return (typeof translated === "string" ? translated : translated?.[field]) ?? fallback;
}

function applyLanguage() {
  const copy = interfaceText[state.language];
  document.documentElement.lang = state.language;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = copy[element.dataset.i18n];
  });
  [["title", "title"], ["aria-label", "ariaLabel"], ["alt", "alt"]].forEach(([attribute, dataKey]) => {
    document.querySelectorAll(`[data-i18n-${attribute}]`).forEach((element) => {
      element.setAttribute(attribute, copy[element.dataset[`i18n${dataKey[0].toUpperCase()}${dataKey.slice(1)}`]]);
    });
  });
  const languageButton = byId("language-toggle");
  languageButton.textContent = state.language === "fr" ? "EN" : "FR";
  languageButton.setAttribute("aria-label", copy.languageSwitch);
  languageButton.title = copy.languageSwitch;
  byId("found-words").textContent = copy.pluralFound;
  byId("page-description").content = state.language === "fr"
    ? `Une grille de mots croisés interactive pour découvrir ${state.config?.themes.length ?? 3} surprises.`
    : `An interactive crossword to discover ${state.config?.themes.length ?? 3} surprises.`;
  if (state.config) {
    document.title = state.config.translations?.[state.language]?.title ?? state.config.title;
    byId("puzzle-credit").textContent = state.config.translations?.[state.language]?.credit ?? state.config.credit;
    document.querySelectorAll(".clue-button").forEach((button) => {
      const entry = state.entries.find((candidate) => candidate.id === button.dataset.entryId);
      if (entry) button.querySelector(".clue-text").textContent = puzzleTranslation("words", entry.id, "clue", entry.clue);
    });
    document.querySelectorAll(".cell input").forEach((input) => {
      input.setAttribute("aria-label", state.language === "fr"
        ? `Ligne ${input.dataset.gridRow}, colonne ${input.dataset.gridColumn}`
        : `Row ${input.dataset.gridRow}, column ${input.dataset.gridColumn}`);
    });
    if (state.activeEntry) {
      const placement = state.placements.find((candidate) => candidate.entry.id === state.activeEntry);
      if (placement) {
        byId("active-hint").textContent = `${placement.number} ${copy[placement.direction === "across" ? "acrossHint" : "downHint"]}`;
        byId("mobile-clue-number").textContent = `${state.language === "fr" ? "N°" : "No."} ${placement.number} | ${copy[placement.direction === "across" ? "mobileAcross" : "mobileDown"]}`;
        byId("mobile-clue-text").textContent = puzzleTranslation("words", placement.entry.id, "clue", placement.entry.clue);
      }
    }
    updateDisplay();
  }
  if (state.loadFailed) byId("loading-state").textContent = copy.loadError;
}

function toggleLanguage() {
  state.language = state.language === "fr" ? "en" : "fr";
  try {
    localStorage.setItem("surprise-words-language", state.language);
  } catch {}
  applyLanguage();
}

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
      text.textContent = puzzleTranslation("words", placement.entry.id, "clue", placement.entry.clue);
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
  const copy = interfaceText[state.language];
  byId("active-hint").textContent = `${placement.number} ${copy[placement.direction === "across" ? "acrossHint" : "downHint"]}`;
  byId("mobile-clue-number").textContent = `${state.language === "fr" ? "N°" : "No."} ${placement.number} | ${copy[placement.direction === "across" ? "mobileAcross" : "mobileDown"]}`;
  byId("mobile-clue-text").textContent = puzzleTranslation("words", placement.entry.id, "clue", placement.entry.clue);
  byId("mobile-active-clue").hidden = false;
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

function clearActiveEntry() {
  state.activeEntry = null;
  document.querySelectorAll(".clue-button").forEach((button) => button.classList.remove("is-active"));
  document.querySelectorAll(".cell").forEach((cell) => cell.classList.remove("is-active"));
  byId("active-hint").textContent = interfaceText[state.language].chooseWord;
  byId("mobile-active-clue").hidden = true;
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
  byId("found-words").textContent = solved.length === 1
    ? interfaceText[state.language].singularFound
    : interfaceText[state.language].pluralFound;
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
    item.querySelector(".reveal-word").textContent = revealed
      ? puzzleTranslation("themes", theme.id, "reveal", theme.reveal)
      : "••••••••";
    if (revealed) revealedCount += 1;
  });
  byId("reveal-count").textContent = `${revealedCount} / ${state.config.themes.length}`;
  const allThemesRevealed = state.config.themes.length > 0 && revealedCount === state.config.themes.length;
  byId("completion-image").hidden = !allThemesRevealed;

  if (solved.length === total && total > 0) {
    byId("reveal-note").textContent = state.config.translations?.[state.language]?.completionMessage
      ?? state.config.completionMessage
      ?? interfaceText[state.language].completed;
  } else if (revealedCount) {
    byId("reveal-note").textContent = state.language === "fr"
      ? `${revealedCount} surprise${revealedCount > 1 ? "s" : ""} révélée${revealedCount > 1 ? "s" : ""}. ${interfaceText.fr.continue}`
      : `${revealedCount} surprise${revealedCount > 1 ? "s" : ""} revealed. ${interfaceText.en.continue}`;
  } else {
    byId("reveal-note").textContent = interfaceText[state.language].noReveals;
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
  if (solvedCount === state.placements.length) showToast(interfaceText[state.language].completed);
  else showToast(interfaceText[state.language].incorrect);
}

function resetPuzzle() {
  document.querySelectorAll(".cell input").forEach((input) => { input.value = ""; });
  state.errorsVisible = false;
  clearActiveEntry();
  updateDisplay();
  showToast(interfaceText[state.language].restartToast);
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
        wrapper.addEventListener("click", () => {
          if (document.activeElement?.matches(".cell input")) document.activeElement.blur();
          clearActiveEntry();
        });
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
        input.dataset.gridRow = row - minRow + 1;
        input.dataset.gridColumn = col - minCol + 1;
        input.setAttribute("aria-label", state.language === "fr"
          ? `Ligne ${input.dataset.gridRow}, colonne ${input.dataset.gridColumn}`
          : `Row ${input.dataset.gridRow}, column ${input.dataset.gridColumn}`);
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
  byId("puzzle-credit").textContent = state.config.translations?.[state.language]?.credit ?? state.config.credit;
  byId("loading-state").hidden = true;
  updateDisplay();
}

async function start() {
  try {
    const response = await fetch(`./puzzle.json?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Chargement JSON impossible (${response.status})`);
    state.config = await response.json();
    byId("theme-count").textContent = state.config.themes.length;
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
    applyLanguage();
  } catch (error) {
    state.loadFailed = true;
    byId("loading-state").textContent = interfaceText[state.language].loadError;
    console.error(error);
  }
}

byId("check-button").addEventListener("click", checkAnswers);
byId("reset-button").addEventListener("click", resetPuzzle);
byId("language-toggle").addEventListener("click", toggleLanguage);

try {
  if (localStorage.getItem("surprise-words-language") === "en") state.language = "en";
} catch {}
applyLanguage();

function updateKeyboardInset() {
  const viewport = window.visualViewport;
  const inputFocused = document.activeElement?.matches(".cell input");
  const inset = viewport && inputFocused
    ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
    : 0;
  document.documentElement.style.setProperty("--keyboard-inset", `${inset}px`);
}

window.visualViewport?.addEventListener("resize", updateKeyboardInset);
window.visualViewport?.addEventListener("scroll", updateKeyboardInset);
window.addEventListener("resize", updateKeyboardInset);
document.addEventListener("focusin", updateKeyboardInset);
document.addEventListener("focusout", () => requestAnimationFrame(updateKeyboardInset));
updateKeyboardInset();
start();