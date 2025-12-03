// create.js
document.addEventListener("DOMContentLoaded", () => {
  const titleInput = document.getElementById("chat-title");
  const bodyInput = document.getElementById("prompt-body");
  const previewBtn = document.getElementById("preview-btn");
  const copyBtn = document.getElementById("copy-btn");
  const previewEl = document.getElementById("prompt-preview");

  if (!bodyInput || !previewBtn || !previewEl) return;

  // 공용 함수: 마크다운을 HTML로 렌더링
  function updatePreview() {
    const md = bodyInput.value || "";
    // marked 라이브러리 사용
    const html = marked.parse(md);
    previewEl.innerHTML = html;
  }

  // 1) 미리보기 버튼
  previewBtn.addEventListener("click", () => {
    updatePreview();
  });

  // 2) 입력 실시간 반영도 하고 싶으면 이거 주석 해제해도 됨
  // bodyInput.addEventListener("input", updatePreview);

  // 3) 프롬프트 복사 (제목은 안 보내니까 본문만 복사)
  copyBtn.addEventListener("click", async () => {
    const promptText = bodyInput.value.trim();
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
