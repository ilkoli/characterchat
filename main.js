// ===== 공통: 라이트/다크 테마 토글 =====

const themeToggleEl = document.getElementById("theme-toggle");
const THEME_STORAGE_KEY = "characterchat-theme";

// 🔹 캐릭터 프롬프트 저장 키 (create.js에서 이 키로 저장해줄 예정)
const PROMPT_STORAGE_KEY = "characterchat-current-prompt";
// 🔹 현재 선택된 캐릭터 ID 저장 키
const CURRENT_CHAR_ID_KEY = "characterchat-current-char-id";

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

// ===== 캐릭터 / Firestore 연동 =====

// DOM 요소들 (캐릭터 / 헤더)
const characterListEl = document.querySelector(".character-list");
const chatTitleEl = document.querySelector(".chat-title");
const sessionSubtitleEl = document.getElementById("session-subtitle");

// 메모리 캐시
let characterCache = []; // { id, name, subtitle, prompt }

// Firestore 헬퍼 (window에 안 붙어있으면 그냥 패스)
function hasFirestore() {
  return (
    !!window.firebaseDB &&
    !!window.firebaseCollection &&
    !!window.firebaseGetDocs
  );
}

// Firestore에서 characters 컬렉션 불러오기
async function firestoreLoadCharacters() {
  if (!hasFirestore()) return [];

  const db = window.firebaseDB;
  const collection = window.firebaseCollection;
  const getDocs = window.firebaseGetDocs;

  const snapshot = await getDocs(collection(db, "characters"));
  const result = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    result.push({
      id: doc.id,
      name: data.name || "이름 없는 캐릭터",
      subtitle: data.subtitle || "사용자 정의 캐릭터",
      prompt: data.prompt || "",
    });
  });
  return result;
}

