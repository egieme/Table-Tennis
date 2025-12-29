/**
 * AI Commentator - "TYRONE"
 *
 * Personality: Tyrone - deep voice, energetic, charismatic commentator
 * Uses cheap ElevenLabs Turbo model for ALL comments
 * Web Speech API only as emergency fallback
 *
 * IMPROVED: Better event detection and clear Groq prompts
 */

// ============================================================================
// API CONFIGURATION
// ============================================================================

const GROQ_API_KEY = "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";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const ELEVENLABS_API_KEY =
  "sk_3b3abd8164001db89ee0ca20596fde6ce4b0a9cfd7b2c01f";

// Deep male voice - "Adam" has a nice deep tone
const ELEVENLABS_VOICE_ID = "Ybqj6CIlqb6M85s9Bl4n";

// CHEAP MODEL: eleven_turbo_v2_5 is 50% cheaper than multilingual!
const ELEVENLABS_MODEL = "eleven_turbo_v2_5";

// Voice settings for Tyrone's different moods
const VOICE_SETTINGS = {
  professional: {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.4,
    use_speaker_boost: true,
  },
  trash: {
    stability: 0.3,
    similarity_boost: 0.7,
    style: 0.9,
    use_speaker_boost: true,
  },
};

// ============================================================================
// LEAGUE CONFIGURATION (must match app.js)
// ============================================================================

const LEAGUE_NAMES = ["Bronze", "Silber", "Gold", "Platin"];
const LEAGUE_WEIGHTS = [1, 3, 9, 27]; // Bronze=1, Silber=3, Gold=9, Platin=27

// ============================================================================
// TYRONE'S LOCAL PHRASES (Fallback - FREE!)
// ============================================================================

