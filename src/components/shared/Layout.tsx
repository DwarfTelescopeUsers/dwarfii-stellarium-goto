import React from "react";

import Nav from "@/components/shared/Nav";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container">
      <Nav />
      <main>{children}</main>
    </div>
  );
}
