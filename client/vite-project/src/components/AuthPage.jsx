import { useEffect, useRef, useState } from "react";

const API_URL =
  import.meta.env?.VITE_API_URL ||
  (import.meta.env?.PROD ? "" : "http://localhost:5000");
const GOOGLE_CLIENT_ID =
  globalThis.__APP_CONFIG__?.googleClientId ||
  import.meta.env?.VITE_GOOGLE_CLIENT_ID;
let googleScriptPromise;
let googleIdentityInitialized = false;

const getErrorMessage = (error) => {
  if (error instanceof TypeError) {
    return `Unable to reach the API at ${API_URL}. Make sure the backend is running and VITE_API_URL is correct.`;
  }
  return error instanceof Error ? error.message : "Authentication failed. Please try again.";
};

const readResponse = async (response, fallbackMessage) => {
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }
  if (!response.ok) throw new Error(data?.message || fallbackMessage);
  return data;
};

function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const googleButtonRef = useRef(null);
  const googleCallbackRef = useRef(null);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("");
    try {
      const payload = mode === "login"
        ? { email: form.email, password: form.password }
        : form;
      const response = await fetch(`${API_URL}/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await readResponse(response, "Authentication failed.");
      if (!data?.token || !data?.user) {
        throw new Error("The server did not return a valid authentication session.");
      }
      localStorage.setItem("feedback-auth-token", data.token);
      onAuthenticated(data.user);
    } catch (error) {
      setStatus(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleCredential = async (response) => {
    setIsSubmitting(true);
    setStatus("");
    try {
      const result = await fetch(`${API_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await readResponse(result, "Google sign-in failed.");
      if (!data?.token || !data?.user) {
        throw new Error("The server did not return a valid authentication session.");
      }
      localStorage.setItem("feedback-auth-token", data.token);
      onAuthenticated(data.user);
    } catch (error) {
      setStatus(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  googleCallbackRef.current = handleGoogleCredential;

  useEffect(() => {
    if (mode !== "login" || !GOOGLE_CLIENT_ID || !googleButtonRef.current) return undefined;

    const renderGoogleButton = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) return;
      googleButtonRef.current.replaceChildren();
      if (!googleIdentityInitialized) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => googleCallbackRef.current?.(response),
        });
        googleIdentityInitialized = true;
      }
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        width: googleButtonRef.current.offsetWidth || 320,
      });
    };
    const handleResize = () => window.requestAnimationFrame(renderGoogleButton);
    const resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(handleResize);

    window.addEventListener("resize", handleResize);
    if (googleButtonRef.current) resizeObserver?.observe(googleButtonRef.current);
    const cleanup = () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver?.disconnect();
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return cleanup;
    }

    googleScriptPromise ||= new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      document.head.appendChild(script);
    });
    googleScriptPromise.then(renderGoogleButton);
    return cleanup;
  }, [mode]);

  const handleGoogleFallback = () => {
    if (!GOOGLE_CLIENT_ID) {
      setStatus("Google sign-in is not configured. Add VITE_GOOGLE_CLIENT_ID to the client environment.");
    }
  };

  return (
    <main className="auth-layout">
      <section className="auth-intro">
        <a className="auth-brand" href="#" aria-label="goodword home">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span className="brand-copy"><strong>good<span>word</span></strong><small>THE CUSTOMER VOICE</small></span>
        </a>
        <div className="auth-intro-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> CUSTOMER VOICE, CLEARER</p>
          <h1>Make every<br /><span>voice count.</span></h1>
          <p>Bring every customer conversation together. Find the signal, celebrate what works, and make the next experience better.</p>
        </div>
        <div className="auth-preview" aria-label="Feedback analytics preview">
          <div className="preview-heading">
            <span className="preview-icon" aria-hidden="true">✳</span>
            <span><strong>Customer pulse</strong><small>A little better, every day</small></span>
            <span className="preview-live"><i /> PREVIEW</span>
          </div>
          <div className="preview-score"><strong>4.8</strong><span><b aria-label="5 out of 5 stars">★★★★★</b><small>average customer rating</small></span></div>
          <div className="preview-bars" aria-hidden="true"><i /><i /><i /><i /><i /></div>
          <div className="preview-footer"><span>Thoughtful feedback</span><span>Meaningful progress <b>↗</b></span></div>
        </div>
        <p className="auth-footnote"><span aria-hidden="true">⌑</span> A calmer way to listen, learn, and grow.</p>
      </section>
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-tabs" role="group" aria-label="Account options">
          <button type="button" aria-pressed={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Login</button>
          <button type="button" aria-pressed={mode === "register"} className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Register</button>
        </div>
        <p className="auth-form-kicker">{mode === "login" ? "WELCOME BACK" : "A BETTER WAY TO LISTEN"}</p>
        <h2>{mode === "login" ? "Log in to continue" : "Start listening better"}</h2>
        <p className="auth-form-description">{mode === "login" ? "Your customer conversations are waiting." : "Create your workspace in just a moment."}</p>
        {mode === "register" && <label>Name<input name="name" value={form.name} onChange={handleChange} autoComplete="name" required /></label>}
        <label>Email<input name="email" type="email" value={form.email} onChange={handleChange} autoComplete="email" required /></label>
        <label>Password
          <span className="password-input">
            <input aria-label="Password" name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={handleChange} minLength="6" autoComplete={mode === "login" ? "current-password" : "new-password"} required />
            <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>{showPassword ? "Hide" : "Show"}</button>
          </span>
        </label>
        <button className="submit-button" type="submit" disabled={isSubmitting}>{isSubmitting ? "Please wait..." : mode === "login" ? "Login" : "Create account"}</button>
        {mode === "login" && (
          <>
            <div className="auth-divider"><span>or</span></div>
            <div ref={googleButtonRef} className="google-button" onClick={handleGoogleFallback} role="presentation">
              {!GOOGLE_CLIENT_ID && <button type="button">Continue with Google</button>}
            </div>
          </>
        )}
        {status && <p className="status error" role="alert">{status}</p>}
        <p className="auth-secure-note"><span aria-hidden="true">✓</span> Your workspace is private and secure.</p>
      </form>
    </main>
  );
}

export default AuthPage;