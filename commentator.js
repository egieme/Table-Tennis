/**
 * AI Commentator for Table Tennis Liquid
 * Enhanced with deep game understanding for intelligent commentary
 */

class AICommentator {
  constructor() {
    this.isMuted = false;
    this.isSpeaking = false;
    this.lastCommentTime = 0;
    this.commentCooldown = 4000;
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
      comebacks: { p1: 0, p2: 0 },
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
      leagueChanged: null,
      wasPromotion: false,
      promotedTo: null,
      isComeback: false,
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
    } else if (newP1Total < oldP1Total) {
      analysis.scorer = null;
      analysis.pointType = "undo";
    } else if (newP2Total < oldP2Total) {
      analysis.scorer = null;
      analysis.pointType = "undo";
    }

    // Check for promotions
    const leagues = ["Bronze", "Silber", "Gold", "Platin"];
    for (let i = 0; i < 4; i++) {
      if (analysis.scorer === 0) {
        if (p1Scores[i] > this.lastState.p1Scores[i] && i > 0) {
          if (this.lastState.p1Scores[i - 1] >= 2) {
            analysis.wasPromotion = true;
            analysis.promotedTo = leagues[i];
            analysis.leagueChanged = i;
          }
        }
      } else if (analysis.scorer === 1) {
        if (p2Scores[i] > this.lastState.p2Scores[i] && i > 0) {
          if (this.lastState.p2Scores[i - 1] >= 2) {
            analysis.wasPromotion = true;
            analysis.promotedTo = leagues[i];
            analysis.leagueChanged = i;
          }
        }
      }
    }