// (옵션) 저장/수정/삭제 함수 — 나중에 create 페이지에서 써먹을 수 있음
async function firestoreSaveCharacter(name, prompt, subtitle = "") {
  if (!hasFirestore()) return null;
  const db = window.firebaseDB;
  const collection = window.firebaseCollection;
  const addDoc = window.firebaseAddDoc;

  const now = Date.now();
  const docRef = await addDoc(collection(db, "characters"), {
    name,
    subtitle,
    prompt,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

async function firestoreUpdateCharacter(id, updatedFields) {
  if (
    !window.firebaseDB ||
    !window.firebaseDoc ||
    !window.firebaseUpdateDoc
  )
    return;
  const db = window.firebaseDB;
  const doc = window.firebaseDoc;
  const updateDoc = window.firebaseUpdateDoc;

  const ref = doc(db, "characters", id);
  await updateDoc(ref, {
    ...updatedFields,
    updatedAt: Date.now(),
  });
}

async function firestoreDeleteCharacter(id) {
  if (
    !window.firebaseDB ||
    !window.firebaseDoc ||
    !window.firebaseDeleteDoc
  )
    return;
  const db = window.firebaseDB;
  const doc = window.firebaseDoc;
  const deleteDoc = window.firebaseDeleteDoc;

  const ref = doc(db, "characters", id);
  await deleteDoc(ref);
}

// 현재 선택된 캐릭터 적용 (UI + localStorage)
function applyActiveCharacter(charId) {
  if (!characterCache.length) return;

  const char =
    characterCache.find((c) => c.id === charId) || characterCache[0];

  // 선택 상태 저장
  localStorage.setItem(CURRENT_CHAR_ID_KEY, char.id);
  // 시스템 프롬프트도 저장 → callBackend에서 사용
  try {
    localStorage.setItem(PROMPT_STORAGE_KEY, char.prompt || "");
  } catch {
    // localStorage 사용 불가해도 죽지 않도록
  }

  // 헤더 타이틀/부제목 갱신
  if (chatTitleEl) {
    chatTitleEl.textContent = char.name || "기본 봇";
  }
  if (sessionSubtitleEl) {
    if (char.id === "default" || !char.prompt) {
      sessionSubtitleEl.textContent = "새 세션 · 장기기억 요약 적용 안 됨";
    } else {
      sessionSubtitleEl.textContent = `캐릭터: ${char.name} · 커스텀 프롬프트 적용 중`;
    }
  }

  // 사이드바 카드 active 토글
  if (characterListEl) {
    const cards = characterListEl.querySelectorAll(".character-card");
    cards.forEach((card) => {
      const cid = card.dataset.charId;
      card.classList.toggle("active", cid === char.id);
    });
  }
}

// 캐릭터 리스트 렌더링
function renderCharacterList(charactersFromDB) {
  if (!characterListEl) return;

  characterListEl.innerHTML = "";

  // 기본 봇 (내장 캐릭터)
  const defaultChar = {
    id: "default",
    name: "기본 봇",
    subtitle: "일반 어시스턴트",
    prompt: "", // 시스템 프롬프트 없음
  };

  const all = [defaultChar, ...charactersFromDB];
  characterCache = all;

  const savedId =
    localStorage.getItem(CURRENT_CHAR_ID_KEY) || defaultChar.id;

  all.forEach((char) => {
    const btn = document.createElement("button");
    btn.className =
      "character-card" + (char.id === savedId ? " active" : "");
    btn.dataset.charId = char.id;

    const avatarEl = document.createElement("div");
    avatarEl.className = "char-avatar";
    avatarEl.textContent =
      char.id === "default" ? "AI" : (char.name || "?").charAt(0);

    const metaEl = document.createElement("div");
    metaEl.className = "char-meta";

    const nameEl = document.createElement("div");
    nameEl.className = "char-name";
    nameEl.textContent = char.name;

    const subEl = document.createElement("div");
    subEl.className = "char-sub";
    subEl.textContent = char.subtitle || "사용자 정의 캐릭터";

    metaEl.appendChild(nameEl);
    metaEl.appendChild(subEl);

    btn.appendChild(avatarEl);
    btn.appendChild(metaEl);

    btn.addEventListener("click", () => {
      applyActiveCharacter(char.id);
    });

    characterListEl.appendChild(btn);
  });

  applyActiveCharacter(savedId);
}

// 초기 캐릭터 로딩
async function initCharacters() {
  if (!characterListEl) return;

  try {
    const fromDB = await firestoreLoadCharacters();
    renderCharacterList(fromDB);
  } catch (err) {
    console.error("캐릭터 목록 불러오기 실패:", err);
    renderCharacterList([]);
  }
}

initCharacters();

// ===== 채팅 로직 =====

const API_ENDPOINT =
  "https://asia-northeast3-ilkoliai.cloudfunctions.net/chat";

const chatLogEl = document.getElementById("chat-log");
const chatFormEl = document.getElementById("chat-form");
const chatInputEl = document.getElementById("chat-input");
const clearChatBtnEl = document.getElementById("clear-chat-btn");
const fakeMemoryBtnEl = document.getElementById("fake-memory-btn");

const turnCountEl = document.getElementById("turn-count");
const rerollCountEl = document.getElementById("reroll-count");
const lastLengthEl = document.getElementById("last-length");
const memoryBoxEl = document.getElementById("memory-box");

let nextMessageId = 0;
let messages = [];     // {id, role, text}
let lastUserMessage = null;
let lastBotIndex = -1;
let rerollCount = 0;
let turnCount = 0;
let isRequesting = false;

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

// 토스트
function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 1600);
}

// 시스템 프롬프트
function getCurrentSystemPrompt() {
  try {
    const stored = localStorage.getItem(PROMPT_STORAGE_KEY);
    return stored || "";
  } catch {
    return "";
  }
}

// 마크다운 렌더링
function renderMarkdown(text) {
  if (typeof marked !== "undefined") {
    return marked.parse(text);
  }
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// 최신 봇 말풍선에만 리롤 보이기
function updateRerollButtons() {
  if (!chatLogEl) return;

  const allRerollBtns = chatLogEl.querySelectorAll(
    ".message[data-role='bot'] .bubble-btn--reroll"
  );
  allRerollBtns.forEach((btn) => btn.classList.add("is-hidden"));

  const botMessages = Array.from(
    chatLogEl.querySelectorAll(".message[data-role='bot']")
  );
  if (botMessages.length === 0) return;

  const lastBot = botMessages[botMessages.length - 1];
  const lastRerollBtn = lastBot.querySelector(".bubble-btn--reroll");
  if (lastRerollBtn) {
    lastRerollBtn.classList.remove("is-hidden");
  }
}

// === 인라인 편집 ===
function enterEditMode(messageObj, msgEl) {
  if (!msgEl || msgEl.classList.contains("is-editing")) return;

  const contentEl = msgEl.querySelector(".message-bubble-content");
  if (!contentEl) return;

  const originalText = messageObj.text || "";

  msgEl.classList.add("is-editing");

  const textarea = document.createElement("textarea");
  textarea.className = "message-edit-input";
  textarea.value = originalText;

  contentEl.innerHTML = "";
  contentEl.appendChild(textarea);

  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);

  textarea.addEventListener("keydown", (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key === "Enter") {
      ev.preventDefault();
      const newText = textarea.value.trim();
      if (!newText) return;
      messageObj.text = newText;
      exitEditMode(messageObj, msgEl);
      showToast("수정 완료!");
    }
    if (ev.key === "Escape") {
      ev.preventDefault();
      messageObj.text = originalText;
      exitEditMode(messageObj, msgEl);
      showToast("수정 취소");
    }
  });
}

