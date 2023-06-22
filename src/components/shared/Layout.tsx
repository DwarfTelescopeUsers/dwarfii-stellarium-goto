import type { ReactNode } from "react";

import Nav from "@/components/shared/Nav";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="container">
      <Nav />
      <main>{children}</main>
    </div>
  );
}
