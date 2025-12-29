/**
 * AI Commentator for Table Tennis Liquid
 * Apple Intelligence Style Integration
 */

class AICommentator {
  constructor() {
    this.isMuted = false;
    this.isSpeaking = false;
    this.lastCommentTime = 0;
    this.commentCooldown = 4500;
    this.mode = localStorage.getItem("ai_personality") || "professional";

    // State tracking for comparison
    this.lastState = {
      p1Scores: [0, 0, 0, 0],
      p2Scores: [0, 0, 0, 0],
    };

    this.initModeButtons();
  }

  /**
   * Initialize mode toggle buttons after DOM is ready
   */
  initModeButtons() {
    document.addEventListener("DOMContentLoaded", () => {
      this.updateModeButtons();
      this.updateMuteButton();
    });
  }

  /**
   * Update mode button active states
   */
  updateModeButtons() {
    const proBtn = document.getElementById("mode-pro");
    const trashBtn = document.getElementById("mode-trash");

    if (proBtn && trashBtn) {
      proBtn.classList.toggle("active", this.mode === "professional");
      trashBtn.classList.toggle("active", this.mode === "trash");
    }
  }

  /**
   * Update mute button text
   */
  updateMuteButton() {
    const muteBtn = document.getElementById("ai-mute-btn");
    if (muteBtn) {
      muteBtn.textContent = this.isMuted ? "KI Aktivieren" : "Stummschalten";
    }
  }

  /**
   * Set commentator personality mode
   * @param {string} mode - 'professional' or 'trash'
   */
  setMode(mode) {
    this.mode = mode;
    localStorage.setItem("ai_personality", mode);
    this.updateModeButtons();
  }

  /**
   * Main handler for score changes - called from app.js
   * @param {number[]} p1Scores - Player 1 scores array [bronze, silver, gold, platinum]
   * @param {number[]} p2Scores - Player 2 scores array
   * @param {string} p1Name - Player 1 name
   * @param {string} p2Name - Player 2 name
   * @param {string} eventType - Type of event (point, promotion, etc.)
   */
  async onScoreChange(p1Scores, p2Scores, p1Name, p2Name, eventType) {
    // Skip if muted or already speaking
    if (this.isMuted || this.isSpeaking) return;

    // Check cooldown
    const now = Date.now();
    if (now - this.lastCommentTime < this.commentCooldown) return;
    this.lastCommentTime = now;

    // Determine who scored
    let actionDescription = eventType;
    const p1Changed =
      JSON.stringify(p1Scores) !== JSON.stringify(this.lastState.p1Scores);
    const p2Changed =
      JSON.stringify(p2Scores) !== JSON.stringify(this.lastState.p2Scores);

    if (p1Changed) {
      actionDescription = `${p1Name} hat gepunktet.`;
    } else if (p2Changed) {
      actionDescription = `${p2Name} hat gepunktet.`;
    }

    // Set thinking state
    this.setOrbState("thinking");

    // Build AI prompt
    const prompt = this.buildPrompt(
      p1Scores,
      p2Scores,
      p1Name,
      p2Name,
      actionDescription,
    );

    // Update state history
    this.lastState.p1Scores = [...p1Scores];
    this.lastState.p2Scores = [...p2Scores];

    // Call AI
    try {
      const response = await puter.ai.chat(prompt);
      const text = response.toString().trim();
      if (text) {
        this.speak(text);
      } else {
        this.setOrbState("idle");
      }
    } catch (error) {
      console.error("AI Commentator Error:", error);
      this.setOrbState("idle");
    }
  }

  /**
   * Build the AI prompt with context
   */
  buildPrompt(p1Scores, p2Scores, p1Name, p2Name, actionDescription) {
    const personality =
      this.mode === "trash"
        ? "Extremer Trash-Talk, sarkastisch, fies, moderner Slang, beleidigt den Verlierer stark."
        : "Professionell, enthusiastisch, hochemotional wie ein TV-Sportkommentator.";

    return `
Rolle: Live-Kommentator für Tischtennis.
Charakter: ${personality}

VORHERIGER STAND:
${p1Name}: Bronze ${this.lastState.p1Scores[0]}, Silber ${this.lastState.p1Scores[1]}, Gold ${this.lastState.p1Scores[2]}, Platin ${this.lastState.p1Scores[3]}
${p2Name}: Bronze ${this.lastState.p2Scores[0]}, Silber ${this.lastState.p2Scores[1]}, Gold ${this.lastState.p2Scores[2]}, Platin ${this.lastState.p2Scores[3]}

AKTUELLER STAND:
${p1Name}: Bronze ${p1Scores[0]}, Silber ${p1Scores[1]}, Gold ${p1Scores[2]}, Platin ${p1Scores[3]}
${p2Name}: Bronze ${p2Scores[0]}, Silber ${p2Scores[1]}, Gold ${p2Scores[2]}, Platin ${p2Scores[3]}

AKTION: ${actionDescription}

Info: Bei 3 Punkten in einer Liga steigt man auf. Bronze -> Silber -> Gold -> Platin.
Aufgabe: Schreibe 1-2 kurze Sätze auf Deutsch. Antworte NUR mit dem Sprechtext, nichts anderes.
        `.trim();
  }

  /**
   * Speak text using Web Speech API
   * @param {string} text - Text to speak
   */
  speak(text) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    this.setOrbState("speaking");
    this.isSpeaking = true;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-DE";
    utterance.rate = 1.1;
    utterance.pitch = 1.0;

    // Try to find a good German voice
    const voices = window.speechSynthesis.getVoices();
    const germanVoice =
      voices.find((v) => v.name.includes("Google") && v.lang.includes("de")) ||
      voices.find((v) => v.lang.includes("de"));

    if (germanVoice) {
      utterance.voice = germanVoice;
    }

    utterance.onend = () => {
      this.setOrbState("idle");
      this.isSpeaking = false;
    };

    utterance.onerror = () => {
      this.setOrbState("idle");
      this.isSpeaking = false;
    };

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Set the visual state of the AI orb
   * @param {string} state - 'idle', 'thinking', or 'speaking'
   */
  setOrbState(state) {
    const orb = document.getElementById("ai-orb");
    if (!orb) return;

    orb.classList.remove("thinking", "speaking");

    if (state === "thinking" || state === "speaking") {
      orb.classList.add(state);
    }
  }

  /**
   * Toggle mute state
   */
  toggleMute() {
    this.isMuted = !this.isMuted;

    const orb = document.getElementById("ai-orb");
    if (orb) {
      orb.classList.toggle("muted", this.isMuted);
    }

    this.updateMuteButton();

    // Cancel speech if muting
    if (this.isMuted) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      this.setOrbState("idle");
    }
  }

  /**
   * Sync state with current game data
   * Called when loading a game
   */
  syncState(p1Scores, p2Scores) {
    this.lastState.p1Scores = [...p1Scores];
    this.lastState.p2Scores = [...p2Scores];
  }
}

// Create global instance
const commentator = new AICommentator();

// Global functions for HTML onclick handlers
function toggleAISettings() {
  const popup = document.getElementById("ai-settings-popup");
  if (popup) {
    popup.style.display = popup.style.display === "none" ? "flex" : "none";
  }
}

function closeAISettings() {
  const popup = document.getElementById("ai-settings-popup");
  if (popup) {
    popup.style.display = "none";
  }
}

function toggleAIMute() {
  commentator.toggleMute();
}

// Load voices when they become available
if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}
