export default (top: string | null, bottom: string | null) => {
  if (!top || !bottom) {
    return;
  }
  const adjust = () =>
    requestAnimationFrame(() => {
      document.body.style.backgroundColor = scrollY + innerHeight > document.body.clientHeight
        ? bottom
        : top;
    });
  addEventListener('scroll', adjust, { passive: true });
  addEventListener('resize', adjust, { passive: true });
  adjust();
};