const TYRONE_PHRASES = {
  professional: {
    point: [
      "Yo, {scorer} mit dem Punkt gegen {loser}!",
      "{scorer} holt sich das Ding gegen {loser}, Baby!",
      "Das war sauber von {scorer}! {loser} muss aufpassen!",
      "Uh, {scorer} zeigt {loser} wie es geht!",
      "{scorer}, mein Mann! {loser} unter Druck!",
      "Respekt an {scorer}! Das war nice gegen {loser}!",
      "So macht man das, {scorer}! {loser} guckt nur zu!",
      "{scorer} drückt {loser} an die Wand!",
    ],
    promotion: [
      "YOOO! {scorer} steigt auf zu {league}! {loser} kann nur zugucken!",
      "AUFSTIEG! {scorer} geht hoch auf {league}! {loser} bleibt unten! Lets GOOO!",
      "{scorer} promoted zu {league} gegen {loser}! Das Ding ist REAL!",
    ],
    promotionWithReset: [
      "BOOOOM! {scorer} auf {league}! Alles wird zurückgesetzt, {loser} verliert {loserLost} Punkte!",
      "AUFSTIEG für {scorer}! {league} Baby! Und {loser}s {loserLost} Punkte? GONE! Haha!",
      "{scorer} steigt auf zu {league}! Reset für alle - {loser} verliert {loserLost} Punkte, aber {scorer} hat den Aufstieg!",
      "Das ist KRASS! {scorer} holt sich {league} und der Reset killt {loser}s {loserLost} Punkte!",
      "YOOO! {scorer} promoted zu {league}! {p1} verliert {p1Lost}, {p2} verliert {p2Lost} - aber nur {scorer} steigt auf!",
    ],
    streak: [
      "{scorer} ist on FIRE gegen {loser}! {count} in Folge, Digga!",
      "Niemand stoppt {scorer}! {count}er Serie gegen {loser}!",
      "{scorer} lässt {loser} nichts! {count} Punkte straight!",
    ],
    tied: [
      "Gleichstand zwischen {p1} und {p2}! Das wird SPANNEND!",
      "Alles offen zwischen {p1} und {p2}! Wer holt sich das?",
      "{p1} gegen {p2} ausgeglichen! Das ist ein FIGHT!",
    ],
    leadChange: [
      "WHOA! {leader} übernimmt die Führung gegen {loser}!",
      "FÜHRUNGSWECHSEL! {leader} ist jetzt vorne!",
      "{leader} dreht das Ding gegen {loser}!",
    ],
    bigLead: [
      "{leader} dominiert mit {diff} Punkten Vorsprung!",
      "{loser} wird abgehängt! {leader} führt mit {diff}!",
      "Das ist eine KLATSCHE! {leader} vorne mit {diff} Punkten!",
    ],
  },
  trash: {
    point: [
      "Boom! {scorer} zerstört {loser}!",
      "{loser} wird GEFICKT von {scorer} gerade! Sorry not sorry!",
      "Haha, {loser} ist SO schlecht gegen {scorer}, Alter!",
      "{scorer} macht {loser} zur Witzfigur!",
      "Peinlich für {loser}! {scorer} zeigt wies geht!",
      "{loser}? Mehr wie LOSER gegen {scorer}! Haha!",
      "{scorer} dominiert {loser} KOMPLETT!",
      "Geh nach Hause, {loser}! {scorer} ist zu stark!",
    ],
    promotion: [
      "YOOO! {scorer} steigt auf und {loser} kann EINPACKEN!",
      "{scorer} auf {league}! {loser} ist am HEULEN gerade!",
      "AUFSTIEG für {scorer}! {loser} ist ein WITZ dagegen!",
    ],
    promotionWithReset: [
      "HAHAHAHA! {scorer} steigt auf zu {league} und {loser} VERLIERT {loserLost} Punkte! Reset BITCH!",
      "{scorer} auf {league}! Und der RESET macht {loser} FERTIG! {loserLost} Punkte WEG!",
      "BRUUUTAL! {scorer} promoted zu {league}! {loser}s {loserLost} Punkte? Im MÜLL! HAHAHA!",
      "Das ist SO FIES! {scorer} holt {league} und {loser} verliert {loserLost} Punkte! GET REKT!",
      "VERNICHTUNG! {scorer} auf {league}! {p1} minus {p1Lost}, {p2} minus {p2Lost} - nur {scorer} gewinnt hier!",
    ],
    streak: [
      "{scorer} VERNICHTET {loser}! {count} in Folge! {loser} ist MÜLL!",
      "{count}er Serie von {scorer}! {loser} hat NULL Chance!",
      "BRUTAL! {scorer} lässt {loser} DUMM aussehen! {count} Punkte!",
    ],
    tied: [
      "Gleichstand zwischen {p1} und {p2}? {loser} hat noch ne Chance, aber glaub nicht dran!",
      "Oha, {p1} gegen {p2} ausgeglichen! Aber einer wird heulen!",
      "{p1} und {p2} ausgeglichen, aber {loser} wird trotzdem verlieren!",
    ],
    leadChange: [
      "HAHA! {leader} übernimmt! {loser} ist am HEULEN!",
      "{leader} zeigt {loser} wer der BOSS ist!",
      "FÜHRUNGSWECHSEL! {loser} wird ZERSTÖRT!",
    ],
    bigLead: [
      "{loser} wird VERNICHTET! {leader} mit {diff} Punkten vorne!",
      "GIB AUF, {loser}! {leader} führt mit {diff}! Es ist VORBEI!",
      "HAHAHAHA! {loser} kriegt eine {diff}-Punkte-KLATSCHE von {leader}!",
    ],
  },
};

// ============================================================================
// AI COMMENTATOR CLASS
// ============================================================================

class AICommentator {
  constructor() {
    this.isMuted = false;
    this.isSpeaking = false;
    this.lastCommentTime = 0;
    this.mode = localStorage.getItem("ai_personality") || "professional";
    this.cooldown = 4000;

    // Audio
    this.currentAudio = null;
    this.audioUnlocked = false;
    this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    this.voices = [];

    // Player names - ALWAYS track these!
    this.p1Name = "Spieler 1";
    this.p2Name = "Spieler 2";

    // State tracking
    this.lastState = {
      p1Scores: [0, 0, 0, 0],
      p2Scores: [0, 0, 0, 0],
      p1Total: 0,
      p2Total: 0,
    };

    // Game statistics
    this.streak = { count: 0, player: null, playerName: null };
    this.lastLeader = null;
    this.lastLeaderName = null;

    // Debug mode
    this.debug = true;

    this.init();
  }

  init() {
    this.loadVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }

