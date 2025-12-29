/**
 * AI Commentator for Table Tennis Liquid
 * Uses Groq API for ultra-fast, free AI responses
 * Fixed for iOS Safari speech synthesis
 */

// ⚠️ Get your FREE API key from https://console.groq.com/keys
const GROQ_API_KEY = "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";
const GROQ_MODEL = "llama-3.1-8b-instant";

class AICommentator {
  constructor() {
    this.isMuted = false;
    this.isSpeaking = false;
    this.lastCommentTime = 0;
    this.commentCooldown = 3000;
    this.mode = localStorage.getItem("ai_personality") || "professional";

    // iOS audio unlock state
    this.audioUnlocked = false;
    this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    this.speechQueue = [];
    this.voices = [];

    // State tracking
    this.lastState = {
      p1Scores: [0, 0, 0, 0],
      p2Scores: [0, 0, 0, 0],
    };
    this.streakTracker = {
      currentStreak: 0,
      streakPlayer: null,
    };
    this.matchStats = {
      totalPoints: 0,
      leadChanges: 0,
    };

    this.init();
  }

  init() {
    // Load voices
    this.loadVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }

    // Setup iOS audio unlock on first touch
    if (this.isIOS) {
      document.addEventListener("touchstart", () => this.unlockAudio(), {
        once: true,
      });
      document.addEventListener("touchend", () => this.unlockAudio(), {
        once: true,
      });
    }
    document.addEventListener("click", () => this.unlockAudio(), {
      once: true,
    });

