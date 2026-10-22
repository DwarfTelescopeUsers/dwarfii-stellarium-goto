import React from "react";
import ImageEditor from "@/components/ImageEditor";
import PageHeader from "@/components/shared/PageHeader";

const Editor: React.FC = () => {
  return (
    <div className="dw-page">
      <PageHeader
        eyebrow="Create"
        title="Image editor"
        description="Make focused adjustments to captured images without leaving Dwarfium."
      />
      <section className="dw-panel dw-tool-panel">
        <ImageEditor />
      </section>
    </div>
  );
};

export default Editor;
