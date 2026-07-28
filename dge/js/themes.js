(function () {
    "use strict";

    const DGE = window.DGE = window.DGE || {};

    const Theme = {

        init() {
            /* Reserved */
        },

        applyDarkMode(isDark) {
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
        },

        toggleDarkMode() {
            const isDark =
                !document.body.classList.contains("dark-mode");

            this.applyDarkMode(isDark);

            localStorage.setItem(
                "app_darkMode",
                isDark ? "true" : "false"
            );
        },

        applyFontSize(px) {

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
        },

        setFontSize(px) {

            this.applyFontSize(px);

            localStorage.setItem(
                "app_fontSize",
                String(px)
            );

            if (
                DGE.Modals &&
                typeof DGE.Modals.togglePopup === "function"
            ) {
                DGE.Modals.togglePopup("fontPopup");
            }
        },

        restore() {

            this.applyDarkMode(
                localStorage.getItem("app_darkMode") === "true"
            );

            const savedFont =
                parseInt(
                    localStorage.getItem("app_fontSize"),
                    10
                );

            if (!isNaN(savedFont)) {
                this.applyFontSize(savedFont);
            }
        }

    };

    DGE.Theme = Theme;

    document.addEventListener(
        "DOMContentLoaded",
        () => {
            Theme.init();
            Theme.restore();
        }
    );

})();
