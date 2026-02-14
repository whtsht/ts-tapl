export type Term =
  | { tag: "true" }
  | { tag: "false" }
  | { tag: "number"; n: number }
  | { tag: "if"; cond: Term; thn: Term; els: Term }
  | { tag: "add"; left: Term; right: Term }
  | { tag: "var"; name: string }
  | { tag: "func"; params: Param[]; body: Term }
  | { tag: "call"; func: Term; args: Term[] }
  | { tag: "seq"; body: Term; rest: Term }
  | { tag: "const"; name: string; value: Term };

export type Type =
  | { tag: "Boolean" }
  | { tag: "Number" }
  | { tag: "Function"; paramTypes: Param[]; returnType: Type };

export type Param = { name: string; type: Type };

export function typeEquql(t1: Type, t2: Type): boolean {
  switch (t1.tag) {
    case "Boolean":
    case "Number":
      return t1.tag === t2.tag;
    case "Function":
      if (t2.tag !== "Function") {
        return false;
      }
      if (t1.paramTypes.length !== t2.paramTypes.length) {
        return false;
      }
      for (let i = 0; i < t1.paramTypes.length; i++) {
        if (!typeEquql(t1.paramTypes[i].type, t2.paramTypes[i].type)) {
          return false;
        }
      }
      return typeEquql(t1.returnType, t2.returnType);
    default:
      throw new Error("not yet implemented");
  }
}

type typeEnv = Record<string, Type>;

export function typecheck(term: Term, env: typeEnv): Type {
  switch (term.tag) {
    case "true":
    case "false":
      return { tag: "Boolean" };
    case "number":
      return { tag: "Number" };
    case "if": {
      const condType = typecheck(term.cond, env);
      if (condType.tag !== "Boolean") {
        throw new Error("Condition of if must be a Boolean");
      }
      const thnType = typecheck(term.thn, env);
      const elsType = typecheck(term.els, env);
      if (thnType.tag !== elsType.tag) {
        throw new Error("Then and else branches must have the same type");
      }
      return thnType;
    }
    case "add": {
      const leftType = typecheck(term.left, env);
      const rightType = typecheck(term.right, env);
      if (leftType.tag !== "Number" || rightType.tag !== "Number") {
        throw new Error("Both operands of add must be Numbers");
      }
      return { tag: "Number" };
    }
    case "var":
      if (!(term.name in env)) {
        throw new Error(`Undefined variable: ${term.name}`);
      }
      return env[term.name];
    case "func": {
      const newEnv = { ...env };
      for (const param of term.params) {
        newEnv[param.name] = param.type;
      }
      const returnType = typecheck(term.body, newEnv);

      return { tag: "Function", paramTypes: term.params, returnType };
    }
    case "call": {
      const funcType = typecheck(term.func, env);
      if (funcType.tag !== "Function") {
        throw new Error("Can only call functions");
      }
      if (funcType.paramTypes.length !== term.args.length) {
        throw new Error("Argument count mismatch");
      }
      for (let i = 0; i < term.args.length; i++) {
        const argType = typecheck(term.args[i], env);
        if (!typeEquql(argType, funcType.paramTypes[i].type)) {
          throw new Error(
            `Argument type mismatch for parameter ${
              funcType.paramTypes[i].name
            }`,
          );
        }
      }
      return funcType.returnType;
    }
    default:
      throw new Error(`Unknown term tag: ${term.tag}`);
  }
}