    // Unlock audio on first interaction
    ["touchstart", "click"].forEach((evt) => {
      document.addEventListener(evt, () => this.unlockAudio(), { once: true });
    });

    document.addEventListener("DOMContentLoaded", () => {
      this.updateModeButtons();
      this.updateMuteButton();
    });

    this.log("Tyrone initialized and ready!");
  }

  log(...args) {
    if (this.debug) {
      console.log("[TYRONE]", ...args);
    }
  }

  loadVoices() {
    this.voices = window.speechSynthesis?.getVoices() || [];
  }

  unlockAudio() {
    if (this.audioUnlocked) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      ctx.resume();
    } catch (e) {}

    if (window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance("");
      u.volume = 0;
      window.speechSynthesis.speak(u);
    }
    this.audioUnlocked = true;
    this.log("Audio unlocked");
  }

  // ============================================================================
  // UI
  // ============================================================================

  updateModeButtons() {
    const proBtn = document.getElementById("mode-pro");
    const trashBtn = document.getElementById("mode-trash");
    if (proBtn && trashBtn) {
      proBtn.classList.toggle("active", this.mode === "professional");
      trashBtn.classList.toggle("active", this.mode === "trash");
    }
  }

  updateMuteButton() {
    const btn = document.getElementById("ai-mute-btn");
    if (btn)
      btn.textContent = this.isMuted ? "Tyrone aktivieren" : "Tyrone stumm";
  }

  setMode(mode) {
    this.mode = mode;
    localStorage.setItem("ai_personality", mode);
    this.updateModeButtons();
    this.log("Mode changed to:", mode);
  }

  setOrbState(state) {
    const orb = document.getElementById("ai-orb");
    if (!orb) return;
    orb.classList.remove("thinking", "speaking");
    if (state !== "idle") orb.classList.add(state);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    const orb = document.getElementById("ai-orb");
    if (orb) orb.classList.toggle("muted", this.isMuted);
    this.updateMuteButton();
    if (this.isMuted) this.stopSpeaking();
    this.log("Mute toggled:", this.isMuted);
  }

  stopSpeaking() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    window.speechSynthesis?.cancel();
    this.isSpeaking = false;
    this.setOrbState("idle");
  }

  // ============================================================================
  // SCORE CALCULATION
  // ============================================================================

  calculateTotal(scores) {
    if (!scores || scores.length !== 4) {
      this.log("ERROR: Invalid scores array:", scores);
      return 0;
    }
    // Bronze + Silber*3 + Gold*9 + Platin*27
    return (
      scores[0] * LEAGUE_WEIGHTS[0] +
      scores[1] * LEAGUE_WEIGHTS[1] +
      scores[2] * LEAGUE_WEIGHTS[2] +
      scores[3] * LEAGUE_WEIGHTS[3]
    );
  }

  formatScores(scores) {
    return `[B:${scores[0]}, S:${scores[1]}, G:${scores[2]}, P:${scores[3]}]`;
  }

  // ============================================================================
  // EVENT DETECTION & ANALYSIS
  // ============================================================================

  analyzeGameState(p1Scores, p2Scores, p1Name, p2Name) {
    // Update player names
    this.p1Name = p1Name || this.p1Name;
    this.p2Name = p2Name || this.p2Name;

    // Calculate totals
    const oldP1Total = this.lastState.p1Total;
    const oldP2Total = this.lastState.p2Total;
    const newP1Total = this.calculateTotal(p1Scores);
    const newP2Total = this.calculateTotal(p2Scores);

    this.log("=== ANALYZING GAME STATE ===");
    this.log(
      `Player 1: ${this.p1Name} | Old: ${oldP1Total} -> New: ${newP1Total} | Scores: ${this.formatScores(p1Scores)}`,
    );
    this.log(
      `Player 2: ${this.p2Name} | Old: ${oldP2Total} -> New: ${newP2Total} | Scores: ${this.formatScores(p2Scores)}`,
    );

    // Determine who scored
    const p1Diff = newP1Total - oldP1Total;
    const p2Diff = newP2Total - oldP2Total;

    this.log(`Score changes: P1=${p1Diff}, P2=${p2Diff}`);

    // Build analysis result
    const analysis = {
      // Player info
      p1Name: this.p1Name,
      p2Name: this.p2Name,

      // Scores
      p1Scores: [...p1Scores],
      p2Scores: [...p2Scores],
      p1Total: newP1Total,
      p2Total: newP2Total,

      // Old scores for reset detection
      oldP1Scores: [...this.lastState.p1Scores],
      oldP2Scores: [...this.lastState.p2Scores],
      oldP1Total: oldP1Total,
      oldP2Total: oldP2Total,

      // Who scored?
      scorerIndex: null,
      scorerName: null,
      loserName: null,
      pointsScored: 0,

      // Events
      isPromotion: false,
      promotionLeague: null,
      isReset: false,
      resetLeagues: [],
      p1PointsLost: 0,
      p2PointsLost: 0,
      isStreak: false,
      streakCount: 0,
      isTied: newP1Total === newP2Total,
      isLeadChange: false,

      // Current state
      leader: null,
      leaderName: null,
      losingName: null,
      leadDiff: Math.abs(newP1Total - newP2Total),

      // Is this a valid score event?
      isValid: false,
    };

    // Determine scorer
    if (p1Diff > 0 && p2Diff === 0) {
      analysis.scorerIndex = 0;
      analysis.scorerName = this.p1Name;
      analysis.loserName = this.p2Name;
      analysis.pointsScored = p1Diff;
      analysis.isValid = true;
      this.log(`>>> ${this.p1Name} SCORED ${p1Diff} point(s)!`);
    } else if (p2Diff > 0 && p1Diff === 0) {
      analysis.scorerIndex = 1;
      analysis.scorerName = this.p2Name;
      analysis.loserName = this.p1Name;
      analysis.pointsScored = p2Diff;
      analysis.isValid = true;
      this.log(`>>> ${this.p2Name} SCORED ${p2Diff} point(s)!`);
    } else if (p1Diff < 0 || p2Diff < 0) {
      this.log("Score was REMOVED - not commenting");
      return analysis;
    } else {
      this.log("No valid score change detected");
      return analysis;
    }

    // Determine current leader
    if (newP1Total > newP2Total) {
      analysis.leader = 0;
      analysis.leaderName = this.p1Name;
      analysis.losingName = this.p2Name;
    } else if (newP2Total > newP1Total) {
      analysis.leader = 1;
      analysis.leaderName = this.p2Name;
      analysis.losingName = this.p1Name;
    }

    // Check for promotion (league advancement)
    const scorerOldScores =
      analysis.scorerIndex === 0
        ? this.lastState.p1Scores
        : this.lastState.p2Scores;
    const scorerNewScores = analysis.scorerIndex === 0 ? p1Scores : p2Scores;

    for (let i = 1; i < 4; i++) {
      if (scorerNewScores[i] > scorerOldScores[i]) {
        analysis.isPromotion = true;
        analysis.promotionLeague = LEAGUE_NAMES[i];
        this.log(`>>> PROMOTION to ${LEAGUE_NAMES[i]}!`);
      }
    }

    // Check for reset (when promotion happens, lower leagues are reset)
    // Detect which leagues were reset for both players
    for (let i = 0; i < 3; i++) {
      const p1OldLeague = this.lastState.p1Scores[i];
      const p2OldLeague = this.lastState.p2Scores[i];
      const p1NewLeague = p1Scores[i];
      const p2NewLeague = p2Scores[i];

      // If both players had points and now have 0, it's a reset
      if (
        (p1OldLeague > 0 || p2OldLeague > 0) &&
        p1NewLeague === 0 &&
        p2NewLeague === 0
      ) {
        analysis.isReset = true;
        analysis.resetLeagues.push(LEAGUE_NAMES[i]);
        analysis.p1PointsLost += p1OldLeague * LEAGUE_WEIGHTS[i];
        analysis.p2PointsLost += p2OldLeague * LEAGUE_WEIGHTS[i];
        this.log(
          `>>> RESET detected in ${LEAGUE_NAMES[i]}! P1 lost ${p1OldLeague}, P2 lost ${p2OldLeague}`,
        );
      }
    }

    if (analysis.isReset) {
      this.log(
        `>>> Total points lost: ${analysis.p1Name}=${analysis.p1PointsLost}, ${analysis.p2Name}=${analysis.p2PointsLost}`,
      );
    }

    // Check for lead change
    if (this.lastLeader !== null && analysis.leader !== null) {
      if (this.lastLeader !== analysis.leader) {
        analysis.isLeadChange = true;
        this.log(`>>> LEAD CHANGE! ${analysis.leaderName} now leads!`);
      }
    }

    // Update streak tracking
    if (this.streak.player === analysis.scorerIndex) {
      this.streak.count++;
    } else {
      this.streak.count = 1;
      this.streak.player = analysis.scorerIndex;
      this.streak.playerName = analysis.scorerName;
    }

    if (this.streak.count >= 3) {
      analysis.isStreak = true;
      analysis.streakCount = this.streak.count;
      this.log(
        `>>> STREAK! ${this.streak.count} in a row for ${analysis.scorerName}!`,
      );
    }

    // Update last leader
    this.lastLeader = analysis.leader;
    this.lastLeaderName = analysis.leaderName;

    this.log("Analysis complete:", analysis);
    return analysis;
  }

  // ============================================================================
  // GROQ PROMPT GENERATION
  // ============================================================================

  buildGroqPrompt(analysis) {
    // Create a very clear, structured prompt for Groq
    const personality =
      this.mode === "trash"
        ? `Du bist TYRONE, ein BRUTALER Trash-Talk Kommentator für Tischtennis.
Du bist LAUT, respektlos, und beleidigst den Verlierer HART.
Du nutzt Slang, Jugendsprache, und bist maximal fies und provokant.
Du lachst über den Verlierer und feierst den Gewinner übertrieben.`
        : `Du bist TYRONE, ein CHARISMATISCHER Sport-Kommentator für Tischtennis.
Du hast eine tiefe Stimme und bist energetisch und enthusiastisch.
Du hyped die Spieler und nutzt lockere, coole Sprache.`;

    // Explain the game rules so AI understands resets
    const gameRules = `
=== SPIELREGELN (WICHTIG!) ===
Dies ist ein Tischtennis-Punktesystem mit 4 Ligen: Bronze, Silber, Gold, Platin.
- 3 Bronze-Punkte = Aufstieg zu Silber (Bronze wird für BEIDE Spieler auf 0 gesetzt!)
- 3 Silber-Punkte = Aufstieg zu Gold (Silber wird für BEIDE auf 0 gesetzt!)
- 3 Gold-Punkte = Aufstieg zu Platin (Bronze, Silber UND Gold werden für BEIDE auf 0 gesetzt!)
Bei einem Aufstieg verlieren also BEIDE Spieler ihre Punkte in den unteren Ligen!
`;

    // Build the game state description
    let gameState = `
=== AKTUELLER SPIELSTAND ===
${analysis.p1Name}: ${analysis.p1Total} Punkte (Bronze:${analysis.p1Scores[0]}, Silber:${analysis.p1Scores[1]}, Gold:${analysis.p1Scores[2]}, Platin:${analysis.p1Scores[3]})
${analysis.p2Name}: ${analysis.p2Total} Punkte (Bronze:${analysis.p2Scores[0]}, Silber:${analysis.p2Scores[1]}, Gold:${analysis.p2Scores[2]}, Platin:${analysis.p2Scores[3]})
`;

    // Show previous state if there was a reset
    if (analysis.isReset) {
      gameState += `
=== VORHERIGER STAND (vor dem Reset) ===
${analysis.p1Name}: ${analysis.oldP1Total} Punkte (Bronze:${analysis.oldP1Scores[0]}, Silber:${analysis.oldP1Scores[1]}, Gold:${analysis.oldP1Scores[2]}, Platin:${analysis.oldP1Scores[3]})
${analysis.p2Name}: ${analysis.oldP2Total} Punkte (Bronze:${analysis.oldP2Scores[0]}, Silber:${analysis.oldP2Scores[1]}, Gold:${analysis.oldP2Scores[2]}, Platin:${analysis.oldP2Scores[3]})
`;
    }

    if (analysis.isTied) {
      gameState += `STATUS: GLEICHSTAND!\n`;
    } else if (analysis.leaderName) {
      gameState += `FÜHRUNG: ${analysis.leaderName} mit ${analysis.leadDiff} Punkt(en) Vorsprung\n`;
    }

    // Describe what just happened
    let eventDescription = `
=== WAS GERADE PASSIERT IST ===
PUNKTGEWINN für: ${analysis.scorerName}
GEGNER: ${analysis.loserName}
`;

    // Add special events - PROMOTION WITH RESET IS THE MOST IMPORTANT!
    if (analysis.isPromotion && analysis.isReset) {
      eventDescription += `
🎉🔥 MEGA-EREIGNIS: ${analysis.scorerName} ist zu ${analysis.promotionLeague} AUFGESTIEGEN!
⚠️ RESET: Durch den Aufstieg wurden ${analysis.resetLeagues.join(", ")} für BEIDE Spieler auf 0 gesetzt!
📉 ${analysis.p1Name} hat ${analysis.p1PointsLost} Punkte verloren!
📉 ${analysis.p2Name} hat ${analysis.p2PointsLost} Punkte verloren!
💡 Das verändert das ganze Spiel - alle gesammelten Punkte in den unteren Ligen sind WEG!`;
    } else if (analysis.isPromotion) {
      eventDescription += `\n🎉 BESONDERES EREIGNIS: ${analysis.scorerName} ist zu ${analysis.promotionLeague} AUFGESTIEGEN!`;
    }

    if (analysis.isLeadChange) {
      eventDescription += `\n🔄 FÜHRUNGSWECHSEL: ${analysis.leaderName} hat die Führung übernommen!`;
    }
    if (analysis.isStreak) {
      eventDescription += `\n🔥 SERIE: ${analysis.scorerName} hat ${analysis.streakCount} Punkte IN FOLGE gemacht!`;
    }
    if (analysis.isTied && analysis.p1Total > 0) {
      eventDescription += `\n⚖️ GLEICHSTAND: Das Spiel ist jetzt ausgeglichen!`;
    }

    // Special instructions for reset situations
    let instructions = `
=== DEINE AUFGABE ===
Kommentiere diesen Moment als Tyrone!
- Du MUSST den Namen "${analysis.scorerName}" erwähnen (der hat gepunktet)
- Du KANNST auch "${analysis.loserName}" erwähnen (der Gegner)`;

    if (analysis.isPromotion && analysis.isReset) {
      instructions += `
- WICHTIG: Erwähne den AUFSTIEG zu ${analysis.promotionLeague}!
- WICHTIG: Erwähne dass durch den Reset Punkte verloren gingen!
- Wenn ${analysis.loserName} mehr Punkte verloren hat, mach dich darüber lustig!
- Wenn ${analysis.scorerName} mehr Punkte verloren hat, erwähne dass es sich trotzdem lohnt wegen dem Aufstieg!`;
    }

    instructions += `
- Antworte mit EINEM kurzen, energetischen Satz auf Deutsch
- NUR der Sprechtext, keine Anführungszeichen, keine Erklärungen

DEIN KOMMENTAR:`;

    const prompt = `${personality}
${gameRules}
${gameState}
${eventDescription}
${instructions}`;

    this.log("=== GROQ PROMPT ===");
    this.log(prompt);

    return prompt;
  }

  // ============================================================================
  // LOCAL PHRASE SELECTION
  // ============================================================================

  getLocalPhrase(analysis) {
    const phrases = TYRONE_PHRASES[this.mode];
    let pool;
    let useLeaderLoser = false;

    // Select appropriate phrase pool based on event priority
    // Promotion with reset is highest priority!
    if (analysis.isPromotion && analysis.isReset) {
      pool = phrases.promotionWithReset;
    } else if (analysis.isPromotion) {
      pool = phrases.promotion;
    } else if (analysis.isLeadChange) {
      pool = phrases.leadChange;
      useLeaderLoser = true;
    } else if (analysis.isStreak) {
      pool = phrases.streak;
    } else if (analysis.isTied && analysis.p1Total > 0) {
      pool = phrases.tied;
    } else if (analysis.leadDiff >= 5) {
      pool = phrases.bigLead;
      useLeaderLoser = true;
    } else {
      pool = phrases.point;
    }

    // Select random phrase
    let text = pool[Math.floor(Math.random() * pool.length)];

    // Replace placeholders
    text = text.replace(/{scorer}/g, analysis.scorerName);
    text = text.replace(/{loser}/g, analysis.loserName);
    text = text.replace(/{p1}/g, analysis.p1Name);
    text = text.replace(/{p2}/g, analysis.p2Name);
    text = text.replace(/{league}/g, analysis.promotionLeague || "");
    text = text.replace(/{count}/g, analysis.streakCount || this.streak.count);
    text = text.replace(
      /{leader}/g,
      analysis.leaderName || analysis.scorerName,
    );
    text = text.replace(/{diff}/g, analysis.leadDiff);

    // Reset-specific placeholders
    text = text.replace(/{p1Lost}/g, analysis.p1PointsLost || 0);
    text = text.replace(/{p2Lost}/g, analysis.p2PointsLost || 0);
    // {loserLost} = how many points the opponent (non-scorer) lost
    const loserLost =
      analysis.scorerIndex === 0
        ? analysis.p2PointsLost
        : analysis.p1PointsLost;
    text = text.replace(/{loserLost}/g, loserLost || 0);
    // {scorerLost} = how many points the scorer lost (still worth it for promotion!)
    const scorerLost =
      analysis.scorerIndex === 0
        ? analysis.p1PointsLost
        : analysis.p2PointsLost;
    text = text.replace(/{scorerLost}/g, scorerLost || 0);

    this.log("Local phrase selected:", text);
    return text;
  }

  // ============================================================================
  // API CALLS
  // ============================================================================

  async callGroq(prompt) {
    if (!GROQ_API_KEY) {
      this.log("No Groq API key configured");
      return null;
    }

    try {
      this.log("Calling Groq API...");

      // Timeout for Safari compatibility
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 80,
            temperature: 0.9,
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!res.ok) {
        this.log("Groq API error:", res.status, res.statusText);
        return null;
      }

      const data = await res.json();
      const text = data.choices[0]?.message?.content?.trim() || null;
      this.log("Groq response:", text);
      return text;
    } catch (e) {
      if (e.name === "AbortError") {
        this.log("Groq API timeout");
      } else {
        this.log("Groq API exception:", e.message || e);
      }
      return null;
    }
  }

  async callElevenLabs(text) {
    if (!ELEVENLABS_API_KEY) {
      this.log("No ElevenLabs API key configured");
      return null;
    }

    const settings = VOICE_SETTINGS[this.mode];

    try {
      this.log("Calling ElevenLabs API...");

      // Timeout for Safari compatibility
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text: text,
            model_id: ELEVENLABS_MODEL,
            voice_settings: settings,
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!res.ok) {
        this.log("ElevenLabs API error:", res.status, res.statusText);
        return null;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      this.log("ElevenLabs audio ready");
      return url;
    } catch (e) {
      if (e.name === "AbortError") {
        this.log("ElevenLabs API timeout");
      } else {
        this.log("ElevenLabs API exception:", e.message || e);
      }
      return null;
    }
  }

  // ============================================================================
  // SPEECH OUTPUT
  // ============================================================================

  async speak(text) {
    if (!text) {
      this.log("No text to speak");
      return;
    }

    this.setOrbState("speaking");
    this.isSpeaking = true;

    this.log("Speaking:", text);

    // Try ElevenLabs (cheap turbo model)
    const audioUrl = await this.callElevenLabs(text);

    if (audioUrl) {
      await this.playAudio(audioUrl);
    } else {
      // Fallback to Web Speech
      this.speakFallback(text);
    }
  }

  playAudio(url) {
    return new Promise((resolve) => {
      const audio = new Audio(url);
      this.currentAudio = audio;

      audio.onended = () => {
        this.setOrbState("idle");
        this.isSpeaking = false;
        this.currentAudio = null;
        URL.revokeObjectURL(url);
        resolve();
      };

      audio.onerror = (e) => {
        this.log("Audio playback error:", e);
        this.setOrbState("idle");
        this.isSpeaking = false;
        this.currentAudio = null;
        resolve();
      };

      audio.play().catch((e) => {
        this.log("Audio play() failed:", e);
        this.speakFallback("");
        resolve();
      });
    });
  }

  speakFallback(text) {
    if (!window.speechSynthesis || !text) {
      this.setOrbState("idle");
      this.isSpeaking = false;
      return;
    }

    this.log("Using Web Speech fallback");
    this.setOrbState("speaking");
    this.isSpeaking = true;
    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE";
    u.rate = this.mode === "trash" ? 1.05 : 0.95;
    u.pitch = 0.85; // Deeper voice for Tyrone

    const voice = this.voices.find((v) => v.lang.includes("de"));
    if (voice) u.voice = voice;

    u.onend = () => {
      this.setOrbState("idle");
      this.isSpeaking = false;
    };
    u.onerror = () => {
      this.setOrbState("idle");
      this.isSpeaking = false;
    };

    setTimeout(() => window.speechSynthesis.speak(u), 100);
  }

  // ============================================================================
  // MAIN ENTRY POINT
  // ============================================================================

  async onScoreChange(p1Scores, p2Scores, p1Name, p2Name) {
    this.log("\n========================================");
    this.log("onScoreChange called");
    this.log("P1:", p1Name, "Scores:", p1Scores);
    this.log("P2:", p2Name, "Scores:", p2Scores);
    this.log("========================================");

    // Check if we should comment
    if (this.isMuted) {
      this.log("Muted - skipping");
      return;
    }

    if (this.isSpeaking) {
      this.log("Already speaking - skipping");
      return;
    }

    const now = Date.now();
    if (now - this.lastCommentTime < this.cooldown) {
      this.log("Cooldown active - skipping");
      return;
    }

    // Analyze the game state
    const analysis = this.analyzeGameState(p1Scores, p2Scores, p1Name, p2Name);

    // Update stored state AFTER analysis
    this.lastState = {
      p1Scores: [...p1Scores],
      p2Scores: [...p2Scores],
      p1Total: analysis.p1Total,
      p2Total: analysis.p2Total,
    };

    // Check if this is a valid scoring event
    if (!analysis.isValid) {
      this.log("Not a valid scoring event - skipping");
      return;
    }

    // Update timing
    this.lastCommentTime = now;
    this.setOrbState("thinking");

    // Generate text with Groq
    const prompt = this.buildGroqPrompt(analysis);
    let text = await this.callGroq(prompt);

    // Fallback to local phrase if Groq fails
    if (!text) {
      this.log("Groq failed, using local phrase");
      text = this.getLocalPhrase(analysis);
    }

    // Clean up the text (remove quotes if present)
    if (text) {
      text = text.replace(/^["']|["']$/g, "").trim();
    }

    // Speak the comment
    await this.speak(text);
  }

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  syncState(p1Scores, p2Scores, p1Name, p2Name) {
    this.log("Syncing state...");
    this.log("P1:", p1Name, "Scores:", p1Scores);
    this.log("P2:", p2Name, "Scores:", p2Scores);

    // Update player names
    if (p1Name) this.p1Name = p1Name;
    if (p2Name) this.p2Name = p2Name;

    // Update stored state
    this.lastState = {
      p1Scores: [...p1Scores],
      p2Scores: [...p2Scores],
      p1Total: this.calculateTotal(p1Scores),
      p2Total: this.calculateTotal(p2Scores),
    };

    // Update leader tracking
    if (this.lastState.p1Total > this.lastState.p2Total) {
      this.lastLeader = 0;
      this.lastLeaderName = this.p1Name;
    } else if (this.lastState.p2Total > this.lastState.p1Total) {
      this.lastLeader = 1;
      this.lastLeaderName = this.p2Name;
    } else {
      this.lastLeader = null;
      this.lastLeaderName = null;
    }

    this.log("State synced successfully");
  }

  getPlayerNames() {
    return { p1: this.p1Name, p2: this.p2Name };
  }

  resetStats() {
    this.log("Resetting stats...");
    this.streak = { count: 0, player: null, playerName: null };
    this.lastLeader = null;
    this.lastLeaderName = null;
  }
}

// ============================================================================
// GLOBAL INSTANCE
// ============================================================================

const commentator = new AICommentator();

// ============================================================================
// UI FUNCTIONS
// ============================================================================

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
