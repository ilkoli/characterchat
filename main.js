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
    // 이름 첫 글자나 간단한 이모지
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

  // 초기 선택 적용
  applyActiveCharacter(savedId);
}

// 초기 캐릭터 로딩
async function initCharacters() {
  if (!characterListEl) return; // 이 페이지에 캐릭터 섹션 없으면 스킵

  try {
    const fromDB = await firestoreLoadCharacters();
    renderCharacterList(fromDB);
  } catch (err) {
    console.error("캐릭터 목록 불러오기 실패:", err);
    // 실패해도 기본 봇만이라도 보이도록
    renderCharacterList([]);
  }
}

initCharacters();

// ===== 채팅 로직 =====

// ✅ 백엔드 Cloud Function URL
const API_ENDPOINT =
  "https://asia-northeast3-ilkoliai.cloudfunctions.net/chat";

// 채팅 관련 DOM들 (채팅 페이지에서만 존재함)
const chatLogEl = document.getElementById("chat-log");
const chatFormEl = document.getElementById("chat-form");
const chatInputEl = document.getElementById("chat-input");
const clearChatBtnEl = document.getElementById("clear-chat-btn");
const fakeMemoryBtnEl = document.getElementById("fake-memory-btn");

const turnCountEl = document.getElementById("turn-count");
const rerollCountEl = document.getElementById("reroll-count");
const lastLengthEl = document.getElementById("last-length");
const memoryBoxEl = document.getElementById("memory-box");

// 상태 값들
let nextMessageId = 0; // 🔹 각 메시지 고유 ID
let messages = [];     // { id, role: "user" | "bot", text: string }
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

// 🔹 현재 캐릭터 프롬프트(본문)를 localStorage에서 꺼내기
function getCurrentSystemPrompt() {
  try {
    const stored = localStorage.getItem(PROMPT_STORAGE_KEY);
    return stored || "";
  } catch {
    return "";
  }
}

// 🔹 마크다운 렌더링 유틸
function renderMarkdown(text) {
  // marked 라이브러리가 있으면 사용
  if (typeof marked !== "undefined") {
    return marked.parse(text);
  }
  // 없으면 그냥 이스케이프된 텍스트만 출력
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// 🔹 가장 최신 봇(assistant) 말풍선에만 리롤 버튼 보이도록
function updateRerollButtons() {
  if (!chatLogEl) return;

  // 모든 리롤 버튼 숨기기
  const allRerollBtns = chatLogEl.querySelectorAll(
    ".message[data-role='bot'] .bubble-btn--reroll"
  );
  allRerollBtns.forEach((btn) => btn.classList.add("is-hidden"));

  // 마지막 봇 메시지 찾기
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

// 메시지 렌더링 (버튼 포함)
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

  // 내용
  const contentEl = document.createElement("div");
  contentEl.className = "message-bubble-content";
  contentEl.innerHTML = renderMarkdown(text);

  // 말풍선 하단 버튼 영역
  const actionsEl = document.createElement("div");
  actionsEl.className = "message-bubble-actions";

  // 🔁 리롤 버튼: 봇 메시지에만 생성
  if (role === "bot") {
    const rerollBtn = document.createElement("button");
    rerollBtn.className = "bubble-btn bubble-btn--reroll";
    rerollBtn.dataset.action = "reroll";
    rerollBtn.textContent = "🔁 리롤";
    actionsEl.appendChild(rerollBtn);
  }

  // 공통 버튼들: 복사 / 수정 / 삭제
  const actions = [
    { action: "copy", label: "복사" },
    { action: "edit", label: "수정" },
    { action: "delete", label: "삭제" },
  ];

  actions.forEach(({ action, label }) => {
    const btn = document.createElement("button");
    btn.className = "bubble-btn";
    btn.dataset.action = action;
    btn.textContent = label;
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

// --- 백엔드 호출 함수 (Gemini 호출 프록시) ---

async function callBackend(userText) {
  try {
    const systemPrompt = getCurrentSystemPrompt();

    const payload = {
      message: userText,
      // 🔹 시스템/캐릭터 프롬프트를 함께 보냄 (백엔드에서 선택적으로 사용할 수 있음)
      systemPrompt: systemPrompt,
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

    const userMsg = { id: nextMessageId++, role: "user", text };
    messages.push(userMsg);
    appendMessage(userMsg);

    isRequesting = true;

    const botReply = await callBackend(text);

    const botMsg = { id: nextMessageId++, role: "bot", text: botReply };
    messages.push(botMsg);
    appendMessage(botMsg);

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

// 🔹 말풍선 하단 버튼들(복사/수정/삭제/리롤) 이벤트 위임
if (chatLogEl) {
  chatLogEl.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    const messageEl = btn.closest(".message");
    if (!messageEl) return;

    const messageId = Number(messageEl.dataset.messageId);
    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    if (action === "copy") {
      // 복사
      try {
        await navigator.clipboard.writeText(message.text);
        console.log("메시지 복사 완료");
      } catch (err) {
        console.error("복사 실패", err);
      }
    } else if (action === "edit") {
      // 수정 (간단하게 prompt로)
      const newText = window.prompt("메시지를 수정해주세요.", message.text);
      if (newText === null) return; // 취소
      message.text = newText;

      const contentEl = messageEl.querySelector(".message-bubble-content");
      if (contentEl) {
        contentEl.innerHTML = renderMarkdown(newText);
      }
    } else if (action === "delete") {
      // 삭제
      messages = messages.filter((m) => m.id !== messageId);
      messageEl.remove();
      updateRerollButtons();
    } else if (action === "reroll") {
      // 리롤: "가장 마지막 봇 메시지"에만 동작
      if (isRequesting || !lastUserMessage) return;

      // 실제 마지막 봇 메시지 찾기
      let lastBot = null;
      let lastBotIndex = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "bot") {
          lastBot = messages[i];
          lastBotIndex = i;
          break;
        }
      }
      if (!lastBot || lastBot.id !== messageId) {
        // 최신 봇 메시지가 아니면 무시
        return;
      }

      rerollCount += 1;
      updateSessionStats(lastUserMessage.length);

      // 상태/화면에서 마지막 봇 메시지 제거
      messages.splice(lastBotIndex, 1);
      messageEl.remove();
      updateRerollButtons();

      // 백엔드에 다시 요청
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
    }
  });
}

// 채팅 초기화 버튼
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
  const initialMsg = {
    id: nextMessageId++,
    role: "bot",
    text: "지금 이 채팅은 백엔드 Cloud Functions를 통해 Gemini 2.5 Pro로 연결돼 있어요.",
  };
  messages.push(initialMsg);
  appendMessage(initialMsg);
}
