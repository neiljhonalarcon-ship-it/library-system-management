// ============================================================
// MEMBER LOGIN LOGIC
// ============================================================

// ============================================================
// PASSWORD TOGGLE (With Auto-Hide on Blur)
// ============================================================
const togglePassword = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");
const eyeIcon = document.getElementById("eyeIcon");

const EYE_OPEN = `
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
`;

const EYE_CLOSED = `
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
`;

if (togglePassword && passwordInput && eyeIcon) {
    passwordInput.addEventListener("blur", function () {
        if (passwordInput.type === "text") {
            passwordInput.type = "password";
            eyeIcon.innerHTML = EYE_OPEN;
            togglePassword.classList.remove("active");
            togglePassword.title = "Show password";
        }
    });

    togglePassword.addEventListener("click", function (e) {
        e.preventDefault();
        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            eyeIcon.innerHTML = EYE_CLOSED;
            togglePassword.classList.add("active");
            togglePassword.title = "Hide password";
        } else {
            passwordInput.type = "password";
            eyeIcon.innerHTML = EYE_OPEN;
            togglePassword.classList.remove("active");
            togglePassword.title = "Show password";
        }
    });
}

// ============================================================
// LOGIN FORM
// ============================================================
document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const errorMsg = document.getElementById("errorMsg");
    const btn = document.querySelector(".btn-login");
    const btnText = btn.querySelector(".btn-text");

    errorMsg.textContent = "";
    btn.disabled = true;
    if (btnText) btnText.textContent = "Signing in...";

    try {
        const response = await fetch("/api/auth/member-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (data.success) {
            showToast(`Welcome back, ${data.member.first_name}!`, "success", {
                title: "Login Successful",
                duration: 1500,
            });
            setTimeout(() => {
                window.location.href = data.redirect || "/member-portal";
            }, 500);
        } else {
            errorMsg.textContent = data.error || "Login failed";
            showToast(data.error || "Login failed", "error", { title: "Login Failed" });
            btn.disabled = false;
            if (btnText) btnText.textContent = "Sign In";
        }
    } catch (err) {
        errorMsg.textContent = "Connection error. Is the server running?";
        showToast("Cannot connect to server", "error");
        btn.disabled = false;
        if (btnText) btnText.textContent = "Sign In";
    }
});

// ============================================================
// FORGOT PASSWORD LOGIC
// ============================================================
function openForgotModal() {
    document.getElementById("forgotModal").style.display = "flex";
    document.getElementById("forgotStep1").style.display = "block";
    document.getElementById("forgotStep2").style.display = "none";
    document.getElementById("forgotEmail").value = "";
    document.getElementById("resetCode").value = "";
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmNewPassword").value = "";
    document.getElementById("forgotError1").textContent = "";
    document.getElementById("forgotError2").textContent = "";
}

function closeForgotModal() {
    document.getElementById("forgotModal").style.display = "none";
}

function backToStep1() {
    document.getElementById("forgotStep1").style.display = "block";
    document.getElementById("forgotStep2").style.display = "none";
}

async function sendResetCode() {
    const email = document.getElementById("forgotEmail").value.trim();
    const btn = document.getElementById("sendCodeBtn");
    const errEl = document.getElementById("forgotError1");
    errEl.textContent = "";

    if (!email) {
        errEl.textContent = "Please enter your email.";
        return;
    }

    btn.disabled = true;
    btn.textContent = "Sending...";

    try {
        const res = await fetch("/api/auth/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email }),
        });
        const data = await res.json();

        if (data.success) {
            document.getElementById("forgotEmailDisplay").textContent = email;
            document.getElementById("forgotStep1").style.display = "none";
            document.getElementById("forgotStep2").style.display = "block";
            if (data.code_preview) console.log("DEV CODE:", data.code_preview);
        } else {
            errEl.textContent = data.error || "Failed to send code.";
        }
    } catch (err) {
        errEl.textContent = "Connection error. Please try again.";
    } finally {
        btn.disabled = false;
        btn.textContent = "Send Reset Code";
    }
}

async function resetPassword() {
    const email = document.getElementById("forgotEmail").value.trim();
    const code = document.getElementById("resetCode").value.trim();
    const newPass = document.getElementById("newPassword").value;
    const confirmPass = document.getElementById("confirmNewPassword").value;
    const btn = document.getElementById("resetBtn");
    const errEl = document.getElementById("forgotError2");
    errEl.textContent = "";

    if (!code || code.length !== 6) {
        errEl.textContent = "Please enter the 6-digit code.";
        return;
    }
    if (newPass.length < 6) {
        errEl.textContent = "Password must be at least 6 characters.";
        return;
    }
    if (newPass !== confirmPass) {
        errEl.textContent = "Passwords do not match.";
        return;
    }

    btn.disabled = true;
    btn.textContent = "Resetting...";

    try {
        const res = await fetch("/api/auth/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, code, new_password: newPass }),
        });
        const data = await res.json();

        if (data.success) {
            if (typeof showToast === "function") showToast("Password reset! You can now log in.", "success");
            closeForgotModal();
        } else {
            errEl.textContent = data.error || "Failed to reset password.";
        }
    } catch (err) {
        errEl.textContent = "Connection error. Please try again.";
    } finally {
        btn.disabled = false;
        btn.textContent = "Reset Password";
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const overlay = document.getElementById("forgotModal");
    if (overlay) {
        overlay.addEventListener("click", function (e) {
            if (e.target === this) closeForgotModal();
        });
    }
});