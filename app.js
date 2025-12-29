/**
 * Table Tennis Liquid - Main Application
 * Optimized Game Logic with AI Commentator Integration
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const leagueConfig = [
  { name: "Bronze", class: "bronze" },
  { name: "Silber", class: "silver" },
  { name: "Gold", class: "gold" },
  { name: "Platin", class: "platinum" },
];

// =============================================================================
// GAME STATE
// =============================================================================

let players = [{ scores: [0, 0, 0, 0] }, { scores: [0, 0, 0, 0] }];
let currentGameId = null;
let playerNames = ["Spieler 1", "Spieler 2"];
let isDarkMode = true;
let soundFiles = { win: null, promoted: null, comeback: null };
let previousTotalScores = [0, 0];
let comebackCounts = [0, 0];
let comebackTracking = {
  p0: { wasBehind: false, deficit: 0 },
  p1: { wasBehind: false, deficit: 0 },
};
let activeAudioInstances = [];

// =============================================================================
// SCORE MANAGEMENT
// =============================================================================

/**
 * Main entry point for score changes
 * @param {number} playerIndex - 0 or 1
 * @param {number} change - 1 for add, -1 for remove
 */
function modifyScore(playerIndex, change) {
  if (change > 0) {
    addWin(playerIndex, 0);
  } else {
    removeWin(playerIndex);
  }

  updateUI();
  saveData();

  // Trigger AI Commentator with delay to not overlap with sound
  triggerCommentator(change > 0 ? "Punktgewinn" : "Punktabzug");
}

/**
 * Trigger AI commentator with current game state
 * @param {string} eventType - Description of the event
 */
function triggerCommentator(eventType) {
  if (typeof commentator === "undefined") return;

  setTimeout(() => {
    commentator.onScoreChange(
      players[0].scores,
      players[1].scores,
      playerNames[0],
      playerNames[1],
      eventType,
    );
  }, 500);
}

/**
 * Calculate weighted total score for a player
 * Bronze=1, Silver=3, Gold=9, Platinum=27
 */
function getTotalScore(playerIndex) {
  const weights = [1, 3, 9, 27];
  return players[playerIndex].scores.reduce((total, score, idx) => {
    return total + score * weights[idx];
  }, 0);
}

/**
 * Check if player achieved a comeback
 */
function checkComeback(
  pIdx,
  prevTotal0,
  prevTotal1,
  currentTotal0,
  currentTotal1,
) {
  const otherIdx = pIdx === 0 ? 1 : 0;
  const prevTotal = pIdx === 0 ? prevTotal0 : prevTotal1;
  const prevOtherTotal = pIdx === 0 ? prevTotal1 : prevTotal0;
  const currentTotal = pIdx === 0 ? currentTotal0 : currentTotal1;
  const currentOtherTotal = pIdx === 0 ? currentTotal1 : currentTotal0;

  const prevDiff = prevTotal - prevOtherTotal;
  const currentDiff = currentTotal - currentOtherTotal;
  const trackingKey = pIdx === 0 ? "p0" : "p1";

  // Track if player was 4+ points behind
  if (prevDiff <= -4) {
    comebackTracking[trackingKey].wasBehind = true;
    comebackTracking[trackingKey].deficit = Math.abs(prevDiff);
  }

  const hasReachedTie = Math.abs(currentDiff) < 0.1;

  // Comeback: was 4+ behind and now tied
  if (
    (prevDiff <= -4 || comebackTracking[trackingKey].wasBehind) &&
    hasReachedTie
  ) {
    comebackCounts[pIdx]++;
    showComebackBadge(pIdx);
    showComebackContainer(pIdx);
    comebackTracking[trackingKey].wasBehind = false;
    comebackTracking[trackingKey].deficit = 0;
    return true;
  }

  // Reset tracking if ahead
  if (currentDiff > 0) {
    comebackTracking[trackingKey].wasBehind = false;
    comebackTracking[trackingKey].deficit = 0;
  }

  return false;
}

/**
 * Show comeback badge on player header
 */
