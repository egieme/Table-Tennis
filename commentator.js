/**
 * AI Commentator for Table Tennis Liquid
 * Uses Groq API for ultra-fast, free AI responses
 * Get your free API key at: https://console.groq.com/keys
 */

// ⚠️ IMPORTANT: Get your FREE API key from https://console.groq.com/keys
// Groq offers generous free tier - no credit card required!
const GROQ_API_KEY = "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";
const GROQ_MODEL = "llama-3.3-70b-versatile"; // Ultra fast, great quality

class AICommentator {
  constructor() {
    this.isMuted = false;
    this.isSpeaking = false;
    this.lastCommentTime = 0;
    this.commentCooldown = 3000; // Faster cooldown since Groq is fast
    this.mode = localStorage.getItem("ai_personality") || "professional";

    // Deep state tracking
    this.gameHistory = [];
    this.lastState = {
      p1Scores: [0, 0, 0, 0],
      p2Scores: [0, 0, 0, 0],
    };
    this.streakTracker = {
      currentStreak: 0,
      streakPlayer: null,
      longestStreak: { count: 0, player: null },
    };
    this.matchStats = {
      totalPoints: 0,
      p1Points: 0,
      p2Points: 0,
      promotions: { p1: 0, p2: 0 },
      leadChanges: 0,
      lastLeader: null,
    };

    this.initModeButtons();
  }

  initModeButtons() {
    document.addEventListener("DOMContentLoaded", () => {
      this.updateModeButtons();
      this.updateMuteButton();
    });
  }

  updateModeButtons() {
    const proBtn = document.getElementById("mode-pro");
    const trashBtn = document.getElementById("mode-trash");
    if (proBtn && trashBtn) {
      proBtn.classList.toggle("active", this.mode === "professional");
      trashBtn.classList.toggle("active", this.mode === "trash");
    }
  }

  updateMuteButton() {
    const muteBtn = document.getElementById("ai-mute-btn");
    if (muteBtn) {
      muteBtn.textContent = this.isMuted ? "KI Aktivieren" : "Stummschalten";
    }
  }

  setMode(mode) {
    this.mode = mode;
    localStorage.setItem("ai_personality", mode);
    this.updateModeButtons();
  }

  /**
   * Calculate weighted total score
   */
  calculateTotal(scores) {
    const weights = [1, 3, 9, 27];
    return scores.reduce(
      (total, score, idx) => total + score * weights[idx],
      0,
    );
  }

