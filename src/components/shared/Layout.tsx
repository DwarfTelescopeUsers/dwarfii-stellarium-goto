import React from "react";

import Nav from "@/components/shared/Nav";
import Footer from "@/components/shared/Footer";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container">
      <Nav />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
