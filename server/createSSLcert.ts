////////////////////////////////////////////////////////////////////////////
// Create Self SIGNED SSL certificates to use with Dwarfium Server and Proxy
////////////////////////////////////////////////////////////////////////////

import { exec } from "child_process";
import * as https from "https";
const fs = require("fs");
const path = require("path");
const os = require("os");
import * as forge from "node-forge";

const INSTALL_DIR = process.argv[2] || "./";
let DWARFIUM_CN_NAME = path.basename(process.cwd());
console.log(DWARFIUM_CN_NAME);
// "Dwarfium" or DwarfiumServer
if (DWARFIUM_CN_NAME != "DwarfiumServer") {
  DWARFIUM_CN_NAME = `Dwarfium`;
}
console.log(DWARFIUM_CN_NAME);

const USE_CLIENT_CERTIFICATE = false; // if need set USE_CLIENT_CERTIFICATE to true

if (!fs.existsSync(INSTALL_DIR)) {
  fs.mkdirSync(INSTALL_DIR, { recursive: true });
}

function getLocalIPAddress(): string[] {
  const interfaces = os.networkInterfaces();
  let localIPs: string[] = [];

  for (const key in interfaces) {
    const iface = interfaces[key];

    if (Array.isArray(iface)) {
      for (const entry of iface) {
        if (entry.family === "IPv4" && !entry.internal) {
          localIPs.push(entry.address);
        }
      }
    }
  }

  // Sort the IPs: 192.x.x.x first, others next, 127.0.0.1 last
  localIPs = localIPs.sort((a, b) => {
    if (a.startsWith("192.") && !b.startsWith("192.")) return -1; // 192.x first
    if (!a.startsWith("192.") && b.startsWith("192.")) return 1;
    if (a === "127.0.0.1") return 1; // 127.0.0.1 always last
    if (b === "127.0.0.1") return -1;
    return a.localeCompare(b); // Otherwise, sort numerically
  });

  return localIPs;
}

// Get External IPv4 Address
async function getExternalIPv4(): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get("https://api.ipify.org/?format=json", (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(data).ip);
          } catch (error) {
            reject("Error parsing external IP response");
          }
        });
      })
      .on("error", (err) => {
        reject("Error fetching external IP: " + err.message);
      });
  });
}

import readline from "readline";

// Function to prompt user confirmation
function promptUser(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(question + " (yes/no): ", (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "yes");
    });
  });
}

const caCertPath = path.join(INSTALL_DIR, "CADwarfiumCert.pem");
const caKeyPath = path.join(INSTALL_DIR, "CADwarfiumKey.pem");

console.log(
  "Create Self SIGNED SSL certificates to use with Dwarfium Server and Proxy",
);

async function ensureSSLCACertificates(): Promise<{
  key: string;
  cert: string;
}> {
  if (!fs.existsSync(caKeyPath) || !fs.existsSync(caCertPath)) {
    console.log("⚠️  CA Certificate is missing.");
    console.log(
      "🚨 WARNING: If you proceed, a **NEW Root CA** will be generated!",
    );
    console.log(
      "⚠️  This may cause issues if other services rely on an existing CA.",
    );

    // Pause and ask for confirmation
    const confirm = await promptUser("Do you want to create a new Root CA?");
    if (!confirm) {
      console.log("❌ Operation canceled. Please copy the CA manually.");
      process.exit(1); // Stop execution
    }

    console.log("🔒 Generating new SSL CA certificate with node-forge...");
    // Create RSA keys using node-forge
    const pki = forge.pki;
    const keys = pki.rsa.generateKeyPair(4096);
    const cert = pki.createCertificate();

    cert.publicKey = keys.publicKey;
    cert.serialNumber = "01";

    const validityDays = 3650;
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date(
      new Date().getTime() + 1000 * 60 * 60 * 24 * (validityDays ?? 1),
    );

    // Set subject and issuer (self-signed)
    const attrs = [{ name: "commonName", value: "Dwarfium-CA" }];
    console.debug("Certificate attributes:", attrs);

    cert.setSubject(attrs);
    cert.setIssuer(attrs);

    const extensions = [
      {
        name: "basicConstraints",
        cA: true, // ✅ This marks the certificate as a CA
      },
      {
        name: "keyUsage",
        critical: true,
        digitalSignature: true,
        keyCertSign: true, // ✅ Allows signing certificates
        cRLSign: true, // Allows signing certificate revocation lists (optional)
      },
    ];
    console.debug("Extensions:", extensions);

    cert.setExtensions(extensions);
    console.debug("setExtensions");

    // Sign the certificate with the private key
    const md = forge.md.sha256.create(); // Force SHA-256
    cert.sign(keys.privateKey, md);

    // PEM encode the certificate and private key
    const pemCert = pki.certificateToPem(cert);

    //const pemKey = pki.privateKeyToPem(keys.privateKey);
    const pemKeyASN1 = pki.privateKeyToAsn1(keys.privateKey);
    // wrap an pemKeyASN1 ASN.1 object in a PKCS#8 ASN.1 PrivateKeyInfo
    const privateKeyInfo = pki.wrapRsaPrivateKey(pemKeyASN1);
    // convert a PKCS#8 ASN.1 PrivateKeyInfo to PEM
    var pemKey = pki.privateKeyInfoToPem(privateKeyInfo);

    // Save the generated certificate and key
    fs.writeFileSync(caCertPath, pemCert);
    fs.writeFileSync(caKeyPath, pemKey);

    console.log("✅ Certificate generated with node-forge!");

    return {
      key: pemKey,
      cert: pemCert,
    };
  } else {
    console.log("🔑 SSL CA certificate already exists.");
    return {
      key: fs.readFileSync(caKeyPath, "utf-8"),
      cert: fs.readFileSync(caCertPath, "utf-8"),
    };
  }
}

