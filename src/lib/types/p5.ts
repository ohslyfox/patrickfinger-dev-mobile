import p5Types from "p5";

export interface Vector {
  x: number;
  y: number;
}

type p5Method = (p5: p5Types) => void;

type P5Methods = {
  display: p5Method;
  mousePressed: p5Method;
  mouseReleased: p5Method;
  windowResized: p5Method;
};

export interface CustomElement extends P5Methods {
  readonly location: Vector;
}

export interface ElementContainer extends P5Methods {
  readonly elements: CustomElement[];
}
