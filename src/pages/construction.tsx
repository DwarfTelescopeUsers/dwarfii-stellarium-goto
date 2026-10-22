import PageHeader from "@/components/shared/PageHeader";

export default function About() {
  return (
    <div className="dw-page">
      <PageHeader
        eyebrow="Dwarfium"
        title="Coming soon"
        description="This workspace is still being prepared."
      />
      <section className="dw-empty-state">
        <div className="dw-empty-state-icon">
          <i className="bi bi-tools" aria-hidden="true" />
        </div>
        <h2>This page is under construction</h2>
        <p>
          We’re refining this feature and will make it available in a future
          release.
        </p>
      </section>
    </div>
  );
}
