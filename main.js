// ===== 채팅 로직 =====

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

let messages = []; // { role: "user" | "bot", text: string }
let lastUserMessage = null;
let lastBotIndex = -1;
let rerollCount = 0;
let turnCount = 0;

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
  metaEl.textContent = role === "user" ? "웅니" : "웅니 AI 봇";

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

// --- 더미 봇 응답 로직 (나중에 Gemini API로 교체 예정) ---

const dummyReplies = [
  (userText) =>
    `음, "${userText}"라고 하셨군요! 지금은 프론트엔드 데모라 진짜 모델은 안 부르고 있어요. 나중에 Gemini 2.5 Pro API를 붙이면 여기서 진짜 답변이 나올 거예요 ✨`,
  (userText) =>
    `"${userText}" 에 대해 더 자세히 적어주셔도 좋아요! 지금은 더미 응답이지만, UX 느낌 잡기에는 충분하죠 히히.`,
  () =>
    `현재는 로컬에서만 도는 프론트 버전이라, 비용은 0원이에요 🙌\n나중엔 서버에서 API를 호출하고, 이 화면은 그대로 재사용하면 됩니다!`,
  () =>
    `이 메시지는 "리롤 테스트용" 더미 답변이에요. 같은 질문에 여러 스타일을 섞어서 보여주고 싶다면, 나중에 temperature나 system prompt를 바꾸는 식으로 구현할 수 있어요.`,
];

function generateDummyReply(userText) {
  const idx = Math.floor(Math.random() * dummyReplies.length);
  lastBotIndex = idx;
  return dummyReplies[idx](userText);
}

// 마지막 봇 메시지 제거 (리롤 시 사용)
function removeLastBotMessageFromUI() {
  if (!chatLogEl) return;
  const allMessages = Array.from(chatLogEl.querySelectorAll(".message.bot"));
  if (allMessages.length === 0) return;
  const lastBot = allMessages[allMessages.length - 1];
  chatLogEl.removeChild(lastBot);
}

// --- 폼 전송 핸들러 ---

if (chatFormEl && chatInputEl) {
  chatFormEl.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = chatInputEl.value.trim();
    if (!text) return;

    chatInputEl.value = "";
    lastUserMessage = text;
    turnCount += 1;
    updateSessionStats(text.length);

    messages.push({ role: "user", text });
    appendMessage("user", text);

    // TODO: 여기 나중에 실제 Gemini API 호출 붙이기
    const botReply = generateDummyReply(text);

    messages.push({ role: "bot", text: botReply });
    appendMessage("bot", botReply);
  });

  // Enter/단축키 처리 (Ctrl+Enter / Cmd+Enter 전송)
  chatInputEl.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      chatFormEl.requestSubmit();
    }
  });
}

// 리롤 버튼
if (rerollBtnEl) {
  rerollBtnEl.addEventListener("click", () => {
    if (!lastUserMessage) return;
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== "bot") return;

    rerollCount += 1;
    updateSessionStats(lastUserMessage.length);

    messages = messages.slice(0, messages.length - 1);
    removeLastBotMessageFromUI();

    const newReply = generateDummyReply(lastUserMessage);
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

// 초기 상태 반영 + 안내 메시지
updateSessionStats(0);
appendMessage(
  "bot",
  "채팅 페이지 테스트"
);
