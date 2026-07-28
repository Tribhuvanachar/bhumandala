(function () {
    "use strict";

    const DGE = window.DGE = window.DGE || {};

    const Modals = {

        init() {
            /* Reserved */
        },

        open(id) {
            const el = document.getElementById(id);
            if (!el) return;

            el.style.display = "flex";
            document.body.classList.add("modal-open");
        },

        close(id) {
            const el = document.getElementById(id);
            if (!el) return;

            el.style.display = "none";
            document.body.classList.remove("modal-open");
        },

        togglePopup(id) {
            document.querySelectorAll(".popup").forEach(p => {
                if (p.id !== id) {
                    p.classList.remove("show");
                }
            });

            const popup = document.getElementById(id);
            if (popup) {
                popup.classList.toggle("show");
            }
        },

        closeAllPopups() {
            document.querySelectorAll(".popup").forEach(p => {
                p.classList.remove("show");
            });
        },

        isOpen(id) {
            const el = document.getElementById(id);
            if (!el) return false;

            return el.style.display === "flex";
        },

        closeAllModals() {
            document.querySelectorAll(".modal").forEach(m => {
                m.style.display = "none";
            });

            document.body.classList.remove("modal-open");
        }

    };

    DGE.Modals = Modals;

    document.addEventListener(
        "DOMContentLoaded",
        () => {
            Modals.init();
        }
    );

})();
