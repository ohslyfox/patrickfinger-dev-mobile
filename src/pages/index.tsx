import dynamic from "next/dynamic";

const DynamicScene = dynamic(() => import("../lib/components/Scene"), {
  ssr: false,
});

export default function Home() {
    return (
        <div>
            <DynamicScene />
        </div>
    );
}
