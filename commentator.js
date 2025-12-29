/**
 * AI Commentator for Table Tennis Liquid
 * High-End "Liquid Glass" Design & Deep Game Logic
 */

class AICommentator {
    constructor() {
        this.isMuted = false;
        this.isSpeaking = false;
        this.lastCommentTime = 0;
        this.mode = localStorage.getItem('ai_personality') || 'professional'; 
        
        // Historie-Speicher für den Vergleich
        this.lastState = {
            p1Scores: [0, 0, 0, 0],
            p2Scores: [0, 0, 0, 0]
        };

        this.initUI();
    }

    initUI() {
        const style = document.createElement('style');
        style.innerHTML = `
            #ai-api-key-container { display: none !important; }
            .mode-toggle { display: flex; gap: 10px; margin-top: 10px; margin-bottom: 20px; }
            .mode-btn { 
                flex: 1; padding: 12px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1); 
                background: rgba(255,255,255,0.05); color: white; cursor: pointer;
                font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
                font-weight: 500; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .mode-btn.active { 
                background: white; color: black; box-shadow: 0 4px 20px rgba(255,255,255,0.4);
                transform: scale(1.02);
            }
        `;
        document.head.appendChild(style);

        setTimeout(() => {
            const popupContent = document.querySelector('#ai-settings-popup .popup-content');
            if (popupContent) {
                const modeSection = document.createElement('div');
                modeSection.className = 'settings-group';
                modeSection.style.marginTop = '20px';
                modeSection.innerHTML = `
                    <label style="display:block; margin-bottom:8px; font-size:0.75rem; color:rgba(255,255,255,0.4); text-transform:uppercase; letter-spacing:1px;">KI Charakter</label>
                    <div class="mode-toggle">
                        <button id="mode-pro" class="mode-btn ${this.mode === 'professional' ? 'active' : ''}" onclick="commentator.setMode('professional')">Pro</button>
                        <button id="mode-trash" class="mode-btn ${this.mode === 'trash' ? 'active' : ''}" onclick="commentator.setMode('trash')">Trash Talk</button>
                    </div>
                `;
                const closeBtn = popupContent.querySelector('button:last-of-type');
                if (closeBtn) popupContent.insertBefore(modeSection, closeBtn);
                else popupContent.appendChild(modeSection);
            }
        }, 1000);
    }

    setMode(m) {
        this.mode = m;
        localStorage.setItem('ai_personality', m);
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        const activeBtn = document.getElementById(m === 'professional' ? 'mode-pro' : 'mode-trash');
        if (activeBtn) activeBtn.classList.add('active');
    }

    async onScoreChange(p1Scores, p2Scores, p1Name, p2Name, eventType) {
        if (this.isMuted || this.isSpeaking) return;

        // Wer hat den Punkt gemacht? Vergleich mit Historie
        let actionDescription = eventType;
        if (JSON.stringify(p1Scores) !== JSON.stringify(this.lastState.p1Scores)) {
            actionDescription = `${p1Name} hat gepunktet/sich verändert.`;
        } else if (JSON.stringify(p2Scores) !== JSON.stringify(this.lastState.p2Scores)) {
            actionDescription = `${p2Name} hat gepunktet/sich verändert.`;
        }

        const now = Date.now();
        if (now - this.lastCommentTime < 4500) return;
        this.lastCommentTime = now;

        this.setUIState('thinking');

        const context = `
        Rolle: Live-Kommentator für Tischtennis.
        Charakter: ${this.mode === 'trash' ? 'Extremer Trash-Talk, sarkastisch, fies, modernes Sprachgebrauch, beleidigt Verlierer stark.' : 'Professionell, hochemotional.'}
        
        HISTORIE (Vorher): 
        ${p1Name}: [${this.lastState.p1Scores.join(',')}] | ${p2Name}: [${this.lastState.p2Scores.join(',')}]
        
        AKTUELL (Jetzt):
        ${p1Name}: [${p1Scores.join(',')}] | ${p2Name}: [${p2Scores.join(',')}]
        
        AKTION: ${actionDescription}
        
        Info: Ligen sind Bronze, Silber, Gold, Platin. Wenn eine Liga auf 0 geht, ist der Spieler aufgestiegen!
        Aufgabe: Schreib 2 kurze Sätze auf Deutsch. Antworte NUR mit Sprechtext.
        `;

        // Update Historie für das nächste Mal
        this.lastState.p1Scores = [...p1Scores];
        this.lastState.p2Scores = [...p2Scores];

        try {
            const response = await puter.ai.chat(context);
            const text = response.toString().trim();
            if (text) this.speak(text);
        } catch (error) {
            console.error("Puter Error:", error);
            this.setUIState('idle');
        }
    }

    speak(text) {
        window.speechSynthesis.cancel();
        this.setUIState('speaking');
        this.isSpeaking = true;

        const ut = new SpeechSynthesisUtterance(text);
        ut.lang = 'de-DE';
        ut.rate = 1.1; 
        
        const voices = window.speechSynthesis.getVoices();
        ut.voice = voices.find(v => v.name.includes('Google') && v.lang.includes('de')) || 
                   voices.find(v => v.lang.includes('de'));

        ut.onend = () => {
            this.setUIState('idle');
            this.isSpeaking = false;
        };
        window.speechSynthesis.speak(ut);
    }

    setUIState(state) {
        const orb = document.getElementById('ai-orb');
        if (!orb) return;
        orb.classList.remove('thinking', 'speaking');
        if (state !== 'idle') orb.classList.add(state);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        const orb = document.getElementById('ai-orb');
        const muteBtn = document.getElementById('ai-mute-btn');
        if (orb) orb.classList.toggle('muted', this.isMuted);
        if (muteBtn) muteBtn.innerText = this.isMuted ? "KI Aktivieren" : "Stummschalten";
        if (this.isMuted) window.speechSynthesis.cancel();
    }
}

const commentator = new AICommentator();

window.toggleAISettings = () => {
    const p = document.getElementById('ai-settings-popup');
    if (p) p.style.display = (p.style.display === 'none') ? 'flex' : 'none';
};
window.closeAISettings = () => {
    const p = document.getElementById('ai-settings-popup');
    if (p) p.style.display = 'none';
};
window.toggleAIMute = () => commentator.toggleMute();