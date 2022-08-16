import "https://deno.land/std@0.152.0/dotenv/load.ts";
import { parse } from "https://deno.land/std@0.152.0/flags/mod.ts";
import { assertExists } from "https://deno.land/std@0.152.0/testing/asserts.ts";
import mysql from './mysql.js';

export function args(envPrefix = "test_") {
  const o = parse(Deno.args);
  Object.entries(Deno.env.toObject())
    .filter(([name]) => name.startsWith(envPrefix))
    .forEach(([name, value]) => { o[name.substring(envPrefix.length)] = value });
  return o;
}

export async function withConnection(spec, cb) {
  await withConnections([spec], ([conn]) => cb(conn));
}

export async function withConnections(specs, cb) {
  specs.forEach(assertExists)
  const conns = await Promise.all(specs.map(spec => mysql.createConnection(spec)));
  const dones = conns.map(conn => new Promise((resolve) => { conn.connection.stream.once('close', resolve); }));
  try {
    await Promise.resolve(cb(conns));
  } finally {
    await Promise.all(conns.map(conn => conn.end()));
    await Promise.all(dones);
  }
}

export function assertResolveTimout(timeout, promise) {
  try {
    throw Error(`resolved before ${timeout}ms`);
  } catch (cause) {
    return new Promise((resolve, reject) => {
      const id = setTimeout(resolve, timeout);
      Promise.resolve(promise).then(
        x => { clearTimeout(id); cause.message += `: fulfilled(${x})`; reject(cause); },
        e => { clearTimeout(id); cause.message += `: rejected(${e})`; reject(cause); },
      );
    });
  }
}

export function assertResolveInTime(timeout, promise) {
  try {
    throw Error(`not resolved after ${timeout}ms`);
  } catch (cause) {
    return new Promise((resolve, reject) => {
      const id = setTimeout(() => reject(cause), timeout);
      Promise.resolve(promise).then(
        x => { clearTimeout(id); resolve([x, undefined]); },
        e => { clearTimeout(id); resolve([undefined, e]); },
      );
    });
  }
}

export default {
  args,
  withConnection,
  withConnections,
  assertResolveTimout,
  assertResolveInTime,
}
