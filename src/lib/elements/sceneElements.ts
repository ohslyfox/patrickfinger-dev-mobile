import p5Types from "p5";
import Container from "./container";
import Bubble from "./bubble";
import HoverText from "./hoverText";

const getSceneElements = (p5: p5Types): Container[] => {
  return [
    Container.getElementContainer(
      Array.from(
        { length: 12 },
        (_v, _i) => new Bubble(p5.windowWidth, p5.windowHeight)
      )
    ),
    Container.getElementContainer([
      new HoverText(p5, "résumé", "https://patrickfinger.dev/resume", -150),
      new HoverText(p5, "projects", "https://github.com/ohslyfox", 0),
      new HoverText(
        p5,
        "linkedin",
        "https://www.linkedin.com/in/patrick-finger-50ab75132",
        150
      ),
    ]),
  ];
};

export default getSceneElements;
