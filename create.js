// create.js
document.addEventListener("DOMContentLoaded", () => {
  const generateBtn = document.getElementById("generate-btn");
  const charInfoEl = document.getElementById("char-info");
  const rulesEl = document.getElementById("system-rules");
  const resultEl = document.getElementById("result");

  if (!generateBtn) return; // 혹시 엘리먼트 못 찾으면 그냥 종료

  generateBtn.addEventListener("click", () => {
    const info = (charInfoEl.value || "").trim();
    const rules = (rulesEl.value || "").trim();

    // 비어 있을 때는 간단 경고
    if (!info && !rules) {
      resultEl.textContent = "먼저 캐릭터 정보나 시스템 지침을 입력해주세요!";
      return;
    }

    const finalPrompt = `
# Role & Purpose
당신은 사용자가 정의한 가상의 캐릭터 **{{char}}**로서, 사용자 **{{user}}**와 상호작용하는 롤플레잉 AI입니다.

# System Directives
${rules || "(별도의 시스템 지침이 없습니다. 기본 대화 규칙만 따릅니다.)"}

# Character Profile
${info || "(캐릭터 프로필 정보가 비어 있습니다.)"}
`.trim();

    resultEl.textContent = finalPrompt;
  });
});

