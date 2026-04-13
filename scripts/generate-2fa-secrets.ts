import { generateSecret, generateURI } from "otplib";

function buildOtpauthUri(label: string, secret: string) {
  return generateURI({
    issuer: "FOGATTA",
    label,
    secret,
  });
}

function printAccountConfig(account: "admin" | "editor", username: string) {
  const secret = generateSecret();
  const label = `${username}-${account}`;
  const uri = buildOtpauthUri(label, secret);

  const envName = account === "admin" ? "ADMIN_2FA_SECRET" : "EDITOR_2FA_SECRET";

  console.log("");
  console.log(account.toUpperCase());
  console.log(`${envName}=${secret}`);
  console.log(`otpauth=${uri}`);
}

const adminUser = process.env.ADMIN_USERNAME?.trim() || "admin";
const editorUser = process.env.EDITOR_USERNAME?.trim() || "editor";

console.log("Generador 2FA TOTP para FOGATTA");
printAccountConfig("admin", adminUser);
printAccountConfig("editor", editorUser);
console.log("\nGuarda los secretos en tu entorno de produccion y escanea cada otpauth en tu app autenticadora.");
