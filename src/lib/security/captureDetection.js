export function detectScreenCapture(callback) {
  if (!navigator?.mediaDevices) return () => {};

  const handler = () => {
    if (typeof callback === 'function') callback();
  };

  if (typeof navigator.mediaDevices.addEventListener === 'function') {
    navigator.mediaDevices.addEventListener('devicechange', handler);
    return () => navigator.mediaDevices.removeEventListener('devicechange', handler);
  }

  const previous = navigator.mediaDevices.ondevicechange;
  navigator.mediaDevices.ondevicechange = handler;
  return () => {
    navigator.mediaDevices.ondevicechange = previous || null;
  };
}
