// ============================================================
// BEAUTIFUL TOAST NOTIFICATIONS
// ============================================================

// Icons as SVG strings
const TOAST_ICONS = {
    success: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    error: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    warning: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    info: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
};

// Default titles per type
const TOAST_TITLES = {
    success: "Success!",
    error: "Error",
    warning: "Warning",
    info: "Info",
};

// ============================================================
// ENSURE CONTAINER EXISTS
// ============================================================
function getToastContainer() {
    let container = document.getElementById("toastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        container.className = "toast-container";
        document.body.appendChild(container);
    }
    return container;
}

// ============================================================
// SHOW TOAST
// ============================================================
function showToast(message, type = "success", options = {}) {
    const container = getToastContainer();

    // Config
    const duration = options.duration || 3500;
    const title = options.title || TOAST_TITLES[type] || "Notice";
    const showClose = options.showClose !== false;

    // Create toast element
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    toast.innerHTML = `
        <div class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</div>
        <div class="toast-content">
            <div class="toast-title">${escapeHtml(title)}</div>
            <div class="toast-message">${escapeHtml(message)}</div>
        </div>
        ${showClose ? '<button class="toast-close" aria-label="Close">✕</button>' : ''}
        <div class="toast-progress" style="animation: toastProgress ${duration}ms linear forwards;"></div>
    `;

    container.appendChild(toast);

    // Close button handler
    const closeBtn = toast.querySelector(".toast-close");
    if (closeBtn) {
        closeBtn.addEventListener("click", () => removeToast(toast));
    }

    // Auto-remove
    const timer = setTimeout(() => removeToast(toast), duration);

    // Remove on click (but not on close button)
    toast.addEventListener("click", (e) => {
        if (e.target.closest(".toast-close")) return;
        clearTimeout(timer);
        removeToast(toast);
    });

    // Limit max toasts
    const toasts = container.querySelectorAll(".toast:not(.removing)");
    if (toasts.length > 4) {
        removeToast(toasts[0]);
    }

    return toast;
}

// ============================================================
// REMOVE TOAST
// ============================================================
function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.add("removing");
    setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
}

// ============================================================
// ESCAPE HTML (for safety)
// ============================================================
function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}