const certPath = path.join(INSTALL_DIR, `${DWARFIUM_CN_NAME}Cert.pem`);
const keyPath = path.join(INSTALL_DIR, `${DWARFIUM_CN_NAME}Key.pem`);

async function ensureSSLCertificates(
  rootCAKeys,
  rootCACert,
  commonName,
): Promise<{ key: string; cert: string }> {
  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.log("🔒 Generating SSL certificate with node-forge...");
    console.log("using CA SSL Certificates:", {
      rootCAKeys,
      rootCACert,
      commonName,
    });
    // Create RSA keys using node-forge
    const pki = forge.pki;
    const keys = pki.rsa.generateKeyPair(4096);
    const cert = pki.createCertificate();

    cert.publicKey = keys.publicKey;
    cert.serialNumber = new Date().getTime().toString();

    const validityDays = 730;
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date(
      new Date().getTime() + 1000 * 60 * 60 * 24 * (validityDays ?? 1),
    );

    // Set subject and issuer (self-signed)
    const attrs = [{ name: "commonName", value: commonName }];
    console.debug("Certificate attributes:", attrs);

    // Parse the CA certificate
    const CACert = forge.pki.certificateFromPem(rootCACert);

    cert.setSubject(attrs);
    cert.setIssuer(CACert.subject.attributes); // Issued by CA);

    // Fetch all IPs
    const localIPs = getLocalIPAddress();
    const externalIP = await getExternalIPv4();
    const allIPs = [...localIPs, externalIP].filter(Boolean);

    console.debug("All IPs:", allIPs);

    const altNames = [
      { type: 2, value: "localhost" }, // DNS name
      { type: 7, ip: "127.0.0.1" }, // Localhost IP
      ...allIPs.map((ip) => ({ type: 7, ip })), // Other IPs
    ];

    console.log("altNames:", altNames);
    const extensions = [
      {
        name: "basicConstraints",
        cA: false,
      },
      {
        name: "keyUsage",
        digitalSignature: true,
        keyEncipherment: true,
      },
      {
        name: "subjectAltName",
        altNames: altNames, // Keeps the existing altNames for IP support
      },
    ];
    console.log("Extensions:", extensions);

    cert.setExtensions(extensions);
    console.debug("setExtensions");

    // Sign the certificate with the private key
    const md = forge.md.sha256.create(); // Force SHA-256
    cert.sign(pki.privateKeyFromPem(rootCAKeys), md);

    // PEM encode the certificate and private key
    const pemCert = pki.certificateToPem(cert);

    //const pemKey = pki.privateKeyToPem(keys.privateKey);
    const pemKeyASN1 = pki.privateKeyToAsn1(keys.privateKey);
    // wrap an pemKeyASN1 ASN.1 object in a PKCS#8 ASN.1 PrivateKeyInfo
    const privateKeyInfo = pki.wrapRsaPrivateKey(pemKeyASN1);
    // convert a PKCS#8 ASN.1 PrivateKeyInfo to PEM
    var pemKey = pki.privateKeyInfoToPem(privateKeyInfo);

    // Save the generated certificate and key
    fs.writeFileSync(certPath, pemCert);
    fs.writeFileSync(keyPath, pemKey);

    console.log("✅ Certificate generated with node-forge!");

    return {
      key: pemKey,
      cert: pemCert,
    };
  } else {
    console.log("🔑 SSL certificate already exists.");
    return {
      key: fs.readFileSync(keyPath, "utf-8"),
      cert: fs.readFileSync(certPath, "utf-8"),
    };
  }
}

