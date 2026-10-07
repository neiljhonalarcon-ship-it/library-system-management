// ============================================================
// SHARED API HELPERS
// ============================================================

async function apiGet(url) {
    const response = await fetch(url);
    if (response.status === 401) {
        window.location.href = "/";
        return null;
    }
    return response.json();
}

async function apiPost(url, data) {
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (response.status === 401) {
        window.location.href = "/";
        return null;
    }
    return response.json();
}

async function apiPut(url, data) {
    const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (response.status === 401) {
        window.location.href = "/";
        return null;
    }
    return response.json();
}

async function apiDelete(url) {
    const response = await fetch(url, { method: "DELETE" });
    if (response.status === 401) {
        window.location.href = "/";
        return null;
    }
    return response.json();
}

// ============================================================
// LOGOUT — With Confirmation Modal
// ============================================================
function logout() {
    // Build confirmation modal HTML
    const modalHTML = `
        <div class="logout-confirm-overlay" id="logoutConfirmOverlay">
            <div class="logout-confirm-modal">
                <div class="logout-confirm-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                </div>
                <h2>Log Out?</h2>
                <p>Are you sure you want to log out of the Library System?</p>
                <div class="logout-confirm-actions">
                    <button class="logout-confirm-cancel" onclick="closeLogoutConfirm()">Cancel</button>
                    <button class="logout-confirm-yes" onclick="confirmLogout()">Yes, Log Out</button>
                </div>
            </div>
        </div>
    `;

    // Remove any existing modal
    const existing = document.getElementById("logoutConfirmOverlay");
    if (existing) existing.remove();

    // Add to body
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Close on overlay click
    setTimeout(() => {
        const overlay = document.getElementById("logoutConfirmOverlay");
        if (overlay) {
            overlay.addEventListener("click", function (e) {
                if (e.target === this) closeLogoutConfirm();
            });
        }
    }, 0);

    // Close on ESC
    document.addEventListener("keydown", function escHandler(e) {
        if (e.key === "Escape") {
            closeLogoutConfirm();
            document.removeEventListener("keydown", escHandler);
        }
    });
}

function closeLogoutConfirm() {
    const overlay = document.getElementById("logoutConfirmOverlay");
    if (overlay) {
        overlay.classList.add("closing");
        setTimeout(() => overlay.remove(), 200);
    }
}

async function confirmLogout() {
    closeLogoutConfirm();
    await apiPost("/api/logout", {});
    window.location.href = "/";
}

// Format peso
function peso(amount) {
    return "P" + Number(amount).toFixed(2);
}

// Format date
function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}


// ============================================================
// UNIVERSAL CONFIRM MODAL
// Beautiful replacement for browser's confirm()
// ============================================================
function showConfirm(options) {
    return new Promise((resolve) => {
        const {
            title = "Are you sure?",
            message = "This action cannot be undone.",
            confirmText = "Confirm",
            cancelText = "Cancel",
            type = "warning",  // warning, danger, success, info
            icon = null,
        } = options;

        // Icon SVGs per type
        const iconSvgs = {
            warning: `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>`,
            danger: `<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>`,
            success: `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>`,
            info: `<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>`,
        };

        const modalHTML = `
            <div class="confirm-modal-overlay" id="confirmModalOverlay">
                <div class="confirm-modal-box">
                    <div class="confirm-modal-icon confirm-icon-${type}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            ${iconSvgs[type] || iconSvgs.warning}
                        </svg>
                    </div>
                    <h2>${escapeHtmlConfirm(title)}</h2>
                    <p>${escapeHtmlConfirm(message)}</p>
                    <div class="confirm-modal-actions">
                        <button class="confirm-btn-cancel" id="confirmBtnCancel">${escapeHtmlConfirm(cancelText)}</button>
                        <button class="confirm-btn-yes confirm-btn-${type}" id="confirmBtnYes">${escapeHtmlConfirm(confirmText)}</button>
                    </div>
                </div>
            </div>
        `;

        // Remove any existing modal
        const existing = document.getElementById("confirmModalOverlay");
        if (existing) existing.remove();

        document.body.insertAdjacentHTML("beforeend", modalHTML);

        const overlay = document.getElementById("confirmModalOverlay");
        const btnYes = document.getElementById("confirmBtnYes");
        const btnCancel = document.getElementById("confirmBtnCancel");

        // Handlers
        function close(result) {
            overlay.classList.add("closing");
            setTimeout(() => {
                overlay.remove();
                resolve(result);
            }, 200);
        }

        btnYes.addEventListener("click", () => close(true));
        btnCancel.addEventListener("click", () => close(false));

        // Close on overlay click (treat as cancel)
        overlay.addEventListener("click", function (e) {
            if (e.target === this) close(false);
        });

        // ESC key closes
        const escHandler = (e) => {
            if (e.key === "Escape") {
                close(false);
                document.removeEventListener("keydown", escHandler);
            }
        };
        document.addEventListener("keydown", escHandler);

        // Focus the Yes button
        setTimeout(() => btnYes.focus(), 100);
    });
}

function escapeHtmlConfirm(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}