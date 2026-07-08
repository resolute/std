export const playSafe = (video: HTMLVideoElement): void => {
  video.play().catch(() => {});
};

let masterObserver: IntersectionObserver | undefined;

const getMasterObserver = (): IntersectionObserver =>
  masterObserver ??= new IntersectionObserver(
    (entries, observer) => {
      // TODO(#visibility): pause video when not visible/intersecting
      for (const { target, isIntersecting } of entries) {
        if (isIntersecting) {
          const source = target.getAttribute('data-src')!;
          target.setAttribute('src', source);
          target.removeAttribute('data-src');
          observer.unobserve(target);
        }
      }
    },
  );

export const lazy = (videos: NodeListOf<HTMLVideoElement>): void => {
  const observer = getMasterObserver();
  const observe = observer.observe.bind(observer);
  videos.forEach(observe);
};

const loopTimers = /* @__PURE__ */ new WeakMap<HTMLVideoElement, number>();

const clearLoopTimer = (video: HTMLVideoElement): void => {
  const existingTimer = loopTimers.get(video);
  if (existingTimer) {
    clearTimeout(existingTimer);
    loopTimers.delete(video);
  }
};

const pauseAndClear = (video: HTMLVideoElement): void => {
  video.pause();
  clearLoopTimer(video);
};

export const finiteLoop = (
  videos: NodeListOf<HTMLVideoElement>,
  maxDuration = 1000 * 60 * 5,
): void => {
  videos.forEach((video) => {
    video.addEventListener('play', () => {
      clearLoopTimer(video);
      const newTimer = setTimeout(pauseAndClear, maxDuration, video) as unknown as number;
      loopTimers.set(video, newTimer);
    });
  });
};
