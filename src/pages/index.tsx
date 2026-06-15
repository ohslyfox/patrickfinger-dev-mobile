import dynamic from "next/dynamic";
import StarfieldBackground from "../lib/components/StarfieldBackground";

const DynamicScene = dynamic(() => import("../lib/components/Scene"), {
  ssr: false,
});

export default function Home() {
    return (
        <div>
            <StarfieldBackground />
            <DynamicScene />
        </div>
    );
}
