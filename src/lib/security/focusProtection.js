export function enableFocusProtection() {
  const onVisibilityChange = () => {
    if (document.hidden) {
      document.body.classList.add('app-blur');
    } else {
      document.body.classList.remove('app-blur');
    }
  };

  document.addEventListener('visibilitychange', onVisibilityChange);
  onVisibilityChange();

  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    document.body.classList.remove('app-blur');
  };
}