const clientKeyPath = path.join(INSTALL_DIR, "clientDwarfiumKey.pem");
const clientCertPath = path.join(INSTALL_DIR, "clientDwarfiumCert.pem");
const clientP12Path = path.join(INSTALL_DIR, "clientDwarfiumCert.p12");

async function createClientCertificate(rootCAKeys, rootCACert) {
  if (
    !fs.existsSync(clientKeyPath) ||
    !fs.existsSync(clientCertPath) ||
    !fs.existsSync(clientP12Path)
  ) {
    const pki = forge.pki;
    const clientKey = pki.rsa.generateKeyPair(2048);

    // Generate a client certificate
    const clientCert = pki.createCertificate();
    clientCert.publicKey = clientKey.publicKey;
    clientCert.serialNumber = "02";

    const validityDays = 730;
    clientCert.validity.notBefore = new Date();
    clientCert.validity.notAfter = new Date(
      new Date().getTime() + 1000 * 60 * 60 * 24 * (validityDays ?? 1),
    );

    const attrs = [
      { name: "commonName", value: "Dwarfium Client Certificate" },
      { name: "organizationName", value: "Dwarfium" },
    ];
    clientCert.setSubject(attrs);
    clientCert.setIssuer(pki.certificateFromPem(rootCACert).subject.attributes);
    clientCert.sign(
      pki.privateKeyFromPem(rootCAKeys),
      forge.md.sha256.create(),
    );

    const pemClientCert = pki.certificateToPem(clientCert);
    const pemClientKey = pki.privateKeyToPem(clientKey.privateKey);

    // Save the generated client certificate and key

    fs.writeFileSync(clientCertPath, pemClientCert);
    fs.writeFileSync(clientKeyPath, pemClientKey);

    console.log("✅ Client Certificate generated with node-forge!");

    // Optionally export to .p12 format (for installation on client machine)
    const pkcs12Asn1 = forge.pkcs12.toPkcs12Asn1(
      clientKey.privateKey,
      clientCert,
      "password",
    );
    const pkcs12Der = forge.asn1.toDer(pkcs12Asn1).getBytes();

    fs.writeFileSync(clientP12Path, pkcs12Der, "binary");

    return {
      clientKey: pemClientKey,
      clientCert: pemClientCert,
      pkcs12: pkcs12Der,
    };
  } else {
    console.log("🔑 SSL Client certificate already exists.");
    return {
      clientKey: fs.readFileSync(clientKeyPath, "utf-8"),
      clientCert: fs.readFileSync(clientCertPath, "utf-8"),
      pkcs12: fs.readFileSync(clientP12Path),
    };
  }
}

