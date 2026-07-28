// granthaUI.js
// Mechanical extraction of UI helper functions from
// PrahladaKrutaNarasimhaStotra.html

import { state } from "./granthaConfig.js";

export function applyDarkMode(isDark) {
    document.body.classList.toggle("dark-mode", isDark);

    const btn = document.getElementById("darkModeBtn");
    if (btn) {
        btn.innerText = isDark ? "🌙" : "☀️";
    }

    const meta = document.getElementById("themeColorMeta");
    if (meta) {
        meta.setAttribute(
            "content",
            isDark ? "#18120E" : "#FFFDF9"
        );
    }
}

export function toggleDarkMode() {
    const isDark =
        !document.body.classList.contains("dark-mode");

    applyDarkMode(isDark);

    localStorage.setItem(
        "app_darkMode",
        isDark ? "true" : "false"
    );
}

export function applyFontSize(px) {

    document.documentElement.style.setProperty(
        "--font-multiplier",
        px + "px"
    );

    document
        .querySelectorAll("#fontPopup .pop-item")
        .forEach(el => {

            el.classList.toggle(
                "active",
                parseInt(el.dataset.size, 10) === px
            );

        });

}

export function setFontSize(px) {

    applyFontSize(px);

    localStorage.setItem(
        "app_fontSize",
        String(px)
    );

    togglePopup("fontPopup");
}

export function applyScript(code) {

    state.activeScript = code;

    document
        .querySelectorAll("#scriptPopup .pop-item")
        .forEach(el => {

            if (el.dataset.script) {
                el.classList.toggle(
                    "active",
                    el.dataset.script === code
                );
            }

        });

    if (code !== "devanagari") {
        document.body.classList.add("non-devanagari");
    }
    else {
        document.body.classList.remove("non-devanagari");
    }

}

export function togglePopup(id) {

    document
        .querySelectorAll(".popup")
        .forEach(p => {

            if (p.id !== id) {
                p.classList.remove("show");
            }

        });

    document
        .getElementById(id)
        .classList.toggle("show");

}

export function openModal(id) {

    const modal = document.getElementById(id);

    if (!modal) return;

    modal.style.display = "flex";

    document.body.classList.add("modal-open");

}

export function closeModal(id) {

    const modal = document.getElementById(id);

    if (!modal) return;

    modal.style.display = "none";

    document.body.classList.remove("modal-open");

}

export function showToast(message) {

    const toast = document.getElementById("toast");

    if (!toast) return;

    toast.innerText = message;

    toast.classList.add("show");

    clearTimeout(showToast._timer);

    showToast._timer = setTimeout(() => {

        toast.classList.remove("show");

    }, 2200);

}
