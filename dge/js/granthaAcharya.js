/**
 * ============================================================
 * granthaAcharya.js
 * Mechanical migration from PrahladaKrutaNarasimhaStotra.html
 * Phase 1: Frozen & Stabilized
 * ============================================================
 */

export class GranthaAcharya {

    constructor(app) {
        this.app = app;
        this.audio = app.audio;
        this.dataset = app.dataset;
        this.els = app.els;

        this.currentAcharyaShlokaId = null;

        this.lastSelectedText = "";
        this.modalSelectedText = "";

        // DOM Lookups - safely handled during runtime
        this.actionTooltip = document.getElementById("actionTooltip");
        this.modalAppendBtn = document.getElementById("modalAppendBtn");
        this.acharyaResult = document.getElementById("acharyaResult");
        this.acharyaLoading = document.getElementById("acharyaLoading");
        this.noteModal = document.getElementById("noteModal");
        this.noteText = document.getElementById("noteText");
        this.keyInput = document.getElementById("userApiKeyInput");
        this.bhashyaContainer = document.getElementById("bhashyaOptionsContainer");
    }

    /* =======================================================
       Markdown renderer
       ======================================================= */

    parseMarkdown(md) {
        if (!md) return "";
        
        let html = md
            .replace(/^### (.*$)/gim, '<div class="md-h3">$1</div>')
            .replace(/^## (.*$)/gim, '<div class="md-h2">$1</div>')
            .replace(/\*\*(.*?)\*\*/g, '<strong class="md-strong">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Safely group contiguous bullet points into a single ul/li block
        html = html.replace(/(?:^\* (.*$)\n?)+/gim, (match) => {
            const listItems = match.trim().split('\n')
                .map(item => `<li>${item.replace(/^\*\s*/, '').trim()}</li>`)
                .join('');
            return `<ul class="md-list">${listItems}</ul>`;
        });

        // Convert remaining isolated newlines to breaks
        return html.replace(/\n/g, '<br>');
    }

    /* =======================================================
       Append selected Acharya excerpt into Notes
       ======================================================= */

    appendSelectedTextToNote(e) {
        if (e) e.preventDefault();

        if (this.modalAppendBtn) {
            this.modalAppendBtn.style.display = "none";
        }

        window.getSelection().removeAllRanges();

        const targetId = this.currentAcharyaShlokaId 
                      || this.app.contextShlokaId 
                      || this.app.activeId;

        if (!targetId) {
            this.app.showToast("Please tap on a Shloka card first to make it active before appending notes.");
            return;
        }

        if (!this.modalSelectedText) return;

        const notes = this.app.notes;
        const existing = notes[targetId] || "";
        
        const updated = existing
            ? existing + "\n\n[Acharya Excerpt]:\n" + this.modalSelectedText
            : "[Acharya Excerpt]:\n" + this.modalSelectedText;

        notes[targetId] = updated;

        localStorage.setItem(this.app.nsKey("notes"), JSON.stringify(notes));

        this.app.renderList();
        this.app.showToast(`Successfully appended excerpt to Shloka ${targetId} notes!`);
    }

    /* =======================================================
       Secret key manager
       ======================================================= */

    openKeyModal() {
        if (this.keyInput) {
            this.keyInput.value = localStorage.getItem("user_gemini_key") || "";
        }
        this.app.openModal("keyModal");
    }

    closeKeyModal() {
        this.app.closeModal("keyModal");
    }

    saveUserApiKey() {
        if (!this.keyInput) return;
        
        const key = this.keyInput.value.trim();

        if (key) {
            localStorage.setItem("user_gemini_key", key);
        } else {
            localStorage.removeItem("user_gemini_key");
        }

        this.closeKeyModal();
    }

    /* =======================================================
       Dynamic Bhashya Picker Workflow
       ======================================================= */

    openBhashyaPicker(e) {
        if (e) e.preventDefault();

        if (this.actionTooltip) {
            this.actionTooltip.style.display = "none";
        }

        window.getSelection().removeAllRanges();

        const targetId = this.app.contextShlokaId || this.app.activeId || 1;
        this.currentAcharyaShlokaId = targetId;

        const shloka = this.dataset.shlokas[targetId];
        const container = this.bhashyaContainer;

        if (!container) return;
        container.innerHTML = "";

        if (shloka && shloka.commentaries) {
            Object.entries(shloka.commentaries).forEach(([cKey, cText]) => {
                const name = this.dataset.metadata?.availableCommentaries?.[cKey] || cKey;
                const displayName = this.app.applyTransliteration(name, this.app.activeScript);

                container.innerHTML += `
                    <button class="bhashya-picker-btn" onpointerdown="DGE.acharya.executeBhashyaAnalysis('${cKey}')">
                        <span>📖 ${displayName}</span>
                        <span style="font-size:11px;opacity:.6;">Analyze ➔</span>
                    </button>`;
            });

            container.innerHTML += `
                <button class="bhashya-picker-btn" style="border-color:var(--accent-gold);" onpointerdown="DGE.acharya.executeBhashyaAnalysis('all')">
                    <span>📚 All Available Commentaries Combined</span>
                    <span style="font-size:11px;opacity:.6;">Analyze ➔</span>
                </button>`;
        }

        container.innerHTML += `
            <button class="bhashya-picker-btn" style="background:transparent;border-style:dashed;" onpointerdown="DGE.acharya.executeBhashyaAnalysis('general')">
                <span>🌐 General Acharya Analysis (External Knowledge)</span>
                <span style="font-size:11px;opacity:.6;">Analyze ➔</span>
            </button>`;

        this.app.openModal("bhashyaPickerModal");
    }

    closeBhashyaPicker() {
        this.app.closeModal("bhashyaPickerModal");
    }

    executeBhashyaAnalysis(cKey) {
        this.closeBhashyaPicker();

        const targetId = this.currentAcharyaShlokaId || this.app.contextShlokaId || this.app.activeId || 1;
        const shloka = this.dataset.shlokas[targetId];

        let commentaryTextToFeed = "";
        let commentaryTitle = "";

        if (cKey === "all") {
            commentaryTitle = "All Available Commentaries";
            if (shloka && shloka.commentaries) {
                Object.entries(shloka.commentaries).forEach(([k, v]) => {
                    const name = this.dataset.metadata?.availableCommentaries?.[k] || k;
                    commentaryTextToFeed += `\n--- Commentary: ${name} ---\n${v}\n`;
                });
            }
        } else if (cKey !== "general" && shloka && shloka.commentaries && shloka.commentaries[cKey]) {
            commentaryTitle = this.dataset.metadata?.availableCommentaries?.[cKey] || cKey;
            commentaryTextToFeed = shloka.commentaries[cKey];
        }

        const payload = {
            type: "commentary",
            selectedText: this.lastSelectedText,
            shlokaText: shloka ? shloka.sa : "",
            commentaryTitle,
            commentaryText: commentaryTextToFeed
        };

        this.askAcharya(null, "commentary", payload);
    }

    /* =======================================================
       Ask Acharya
       ======================================================= */

    async askAcharya(e, type, payload) {
        if (e) e.preventDefault();

        if (this.actionTooltip) this.actionTooltip.style.display = "none";

        this.currentAcharyaShlokaId = this.app.contextShlokaId || this.app.activeId;
        const apiKey = localStorage.getItem("user_gemini_key");

        if (!apiKey && document.body.classList.contains("is-authorized")) {
            this.openKeyModal();
            return;
        } else if (!apiKey) {
            this.app.openModal("acharyaModal");
            
            if (this.acharyaLoading) this.acharyaLoading.style.display = "none";
            if (this.acharyaResult) {
                this.acharyaResult.innerHTML = `
                    <span style="color:var(--accent-red);font-weight:bold;">
                    आचार्यः ध्याने मग्नः अस्ति (Acharya is meditating).
                    </span><br><br>
                    The traditional text analysis engine is currently unavailable. Please try again later.`;
            }
            return;
        }

        const text = payload 
            ? payload.selectedText 
            : (this.lastSelectedText || window.getSelection().toString().trim());

        if (!text && type !== "commentary") return;

        window.getSelection().removeAllRanges();

        this.app.openModal("acharyaModal");
        if (this.acharyaLoading) this.acharyaLoading.style.display = "block";
        if (this.acharyaResult) this.acharyaResult.innerHTML = "";

        let targetLang = "English";
        if (this.app.activeScript === "kannada") targetLang = "Kannada";
        if (this.app.activeScript === "telugu") targetLang = "Telugu";
        if (this.app.activeScript === "tamil") targetLang = "Tamil";
        if (this.app.activeScript === "malayalam") targetLang = "Malayalam";

        let promptText = "";

        if (type === "shloka") {
            promptText = `You are a traditional scholar of the Madhva Sampradaya (Dvaita Vedanta). For the verse: "${text}", provide:
1. Padachheda (Word-by-word split)
2. Anvaya (Prose word order)
3. Word Meaning
4. Bhavartha (Overarching theme strictly according to Sri Madhvacharya's philosophy).
Format using clean markdown headings.`;

        } else if (type === "grammar") {
            promptText = `You are a traditional Vyakarana Acharya. For the text: "${text}" provide:
1. Dhatu & Gana (if verb)
2. Pratyaya (Krt/Taddhita/Tin)
3. Vibhakti & Linga (if noun)
4. Samasa Vigraha (if compound)
Format using clean markdown.`;

        } else if (type === "commentary") {
            if (payload && payload.commentaryText) {
                promptText = `You are a traditional scholar of the Madhva Sampradaya (Dvaita Vedanta).
Analyze ONLY the supplied commentary text provided below. Do NOT hallucinate external commentaries.

Mula Shloka: "${payload.shlokaText}"
Commentary Name: "${payload.commentaryTitle}"
Commentary Text: "${payload.commentaryText}"
Highlighted Fragment: "${payload.selectedText}"

Provide a detailed scholarly breakdown in clean markdown:
1. Sentence-by-Sentence Breakdown & Word-by-Word Meaning of this supplied commentary fragment.
2. Pramana & Citation Expansion: Identify every scriptural quote (Shruti, Smriti, Gita, Amarakosha, etc.) cited in this text. Provide the FULL Sanskrit quote, source attribution, and precise meaning.
3. Philosophical Siddhanta strictly according to Sri Madhvacharya's Dvaita philosophy derived from this commentary.`;
            } else {
                promptText = `You are a traditional scholar of the Madhva Sampradaya (Dvaita Vedanta). Analyze this commentary excerpt: "${text}"
Provide:
1. Sentence Breakdown
2. Purvapaksha & Siddhanta (strictly according to Sri Madhvacharya)
3. Pramana/Citations expanded with full quotes.
Format using clean markdown.`;
            }

        } else if (type === "translate") {
            promptText = `Translate and explain the meaning of this Sanskrit text: "${text}" into ${targetLang}.
Provide a natural translation and a brief summary of its philosophical significance according to the Madhva Sampradaya (Dvaita philosophy).
Format cleanly using markdown.`;
        }

        try {
            const modelName = this.app.config?.geminiModel || "gemini-1.5-flash";
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
                }
            );

            const data = await response.json();

            if (data.error) throw new Error(data.error.message);

            // Defensive response mapping
            const parts = data.candidates?.[0]?.content?.parts;
            if (!parts || !parts[0] || !parts[0].text) {
                throw new Error("Invalid or empty response received from the API.");
            }

            let result = parts[0].text;

            if (this.acharyaLoading) this.acharyaLoading.style.display = "none";
            if (this.acharyaResult) this.acharyaResult.innerHTML = this.parseMarkdown(result);

        } catch (err) {
            if (this.acharyaLoading) this.acharyaLoading.style.display = "none";

            if (this.acharyaResult) {
                if (document.body.classList.contains("is-authorized")) {
                    this.acharyaResult.innerHTML = `<span style="color:var(--accent-red);font-weight:bold;">Admin Debug Error:</span><br>${err.message}`;
                } else {
                    this.acharyaResult.innerHTML = `
                        <span style="color:var(--accent-red);font-weight:bold;">
                        आचार्यः ध्याने मग्नः अस्ति (Acharya is meditating).
                        </span><br><br>
                        The traditional text analysis engine is currently unavailable. Please try again later.`;
                }
            }
        }
    }

    /* =======================================================
       Share Acharya Analysis
       ======================================================= */

    shareAcharyaAnalysis() {
        if (!this.acharyaResult) return;
        
        const resText = this.acharyaResult.innerText;
        if (!resText) return;

        if (navigator.share) {
            navigator.share({
                title: `Acharya Analysis (Shloka ${this.currentAcharyaShlokaId || this.app.activeId || ""})`,
                text: resText
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(resText);
            this.app.showToast("Analysis copied to clipboard!");
        }
    }

    /* =======================================================
       Close Acharya Modal
       ======================================================= */

    closeAcharyaModal() {
        this.app.closeModal("acharyaModal");
        if (this.modalAppendBtn) this.modalAppendBtn.style.display = "none";
        window.getSelection().removeAllRanges();
    }
}
