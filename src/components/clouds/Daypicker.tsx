import React, { useState } from "react";

export interface DaypickerProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
}

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const Daypicker = ({ selectedDate, setSelectedDate }: DaypickerProps) => {
  const [dateRange] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fiveDaysAway = new Date();
    fiveDaysAway.setHours(0, 0, 0, 0);
    fiveDaysAway.setDate(today.getDate() + 4);
    return { today, fiveDaysAway };
  });

  return (
    <label className="dw-date-field">
      <span>Forecast date</span>
      <input
        type="date"
        value={toDateInputValue(selectedDate)}
        min={toDateInputValue(dateRange.today)}
        max={toDateInputValue(dateRange.fiveDaysAway)}
        onChange={(event) => {
          if (event.target.value) {
            setSelectedDate(new Date(`${event.target.value}T12:00:00`));
          }
        }}
      />
    </label>
  );
};

export default Daypicker;
