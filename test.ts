import { parse as parse_, parseArith } from "./tiny-ts-parser.ts";
import { assertEquals } from "@std/assert";
import { assertThrows } from "@std/assert";
import { typecheck } from "./main.ts";
import type { Term, Type } from "./main.ts";

function parse(input: string): Term {
  return parse_(input) as Term;
}

function genEnv(): Record<string, Type> {
  return {};
}

Deno.test("test typecheck ok", () => {
  assertEquals(
    typecheck(parseArith("true"), genEnv()),
    { tag: "Boolean" },
  );
  assertEquals(
    typecheck(parseArith("false"), genEnv()),
    { tag: "Boolean" },
  );
  assertEquals(
    typecheck(parseArith("42"), genEnv()),
    { tag: "Number" },
  );
  assertEquals(
    typecheck(parseArith("true ? 1 : 2"), genEnv()),
    { tag: "Number" },
  );
  assertEquals(
    typecheck(parseArith("1 + 2"), genEnv()),
    { tag: "Number" },
  );

  assertEquals(
    typecheck(parse("a"), { a: { tag: "Number" } }),
    { tag: "Number" },
  );

  assertEquals(
    typecheck(parse("(x: number) => 1"), genEnv()),
    {
      tag: "Function",
      paramTypes: [{ name: "x", type: { tag: "Number" } }],
      returnType: { tag: "Number" },
    },
  );

  assertEquals(
    typecheck(parse("(x: number) => x"), genEnv()),
    {
      tag: "Function",
      paramTypes: [{ name: "x", type: { tag: "Number" } }],
      returnType: { tag: "Number" },
    },
  );

  assertEquals(
    typecheck(parse("((x: number, y: boolean) => x)(42, false)"), genEnv()),
    { tag: "Number" },
  );

  assertEquals(
    typecheck(parse("((x: number, y: boolean) => x)(42, false)"), genEnv()),
    { tag: "Number" },
  );
});

Deno.test("Add operands test", () => {
  assertThrows(
    () => typecheck(parseArith("1 + true"), genEnv()),
    Error,
    "Both operands of add must be Numbers",
  );
  assertThrows(
    () => typecheck(parseArith("true + 1"), genEnv()),
    Error,
    "Both operands of add must be Numbers",
  );
  assertThrows(
    () => typecheck(parseArith("true + false"), genEnv()),
    Error,
    "Both operands of add must be Numbers",
  );
});

Deno.test("Condition of if must be a Boolean", () => {
  assertThrows(
    () => typecheck(parseArith("1 ? 1 : 2"), genEnv()),
    Error,
    "Condition of if must be a Boolean",
  );
  assertThrows(
    () => typecheck(parseArith("42 ? true : false"), genEnv()),
    Error,
    "Condition of if must be a Boolean",
  );
});

Deno.test("Then and else branches must have the same type", () => {
  assertThrows(
    () => typecheck(parseArith("true ? 1 : false"), genEnv()),
    Error,
    "Then and else branches must have the same type",
  );
  assertThrows(
    () => typecheck(parseArith("false ? true : 42"), genEnv()),
    Error,
    "Then and else branches must have the same type",
  );
});

Deno.test("undefined variable test", () => {
  assertThrows(
    () => typecheck(parse("x"), genEnv()),
    Error,
    "Undefined variable: x",
  );

  assertThrows(
    () => typecheck(parse("((x: number) => 1)(x)"), genEnv()),
    Error,
    "Undefined variable: x",
  );
});

Deno.test("test typecheck complex", () => {
  assertEquals(
    typecheck(parseArith("true ? (1 + 2) : (3 + 4)"), genEnv()),
    { tag: "Number" },
  );
  assertEquals(
    typecheck(parseArith("false ? (true ? 1 : 2) : (false ? 3 : 4)"), genEnv()),
    { tag: "Number" },
  );
  assertThrows(() =>
    typecheck(parseArith("((true : false : true) ? 1 : 2) ? 2 : 3"), genEnv())
  );
});
