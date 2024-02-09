import { ConnectionContextType } from "@/types";
import { logger } from "@/lib/logger";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

import { wsURL, ping_dwarf, analyzePacket, socketSend } from "dwarfii_api";

class Queue {
  private elements: any;

  constructor(...elements) {
    // Initializing the queue with given arguments
    this.elements = [...elements];
  }
  // Proxying the push/shift methods
  push(...args) {
    return this.elements.push(...args);
  }
  shift(...args) {
    return this.elements.shift(...args);
  }
  // Add some length utility methods
  get length() {
    return this.elements.length;
  }
  set length(length) {
    this.elements.length = length;
  }
}

export class WebSocketHandler {
  private socket!: WebSocket;
  private connectionCtx: ConnectionContextType;
  private WS_Packet: any; // Replace 'any' with the actual type of WS_Packet
  private messageHandler: Function;
  private txtInfoCommand: any; // Replace 'any' with the actual type of txtInfoCommand
  private callback: Function;
  private ping_send: any;
  private wait_endsignal: boolean;
  private keep_connection: boolean;

  private is_running: boolean;
  private is_sending: boolean;
  private is_receiving: boolean;
  private is_stopped: boolean;
  private is_buffered: boolean;
  private sendingQueue: Queue;

  public IPDwarf: string | undefined;
  public logic_data: boolean;
  public end_signal: boolean;
  public closeSocketTimer: ReturnType<typeof setInterval> | undefined;
  public closeTimerHandler: Function;
  public onStopTimerHandler: Function;

  constructor(connectionCtx, keep_connection: boolean = false) {
    this.connectionCtx = connectionCtx;
    this.IPDwarf = this.connectionCtx.IPDwarf;

    this.WS_Packet = {};
    this.messageHandler = function () {};
    this.txtInfoCommand = "";
    this.callback = function () {};
    this.logic_data = false;
    this.wait_endsignal = false;

    this.end_signal = true;

    this.closeSocketTimer = undefined;
    this.closeTimerHandler = function () {};
    this.onStopTimerHandler = function () {};

    this.is_running = false;
    this.is_sending = false;
    this.is_receiving = false;
    this.is_stopped = false;
    this.is_buffered = false;
    this.wait_endsignal = false;
    this.sendingQueue = new Queue();

    if (keep_connection) {
      console.debug("keep_connection true");
    }
    if (connectionCtx.socketIPDwarf) {
      console.debug("connectionCtx.socketIPDwarf true");
    }
    if (
      connectionCtx.socketIPDwarf &&
      connectionCtx.socketIPDwarf.readyState === WebSocket.OPEN
    ) {
      console.debug("WebSocket OPEN");
    }
    if (keep_connection) {
      console.debug("keep_connection true");
    }

    this.keep_connection = false;
    if (!keep_connection && connectionCtx.socketIPDwarf) {
      if (connectionCtx.socketIPDwarf.readyState === WebSocket.OPEN) {
        connectionCtx.socketIPDwarf.close();
        console.log("Closing old Websocket: ");
      } else {
        console.log("Old Websocket not opened");
      }
    } else if (
      connectionCtx.socketIPDwarf &&
      connectionCtx.socketIPDwarf.readyState === WebSocket.OPEN
    ) {
      console.log("Keep old Websocket opened");
      this.socket = connectionCtx.socketIPDwarf;
      this.keep_connection = true;
    }

    if (this.keep_connection) {
      console.debug("this.keep_connection true");
    }
  }

  async run() {
    // Check if ipDwarf is defined before calling wsURL
    if (!this.IPDwarf) {
      console.error("IPDwarf is undefined. Unable to create WebSocket.");
      return false;
    }

    await sleep(10);

    if (!this.keep_connection) {
      this.socket = new WebSocket(wsURL(this.IPDwarf));
      this.connectionCtx.setSocketIPDwarf(this.socket);
      console.log("Open new Socket");
    }

    // Need ping command
    this.ping_send = new ping_dwarf(this.socket);

    if (this.keep_connection) {
      // Start manually no open event
      this.start();
    }

    this.socket.onopen = () => {
      // Socket Binary Mode
      this.socket.binaryType = "arraybuffer";

      // Start on the open event
      this.start();
    };

    this.socket.onmessage = async (event) => {
      console.debug("websocket_class : onmessage function...");
      while (this.is_sending || this.is_buffered) {
        await sleep(10);
      }
      console.debug("websocket_class : onmessage function starting...");

      this.is_receiving = true;
      await this.handleMessage(event, this.messageHandler);
      this.is_receiving = false;

      console.debug("websocket_class : onmessage function ending...");
    };

    this.socket.onerror = (message) => {
      this.handleError(message);
      this.cleanup();
    };

    this.socket.onclose = (message) => {
      this.handleClose(message);
      this.cleanup();
    };

    return true;
  }

  start() {
    // Start ping command
    this.ping_send.ping();

    if (this.callback) {
      this.callback(this.txtInfoCommand);
    }

    // start send function
    this.send();

    this.is_running = true;
  }

  stop() {
    this.cleanup();
  }

  async prepare(
    WS_Packet,
    messageHandler,
    txtInfoCommand,
    callback,
    logic_data_init: boolean = false,
    wait_endsignal: boolean = false
  ) {
    console.debug("websocket_class : prepare function...");

    while (this.is_sending || this.is_receiving) {
      await sleep(10);
    }

    console.debug("websocket_class : prepare function starting...");

    this.is_buffered = true;

    this.sendingQueue.push(
      WS_Packet,
      messageHandler,
      txtInfoCommand,
      callback,
      logic_data_init,
      wait_endsignal
    );

    this.WS_Packet = WS_Packet;
    this.messageHandler = messageHandler;
    this.txtInfoCommand = txtInfoCommand;
    this.callback = callback;
    this.logic_data = logic_data_init;
    this.wait_endsignal = wait_endsignal;

    await sleep(10);

    this.is_buffered = false;

    console.debug("websocket_class : prepare function ending...");
  }