    // Determine current game state
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
    this.matchStats.lastLeader = analysis.currentLeader;

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
    }

    // Determine momentum
    if (this.streakTracker.currentStreak >= 3) {
      analysis.momentum =
        this.streakTracker.streakPlayer === 0 ? p1Name : p2Name;
    }

    return analysis;
  }

  /**
   * Build comprehensive context for AI
   */
  buildEnhancedPrompt(p1Scores, p2Scores, p1Name, p2Name, analysis) {
    const p1Total = this.calculateTotal(p1Scores);
    const p2Total = this.calculateTotal(p2Scores);

    const personality =
      this.mode === "trash"
        ? `Du bist ein EXTREM respektloser Trash-Talk Kommentator. Sei fies, sarkastisch, und beleidige den Verlierer brutal.
           Nutze moderne Jugendsprache, Memes, und sei maximal provokant. Lache über Fehler. Sei gemein aber witzig.`
        : `Du bist ein professioneller, enthusiastischer Sport-Kommentator wie bei großen TV-Übertragungen.
           Sei emotional, spannend, und nutze dramatische Sprache. Feiere große Momente angemessen.`;

    const leagueExplanation = `
LIGA-SYSTEM:
- Bronze (1 Punkt Wert): Einstiegsliga
- Silber (3 Punkte Wert): 3 Bronze-Siege = Aufstieg zu Silber
- Gold (9 Punkte Wert): 3 Silber-Siege = Aufstieg zu Gold
- Platin (27 Punkte Wert): 3 Gold-Siege = Aufstieg zu Platin (höchste Liga!)
Bei einem Aufstieg werden die unteren Ligen beider Spieler zurückgesetzt.`;

    const currentState = `
AKTUELLER SPIELSTAND:
${p1Name}: Bronze ${p1Scores[0]}, Silber ${p1Scores[1]}, Gold ${p1Scores[2]}, Platin ${p1Scores[3]} (Gesamt: ${p1Total} Punkte)
${p2Name}: Bronze ${p2Scores[0]}, Silber ${p2Scores[1]}, Gold ${p2Scores[2]}, Platin ${p2Scores[3]} (Gesamt: ${p2Total} Punkte)`;

    const gameState = `
SPIELSITUATION:
- Führung: ${analysis.isTied ? "GLEICHSTAND!" : `${analysis.currentLeader} führt mit ${analysis.scoreDiff} Punkten`}
- Spielverlauf: ${analysis.isCloseGame ? "ENGES SPIEL!" : analysis.scoreDiff > 10 ? "Klare Führung" : "Normaler Abstand"}
- Führungswechsel bisher: ${this.matchStats.leadChanges}`;

    const momentumInfo =
      this.streakTracker.currentStreak >= 2
        ? `\nMOMENTUM: ${analysis.momentum !== "neutral" ? `${analysis.momentum} hat eine ${this.streakTracker.currentStreak}er Serie! 🔥` : "Ausgeglichen"}`
        : "";

    let eventDescription = "";
    if (analysis.wasPromotion) {
      eventDescription = `
🎯 WICHTIGES EREIGNIS: ${analysis.scorerName} ist gerade zu ${analysis.promotedTo} aufgestiegen!
Das ist ein großer Moment - die unteren Ligen wurden zurückgesetzt!`;
    } else if (analysis.scorer !== null) {
      eventDescription = `
AKTION: ${analysis.scorerName} hat einen Punkt in Bronze gemacht.`;
    } else {
      eventDescription = `
AKTION: Punktabzug/Korrektur wurde vorgenommen.`;
    }

    // Check for special situations
    let specialSituation = "";
    if (p1Scores[3] > 0 || p2Scores[3] > 0) {
      specialSituation +=
        "\n⭐ PLATIN-LEVEL ERREICHT! Das Spiel ist auf höchstem Niveau!";
    }
    if (analysis.isTied && p1Total > 0) {
      specialSituation += "\n⚡ GLEICHSTAND! Jeder Punkt zählt jetzt doppelt!";
    }
    if (this.streakTracker.currentStreak >= 4) {
      specialSituation += `\n🔥 WAHNSINN! ${this.streakTracker.currentStreak} Punkte in Folge!`;
    }

    // Near promotion detection
    let nearPromotion = "";
    if (p1Scores[0] === 2)
      nearPromotion += `\n${p1Name} braucht nur noch 1 Bronze für Silber-Aufstieg!`;
    if (p2Scores[0] === 2)
      nearPromotion += `\n${p2Name} braucht nur noch 1 Bronze für Silber-Aufstieg!`;
    if (p1Scores[1] === 2)
      nearPromotion += `\n${p1Name} braucht nur noch 1 Silber für Gold-Aufstieg!`;
    if (p2Scores[1] === 2)
      nearPromotion += `\n${p2Name} braucht nur noch 1 Silber für Gold-Aufstieg!`;
    if (p1Scores[2] === 2)
      nearPromotion += `\n🌟 ${p1Name} braucht nur noch 1 Gold für PLATIN-Aufstieg!`;
    if (p2Scores[2] === 2)
      nearPromotion += `\n🌟 ${p2Name} braucht nur noch 1 Gold für PLATIN-Aufstieg!`;

    return `
${personality}

${leagueExplanation}

${currentState}

${gameState}${momentumInfo}

${eventDescription}${specialSituation}${nearPromotion}

AUFGABE: Kommentiere diesen Moment in 1-2 kurzen, prägnanten Sätzen auf Deutsch.
- Reagiere auf das aktuelle Ereignis
- Berücksichtige den Spielstand und die Situation
- Sei ${this.mode === "trash" ? "maximal provokant und beleidigend" : "professionell und spannend"}
- Antworte NUR mit dem Sprechtext, keine Erklärungen!
    `.trim();
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

    // Build enhanced prompt
    const prompt = this.buildEnhancedPrompt(
      p1Scores,
      p2Scores,
      p1Name,
      p2Name,
      analysis,
    );

    // Save to history
    this.gameHistory.push({
      timestamp: now,
      p1Scores: [...p1Scores],
      p2Scores: [...p2Scores],
      analysis,
    });

    // Update last state
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
      comebacks: { p1: 0, p2: 0 },
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