function exitEditMode(messageObj, msgEl) {
  if (!msgEl) return;
  const contentEl = msgEl.querySelector(".message-bubble-content");
  if (!contentEl) return;

  msgEl.classList.remove("is-editing");
  contentEl.innerHTML = renderMarkdown(messageObj.text || "");
}

// 메시지 렌더링
function appendMessage(message) {
  if (!chatLogEl) return;

  const { id, role, text } = message;

  const msgEl = document.createElement("div");
  msgEl.className = `message ${role === "user" ? "user" : "bot"}`;
  msgEl.dataset.messageId = String(id);
  msgEl.dataset.role = role;

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

  const contentEl = document.createElement("div");
  contentEl.className = "message-bubble-content";
  contentEl.innerHTML = renderMarkdown(text);

  const actionsEl = document.createElement("div");
  actionsEl.className = "message-bubble-actions";

  if (role === "bot") {
    const rerollBtn = document.createElement("button");
    rerollBtn.className = "bubble-btn bubble-btn--reroll";
    rerollBtn.dataset.action = "reroll";
    rerollBtn.innerHTML = `<i class="fi fi-rr-refresh"></i>`;
    rerollBtn.title = "리롤";
    actionsEl.appendChild(rerollBtn);
  }

  const actions = [
    { action: "copy",  title: "복사", iconHTML: `<i class="fi fi-rr-copy"></i>` },
    { action: "edit",  title: "수정", iconHTML: `<i class="fi fi-rr-edit"></i>` },
    { action: "delete",title: "삭제", iconHTML: `<i class="fi fi-rr-trash"></i>` },
  ];

  actions.forEach(({ action, title, iconHTML }) => {
    const btn = document.createElement("button");
    btn.className = "bubble-btn";
    btn.dataset.action = action;
    btn.innerHTML = iconHTML;
    btn.title = title;
    actionsEl.appendChild(btn);
  });

  bubbleEl.appendChild(contentEl);
  bubbleEl.appendChild(actionsEl);

  bodyEl.appendChild(metaEl);
  bodyEl.appendChild(bubbleEl);

  msgEl.appendChild(avatarEl);
  msgEl.appendChild(bodyEl);

  chatLogEl.appendChild(msgEl);
  scrollToBottom();
  updateRerollButtons();
}