function showComebackBadge(pIdx) {
  const header = document.getElementById(
    pIdx === 0 ? "p1-header" : "p2-header",
  );
  if (!header) return;

  const existingBadge = header.querySelector(".comeback-badge");
  if (existingBadge) existingBadge.remove();

  const badge = document.createElement("span");
  badge.className = "comeback-badge";
  badge.innerHTML = `🔥<span class="comeback-count">${comebackCounts[pIdx]}</span>`;
  badge.title = `${comebackCounts[pIdx]} Comeback${comebackCounts[pIdx] > 1 ? "s" : ""}!`;
  header.appendChild(badge);
}

/**
 * Show flaming container effect for comeback
 */
function showComebackContainer(pIdx) {
  const card = document.getElementById(pIdx === 0 ? "p1-card" : "p2-card");
  if (!card) return;

  card.classList.remove("comeback-active");
  void card.offsetWidth; // Force reflow
  card.classList.add("comeback-active");

  setTimeout(() => {
    card.classList.remove("comeback-active");
  }, 10000);
}

/**
 * Add a win to a player at specified league
 */
function addWin(pIdx, leagueIdx, skipSound = false) {
  if (leagueIdx >= leagueConfig.length) return;

  const prevTotal0 = getTotalScore(0);
  const prevTotal1 = getTotalScore(1);

  players[pIdx].scores[leagueIdx]++;

  const currentTotal0 = getTotalScore(0);
  const currentTotal1 = getTotalScore(1);

  const isComeback = checkComeback(
    pIdx,
    prevTotal0,
    prevTotal1,
    currentTotal0,
    currentTotal1,
  );

  // Handle league promotion
  const leagueName = leagueConfig[leagueIdx].name;
  const promotionThreshold = leagueName === "Platin" ? Infinity : 3;

  if (
    players[pIdx].scores[leagueIdx] >= promotionThreshold &&
    leagueName !== "Platin"
  ) {
    // Reset scores for promotion
    if (leagueName === "Gold") {
      // Reset all leagues below platinum for both players
      for (let i = 0; i < players.length; i++) {
        for (let l = 0; l <= leagueIdx; l++) {
          players[i].scores[l] = 0;
        }
      }
    } else {
      // Reset current league for both players
      players[0].scores[leagueIdx] = 0;
      players[1].scores[leagueIdx] = 0;
    }

    previousTotalScores[0] = getTotalScore(0);
    previousTotalScores[1] = getTotalScore(1);

    // Play sound and promote
    if (isComeback) {
      playSound("comeback");
    } else {
      playSound("promoted");
    }

    addWin(pIdx, leagueIdx + 1, true);
    return;
  }

  // Update scores
  previousTotalScores[0] = currentTotal0;
  previousTotalScores[1] = currentTotal1;

  // Play appropriate sound
  if (isComeback) {
    playSound("comeback");
  } else if (!skipSound && leagueName !== "Platin") {
    playSound("win");
  }
}

/**
 * Remove a win from player's bronze league
 */
function removeWin(pIdx) {
  if (players[pIdx].scores[0] > 0) {
    players[pIdx].scores[0]--;
    previousTotalScores[0] = getTotalScore(0);
    previousTotalScores[1] = getTotalScore(1);
  }
}

// =============================================================================
// UI UPDATES
// =============================================================================

/**
 * Update all UI elements
 */
function updateUI() {
  const isMobile = window.innerWidth <= 768;

  [0, 1].forEach((pIdx) => {
    const p = players[pIdx];
    const displayId = pIdx === 0 ? "p1-display" : "p2-display";
    const containerId = pIdx === 0 ? "p1-leagues" : "p2-leagues";

    document.getElementById(displayId).textContent = p.scores[0];

    const container = document.getElementById(containerId);
    container.innerHTML = "";

    // Build league items (skip Bronze)
    const leaguesToShow = leagueConfig
      .map((league, idx) => ({ league, idx }))
      .filter(({ idx }) => idx > 0);

    if (isMobile) leaguesToShow.reverse();

    leaguesToShow.forEach(({ league, idx }) => {
      const item = document.createElement("div");
      item.className = `league-item ${league.class} ${p.scores[idx] > 0 ? "active" : ""}`;
      item.innerHTML = `
        <div class="league-left">
          <div class="league-icon"></div>
          <div class="league-name">${league.name}</div>
        </div>
        <div class="league-count">${p.scores[idx]}</div>
      `;
      container.appendChild(item);
    });
  });

  updateScoreDifference();
}

