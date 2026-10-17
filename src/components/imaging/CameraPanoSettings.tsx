import React from "react";
import type { Dispatch, SetStateAction } from "react";

type PropTypes = {
  colValue: number;
  setColValue: Dispatch<SetStateAction<number>>;
  rowValue: number;
  setRowValue: Dispatch<SetStateAction<number>>;
  setShowSettingsMenu: Dispatch<SetStateAction<boolean>>;
};

export default function CameraPanoSettings({ setShowSettingsMenu }: PropTypes) {
  return (
    <div>
      <p role="status">
        Panorama grid configuration is unavailable for this connection. No row
        or column settings will be sent.
      </p>
      <button
        type="button"
        onClick={() => setShowSettingsMenu(false)}
        className="btn btn-more02"
      >
        Close
      </button>
    </div>
  );
}