// --- 백엔드 호출 ---

async function callBackend(userText) {
  try {
    const systemPrompt = getCurrentSystemPrompt();

    const payload = {
      message: userText,
      systemPrompt,
    };

    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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

// --- 폼 전송 ---

if (chatFormEl && chatInputEl) {
  chatFormEl.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = chatInputEl.value.trim();
    if (!text || isRequesting) return;

    chatInputEl.value = "";
    lastUserMessage = text;
    turnCount += 1;
    updateSessionStats(text.length);

    const userMsg = { id: nextMessageId++, role: "user", text };
    messages.push(userMsg);
    appendMessage(userMsg);

    isRequesting = true;
    const botReply = await callBackend(text);
    isRequesting = false;

    const botMsg = { id: nextMessageId++, role: "bot", text: botReply };
    messages.push(botMsg);
    appendMessage(botMsg);
  });

  chatInputEl.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      chatFormEl.requestSubmit();
    }
  });
}

// --- 말풍선 버튼 이벤트 위임 ---

if (chatLogEl) {
  chatLogEl.addEventListener("click", async (e) => {
    const btn = e.target.closest(".bubble-btn");
    if (!btn) return;

    const action = btn.dataset.action;
    const messageEl = btn.closest(".message");
    if (!messageEl) return;

    const messageId = Number(messageEl.dataset.messageId);
    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    if (action === "copy") {
      try {
        await navigator.clipboard.writeText(message.text || "");
        showToast("복사 완료!");
      } catch (err) {
        console.error("복사 실패", err);
        showToast("복사 실패);
      }
      return;
    }

    if (action === "edit") {
      enterEditMode(message, messageEl);
      showToast("Ctrl+Enter: 저장 · Esc: 취소");
      return;
    }

    if (action === "delete") {
      messages = messages.filter((m) => m.id !== messageId);
      messageEl.remove();
      updateRerollButtons();
      showToast("메시지 삭제됨");
      return;
    }

    if (action === "reroll") {
      if (isRequesting || !lastUserMessage) return;

      let lastBot = null;
      let lastBotIndex = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "bot") {
          lastBot = messages[i];
          lastBotIndex = i;
          break;
        }
      }
      if (!lastBot || lastBot.id !== messageId) return;

      rerollCount += 1;
      updateSessionStats(lastUserMessage.length);

      messages.splice(lastBotIndex, 1);
      messageEl.remove();
      updateRerollButtons();

      isRequesting = true;
      const newReply = await callBackend(lastUserMessage);
      isRequesting = false;

      const newBotMsg = {
        id: nextMessageId++,
        role: "bot",
        text: newReply,
      };
      messages.push(newBotMsg);
      appendMessage(newBotMsg);
      showToast("리롤 완료!");
    }
  });
}

// 초기화 버튼
if (clearChatBtnEl) {
  clearChatBtnEl.addEventListener("click", () => {
    messages = [];
    nextMessageId = 0;
    if (chatLogEl) chatLogEl.innerHTML = "";
    lastUserMessage = null;
    lastBotIndex = -1;
    turnCount = 0;
    rerollCount = 0;
    updateSessionStats(0);
  });
}

// 테스트용 가짜 장기기억
if (fakeMemoryBtnEl) {
  fakeMemoryBtnEl.addEventListener("click", () => {
    if (!memoryBoxEl) return;
    memoryBoxEl.textContent =
      "• 장기기억 들어올 자리\n" +
      "• 여기에는 나중에 요약 시스템이 생성한 요약 텍스트가 표시될 예정!";
  });
}

// 초기 안내 메시지
if (chatLogEl) {
  updateSessionStats(0);
  const initialMsg = {
    id: nextMessageId++,
    role: "bot",
    text: "지금 이 채팅은 백엔드 Cloud Functions를 통해 Gemini 2.5 Pro로 연결돼 있어요.",
  };
  messages.push(initialMsg);
  appendMessage(initialMsg);
}