/**
 * Update score difference displays
 */
function updateScoreDifference() {
  const p1Total = getTotalScore(0);
  const p2Total = getTotalScore(1);
  const diff = p1Total - p2Total;

  const p1DiffEl = document.getElementById("p1-score-diff");
  const p2DiffEl = document.getElementById("p2-score-diff");

  if (diff > 0) {
    p1DiffEl.textContent = `+${diff}`;
    p2DiffEl.textContent = `-${diff}`;
    p1DiffEl.setAttribute("data-equal", "false");
    p2DiffEl.setAttribute("data-equal", "false");
  } else if (diff < 0) {
    p1DiffEl.textContent = `${diff}`;
    p2DiffEl.textContent = `+${Math.abs(diff)}`;
    p1DiffEl.setAttribute("data-equal", "false");
    p2DiffEl.setAttribute("data-equal", "false");
  } else {
    p1DiffEl.textContent = "=";
    p2DiffEl.textContent = "=";
    p1DiffEl.setAttribute("data-equal", "true");
    p2DiffEl.setAttribute("data-equal", "true");
  }
}

/**
 * Update player name displays
 */
function updatePlayerNames() {
  const p1Header = document.getElementById("p1-header");
  const p2Header = document.getElementById("p2-header");

  // Save badges
  const p1Badge = p1Header.querySelector(".comeback-badge");
  const p2Badge = p2Header.querySelector(".comeback-badge");

  p1Header.textContent = playerNames[0];
  p2Header.textContent = playerNames[1];

  // Restore badges
  if (p1Badge && comebackCounts[0] > 0) p1Header.appendChild(p1Badge);
  if (p2Badge && comebackCounts[1] > 0) p2Header.appendChild(p2Badge);

  // Update inputs
  const p1Input = document.getElementById("p1-name-input");
  const p2Input = document.getElementById("p2-name-input");
  if (p1Input) p1Input.value = playerNames[0];
  if (p2Input) p2Input.value = playerNames[1];
}

// =============================================================================
// POPUP FUNCTIONS
// =============================================================================

function openSettings() {
  document.getElementById("settings-popup").classList.add("active");
  updatePlayerNames();
  const select = document.getElementById("game-select");
  const deleteBtn = document.getElementById("delete-game-btn");
  if (select && deleteBtn) {
    deleteBtn.style.display = select.value ? "block" : "none";
  }
}

function closeSettings() {
  document.getElementById("settings-popup").classList.remove("active");
  document.getElementById("reset-confirmation").style.display = "none";
  document.getElementById("delete-confirmation").style.display = "none";
}

function openAchievements() {
  document.getElementById("achievements-popup").classList.add("active");
}

function closeAchievements() {
  document.getElementById("achievements-popup").classList.remove("active");
}

function onGameSelect() {
  const select = document.getElementById("game-select");
  const newGameTitle = document.getElementById("new-game-title");
  const createBtn = document.getElementById("create-game-btn");
  const deleteBtn = document.getElementById("delete-game-btn");

  if (select.value === "") {
    newGameTitle.style.display = "block";
    createBtn.style.display = "block";
    deleteBtn.style.display = "none";
  } else {
    newGameTitle.style.display = "none";
    createBtn.style.display = "none";
    deleteBtn.style.display = "block";
    currentGameId = parseInt(select.value);
    loadGameData(currentGameId);
  }
}

async function savePlayerNames() {
  playerNames[0] =
    document.getElementById("p1-name-input").value.trim() || "Spieler 1";
  playerNames[1] =
    document.getElementById("p2-name-input").value.trim() || "Spieler 2";
  updatePlayerNames();

  // Notify commentator about name changes so Tyrone always knows the players!
  if (typeof commentator !== "undefined" && commentator.syncState) {
    commentator.syncState(
      players[0].scores,
      players[1].scores,
      playerNames[0],
      playerNames[1],
    );
  }

  await saveData();
}

function showResetConfirmation() {
  document.getElementById("reset-confirmation").style.display = "block";
}

function cancelReset() {
  document.getElementById("reset-confirmation").style.display = "none";
}

function showDeleteConfirmation() {
  document.getElementById("delete-confirmation").style.display = "block";
}

function cancelDelete() {
  document.getElementById("delete-confirmation").style.display = "none";
}

