"use strict";

/*=============================================================================
 Digital Grantha Engine
 Render Engine
 Version : 10.1.3 Alpha (Frozen Phase 1)
=============================================================================*/

(function () {

    if (!window.DGE)
        throw new Error("DGE core must be loaded first.");

    const Render = {

        root: null,
        currentVerse: null,
        commentaryView: "all",

        selectors: {
            container: "#granthaContainer",
            title: "#granthaTitle",
            subtitle: "#granthaSubtitle",
            verse: "#verse",
            verseNumber: "#verseNumber",
            navigation: "#navigation",
            search: "#searchResults",
            commentary: "#commentary"
        },

        init() {
            this.root = document.querySelector(this.selectors.container);
            return this;
        },

        // ------------------------------------------------------------------------
        // DOM Helpers
        // ------------------------------------------------------------------------

        $(selector) {
            return document.querySelector(selector);
        },

        clear(selector) {
            const node = this.$(selector);
            if (node) node.innerHTML = "";
        },

        text(selector, value) {
            const node = this.$(selector);
            if (node) node.textContent = value ?? "";
        },

        html(selector, value) {
            const node = this.$(selector);
            if (node) node.innerHTML = value ?? "";
        },

        append(selector, node) {
            const target = this.$(selector);
            if (target) target.appendChild(node);
        },

        show(selector) {
            const node = this.$(selector);
            if (node) node.style.display = "";
        },

        hide(selector) {
            const node = this.$(selector);
            if (node) node.style.display = "none";
        },

        // ------------------------------------------------------------------------
        // Legacy Core Methods
        // ------------------------------------------------------------------------

        getText(id) {
            const data = DGE.Data ? DGE.Data.all() : null;
            if (!data) return "";
            
            const verse = data[id];
            if (!verse) return "";
            
            let text = verse.sa ?? verse.sanskrit ?? verse.text ?? verse.verse ?? "";
            
            // Preserve legacy behavior: apply transliteration at the source
            if (DGE.Transliteration && typeof DGE.Transliteration.apply === "function") {
                text = DGE.Transliteration.apply(text);
            }
            
            return text;
        },

        setCommentaryView(view, element) {
            this.commentaryView = view || "all";

            document.querySelectorAll("#commentaryPopup .pop-item").forEach(item => {
                item.classList.remove("active");
            });

            if (element) {
                element.classList.add("active");
            }

            if (DGE.Modals && DGE.Modals.togglePopup) {
                DGE.Modals.togglePopup("commentaryPopup");
            }

            this.renderList();
        },

        // ------------------------------------------------------------------------
        // Main Rendering Pipeline
        // ------------------------------------------------------------------------

        renderList() {
            const data = DGE.Data ? DGE.Data.all() : null;
            this.clear(this.selectors.container);

            if (!data || Object.keys(data).length === 0) {
                this.renderEmpty();
                if (typeof DGE.emit === "function") DGE.emit("render:empty");
                return;
            }

            // Fetch filtered boundaries (Filter module handles logic/ranges)
            let filteredIds = null;
            if (DGE.Filter && typeof DGE.Filter.getFilteredIds === "function") {
                filteredIds = DGE.Filter.getFilteredIds();
            }

            // Fetch search boundaries
            let searchMatches = null;
            if (DGE.Search && DGE.Search.query && Array.isArray(DGE.Search.matches)) {
                searchMatches = DGE.Search.matches;
            }

            let visibleCount = 0;
            const isArray = Array.isArray(data);

            // Iterate over keys to support both 1-indexed Arrays and Objects securely
            Object.keys(data).forEach(key => {
                const verse = data[key];
                if (!verse) return;
                
                // Establish a unified ID (defaults to object key or array index)
                const id = verse.id ?? verse.number ?? (isArray ? Number(key) : key);
                
                // 1. Check Filters
                if (filteredIds && !filteredIds.includes(id)) return;
                
                // 2. Check Search Match
                if (searchMatches && !searchMatches.includes(id)) return;

                const card = this.createCard(verse, id);
                
                if (this.currentVerse && (this.currentVerse.id === id || this.currentVerse.number === id)) {
                    card.classList.add("active");
                }
                
                this.append(this.selectors.container, card);
                visibleCount++;
            });

            if (visibleCount === 0) {
                this.renderEmpty();
            } else {
                this.afterRender();
            }

            if (typeof DGE.emit === "function") {
                DGE.emit("render:list", {
                    total: Object.keys(data).length,
                    visible: visibleCount,
                    current: this.currentVerse
                });
            }
        },

        createCard(verse, id) {
            const card = document.createElement("div");
            card.className = "shloka-card";
            card.id = "verse-" + id;
            card.dataset.verse = id;

            let body = this.getText(id);
            if (DGE.Search && DGE.Search.query && DGE.Search.highlight) {
                body = DGE.Search.highlight(body);
            }

            let commentary = "";
            if (verse.commentaries) {
                commentary = this.createCommentary(
                    verse.commentaries,
                    DGE.Search ? DGE.Search.query : ""
                );
            }

            card.innerHTML = `
                <div class="shloka-main-row">
                    <div class="shloka-num">${id}</div>
                    <div class="shloka-text" onclick="playShloka(${id})">
                        ${body}
                    </div>
                    ${this.createCardActions(id)}
                </div>
                ${commentary}
            `;
            return card;
        },

        createCardActions(id) {
            if (!window.notes && !window.marks && !window.snippets) return "";

            let markerClass = "btn-icon";
            let markerIcon = "⋮";

            if (window.marks && marks[id] === "fav") {
                markerClass += " is-fav";
                markerIcon = "★";
            } else if (window.marks && marks[id] === "practice") {
                markerClass += " is-practice";
                markerIcon = "🚩";
            }

            const noteClass = window.notes && notes[id] ? "btn-icon has-note" : "btn-icon";
            let badge = "";

            if (window.snippets && snippets[id] && snippets[id].length) {
                badge = `<div class="snippet-badge">🎯 ${snippets[id].length}</div>`;
            }

            return `
                <div class="card-actions">
                    <button class="${noteClass}" onclick="openNote(${id})">📝</button>
                    <button class="${markerClass}" onclick="openMarkerMenu(event, ${id})">${markerIcon}</button>
                </div>
                ${badge}
            `;
        },

        createCommentary(commentaries, query) {
            if (!commentaries) return "";
            let html = "";

            Object.entries(commentaries).forEach(([key, value]) => {
                if (!value) return;
                let title = key;

                if (window.stotraData && stotraData.metadata && stotraData.metadata.availableCommentaries && stotraData.metadata.availableCommentaries[key]) {
                    title = stotraData.metadata.availableCommentaries[key];
                }

                if (DGE.Transliteration && typeof DGE.Transliteration.apply === "function") {
                    title = DGE.Transliteration.apply(title);
                    value = DGE.Transliteration.apply(value);
                }

                if (query && DGE.Search && DGE.Search.highlight) {
                    value = DGE.Search.highlight(value);
                }

                html += `
                    <div class="commentary-block" data-commentary="${key}">
                        <div class="commentary-title">${title}</div>
                        ${value}
                    </div>
                `;
            });
            return html;
        },

        afterRender() {
            if (typeof DGE.emit === "function") {
                DGE.emit("render:complete", { verse: this.currentVerse });
            }
        },

        // ------------------------------------------------------------------------
        // Visual Modifiers & State
        // ------------------------------------------------------------------------

        updateActiveVerse(id) {
            document.querySelectorAll(".shloka-card.active").forEach(card => {
                card.classList.remove("active");
            });
            const card = document.getElementById("verse-" + id);
            if (!card) return;
            card.classList.add("active");
            this.currentVerse = { id };
        },

        scrollToCard(id) {
            const card = document.getElementById("verse-" + id);
            if (!card) return;
            card.scrollIntoView({ behavior: "smooth", block: "center" });
        },

        renderAndFocus(id) {
            this.updateActiveVerse(id);
            this.scrollToCard(id);
        },

        updateVerse(id, verse) {
            if (!verse) return;
            const node = document.querySelector(`[data-verse="${id}"]`) || document.getElementById("verse-" + id);
            if (!node) return;
            
            if (verse.sa) node.innerHTML = verse.sa;
            else if (verse.text) node.innerHTML = verse.text;
            else if (verse.verse) node.innerHTML = verse.verse;
        },

        // ------------------------------------------------------------------------
        // Single Verse / Grantha Detail Methods
        // ------------------------------------------------------------------------

        renderVerse(verse) {
            if (!verse) return;
            this.currentVerse = verse;
            
            const id = verse.id ?? verse.number ?? "";
            this.text(this.selectors.verseNumber, id);
            
            let body = verse.text ?? verse.verse ?? verse.content ?? "";
            
            // Ensure single-verse view transliterates correctly too
            if (DGE.Transliteration && typeof DGE.Transliteration.apply === "function") {
                body = DGE.Transliteration.apply(body);
            }
            
            this.html(this.selectors.verse, body);
            
            if (typeof DGE.emit === "function") DGE.emit("render:verse", verse);
        },

        renderCurrentVerse() {
            if (!this.currentVerse) return;
            this.renderVerse(this.currentVerse);
            this.updateActiveVerse(this.currentVerse.id ?? this.currentVerse.number);
        },

        renderGrantha(grantha) {
            if (!grantha) return;
            this.text(this.selectors.title, grantha.title);
            this.text(this.selectors.subtitle, grantha.subtitle || "");
        },

        renderNavigation(previous, next) {
            const nav = this.$(this.selectors.navigation);
            if (!nav) return;
            nav.innerHTML = "";

            const prev = document.createElement("button");
            prev.textContent = "◀ Previous";
            prev.disabled = !previous;
            prev.onclick = () => { if (previous) this.renderVerse(previous); };

            const nextBtn = document.createElement("button");
            nextBtn.textContent = "Next ▶";
            nextBtn.disabled = !next;
            nextBtn.onclick = () => { if (next) this.renderVerse(next); };

            nav.appendChild(prev);
            nav.appendChild(nextBtn);
        },

        renderMetadata(metadata) {
            if (!metadata) return;
            Object.entries(metadata).forEach(([key, value]) => {
                const element = document.querySelector(`[data-meta="${key}"]`);
                if (element) element.textContent = value ?? "";
            });
        },

        // ------------------------------------------------------------------------
        // Search & Highlights
        // ------------------------------------------------------------------------

        renderSearchResults(results) {
            const target = this.$(this.selectors.search);
            if (!target) return;
            target.innerHTML = "";

            if (!results || results.length === 0) {
                target.innerHTML = "<p>No results found.</p>";
                return;
            }

            results.forEach(result => {
                const item = document.createElement("div");
                item.className = "dge-search-result";
                item.textContent = result.number ?? result.id ?? "";
                item.onclick = () => this.renderVerse(result);
                target.appendChild(item);
            });
        },

        beginSearch() {
            this.clear(this.selectors.search);
        },

        endSearch() {
            if (typeof DGE.emit === "function") DGE.emit("render:search-complete");
        },

        highlight(text) {
            if (!text || !this.currentVerse) return;
            const verseNode = this.$(this.selectors.verse);
            if (!verseNode) return;

            const escaped = text.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
            const regex = new RegExp(escaped, "gi");
            verseNode.innerHTML = verseNode.innerHTML.replace(regex, match => `<mark>${match}</mark>`);
        },

        clearHighlight() {
            if (!this.currentVerse) return;
            this.renderVerse(this.currentVerse);
        },

        // ------------------------------------------------------------------------
        // UI States (Error, Loading, Empty, etc.)
        // ------------------------------------------------------------------------

        renderError(message) {
            this.html(this.selectors.verse, `<div class="dge-error">${message}</div>`);
        },

        renderLoading(message = "Loading...") {
            this.html(this.selectors.verse, `<div class="dge-loading">${message}</div>`);
        },

        renderEmpty() {
            // Only clear the list container, leave the active single verse untouched
            this.html(this.selectors.container, '<div class="dge-empty">No verses to display.</div>');
        },

        renderCommentary(html) {
            this.html(this.selectors.commentary, html);
        },

        // ------------------------------------------------------------------------
        // Utility & Lifecycle Methods
        // ------------------------------------------------------------------------

        refresh() {
            this.renderList();
        },

        reset() {
            this.currentVerse = null;
            this.clear(this.selectors.container);
            this.clear(this.selectors.search);
            this.clear(this.selectors.commentary);
        },

        ready() {
            if (typeof DGE.emit === "function") DGE.emit("render:ready");
        },

        destroy() {
            this.root = null;
            this.currentVerse = null;
        }

    };

    DGE.Render = Render;

    document.addEventListener("DOMContentLoaded", () => {
        Render.init();
    });

})();
