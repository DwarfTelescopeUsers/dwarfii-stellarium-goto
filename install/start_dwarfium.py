import importlib.util
import subprocess
import os
import sys
import socket
import ssl
import ast
import re

package_name = "flask"

if importlib.util.find_spec(package_name) is None:
    print(f"{package_name} is not installed. Installing now...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", package_name])

from flask import Flask, request, jsonify, send_from_directory, abort
# Create a Flask app, serving static files from the current directory
app = Flask(__name__, static_folder=os.getcwd())


def parse_ble_helper_output(output):
    result = None
    for line in output.splitlines():
        object_start = line.find("{")
        object_end = line.rfind("}")
        if object_start < 0 or object_end <= object_start:
            continue

        value = line[object_start:object_end + 1]
        value = re.sub(r"BLEDevice\(([^)]+)\)", lambda match: repr(match.group(1)), value)
        try:
            parsed = ast.literal_eval(value)
            if isinstance(parsed, dict):
                result = parsed
        except (SyntaxError, ValueError):
            continue
    return result


def ble_device_names(devices):
    names = []
    for device in devices or []:
        match = re.search(r"(DWARF(?:3|_mini|II)?_[A-Za-z0-9]+)", str(device), re.IGNORECASE)
        if match:
            names.append(match.group(1))
    return names

# Function to get local IP addresses
def get_local_ip_addresses():
    local_ips = []
    hostname = socket.gethostname()

    # Get all network interfaces
    for ip in socket.getaddrinfo(hostname, None):
        ip_address = ip[4][0]
        if ip_address.startswith("192.") or ip_address.startswith("100.") or ip_address.startswith("10.") or ip_address.startswith("172.") or ip_address == "127.0.0.1":
            local_ips.append(ip_address)

    return local_ips

# API endpoint to check if running
@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "Proxy is running"}), 200

# API endpoint to check if a BLE program is here
@app.route('/run-ble-health', methods=['GET'])
def run_ble_health():
    # Define the base name of the executable (without extension)
    extern_path = os.path.abspath(os.path.join(".", "extern"))
    exe_name = "connect_bluetooth"

    # Determine the correct file extension
    if sys.platform == "win32":
        exe_path = os.path.join(extern_path, exe_name + ".exe")
    else:
        exe_path = os.path.join(extern_path, exe_name)  # No .exe on Linux/macOS

    # Check if both the directory and the executable file exist
    if os.path.exists(extern_path) and os.path.exists(exe_path):
        return jsonify({"status": "Executable found"}), 200

    return jsonify({"error": "Executable not found"}), 404

# API endpoint to execute ble program with parameters
@app.route('/run-ble', methods=['POST'])
def run_ble():
    try:
        data = request.get_json() or {}  # Ensure request body is a dictionary
        ble_psd = data.get("ble_psd", "DWARF_12345678")
        ble_STA_ssid = data.get("ble_STA_ssid", "")
        ble_STA_pwd = data.get("ble_STA_pwd", "")
        auto_select = data.get("auto_select", "0")  # Default value as string

        # Define the base name of the executable (without extension)
        extern_path = os.path.abspath(os.path.join(".","extern"))
        exe_name = "connect_bluetooth"

        # Determine the correct file extension
        if sys.platform == "win32":
            exe_path = os.path.join(extern_path, exe_name + ".exe")
        else:
            exe_path = os.path.join(extern_path, exe_name)  # No .exe on Linux/macOS

        command_line = [
            exe_path,
            "--psd", ble_psd,
            "--ssid", ble_STA_ssid,
            "--pwd", ble_STA_pwd,
            "--select", str(auto_select),
            "--cmd"
        ]

        # Ensure correct execution format for Linux/macOS
        if sys.platform != "win32":
            exe_path = "./" + exe_path.replace("\\", "/")  # Convert Windows-style paths if needed

        # Run the executable with parameters
        process = subprocess.run(
            command_line,
            cwd=extern_path,
            capture_output=True,
            text=True,
            timeout=115,
        )

        # Debugging: Check process output
        print("Process Output:", process.stdout)
        print("Process Errors:", process.stderr)

        if process.returncode != 0:
            return jsonify({"error": f"Process failed: {process.stderr}"}), 500

        result = parse_ble_helper_output(process.stderr)
        if not result:
            return jsonify({"error": "Bluetooth helper returned no structured result"}), 500

        if result.get("step") == "1" and not result.get("dwarf_devices"):
            return "", 204

        if result.get("step") == "3" and len(result.get("dwarf_devices") or []) > 1:
            return jsonify({
                "message": "Multiple devices found, user selection needed",
                "devices": ble_device_names(result.get("dwarf_devices")),
            }), 202

        if result.get("step") == "4":
            payload = {
                "dwarfIp": result.get("ip_address"),
                "dwarfId": result.get("device_dwarf_id"),
                "details": result,
            }
            return jsonify(payload), 200 if result.get("is_connected") else 401

        return jsonify({
            "error": "Bluetooth helper returned an unexpected result",
            "details": result,
        }), 500

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# API endpoint to check if a program is here
@app.route('/stellarium-config-health', methods=['GET'])
def stellarium_config_health():
    # Define the base name of the executable
    extern_path = os.path.abspath(".")
    exe_name = "stellarium_auto_config"
    exe_full_name = exe_name + ".exe" if sys.platform == "win32" else exe_name

    exe_path = os.path.join(extern_path, exe_full_name)

    # Check if the executable file exist
    if os.path.exists(exe_path):
        urlExe = "/stellarium-config-exe"
        return jsonify({"status": "Executable found", "data": urlExe}), 200

    return jsonify({"error": "Executable not found"}), 404