  /**
   * Analyze what changed between states
   */
  analyzeChange(p1Scores, p2Scores, p1Name, p2Name) {
    const analysis = {
      scorer: null,
      scorerName: null,
      loserName: null,
      pointType: "normal",
      wasPromotion: false,
      promotedTo: null,
      currentLeader: null,
      scoreDiff: 0,
      isCloseGame: false,
      isTied: false,
      momentum: "neutral",
    };

    const oldP1Total = this.calculateTotal(this.lastState.p1Scores);
    const oldP2Total = this.calculateTotal(this.lastState.p2Scores);
    const newP1Total = this.calculateTotal(p1Scores);
    const newP2Total = this.calculateTotal(p2Scores);

    // Determine who scored
    if (newP1Total > oldP1Total) {
      analysis.scorer = 0;
      analysis.scorerName = p1Name;
      analysis.loserName = p2Name;
    } else if (newP2Total > oldP2Total) {
      analysis.scorer = 1;
      analysis.scorerName = p2Name;
      analysis.loserName = p1Name;
    } else if (newP1Total < oldP1Total || newP2Total < oldP2Total) {
      analysis.pointType = "undo";
    }

    // Check for promotions
    const leagues = ["Bronze", "Silber", "Gold", "Platin"];
    for (let i = 1; i < 4; i++) {
      if (analysis.scorer === 0 && p1Scores[i] > this.lastState.p1Scores[i]) {
        analysis.wasPromotion = true;
        analysis.promotedTo = leagues[i];
      } else if (
        analysis.scorer === 1 &&
        p2Scores[i] > this.lastState.p2Scores[i]
      ) {
        analysis.wasPromotion = true;
        analysis.promotedTo = leagues[i];
      }
    }

    // Game state
    analysis.scoreDiff = Math.abs(newP1Total - newP2Total);
    analysis.isTied = newP1Total === newP2Total;
    analysis.isCloseGame = analysis.scoreDiff <= 3;

    if (newP1Total > newP2Total) {
      analysis.currentLeader = p1Name;
    } else if (newP2Total > newP1Total) {
      analysis.currentLeader = p2Name;
    }

    // Track lead changes
    const oldLeader =
      oldP1Total > oldP2Total
        ? p1Name
        : oldP2Total > oldP1Total
          ? p2Name
          : null;
    if (
      analysis.currentLeader &&
      oldLeader &&
      analysis.currentLeader !== oldLeader
    ) {
      this.matchStats.leadChanges++;
    }

    // Update streak
    if (analysis.scorer !== null) {
      if (this.streakTracker.streakPlayer === analysis.scorer) {
        this.streakTracker.currentStreak++;
      } else {
        this.streakTracker.currentStreak = 1;
        this.streakTracker.streakPlayer = analysis.scorer;
      }
      if (
        this.streakTracker.currentStreak >
        this.streakTracker.longestStreak.count
      ) {
        this.streakTracker.longestStreak = {
          count: this.streakTracker.currentStreak,
          player: analysis.scorerName,
        };
      }
      // Momentum
      if (this.streakTracker.currentStreak >= 3) {
        analysis.momentum = analysis.scorerName;
      }
    }

    return analysis;
  }

  /**
   * Build the prompt for Groq
   */
  buildPrompt(p1Scores, p2Scores, p1Name, p2Name, analysis) {
    const p1Total = this.calculateTotal(p1Scores);
    const p2Total = this.calculateTotal(p2Scores);

    const personality =
      this.mode === "trash"
        ? `EXTREM respektloser Trash-Talk Kommentator. Sei fies, sarkastisch, beleidige den Verlierer. Nutze Jugendsprache und sei provokant.`
        : `Professioneller Sport-Kommentator. Sei enthusiastisch und emotional wie bei großen TV-Übertragungen.`;

    let situation = "";
    if (analysis.wasPromotion) {
      situation = `🎯 ${analysis.scorerName} ist zu ${analysis.promotedTo} aufgestiegen!`;
    } else if (analysis.scorer !== null) {
      situation = `${analysis.scorerName} hat gepunktet.`;
    } else {
      situation = `Punktkorrektur.`;
    }

    // Special alerts
    let alerts = "";
    if (analysis.isTied && p1Total > 0) alerts += " GLEICHSTAND!";
    if (this.streakTracker.currentStreak >= 3)
      alerts += ` ${this.streakTracker.currentStreak}er Serie!`;
    if (p1Scores[2] === 2) alerts += ` ${p1Name} kurz vor Platin!`;
    if (p2Scores[2] === 2) alerts += ` ${p2Name} kurz vor Platin!`;

    return `Du bist ein ${personality}

SPIELSTAND:
${p1Name}: ${p1Total} Punkte (B:${p1Scores[0]} S:${p1Scores[1]} G:${p1Scores[2]} P:${p1Scores[3]})
${p2Name}: ${p2Total} Punkte (B:${p2Scores[0]} S:${p2Scores[1]} G:${p2Scores[2]} P:${p2Scores[3]})
${analysis.isTied ? "GLEICHSTAND" : `${analysis.currentLeader} führt +${analysis.scoreDiff}`}

EREIGNIS: ${situation}${alerts}

Kommentiere in 1-2 kurzen Sätzen auf Deutsch. NUR Sprechtext, nichts anderes.`;
  }