// Create The certificats if SSL certificates exist
async function main() {
  try {
    const rootCAOptions = await ensureSSLCACertificates();
    console.log("SSL Certificates loaded successfully:", {
      rootCAOptions,
    });

    const commonName = `${DWARFIUM_CN_NAME}`;

    console.log("SSL Certificates for :", commonName);
    const httpsOptions = await ensureSSLCertificates(
      rootCAOptions.key,
      rootCAOptions.cert,
      commonName,
    );
    console.log("SSL Certificates loaded successfully:", httpsOptions);

    if (USE_CLIENT_CERTIFICATE) {
      const clientCertData = await createClientCertificate(
        rootCAOptions.key,
        rootCAOptions.cert,
      );
      console.log("Client Certificate loaded:", clientCertData);
    }

    // Installation Procedure
    console.log("Creating Installation Procedure Script...");
    const commonNameCert = `${commonName}Cert.pem`;

    const launcherScriptWindows = USE_CLIENT_CERTIFICATE
      ? `
        @echo on
        powershell -Command "& { Get-ChildItem -Path Cert:\\CurrentUser\\Root\\ | Where-Object {$_.Subject -like '*Dwarfium*'} | ForEach-Object { Remove-Item -Path $_.PSPath -Force }}"
        powershell -Command "& { Get-ChildItem -Path Cert:\\CurrentUser\\My\\ | Where-Object {$_.Subject -like '*Dwarfium*'} | ForEach-Object { Remove-Item -Path $_.PSPath -Force }}"
        powershell -Command "& Import-Certificate -FilePath 'CADwarfiumCert.pem' -CertStoreLocation Cert:\\CurrentUser\\Root"
        powershell -Command "& Import-PfxCertificate -FilePath 'clientDwarfiumCert.p12' -CertStoreLocation Cert:\\CurrentUser\\My -Password (ConvertTo-SecureString -String 'password' -AsPlainText -Force)"
        echo Dwarfium Certificates and Client Certificate have been Installed, You need to restart your browser, to take effect.
        pause
        exit
    `
      : `
        @echo on
        powershell -Command "& { Get-ChildItem -Path Cert:\\CurrentUser\\Root\\ | Where-Object {$_.Subject -like '*Dwarfium*'} | ForEach-Object { Remove-Item -Path $_.PSPath -Force }}"
        powershell -Command "& { Get-ChildItem -Path Cert:\\CurrentUser\\My\\ | Where-Object {$_.Subject -like '*${commonName}'} | ForEach-Object { Remove-Item -Path $_.PSPath -Force }}"
        powershell -Command "& Import-Certificate -FilePath 'CADwarfiumCert.pem' -CertStoreLocation Cert:\\CurrentUser\\Root"
        powershell -Command "& Import-Certificate -FilePath '${commonNameCert}' -CertStoreLocation Cert:\\CurrentUser\\My"
        echo Dwarfium Certificates have been Installed, You need to restart your browser, to take effect.
        pause
        exit
    `;

    const launcherScriptLinuxMac = USE_CLIENT_CERTIFICATE
      ? `
        #!/bin/bash

        # Ensure script exits on error
        set -e

        CERT_PATH="./DwarfiumCert.pem"
        CLIENT_CERT_PATH="./clientDwarfiumCert.pem"
        CLIENT_KEY_PATH="./clientDwarfiumKey.pem"
        CLIENT_P12_PATH="./clientDwarfiumCert.p12"

        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo cp "$CERT_PATH" /usr/local/share/ca-certificates/
            sudo cp "$CLIENT_CERT_PATH" /usr/local/share/ca-certificates/
            sudo cp "$CLIENT_KEY_PATH" /etc/ssl/private/
            sudo update-ca-certificates
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "$CERT_PATH"
            sudo security import "$CLIENT_P12_PATH" -k /Library/Keychains/System.keychain
        
        fi

        echo Dwarfium Certificates and Client Certificate have been Installed, You need to restart your browser, to take effect.
    `
      : `
        #!/bin/bash

        # Ensure script exits on error
        set -e

        ROOT_CERT_PATH="./CADwarfiumCert.pem"
        CERT_PATH="./${commonNameCert}"
        

        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo cp "$ROOT_CERT_PATH" /usr/local/share/ca-certificates/
            sudo update-ca-certificates
            # Install Server Certificate for server-side usage
            sudo cp "$CERT_PATH" /etc/ssl/certs/
            sudo update-ca-certificates
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "$ROOT_CERT_PATH"
            # Install Server Certificate for server-side usage
            sudo cp "$CERT_PATH" /usr/local/share/ca-certificates/
        
        fi

        echo Dwarfium Certificates have been Installed, You need to restart your browser, to take effect.
    `;

    const platform = process.platform;
    let scriptPath;

    if (platform == "win32") {
      scriptPath = path.join(INSTALL_DIR, "install_SSL_certificates.bat");
      fs.writeFileSync(
        path.join(INSTALL_DIR, "install_SSL_certificates.bat"),
        launcherScriptWindows,
        { mode: 0o755 },
      );
    } else {
      scriptPath = path.join(INSTALL_DIR, "install_SSL_certificates.sh");
      fs.writeFileSync(
        path.join(INSTALL_DIR, "install_SSL_certificates.sh"),
        launcherScriptLinuxMac,
        { mode: 0o755 },
      );
    }

    console.log("The install script has been created");

    console.log("Starting the install script...");

    if (platform === "win32") {
      exec(`start /D "${INSTALL_DIR}" install_SSL_certificates.bat`);
    } else {
      exec(`chmod +x "${scriptPath}" && bash "${scriptPath}"`);
    }
  } catch (error) {
    console.error("Error loading SSL Certificates:", error);
  }
}

// Call the main function to run everything
main();
