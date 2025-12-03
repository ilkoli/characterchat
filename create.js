// create.js
document.addEventListener("DOMContentLoaded", () => {
  const titleInput = document.getElementById("chat-title");
  const bodyInput = document.getElementById("prompt-body");
  const startSituationInput = document.getElementById("start-situation");
  const startMessageInput = document.getElementById("start-message");

  const previewBtn = document.getElementById("preview-btn");
  const copyBtn = document.getElementById("copy-btn");
  const previewEl = document.getElementById("prompt-preview");

  if (!bodyInput || !previewBtn || !previewEl) return;

  // 🔹 마크다운 줄바꿈(엔터)도 <br>로 처리되도록 옵션 설정
  if (typeof marked !== "undefined") {
    marked.setOptions({
      breaks: true, // 한 줄 엔터도 줄바꿈 처리
    });
  }

  // 🔹 미리보기용으로 전체 마크다운 문자열 조립
  function buildPreviewMarkdown() {
    const base = bodyInput.value || "";
    const situation = (startSituationInput.value || "").trim();
    const opening = (startMessageInput.value || "").trim();

    let extra = "";

    if (situation) {
      extra += `

---

### 시작 상황

${situation}
`;
    }

    if (opening) {
      extra += `

### 시작 대사 (AI가 먼저 하는 말)

${opening}
`;
    }

    // 기본 프롬프트 + (있으면) 시작 상황/대사
    return (base + extra).trim();
  }

  // 공용 함수: 마크다운을 HTML로 렌더링
  function updatePreview() {
    const md = buildPreviewMarkdown();

    if (typeof marked !== "undefined") {
      const html = marked.parse(md);
      previewEl.innerHTML = html;
    } else {
      // 만약 marked가 없으면 그냥 텍스트만 보여주기
      previewEl.textContent = md;
    }
  }

  // 1) 미리보기 버튼
  previewBtn.addEventListener("click", () => {
    updatePreview();
  });

  // 2) 실시간 미리보기도 원하면 아래 주석 풀기
  // [웅니가 원하는 스타일에 따라]
  // bodyInput.addEventListener("input", updatePreview);
  // startSituationInput.addEventListener("input", updatePreview);
  // startMessageInput.addEventListener("input", updatePreview);

  // 3) 프롬프트 "본문만" 복사 (제목/시작 상황/대사는 따로 관리)
  copyBtn.addEventListener("click", async () => {
    const promptText = (bodyInput.value || "").trim();
    if (!promptText) {
      alert("프롬프트 본문이 비어 있어요!");
      return;
    }

    try {
      await navigator.clipboard.writeText(promptText);
      alert("프롬프트 본문을 클립보드에 복사했어요! ✨");
    } catch (err) {
      console.error(err);
      alert("복사에 실패했어요. 직접 전체 선택 후 Ctrl+C 해주세요 ㅠㅠ");
    }
  });

  // 페이지 처음 열릴 때 한 번 미리보기
  updatePreview();
});
