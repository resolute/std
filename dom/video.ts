export const playSafe = (video: HTMLVideoElement) => {
  video.play().catch(() => {});
};

const masterObserver = new IntersectionObserver((entries, observer) => {
  // TODO: pause video when not visible/intersecting
  for (const { target, isIntersecting } of entries) {
    if (isIntersecting) {
      const source = target.getAttribute('data-src')!;
      target.setAttribute('src', source);
      target.removeAttribute('data-src');
      observer.unobserve(target);
    }
  }
});

const observe = /* @__PURE__ */ masterObserver.observe.bind(masterObserver);

export const lazy = (videos: NodeListOf<HTMLVideoElement>) => {
  videos.forEach(observe);
};

const loopTimers = /* @__PURE__ */ new WeakMap<HTMLVideoElement, number>();

const clearLoopTimer = (video: HTMLVideoElement) => {
  const existingTimer = loopTimers.get(video);
  if (existingTimer) {
    clearTimeout(existingTimer);
    loopTimers.delete(video);
  }
};

const pauseAndClear = (video: HTMLVideoElement) => {
  video.pause();
  clearLoopTimer(video);
};

export const finiteLoop = (videos: NodeListOf<HTMLVideoElement>, maxDuration = 1000 * 60 * 5) => {
  videos.forEach((video) => {
    video.addEventListener('play', () => {
      clearLoopTimer(video);
      const newTimer = setTimeout(pauseAndClear, maxDuration, video) as unknown as number;
      loopTimers.set(video, newTimer);
    });
  });
};
