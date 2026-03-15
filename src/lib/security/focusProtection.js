export function enableFocusProtection() {
  const applyBlur = () => {
    document.body.classList.add('app-blur');
  };

  const clearBlur = () => {
    if (document.hidden) return;
    document.body.classList.remove('app-blur');
  };

  const onVisibilityChange = () => {
    if (document.hidden) {
      applyBlur();
      return;
    }
    clearBlur();
  };

  const onWindowBlur = () => applyBlur();
  const onWindowFocus = () => clearBlur();

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('blur', onWindowBlur);
  window.addEventListener('focus', onWindowFocus);
  onVisibilityChange();

  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('blur', onWindowBlur);
    window.removeEventListener('focus', onWindowFocus);
    document.body.classList.remove('app-blur');
  };
}
