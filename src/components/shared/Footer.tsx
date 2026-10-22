import packageJson from "../../../package.json";

export default function Footer() {
  return (
    <footer className="dw-footer">
      <span>Dwarfium &copy; {new Date().getFullYear()}</span>
      <span>Version {packageJson.version}</span>
    </footer>
  );
}
