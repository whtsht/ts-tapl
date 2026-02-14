import { parse as parse_ } from "./tiny-ts-parser.ts";
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
    typecheck(parse("true"), genEnv()),
    { tag: "Boolean" },
  );
  assertEquals(
    typecheck(parse("false"), genEnv()),
    { tag: "Boolean" },
  );
  assertEquals(
    typecheck(parse("42"), genEnv()),
    { tag: "Number" },
  );
  assertEquals(
    typecheck(parse("true ? 1 : 2"), genEnv()),
    { tag: "Number" },
  );
  assertEquals(
    typecheck(parse("1 + 2"), genEnv()),
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
    () => typecheck(parse("1 + true"), genEnv()),
    Error,
    "Both operands of add must be Numbers",
  );
  assertThrows(
    () => typecheck(parse("true + 1"), genEnv()),
    Error,
    "Both operands of add must be Numbers",
  );
  assertThrows(
    () => typecheck(parse("true + false"), genEnv()),
    Error,
    "Both operands of add must be Numbers",
  );
});

Deno.test("Condition of if must be a Boolean", () => {
  assertThrows(
    () => typecheck(parse("1 ? 1 : 2"), genEnv()),
    Error,
    "Condition of if must be a Boolean",
  );
  assertThrows(
    () => typecheck(parse("42 ? true : false"), genEnv()),
    Error,
    "Condition of if must be a Boolean",
  );
});

Deno.test("Then and else branches must have the same type", () => {
  assertThrows(
    () => typecheck(parse("true ? 1 : false"), genEnv()),
    Error,
    "Then and else branches must have the same type",
  );
  assertThrows(
    () => typecheck(parse("false ? true : 42"), genEnv()),
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
    typecheck(parse("true ? (1 + 2) : (3 + 4)"), genEnv()),
    { tag: "Number" },
  );

  assertEquals(
    typecheck(parse("false ? (true ? 1 : 2) : (false ? 3 : 4)"), genEnv()),
    { tag: "Number" },
  );

  assertThrows(() =>
    typecheck(parse("((true : false : true) ? 1 : 2) ? 2 : 3"), genEnv())
  );

  assertEquals(
    typecheck(
      parse(
        `const add = (x: number, y: number) => x + y;
        const select = (b: boolean, x: number, y: number) => b ? x : y;
        const a = add(1, 2);
        const b = select(true, 42, a);
        b`,
      ),
      genEnv(),
    ),
    { tag: "Number" },
  );

  assertEquals(
    typecheck(
      parse(
      `const a = { x: 1, y: true };
      a.y;`,
      ),
      genEnv(),
    ),
    { tag: "Boolean" },
  );
});
