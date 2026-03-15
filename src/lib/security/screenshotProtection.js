export function blockScreenshotKeys(onAttempt) {
  const handler = (event) => {
    const key = String(event?.key || '').toLowerCase();
    if (key !== 'printscreen') return;

    event.preventDefault();
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

  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}
