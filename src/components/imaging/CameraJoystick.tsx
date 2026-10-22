import { useContext, useEffect } from "react";
import JoystickController from "joystick-controller";
import { ConnectionContext } from "@/stores/ConnectionContext";

/** Each controller belongs to exactly one physical socket for its lifetime. */
export default function CameraJoystick() {
  const context = useContext(ConnectionContext);
  const socket = context.socketIPDwarf;
  useEffect(() => {
    if (!socket) return;
    let active = true;
    let moving = false;
    let pending = false;
    let lastMovement = -Infinity;
    const report = (error: unknown) => {
      if (active)
        context.setDeviceError?.(
          error instanceof Error ? error.message : String(error),
        );
    };
    const stop = () => {
      if (!moving) return;
      moving = false;
      if (socket.isConnected())
        void socket.request("stopJoystick", {}).catch(report);
    };
    const controller = new JoystickController(
      {
        maxRange: 70,
        level: 10,
        radius: 50,
        joystickRadius: 30,
        opacity: 0.5,
        leftToRight: false,
        bottomToUp: true,
        containerClass: "joystick-container",
        controllerClass: "joystick-controller",
        joystickClass: "joystick",
        distortion: true,
        x: "93%",
        y: "10%",
        mouseClickButton: "ALL",
        hideContextMenu: false,
      },
      ({ leveledX, leveledY, distance, angle }) => {
        if (!active) return;
        if (distance <= 0) {
          stop();
          return;
        }
        if (!socket.isConnected() || pending || Date.now() - lastMovement < 500)
          return;
        const vectorAngle =
          (((360 - (angle * 180) / Math.PI) % 360) + 360) % 360;
        const vectorLength = Math.min(
          1,
          Math.sqrt(leveledX ** 2 + leveledY ** 2) / 10,
        );
        moving = true;
        pending = true;
        lastMovement = Date.now();
        void socket
          .request("joystick", { vectorAngle, vectorLength })
          .catch(report)
          .finally(() => {
            pending = false;
          });
      },
    );
    return () => {
      active = false;
      controller.destroy();
      stop();
    };
  }, [socket]);
  return <div />;
}