    // Init UI
    document.addEventListener("DOMContentLoaded", () => {
      this.updateModeButtons();
      this.updateMuteButton();
    });
  }

  loadVoices() {
    this.voices = window.speechSynthesis?.getVoices() || [];
  }

  /**
   * Unlock audio on iOS - must be called from user interaction
   */
  unlockAudio() {
    if (this.audioUnlocked) return;

    // Create and play silent audio to unlock Web Audio
    try {
      const audioContext = new (
        window.AudioContext || window.webkitAudioContext
      )();
      const buffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);
      audioContext.resume();
    } catch (e) {
      // Ignore errors
    }

    // Unlock speech synthesis with empty utterance
    if (window.speechSynthesis) {
      const unlock = new SpeechSynthesisUtterance("");
      unlock.volume = 0;
      window.speechSynthesis.speak(unlock);
    }

    this.audioUnlocked = true;
    console.log("🔊 Audio unlocked for iOS");
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

  calculateTotal(scores) {
    const weights = [1, 3, 9, 27];
    return scores.reduce(
      (total, score, idx) => total + score * weights[idx],
      0,
    );
  }

  analyzeChange(p1Scores, p2Scores, p1Name, p2Name) {
    const oldP1Total = this.calculateTotal(this.lastState.p1Scores);
    const oldP2Total = this.calculateTotal(this.lastState.p2Scores);
    const newP1Total = this.calculateTotal(p1Scores);
    const newP2Total = this.calculateTotal(p2Scores);

    const analysis = {
      scorer: null,
      scorerName: null,
      loserName: null,
      wasPromotion: false,
      promotedTo: null,
      currentLeader: null,
      scoreDiff: Math.abs(newP1Total - newP2Total),
      isTied: newP1Total === newP2Total,
      momentum: "neutral",
    };

    // Who scored?
    if (newP1Total > oldP1Total) {
      analysis.scorer = 0;
      analysis.scorerName = p1Name;
      analysis.loserName = p2Name;
    } else if (newP2Total > oldP2Total) {
      analysis.scorer = 1;
      analysis.scorerName = p2Name;
      analysis.loserName = p1Name;
    }

    // Check promotions
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

    // Leader
    if (newP1Total > newP2Total) analysis.currentLeader = p1Name;
    else if (newP2Total > newP1Total) analysis.currentLeader = p2Name;

    // Streak tracking
    if (analysis.scorer !== null) {
      if (this.streakTracker.streakPlayer === analysis.scorer) {
        this.streakTracker.currentStreak++;
      } else {
        this.streakTracker.currentStreak = 1;
        this.streakTracker.streakPlayer = analysis.scorer;
      }
      if (this.streakTracker.currentStreak >= 3) {
        analysis.momentum = analysis.scorerName;
      }
    }

    return analysis;
  }

  buildPrompt(p1Scores, p2Scores, p1Name, p2Name, analysis) {
    const p1Total = this.calculateTotal(p1Scores);
    const p2Total = this.calculateTotal(p2Scores);

    const personality =
      this.mode === "trash"
        ? `EXTREM respektloser Trash-Talk Kommentator. Sei fies, sarkastisch, beleidige den Verlierer. Nutze Jugendsprache.`
        : `Professioneller Sport-Kommentator. Sei enthusiastisch und emotional wie bei TV-Übertragungen.`;

    let situation = analysis.wasPromotion
      ? `🎯 ${analysis.scorerName} ist zu ${analysis.promotedTo} aufgestiegen!`
      : analysis.scorer !== null
        ? `${analysis.scorerName} hat gepunktet.`
        : `Punktkorrektur.`;

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

Kommentiere in 1-2 kurzen Sätzen auf Deutsch. NUR Sprechtext.`;
  }

  async callGroq(prompt) {
    if (!GROQ_API_KEY || GROQ_API_KEY === "YOUR_GROQ_API_KEY_HERE") {
      console.warn("⚠️ Groq API Key fehlt!");
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
            max_tokens: 100,
            temperature: 0.9,
          }),
        },
      );

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      return data.choices[0]?.message?.content?.trim() || null;
    } catch (error) {
      console.error("Groq Error:", error);
      return null;
    }
  }

  /**
   * Main entry point - called from app.js
   */
  async onScoreChange(p1Scores, p2Scores, p1Name, p2Name, eventType) {
    if (this.isMuted || this.isSpeaking) return;

    const now = Date.now();
    if (now - this.lastCommentTime < this.commentCooldown) return;
    this.lastCommentTime = now;

    const analysis = this.analyzeChange(p1Scores, p2Scores, p1Name, p2Name);

    this.setOrbState("thinking");

    const prompt = this.buildPrompt(
      p1Scores,
      p2Scores,
      p1Name,
      p2Name,
      analysis,
    );

    // Update state
    this.lastState.p1Scores = [...p1Scores];
    this.lastState.p2Scores = [...p2Scores];

    const text = await this.callGroq(prompt);
    if (text) {
      this.speak(text);
    } else {
      this.setOrbState("idle");
    }
  }

  /**
   * Speak text - with iOS workarounds
   */
  speak(text) {
    if (!window.speechSynthesis) {
      console.warn("Speech synthesis not supported");
      this.setOrbState("idle");
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    this.setOrbState("speaking");
    this.isSpeaking = true;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-DE";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Find German voice
    const germanVoice =
      this.voices.find((v) => v.lang.includes("de-DE")) ||
      this.voices.find((v) => v.lang.includes("de"));
    if (germanVoice) utterance.voice = germanVoice;

    utterance.onend = () => {
      this.setOrbState("idle");
      this.isSpeaking = false;
    };

    utterance.onerror = (e) => {
      console.error("Speech error:", e);
      this.setOrbState("idle");
      this.isSpeaking = false;
    };

    // iOS workaround: small delay helps
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);

      // iOS bug: speechSynthesis stops after ~15 seconds, resume it
      if (this.isIOS) {
        this.keepAlive();
      }
    }, 100);
  }

  /**
   * iOS workaround: keep speech synthesis alive
   */
  keepAlive() {
    const interval = setInterval(() => {
      if (!this.isSpeaking) {
        clearInterval(interval);
        return;
      }
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }, 5000);
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
      window.speechSynthesis?.cancel();
      this.isSpeaking = false;
      this.setOrbState("idle");
    }
  }

  syncState(p1Scores, p2Scores) {
    this.lastState.p1Scores = [...p1Scores];
    this.lastState.p2Scores = [...p2Scores];
  }

  resetStats() {
    this.streakTracker = { currentStreak: 0, streakPlayer: null };
    this.matchStats = { totalPoints: 0, leadChanges: 0 };
  }
}

// Global instance
const commentator = new AICommentator();

// Global functions for HTML
function toggleAISettings() {
  const popup = document.getElementById("ai-settings-popup");
  if (popup)
    popup.style.display = popup.style.display === "none" ? "flex" : "none";
}

function closeAISettings() {
  const popup = document.getElementById("ai-settings-popup");
  if (popup) popup.style.display = "none";
}

function toggleAIMute() {
  commentator.toggleMute();
}
