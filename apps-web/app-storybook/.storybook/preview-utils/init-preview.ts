const setTitle = (title: string) => {
  document.title = title;
};

const initTitle = () => {
  setTitle("Lennon's Lab");
  const handleLoad = () => {
    setTitle("Lennon's Lab");
  };
  window.addEventListener('DOMContentLoaded', handleLoad, { once: true });
  window.addEventListener('load', handleLoad, { once: true });
};

const initFavicon = () => {
  const existingLink = document.querySelector('link[rel="icon"]');
  if (existingLink) {
    existingLink.remove();
  }
  const link = document.createElement('link');
  link.setAttribute('rel', 'icon');
  link.setAttribute('href', '/favicon.svg');
  link.setAttribute('type', 'image/svg+xml');
  document.head.appendChild(link);
};

export const initPreview = () => {
  initFavicon();
  initTitle();
};
