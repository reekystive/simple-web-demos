const setTitle = (title: string) => {
  document.title = title;
};

const initTitle = () => {
  setTitle("Lennon's Lab");
  const handleTitleChange = () => {
    const title = document.title;
    if (title !== "Lennon's Lab") {
      setTitle("Lennon's Lab");
    }
  };
  const observer = new MutationObserver(handleTitleChange);
  observer.observe(document.head, {
    childList: true,
    subtree: true,
  });
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
