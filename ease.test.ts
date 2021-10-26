import { assertStrictEquals } from 'https://deno.land/std@0.112.0/testing/asserts.ts';
import {
  easeInQuad, easeOutQuad, easeInOutQuad, easeInCubic,
  easeOutCubic, easeInOutCubic, easeInQuart, easeOutQuart,
  easeInOutQuart, easeInQuint, easeOutQuint, easeInOutQuint,
  easeInSine, easeOutSine, easeInOutSine, easeInExpo, easeOutExpo,
  easeInOutExpo, easeInCirc, easeOutCirc, easeInOutCirc,
  easeInBack, easeOutBack, easeInOutBack, easeInElastic,
  easeOutElastic, easeInOutElastic, easeInBounce, easeInOutBounce,
} from './ease.ts';

Deno.test('ease', () => {
  [
    easeInQuad,
    easeOutQuad,
    easeInOutQuad,
    easeInCubic,
    easeOutCubic,
    easeInOutCubic,
    easeInQuart,
    easeOutQuart,
    easeInOutQuart,
    easeInQuint,
    easeOutQuint,
    easeInOutQuint,
    easeInSine,
    easeOutSine,
    easeInOutSine,
    easeInExpo,
    easeOutExpo,
    easeInOutExpo,
    easeInCirc,
    easeOutCirc,
    easeInOutCirc,
    easeInBack,
    easeOutBack,
    easeInOutBack,
    easeInElastic,
    easeOutElastic,
    easeInOutElastic,
    easeInBounce,
    easeInOutBounce,
  ].forEach((ease) => {
    [
      0,
      0.1, 0.2, 0.3,
      0.4, 0.5, 0.6,
      0.7, 0.8, 0.9,
      1,
    ].forEach((progress) => {
      assertStrictEquals(Number.isFinite(ease(progress)), true);
    });
  });
});
