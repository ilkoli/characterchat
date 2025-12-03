.toast {
  position: fixed;
  bottom: 26px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--accent-strong);
  color: var(--text-contrast);
  padding: 8px 14px;
  font-size: 13px;
  border-radius: 999px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease, transform 0.25s ease;
  z-index: 9999;
}
.toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(-6px);
}

.message-edit-input {
  width: 100%;
  min-height: 60px;
  border-radius: 10px;
  border: 1px solid var(--border-subtle);
  padding: 6px 8px;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;
  background: transparent;
  color: var(--text);
}
.message-edit-input:focus {
  outline: none;
  border-color: var(--accent-strong);
  box-shadow: 0 0 0 1px rgba(161, 188, 152, 0.45);
}
