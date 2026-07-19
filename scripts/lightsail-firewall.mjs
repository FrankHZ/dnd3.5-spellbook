#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const PUBLIC_IPV4_CIDR = "0.0.0.0/0";
const PUBLIC_IPV6_CIDR = "::/0";

function fail(message) {
  throw new Error(message);
}

function requireString(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    fail(`${name} is required`);
  }
  return value;
}

function normalizePort(value, name) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    fail(`${name} must be an integer port`);
  }
  return port;
}

function normalizeStringArray(value) {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    fail("Lightsail CIDR fields must be arrays");
  }
  return [...new Set(value.map((entry) => String(entry)))].sort();
}

function normalizePortInfo(port) {
  return {
    fromPort: normalizePort(port.fromPort, "fromPort"),
    toPort: normalizePort(port.toPort, "toPort"),
    protocol: requireString(port.protocol, "protocol"),
    cidrs: normalizeStringArray(port.cidrs),
    ipv6Cidrs: normalizeStringArray(port.ipv6Cidrs),
    cidrListAliases: normalizeStringArray(port.cidrListAliases),
  };
}

function comparePortInfo(left, right) {
  return (
    left.protocol.localeCompare(right.protocol) ||
    left.fromPort - right.fromPort ||
    left.toPort - right.toPort ||
    left.cidrs.join(",").localeCompare(right.cidrs.join(",")) ||
    left.ipv6Cidrs.join(",").localeCompare(right.ipv6Cidrs.join(",")) ||
    left.cidrListAliases
      .join(",")
      .localeCompare(right.cidrListAliases.join(","))
  );
}

function portEntries(source) {
  if (Array.isArray(source)) {
    return source;
  }
  if (Array.isArray(source?.portStates)) {
    return source.portStates;
  }
  if (Array.isArray(source?.portInfos)) {
    return source.portInfos;
  }
  fail("Expected Lightsail portStates or portInfos JSON");
}

export function normalizeOpenPortInfos(source) {
  return portEntries(source)
    .filter((port) => port.state === undefined || port.state === "open")
    .map(normalizePortInfo)
    .sort(comparePortInfo);
}

function canCarrySsh(portInfo, port) {
  return (
    (portInfo.protocol === "tcp" || portInfo.protocol === "all") &&
    portInfo.fromPort <= port &&
    portInfo.toPort >= port
  );
}

function normalizeRunnerCidr(cidr) {
  const value = requireString(cidr, "runner CIDR");
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/32$/u.exec(value);
  if (!match || match.slice(1).some((octet) => Number(octet) > 255)) {
    fail("runner CIDR must be an IPv4 /32");
  }
  return value;
}

export function assertNoUnrestrictedSsh(source, sshPort) {
  const port = normalizePort(sshPort, "SSH port");
  const unrestricted = normalizeOpenPortInfos(source).some(
    (portInfo) =>
      canCarrySsh(portInfo, port) &&
      (portInfo.cidrs.includes(PUBLIC_IPV4_CIDR) ||
        portInfo.ipv6Cidrs.includes(PUBLIC_IPV6_CIDR)),
  );
  if (unrestricted) {
    fail("Refusing to deploy while SSH is unrestricted on the Lightsail firewall");
  }
}

export function buildAuthorizePayload(source, instanceName, sshPort, runnerCidr) {
  const instance = requireString(instanceName, "instance name");
  const port = normalizePort(sshPort, "SSH port");
  const cidr = normalizeRunnerCidr(runnerCidr);
  assertNoUnrestrictedSsh(source, port);

  let matched = false;
  const portInfos = normalizeOpenPortInfos(source).map((portInfo) => {
    if (!canCarrySsh(portInfo, port)) {
      return portInfo;
    }
    matched = true;
    return {
      ...portInfo,
      cidrs: [...new Set([...portInfo.cidrs, cidr])].sort(),
    };
  });

  if (!matched) {
    portInfos.push({
      fromPort: port,
      toPort: port,
      protocol: "tcp",
      cidrs: [cidr],
      ipv6Cidrs: [],
      cidrListAliases: [],
    });
  }

  return { instanceName: instance, portInfos: portInfos.sort(comparePortInfo) };
}

export function buildRestorePayload(source, instanceName) {
  return {
    instanceName: requireString(instanceName, "instance name"),
    portInfos: normalizeOpenPortInfos(source),
  };
}

export function assertPortInfosMatch(actual, expectedPayload) {
  const expected = normalizeOpenPortInfos(expectedPayload);
  const actualPortInfos = normalizeOpenPortInfos(actual);
  const expectedJson = JSON.stringify(expected);
  const actualJson = JSON.stringify(actualPortInfos);
  if (actualJson !== expectedJson) {
    fail(`Lightsail port state mismatch\nexpected ${expectedJson}\nactual   ${actualJson}`);
  }
}

export function assertRunnerAuthorized(actual, expectedPayload, sshPort, runnerCidr) {
  assertPortInfosMatch(actual, expectedPayload);
  const port = normalizePort(sshPort, "SSH port");
  const cidr = normalizeRunnerCidr(runnerCidr);
  assertNoUnrestrictedSsh(actual, port);
  const authorized = normalizeOpenPortInfos(actual).some(
    (portInfo) => canCarrySsh(portInfo, port) && portInfo.cidrs.includes(cidr),
  );
  if (!authorized) {
    fail("Runner CIDR was not present in the Lightsail SSH rule after update");
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index];
    if (!entry.startsWith("--")) {
      fail(`Unexpected argument ${entry}`);
    }
    const key = entry.slice(2);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      fail(`Missing value for --${key}`);
    }
    args[key] = value;
    index += 1;
  }
  return args;
}

function requiredArg(args, name) {
  return requireString(args[name], `--${name}`);
}

function runCli() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  switch (command) {
    case "authorize": {
      const payload = buildAuthorizePayload(
        readJson(requiredArg(args, "input")),
        requiredArg(args, "instance"),
        requiredArg(args, "port"),
        requiredArg(args, "cidr"),
      );
      writeJson(requiredArg(args, "output"), payload);
      return;
    }
    case "restore": {
      const payload = buildRestorePayload(
        readJson(requiredArg(args, "input")),
        requiredArg(args, "instance"),
      );
      writeJson(requiredArg(args, "output"), payload);
      return;
    }
    case "verify-authorized": {
      assertRunnerAuthorized(
        readJson(requiredArg(args, "actual")),
        readJson(requiredArg(args, "expected")),
        requiredArg(args, "port"),
        requiredArg(args, "cidr"),
      );
      return;
    }
    case "verify-restored": {
      assertPortInfosMatch(
        readJson(requiredArg(args, "actual")),
        readJson(requiredArg(args, "expected")),
      );
      return;
    }
    default:
      fail("Usage: lightsail-firewall.mjs authorize|restore|verify-authorized|verify-restored");
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    runCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