  async send() {
    await sleep(250);

    while (!this.is_running) {
      await sleep(10);
    }

    console.debug("websocket_class : send function...");

    this.is_sending = false;

    while (!this.is_stopped) {
      await sleep(10);

      if (
        !this.is_buffered &&
        this.end_signal &&
        this.sendingQueue.length > 0
      ) {
        console.debug("websocket_class : send function starting...");
        this.is_sending = true;

        this.WS_Packet = this.sendingQueue.shift();
        this.messageHandler = this.sendingQueue.shift();
        this.txtInfoCommand = this.sendingQueue.shift();
        this.callback = this.sendingQueue.shift();
        this.logic_data = this.sendingQueue.shift();
        this.wait_endsignal = this.sendingQueue.shift();

        // need waiting end_signal to send again ?
        this.end_signal = !this.wait_endsignal;

        // Send Command:
        socketSend(this.socket, this.WS_Packet);
        console.log(
          `websocket_class : sending buffer = ${Array.prototype.toString.call(
            this.WS_Packet
          )}`
        );
        await sleep(500);

        this.is_sending = false;

        console.debug("websocket_class : send function stoping...");
      }
    }

    this.is_sending = false;

    console.debug("websocket_class : send function ending...");

    /*

    this.WS_Packet = WS_Packet;
    this.messageHandler = messageHandler;
    this.txtInfoCommand = txtInfoCommand;
    this.callback = callback;
    this.logic_data = logic_data_init;
   
*/
  }

  handleMessage(event, messageHandler) {
    // Close Timer if exist
    if (this.closeSocketTimer !== undefined) {
      clearTimeout(this.closeSocketTimer);
      if (this.closeTimerHandler !== undefined) this.closeTimerHandler();
    }
    // it can be a string like an array ??
    let find_real_string_buffer = false;
    if (typeof event.data === "string") {
      // Count the occurrences of commas
      const numberOfCommas = (event.data.match(/,/g) || []).length;

      if (numberOfCommas < 5) {
        console.log("Received: '" + event.data + "'");
        find_real_string_buffer = true;
      } else console.log("Received: a string buffer that matchs a binary one");
    }
    if (!find_real_string_buffer) {
      console.log(" -> Receiving data .....");
      this.connectionCtx.setConnectionStatus(true);
      let decodedmessage = analyzePacket(event.data);
      console.log(decodedmessage);
      let result_data = JSON.parse(decodedmessage);

      // Call the custom message handler
      if (
        messageHandler(result_data, this.txtInfoCommand, this.callback, this)
      ) {
        if (this.callback) {
          this.callback(result_data);
        }
        logger(this.txtInfoCommand, result_data, this.connectionCtx);
      } else {
        logger("", result_data, this.connectionCtx);
      }
    }
  }

  handleError(message) {
    // Stop Timer if exist
    if (this.closeSocketTimer !== undefined) {
      clearTimeout(this.closeSocketTimer);
      if (this.onStopTimerHandler !== undefined) this.onStopTimerHandler();
    }
    // Stop ping command
    this.ping_send.close();
    this.connectionCtx.setConnectionStatus(false);
    if (this.callback) {
      this.callback(message);
    }
    logger(this.txtInfoCommand + "error:", message, this.connectionCtx);
  }

  handleClose(message) {
    // Stop Timer if exist
    if (this.closeSocketTimer !== undefined) {
      clearTimeout(this.closeSocketTimer);
      if (this.onStopTimerHandler !== undefined) this.onStopTimerHandler();
    }
    // Stop ping command
    this.ping_send.close();
    this.connectionCtx.setConnectionStatus(false);
    if (this.callback) {
      this.callback(message);
    }
    logger(this.txtInfoCommand + " close:", message, this.connectionCtx);
  }

  cleanup() {
    console.log(this.txtInfoCommand + " cleanup");
    if (this.closeSocketTimer !== undefined)
      clearTimeout(this.closeSocketTimer);
    this.ping_send.close();
    this.is_stopped = true;
    // Remove event listeners during cleanup
    this.socket.onopen = null;
    this.socket.onmessage = null;
    this.socket.onerror = null;
    this.socket.onclose = null;
  }
}

{
  /*

import { WebSocketHandler } from "@/lib/websocket_class";

// Example usage:
let WS_Packet = messageSetTime();
let txtInfoCommand = "SetTime";

// logic_data_init : initial value of logic_data

const customMessageHandler = (result_data, txtInfoCommand, callback, webSocketHandlerInstance) => {
    // Use webSocketHandlerInstance to access logic_data
    webSocketHandlerInstance.logic_data = 0
    if (result_data.data.code == 0) {
        if (callback) {
            callback("utc date ok");
        } else {
          if (callback) {
            callback("utc date error");
          }
        }
        return true;
    }
    else
        return false;
};

keep_connection = false;

const webSocketHandler = new WebSocketHandler(connectionCtx, keep_connection);

logic_data_init = false;
wait_end_signal = false;

webSocketHandler.prepare(WS_Packet, customMessageHandler, txtInfoCommand, callback, logic_data_init,wait_end_signal);

webSocketHandler.run();

// you can change webSocketHandler.logic_data value (global variable) in customMessageHandler

// if wait_end_signal == true
// set webSocketHandler.end_signal = true to stop before new frames can be sent

// second times
webSocketHandler.prepare(WS_Packet, customMessageHandler, txtInfoCommand, callback, logic_data_init,wait_end_signal);

// if need
webSocketHandler.stop();
*/
}
