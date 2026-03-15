export function blockScreenshotKeys(onAttempt) {
  let guardTimeout = null;

  const triggerGuard = () => {
    if (typeof document === 'undefined') return;
    document.body.classList.add('capture-guard-active');
    if (guardTimeout) window.clearTimeout(guardTimeout);
    guardTimeout = window.setTimeout(() => {
      document.body.classList.remove('capture-guard-active');
      guardTimeout = null;
    }, 1200);
  };

  const handler = (event) => {
    const key = String(event?.key || '').toLowerCase();
    const isPrintScreen = key === 'printscreen';
    const isWindowsSnip = event.shiftKey && (event.metaKey || event.ctrlKey) && key === 's';
    const isMacCapture = event.metaKey && event.shiftKey && (key === '3' || key === '4' || key === '5');
    const isDevCapture = event.ctrlKey && event.shiftKey && key === 'i';

    if (!isPrintScreen && !isWindowsSnip && !isMacCapture && !isDevCapture) return;

    event.preventDefault();
    event.stopPropagation();
    triggerGuard();

    try {
      navigator.clipboard?.writeText('');
    } catch {
      // Clipboard may be unavailable depending on browser permissions.
    }

    if (typeof onAttempt === 'function') {
      onAttempt(event);
      return;
    }

    window.alert('Screenshots are disabled during encounters.');
  };

  document.addEventListener('keydown', handler, true);
  document.addEventListener('keyup', handler, true);

  return () => {
    document.removeEventListener('keydown', handler, true);
    document.removeEventListener('keyup', handler, true);
    if (guardTimeout) window.clearTimeout(guardTimeout);
    document.body.classList.remove('capture-guard-active');
  };
}
