// main.js

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
  requestAnimationFrame(() => {
    chatLogEl.scrollTop = chatLogEl.scrollHeight;
  });
}

function updateSessionStats(latestTextLength = 0) {
  turnCountEl.textContent = String(turnCount);
  rerollCountEl.textContent = String(rerollCount);
  lastLengthEl.textContent = `${latestTextLength} 자`;
}

// 메시지 렌더링
function appendMessage(role, text) {
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

// --- 더미 봇 응답 로직 ---
// 나중에 여기만 Gemini API 호출로 교체하면 됨!
const dummyReplies = [
  (userText) =>
    `음, "${userText}"라고 하셨군요! 지금은 프론트엔드만 만들어둔 상태라 실제 모델을 부르진 않지만, 나중에 Gemini 2.5 Pro를 붙이면 여기서 진짜 답변이 나올 거예요 ✨`,
  (userText) =>
    `"${userText}" 에 대해 더 자세히 적어주셔도 좋아요! 지금은 더미 응답이지만, UX 느낌 잡기에는 충분하죠 히히.`,
  (userText) =>
    `현재는 로컬에서만 도는 프론트 버전이라, 비용은 0원이에요 🙌\n나중엔 서버에서 API를 호출하고, 여기 UI는 그대로 재사용하면 됩니다!`,
  (userText) =>
    `이 메시지는 "리롤 테스트용" 더미 답변이에요. 같은 질문에 여러 스타일을 섞어서 보여주고 싶다면, 나중에 temperature나 system prompt를 바꾸는 식으로 구현할 수 있어요.`,
];

function generateDummyReply(userText) {
  // 항상 다른 느낌을 주고 싶으니까 랜덤으로 뽑기
  const idx = Math.floor(Math.random() * dummyReplies.length);
  lastBotIndex = idx;
  return dummyReplies[idx](userText);
}

// 마지막 봇 메시지 제거 (리롤 시 사용)
function removeLastBotMessageFromUI() {
  const allMessages = Array.from(
    chatLogEl.querySelectorAll(".message.bot")
  );
  if (allMessages.length === 0) return;
  const lastBot = allMessages[allMessages.length - 1];
  chatLogEl.removeChild(lastBot);
}

// --- 폼 전송 핸들러 ---

chatFormEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = chatInputEl.value.trim();
  if (!text) return;

  // UI 초기화
  chatInputEl.value = "";
  lastUserMessage = text;
  turnCount += 1;
  updateSessionStats(text.length);

  messages.push({ role: "user", text });
  appendMessage("user", text);

  // 여기서 나중에 실제 API 호출하면 됨
  // TODO: fetch("/api/chat", { method: "POST", body: JSON.stringify({ messages }) ... })
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

// 리롤 버튼: 마지막 봇 답변 교체
rerollBtnEl.addEventListener("click", () => {
  if (!lastUserMessage) return;
  // 마지막 메시지가 봇인지 한 번 확인
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || lastMsg.role !== "bot") return;

  // 상태 업데이트
  rerollCount += 1;
  updateSessionStats(lastUserMessage.length);

  // 메모리 상에서도 마지막 봇 메시지 제거
  messages = messages.slice(0, messages.length - 1);
  // UI에서도 제거
  removeLastBotMessageFromUI();

  // 새 응답 생성
  const newReply = generateDummyReply(lastUserMessage);
  messages.push({ role: "bot", text: newReply });
  appendMessage("bot", newReply);
});

// 채팅 초기화 버튼
clearChatBtnEl.addEventListener("click", () => {
  messages = [];
  chatLogEl.innerHTML = "";
  lastUserMessage = null;
  lastBotIndex = -1;
  turnCount = 0;
  rerollCount = 0;
  updateSessionStats(0);
});

// 테스트용 가짜 장기기억 넣기
fakeMemoryBtnEl.addEventListener("click", () => {
  memoryBoxEl.textContent =
    "• 웅니는 Gemini 2.5 Pro 기반 개인 챗봇을 만들고 싶어함.\n" +
    "• 리롤, 장기기억, 요약 시스템 등 구조적인 설계에 관심이 많음.\n" +
    "• 비용을 꼼꼼히 계산하며 월 3만원 안쪽에서 운영하고 싶어함.\n" +
    "• 재잘재잘 장문 대화를 선호하고, UX/디자인에도 관심이 많음.";
});
 
// 초기 상태 반영
updateSessionStats(0);

// 첫 안내 메시지 하나 넣어주기
appendMessage(
  "bot",
  "웅니, 안녕! 👋\n\n여기는 아직 프론트엔드만 있는 시제품 챗 화면이에요.\n" +
    "- 가운데는 채팅 영역\n" +
    "- 오른쪽은 장기기억/세션 정보\n" +
    "- 왼쪽은 캐릭터/세션 리스트\n\n나중에 서버랑 API만 붙이면 진짜 Gemini 2.5 Pro랑 대화하는 플랫폼으로 바뀔 거예요 ✨"
);
