export default (top: string | null, bottom: string | null) => {
  if (!top || !bottom) {
    return;
  }
  const adjust = () => requestAnimationFrame(() => {
    document.body.style.backgroundColor =
      window.scrollY + window.innerHeight > document.body.clientHeight
        ? bottom
        : top;
  });
  window.addEventListener('scroll', adjust, { passive: true });
  window.addEventListener('resize', adjust, { passive: true });
  adjust();
};
