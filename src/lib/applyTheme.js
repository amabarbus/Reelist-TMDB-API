try {
  const saved = window.localStorage.getItem("user-profile");
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed.theme) document.documentElement.setAttribute('data-theme', parsed.theme);
  }
} catch (e) { }