  /**
   * Call Groq API
   */
  async callGroq(prompt) {
    if (GROQ_API_KEY === "YOUR_GROQ_API_KEY_HERE") {
      console.warn(
        "⚠️ Groq API Key nicht gesetzt! Hole dir einen kostenlosen Key: https://console.groq.com/keys",
      );
      return null;
    }

    try {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 150,
            temperature: 0.9,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content?.trim() || null;
    } catch (error) {
      console.error("Groq API Error:", error);
      return null;
    }
  }

  /**
   * Main handler for score changes
   */
  async onScoreChange(p1Scores, p2Scores, p1Name, p2Name, eventType) {
    if (this.isMuted || this.isSpeaking) return;

    const now = Date.now();
    if (now - this.lastCommentTime < this.commentCooldown) return;
    this.lastCommentTime = now;

    // Analyze what happened
    const analysis = this.analyzeChange(p1Scores, p2Scores, p1Name, p2Name);

    // Update stats
    if (analysis.scorer === 0) {
      this.matchStats.p1Points++;
      this.matchStats.totalPoints++;
    } else if (analysis.scorer === 1) {
      this.matchStats.p2Points++;
      this.matchStats.totalPoints++;
    }

    if (analysis.wasPromotion) {
      if (analysis.scorer === 0) this.matchStats.promotions.p1++;
      else this.matchStats.promotions.p2++;
    }

    // Set thinking state
    this.setOrbState("thinking");

    // Build and send prompt
    const prompt = this.buildPrompt(
      p1Scores,
      p2Scores,
      p1Name,
      p2Name,
      analysis,
    );

    // Update last state
    this.lastState.p1Scores = [...p1Scores];
    this.lastState.p2Scores = [...p2Scores];

    // Call Groq
    const text = await this.callGroq(prompt);
    if (text) {
      this.speak(text);
    } else {
      this.setOrbState("idle");
    }
  }

  speak(text) {
    window.speechSynthesis.cancel();
    this.setOrbState("speaking");
    this.isSpeaking = true;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-DE";
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const germanVoice =
      voices.find((v) => v.name.includes("Google") && v.lang.includes("de")) ||
      voices.find((v) => v.lang.includes("de"));

    if (germanVoice) utterance.voice = germanVoice;

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

  setOrbState(state) {
    const orb = document.getElementById("ai-orb");
    if (!orb) return;
    orb.classList.remove("thinking", "speaking");
    if (state === "thinking" || state === "speaking") {
      orb.classList.add(state);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    const orb = document.getElementById("ai-orb");
    if (orb) orb.classList.toggle("muted", this.isMuted);
    this.updateMuteButton();

    if (this.isMuted) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      this.setOrbState("idle");
    }
  }

  syncState(p1Scores, p2Scores) {
    this.lastState.p1Scores = [...p1Scores];
    this.lastState.p2Scores = [...p2Scores];
  }

  resetStats() {
    this.gameHistory = [];
    this.streakTracker = {
      currentStreak: 0,
      streakPlayer: null,
      longestStreak: { count: 0, player: null },
    };
    this.matchStats = {
      totalPoints: 0,
      p1Points: 0,
      p2Points: 0,
      promotions: { p1: 0, p2: 0 },
      leadChanges: 0,
      lastLeader: null,
    };
  }
}

// Create global instance
const commentator = new AICommentator();

// Global functions for HTML handlers
function toggleAISettings() {
  const popup = document.getElementById("ai-settings-popup");
  if (popup) {
    popup.style.display = popup.style.display === "none" ? "flex" : "none";
  }
}

function closeAISettings() {
  const popup = document.getElementById("ai-settings-popup");
  if (popup) popup.style.display = "none";
}

function toggleAIMute() {
  commentator.toggleMute();
}

// Load voices
if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () =>
    window.speechSynthesis.getVoices();
}