// =============================================================================
// EVENT LISTENERS
// =============================================================================

// Close popups on overlay click
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("popup-overlay")) {
    closeSettings();
    closeAchievements();
  }
});

// Prevent double-tap zoom on mobile
let lastTouchEnd = 0;
document.addEventListener(
  "touchend",
  (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  },
  false,
);

// Prevent pinch zoom
["gesturestart", "gesturechange", "gestureend"].forEach((event) => {
  document.addEventListener(event, (e) => e.preventDefault());
});

// Prevent keyboard zoom
document.addEventListener("keydown", (e) => {
  if (
    (e.ctrlKey || e.metaKey) &&
    [61, 107, 173, 109, 187, 189].includes(e.keyCode)
  ) {
    e.preventDefault();
  }
});

// Prevent wheel zoom
document.addEventListener(
  "wheel",
  (e) => {
    if (e.ctrlKey || e.metaKey) e.preventDefault();
  },
  { passive: false },
);

// Update UI on resize
window.addEventListener("resize", updateUI);

// =============================================================================
// THEME MANAGEMENT
// =============================================================================

function toggleTheme() {
  isDarkMode = !isDarkMode;
  document.body.classList.toggle("light-mode", !isDarkMode);
  localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  updateThemeIcon();
}

function updateThemeIcon() {
  const icon = document.getElementById("theme-icon");
  if (!icon) return;

  if (isDarkMode) {
    icon.innerHTML = `
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    `;
  } else {
    icon.innerHTML = `
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    `;
  }
}

// =============================================================================
// SOUND MANAGEMENT
// =============================================================================

async function handleSoundUpload(type) {
  const input = document.getElementById(`${type}-sound-input`);
  const preview = document.getElementById(`${type}-sound-preview`);

  if (!input.files || !input.files[0]) return;

  const file = input.files[0];
  const reader = new FileReader();

  reader.onload = async (e) => {
    const base64 = e.target.result;
    soundFiles[type] = base64;
    preview.src = base64;
    preview.style.display = "block";

    if (currentGameId) {
      try {
        const updateData = {};
        updateData[`sound_${type}`] = base64;
        await supabaseClient
          .from("games")
          .update(updateData)
          .eq("id", currentGameId);
      } catch (err) {
        console.error("Error saving sound:", err);
      }
    }
  };

  reader.readAsDataURL(file);
}

function playSound(type) {
  if (!soundFiles[type]) return;

  // Stop all active sounds
  activeAudioInstances.forEach((a) => {
    a.pause();
    a.currentTime = 0;
  });
  activeAudioInstances = [];

  const audio = new Audio(soundFiles[type]);
  audio.volume = 1.0;
  audio.play().catch(() => {});
  activeAudioInstances.push(audio);

  // Fade out after 5 seconds
  setTimeout(() => {
    const fadeOut = setInterval(() => {
      if (audio.volume > 0.05) {
        audio.volume -= 0.05;
      } else {
        audio.pause();
        audio.currentTime = 0;
        clearInterval(fadeOut);
        const idx = activeAudioInstances.indexOf(audio);
        if (idx > -1) activeAudioInstances.splice(idx, 1);
      }
    }, 50);
  }, 5000);
}

function displaySounds() {
  ["win", "promoted", "comeback"].forEach((type) => {
    if (soundFiles[type]) {
      const preview = document.getElementById(`${type}-sound-preview`);
      if (preview) {
        preview.src = soundFiles[type];
        preview.style.display = "block";
      }
    }
  });
}

// =============================================================================
// INITIALIZATION
// =============================================================================

window.addEventListener("DOMContentLoaded", () => {
  // Load theme
  const savedTheme = localStorage.getItem("theme");
  isDarkMode = savedTheme !== "light";
  if (!isDarkMode) {
    document.body.classList.add("light-mode");
  }
  updateThemeIcon();

  // Initialize scores
  previousTotalScores[0] = getTotalScore(0);
  previousTotalScores[1] = getTotalScore(1);

  // Sync commentator state with player names
  if (typeof commentator !== "undefined" && commentator.syncState) {
    commentator.syncState(
      players[0].scores,
      players[1].scores,
      playerNames[0],
      playerNames[1],
    );
  }

  // Load game data
  loadData();
});
