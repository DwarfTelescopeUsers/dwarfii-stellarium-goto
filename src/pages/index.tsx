import Link from "next/link";

export default function Home() {
  return (
    <div>
      <h1>Dwarf II + Stellarium</h1>

      <p>
        This website connects to the Dwarf II telescope to Stellarium via the{" "}
        <Link href="https://hj433clxpv.feishu.cn/docx/MiRidJmKOobM2SxZRVGcPCVknQg">
          Dwarf II API
        </Link>{" "}
        and Stellarium remote control plugin. Once Dwarf II and Stellarium are
        connected, you can select an object in Stellarium, and then tell Dwarf
        II to go to that object. You can also select an object from a predefined
        object lists and view that object in Stellarium.
      </p>

      <Link href="/setup-scope" className="btn btn-primary">
        Start
      </Link>
    </div>
  );
}
