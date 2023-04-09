import React, { useState } from "react";
import Sketch from "react-p5";
import p5Types from "p5";
import { ElementContainer } from "../types/p5";
import getSceneElements from "../elements/sceneElements";

interface Props {}

const Scene: React.FC<Props> = (props: Props) => {
    const [elementContainers, setElementContainers] = useState<
        ElementContainer[]
    >([]);

    const setup = (p5: p5Types, canvasParentRef: Element) => {
        const canvas = p5
            .createCanvas(p5.windowWidth, p5.windowHeight)
            .parent(canvasParentRef);
        canvas.position(0, 0);
        setElementContainers(getSceneElements(p5));
    };

    const draw = (p5: p5Types) => {
        p5.background(0);
        for (const container of elementContainers) {
            container.display(p5);
        }
    };

    const windowResized = (p5: p5Types) => {
        p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
        for (const container of elementContainers) {
            container.windowResized(p5);
        }
    };

    const mousePressed = (p5: p5Types) => {
        for (const container of elementContainers) {
            container.mousePressed(p5);
        }
    };

    const mouseReleased = (p5: p5Types) => {
        for (const container of elementContainers) {
            container.mouseReleased(p5);
        }
    };

    return (
        <Sketch
            setup={setup}
            draw={draw}
            windowResized={windowResized}
            mousePressed={mousePressed}
            mouseReleased={mouseReleased}
        />
    );
};

export default Scene;