# API endpoint to execute a program with parameters
@app.route('/stellarium-config-exe', methods=['GET'])
def stellarium_config_exe():
    try:

        # Define the base name of the executable
        install_path = os.path.abspath(".")
        exe_name = "stellarium_auto_config"
        exe_full_name = exe_name + ".exe" if sys.platform == "win32" else exe_name

        exe_path = os.path.join(install_path, exe_full_name)


        # Ensure correct execution format for Linux/macOS
        if sys.platform != "win32":
            exe_path = "./" + exe_path.replace("\\", "/")  # Convert Windows-style paths if needed

        process = subprocess.Popen(
            [exe_path], 
            cwd=install_path,
            shell=(sys.platform != "win32"),  # Use shell only on non-Windows platforms
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True  # Ensures the output is treated as text instead of bytes
        )

        stdout_data, stderr_data = process.communicate()

        if process.returncode == 0:
            print("Process exited successfully:", stdout_data)
            return jsonify({"message": "Process completed", "output": stdout_data}), 200
        else:
            print("Process exited with error:", stderr_data)
            return jsonify({"error": "Process failed", "details": stderr_data}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Serve static files and redirect unknown routes to index.html (for frontend routing
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_static(path):
    #  If the requested path is an API route, return 404 instead of redirecting
    if path == "health" or path == "run-ble-health" or path == "run-ble" or path =="stellarium-config-health" or path =="stellarium-config-exe":
        return jsonify({"error": "Not Found"}), 404

    full_path = os.path.join(app.static_folder, path)

    # If the path is a directory, serve the index.html inside it
    if os.path.isdir(full_path):
        return send_from_directory(full_path, "index.html")

    # If the file exists, serve it normally
    if os.path.exists(full_path):
        return send_from_directory(app.static_folder, path)

    # Missing build assets must be reported as missing, not silently returned
    # as HTML (which the browser then rejects as a JavaScript MIME error).
    if path.startswith("_next/") or "." in os.path.basename(path):
        abort(404)

    # Otherwise, redirect to index.html for frontend routing (SPA)
    return send_from_directory(app.static_folder, "index.html")

# Start the Flask server on port 8000
if __name__ == '__main__':
    ca_file = 'CADwarfiumCert.pem'

    # Certificate and key must come from the same pair. Older ZIP releases
    # used the Server-prefixed names; keep those installations upgradeable.
    certificate_pair = next(
        ((cert, key) for cert, key in (
            ('DwarfiumCert.pem', 'DwarfiumKey.pem'),
            ('DwarfiumServerCert.pem', 'DwarfiumServerKey.pem'),
        ) if os.path.exists(cert) and os.path.exists(key)),
        None,
    )

    if certificate_pair:
        cert_file, key_file = certificate_pair
        print(f"Using certificate: {cert_file} and key: {key_file}")

        ssl_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
        ssl_context.load_cert_chain(certfile=cert_file, keyfile=key_file)

        if os.path.exists(ca_file):
            print("Using CA certificate for additional security")
            ssl_context.load_verify_locations(cafile=ca_file)  # Load CA

        print("Starting Dwarfium HTTPS server on port 8000")
        app.run(host='0.0.0.0', port=8000, ssl_context=ssl_context)
    else:
        print("Starting Dwarfium HTTP server on port 8000")
        app.run(host='0.0.0.0', port=8000)
