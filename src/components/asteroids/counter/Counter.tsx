import React from "react";

type CounterProps = {
  total?: number;
  dangerous?: number;
};

export const Counter: React.FC<CounterProps> = ({ total, dangerous }) => (
  <div className="dw-asteroid-counts" aria-label="Asteroid summary">
    <div>
      <span>Objects found</span>
      <strong>{total ?? "—"}</strong>
    </div>
    <div className="is-danger">
      <span>Potentially hazardous</span>
      <strong>{dangerous ?? "—"}</strong>
    </div>
  </div>
);

export default Counter;
