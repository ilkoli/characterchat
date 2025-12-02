// ===== 공통: 라이트/다크 테마 토글 =====

const themeToggleEl = document.getElementById("theme-toggle");
const THEME_STORAGE_KEY = "characterchat-theme";

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("theme-dark", isDark);

  if (themeToggleEl) {
    const icon = isDark ? "🌙" : "🌞";
    const current = isDark ? "다크" : "라이트";
    const next = isDark ? "라이트" : "다크";
    themeToggleEl.textContent = icon;
    themeToggleEl.setAttribute(
      "aria-label",
      `${current} 모드 (눌러서 ${next} 전환)`
    );
  }
}

function initTheme() {
  if (!themeToggleEl) return;

  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  const systemPrefersDark = window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches;
  const initialTheme = saved || (systemPrefersDark ? "dark" : "light");
  applyTheme(initialTheme);

  themeToggleEl.addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("theme-dark")
      ? "light"
      : "dark";
    applyTheme(nextTheme);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  });
}

initTheme();

// ===== 채팅 로직 =====

// ✅ 백엔드 Cloud Function URL
const API_ENDPOINT =
  "https://asia-northeast3-ilkoliai.cloudfunctions.net/chat";

// 채팅 관련 DOM들 (채팅 페이지에서만 존재함)
const chatLogEl = document.getElementById("chat-log");
const chatFormEl = document.getElementById("chat-form");
const chatInputEl = document.getElementById("chat-input");
const rerollBtnEl = document.getElementById("reroll-btn");
const clearChatBtnEl = document.getElementById("clear-chat-btn");
const fakeMemoryBtnEl = document.getElementById("fake-memory-btn");

const turnCountEl = document.getElementById("turn-count");
const rerollCountEl = document.getElementById("reroll-count");
const lastLengthEl = document.getElementById("last-length");
const memoryBoxEl = document.getElementById("memory-box");

// 상태 값들
let messages = []; // { role: "user" | "bot", text: string }
let lastUserMessage = null;
let lastBotIndex = -1; // 지금은 안 쓰지만 남겨둠
let rerollCount = 0;
let turnCount = 0;
let isRequesting = false; // 중복 요청 방지

// --- 유틸 ---

function scrollToBottom() {
  if (!chatLogEl) return;
  requestAnimationFrame(() => {
    chatLogEl.scrollTop = chatLogEl.scrollHeight;
  });
}

function updateSessionStats(latestTextLength = 0) {
  if (!turnCountEl || !rerollCountEl || !lastLengthEl) return;
  turnCountEl.textContent = String(turnCount);
  rerollCountEl.textContent = String(rerollCount);
  lastLengthEl.textContent = `${latestTextLength} 자`;
}

// 메시지 렌더링
function appendMessage(role, text) {
  if (!chatLogEl) return;

  const msgEl = document.createElement("div");
  msgEl.className = `message ${role === "user" ? "user" : "bot"}`;

  const avatarEl = document.createElement("div");
  avatarEl.className = "message-avatar";
  avatarEl.textContent = role === "user" ? "나" : "AI";

  const bodyEl = document.createElement("div");
  bodyEl.className = "message-body";

  const metaEl = document.createElement("div");
  metaEl.className = "message-meta";
  metaEl.textContent = role === "user" ? "사용자" : "AI 봇";

  const bubbleEl = document.createElement("div");
  bubbleEl.className = "message-bubble";
  bubbleEl.textContent = text;

  bodyEl.appendChild(metaEl);
  bodyEl.appendChild(bubbleEl);

  msgEl.appendChild(avatarEl);
  msgEl.appendChild(bodyEl);

  chatLogEl.appendChild(msgEl);
  scrollToBottom();
}

// 마지막 봇 메시지 제거 (리롤 시 사용)
function removeLastBotMessageFromUI() {
  if (!chatLogEl) return;
  const allMessages = Array.from(chatLogEl.querySelectorAll(".message.bot"));
  if (allMessages.length === 0) return;
  const lastBot = allMessages[allMessages.length - 1];
  chatLogEl.removeChild(lastBot);
}

// --- 백엔드 호출 함수 (Gemini 호출 프록시) ---

async function callBackend(userText) {
  try {
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userText })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(
        `HTTP ${res.status} ${res.statusText}${
          errText ? " - " + errText : ""
        }`
      );
    }

    const data = await res.json();
    if (!data || typeof data.reply !== "string") {
      throw new Error("응답 형식이 예상과 다름");
    }
    return data.reply;
  } catch (err) {
    console.error("백엔드 호출 에러:", err);
    return `⚠️ 서버 호출 중 오류가 발생했어요.\n(${String(
      err.message || err
    )})`;
  }
}

// --- 폼 전송 핸들러 (실제 채팅 전송) ---

if (chatFormEl && chatInputEl) {
  chatFormEl.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = chatInputEl.value.trim();
    if (!text || isRequesting) return;

    chatInputEl.value = "";
    lastUserMessage = text;
    turnCount += 1;
    updateSessionStats(text.length);

    messages.push({ role: "user", text });
    appendMessage("user", text);

    isRequesting = true;

    const botReply = await callBackend(text);

    messages.push({ role: "bot", text: botReply });
    appendMessage("bot", botReply);

    isRequesting = false;
  });

  // Enter/단축키 처리 (Ctrl+Enter / Cmd+Enter 전송)
  chatInputEl.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      chatFormEl.requestSubmit();
    }
  });
}

// 리롤 버튼 (마지막 유저 메시지를 다시 보냄)
if (rerollBtnEl) {
  rerollBtnEl.addEventListener("click", async () => {
    if (!lastUserMessage || isRequesting) return;
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== "bot") return;

    rerollCount += 1;
    updateSessionStats(lastUserMessage.length);

    // UI에서 마지막 봇 메시지 제거
    messages = messages.slice(0, messages.length - 1);
    removeLastBotMessageFromUI();

    isRequesting = true;
    const newReply = await callBackend(lastUserMessage);
    isRequesting = false;

    messages.push({ role: "bot", text: newReply });
    appendMessage("bot", newReply);
  });
}

// 채팅 초기화 버튼
if (clearChatBtnEl) {
  clearChatBtnEl.addEventListener("click", () => {
    messages = [];
    if (chatLogEl) chatLogEl.innerHTML = "";
    lastUserMessage = null;
    lastBotIndex = -1;
    turnCount = 0;
    rerollCount = 0;
    updateSessionStats(0);
  });
}

// 테스트용 가짜 장기기억 넣기
if (fakeMemoryBtnEl) {
  fakeMemoryBtnEl.addEventListener("click", () => {
    if (!memoryBoxEl) return;
    memoryBoxEl.textContent =
      "• 장기기억 들어올 자리\n" +
      "• 여기에는 나중에 요약 시스템이 생성한 요약 텍스트가 표시될 예정!";
  });
}

// 초기 상태 반영 + 안내 메시지 (채팅 페이지일 때만)
if (chatLogEl) {
  updateSessionStats(0);
  appendMessage(
    "bot",
    "지금 이 채팅은 백엔드 Cloud Functions를 통해 Gemini 2.5 Pro로 연결돼 있어요."
  );
}
