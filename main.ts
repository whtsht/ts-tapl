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
  | { tag: "const"; name: string; init: Term; rest: Term }
  | { tag: "objectNew"; props: Prop[] }
  | { tag: "objectGet"; obj: Term; propName: string }
  | {
    tag: "recFunc";
    funcName: string;
    params: Param[];
    retType: Type;
    body: Term;
    rest: Term;
  };

type Prop = { name: string; term: Term };

export type Type =
  | { tag: "Boolean" }
  | { tag: "Number" }
  | { tag: "Func"; params: Param[]; retType: Type }
  | { tag: "Object"; props: PropType[] }
  | { tag: "TypeVar"; name: string }
  | { tag: "Rec"; name: string; type: Type };

export type Param = { name: string; type: Type };
export type PropType = { name: string; type: Type };

export function typeEquql(t1: Type, t2: Type): boolean {
  return typeEqSub(t1, t2, []);
}

export function subtype(t1: Type, t2: Type): boolean {
  switch (t1.tag) {
    case "Boolean":
    case "Number":
      return t1.tag === t2.tag;
    case "Func":
      if (t2.tag !== "Func") {
        return false;
      }
      if (t1.params.length !== t2.params.length) {
        return false;
      }
      for (let i = 0; i < t1.params.length; i++) {
        if (!subtype(t2.params[i].type, t1.params[i].type)) {
          return false;
        }
      }
      if (!subtype(t1.retType, t2.retType)) {
        return false;
      }
      return true;
    case "Object":
      if (t2.tag !== "Object") {
        return false;
      }
      for (const prop2 of t2.props) {
        const prop1 = t1.props.find((p) => p.name === prop2.name);
        if (!prop1 || !subtype(prop1.type, prop2.type)) {
          return false;
        }
      }
      return true;
    default:
      throw new Error("not yet implemented");
  }
}

export function typeEquqlNaive(
  t1: Type,
  t2: Type,
  map: Record<string, string>,
): boolean {
  switch (t1.tag) {
    case "Boolean":
    case "Number":
      return t1.tag === t2.tag;
    case "Func": {
      if (t2.tag !== "Func") {
        return false;
      }
      if (t1.params.length !== t2.params.length) {
        return false;
      }
      for (let i = 0; i < t1.params.length; i++) {
        if (!typeEquqlNaive(t1.params[i].type, t2.params[i].type, map)) {
          return false;
        }
      }
      return typeEquqlNaive(t1.retType, t2.retType, map);
    }
    case "Object": {
      if (t2.tag !== "Object") {
        return false;
      }
      if (t1.props.length !== t2.props.length) {
        return false;
      }
      for (let i = 0; i < t1.props.length; i++) {
        const prop1 = t1.props[i];
        const prop2 = t2.props.find((p) => p.name === prop1.name);
        if (!prop2 || !typeEquqlNaive(prop1.type, prop2.type, map)) {
          return false;
        }
      }
      return true;
    }
    case "TypeVar": {
      if (t2.tag !== "TypeVar") {
        return false;
      }
      return map[t1.name] === t2.name;
    }
    case "Rec": {
      if (t2.tag !== "Rec") {
        return false;
      }
      const newMap = { ...map, [t1.name]: t2.name };
      return typeEquqlNaive(t1.type, t2.type, newMap);
    }
    default:
      throw new Error("not yet implemented");
  }
}

export function typeEqSub(t1: Type, t2: Type, seen: [Type, Type][]): boolean {
  for (const [s1, s2] of seen) {
    if (typeEquqlNaive(s1, t1, {}) && typeEquqlNaive(s2, t2, {})) {
      return true;
    }
  }
  if (t1.tag === "Rec") {
    return typeEqSub(
      simplifyType(t1),
      t2,
      [...seen, [t1, t2]],
    );
  }
  if (t2.tag === "Rec") {
    return typeEqSub(
      t1,
      simplifyType(t2),
      [...seen, [t1, t2]],
    );
  }
  switch (t1.tag) {
    case "Boolean":
    case "Number":
      return t1.tag === t2.tag;
    case "Func":
      if (t2.tag !== "Func") {
        return false;
      }
      if (t1.params.length !== t2.params.length) {
        return false;
      }
      for (let i = 0; i < t1.params.length; i++) {
        if (!typeEqSub(t1.params[i].type, t2.params[i].type, seen)) {
          return false;
        }
      }
      return typeEqSub(t1.retType, t2.retType, seen);
    case "Object":
      if (t2.tag !== "Object") {
        return false;
      }
      if (t1.props.length !== t2.props.length) {
        return false;
      }
      for (let i = 0; i < t1.props.length; i++) {
        const prop1 = t1.props[i];
        const prop2 = t2.props.find((p) => p.name === prop1.name);
        if (!prop2 || !typeEqSub(prop1.type, prop2.type, seen)) {
          return false;
        }
      }
      return true;
    case "TypeVar":
      throw new Error("unreachable");
    default:
      throw new Error("not yet implemented");
  }
}

export function expandType(type: Type, tyVarName: string, recType: Type): Type {
  switch (type.tag) {
    case "Boolean":
    case "Number":
      return type;
    case "Func": {
      const expandedParams = type.params.map(({ name, type }) => ({
        name,
        type: expandType(type, tyVarName, recType),
      }));
      const expandedRetType = expandType(type.retType, tyVarName, recType);
      return { tag: "Func", params: expandedParams, retType: expandedRetType };
    }
    case "Object": {
      const expandedProps = type.props.map(({ name, type }) => ({
        name,
        type: expandType(type, tyVarName, recType),
      }));
      return { tag: "Object", props: expandedProps };
    }
    case "TypeVar":
      return type.name === tyVarName ? recType : type;
    case "Rec": {
      if (type.name === tyVarName) {
        return type;
      }
      const expandedType = expandType(type.type, tyVarName, recType);
      return { tag: "Rec", name: type.name, type: expandedType };
    }
    default:
      throw new Error("not yet implemented");
  }
}

export function simplifyType(type: Type): Type {
  switch (type.tag) {
    case "Rec": {
      return simplifyType(expandType(type.type, type.name, type));
    }
    default:
      return type;
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
      const condType = simplifyType(typecheck(term.cond, env));
      if (condType.tag !== "Boolean") {
        throw new Error("Condition of if must be a Boolean");
      }
      const thnType = typecheck(term.thn, env);
      const elsType = typecheck(term.els, env);
      if (!typeEquql(thnType, elsType)) {
        throw new Error("Then and else branches must have the same type");
      }
      return thnType;
    }
    case "add": {
      const leftType = simplifyType(typecheck(term.left, env));
      const rightType = simplifyType(typecheck(term.right, env));
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
      const retType = typecheck(term.body, newEnv);

      return { tag: "Func", params: term.params, retType };
    }
    case "call": {
      const funcType = simplifyType(typecheck(term.func, env));
      if (funcType.tag !== "Func") {
        throw new Error("Can only call functions");
      }
      if (funcType.params.length !== term.args.length) {
        throw new Error("Argument count mismatch");
      }
      for (let i = 0; i < term.args.length; i++) {
        const argType = typecheck(term.args[i], env);
        if (!subtype(argType, funcType.params[i].type)) {
          throw new Error(
            `Argument type mismatch for parameter ${funcType.params[i].name}`,
          );
        }
      }
      return funcType.retType;
    }
    case "seq": {
      typecheck(term.body, env);
      return typecheck(term.rest, env);
    }
    case "const": {
      const initType = typecheck(term.init, env);
      const newEnv = { ...env, [term.name]: initType };
      return typecheck(term.rest, newEnv);
    }
    case "objectNew": {
      const props: PropType[] = term.props.map(({ name, term }) => ({
        name,
        type: typecheck(term, env),
      }));
      return { tag: "Object", props };
    }
    case "objectGet": {
      const objType = simplifyType(typecheck(term.obj, env));
      if (objType.tag !== "Object") {
        throw new Error("Can only get properties from objects");
      }
      const propType = objType.props.find((p) => p.name === term.propName);
      if (!propType) {
        throw new Error(`Property ${term.propName} does not exist on object`);
      }
      return propType.type;
    }
    case "recFunc": {
      const funcType: Type = {
        tag: "Func",
        params: term.params,
        retType: term.retType,
      };
      const newEnv = { ...env, [term.funcName]: funcType };
      for (const param of term.params) {
        newEnv[param.name] = param.type;
      }
      const retType = typecheck(term.body, newEnv);
      if (!typeEquql(retType, term.retType)) {
        throw new Error("Return type does not match declared return type");
      }
      return typecheck(term.rest, { ...env, [term.funcName]: funcType });
    }
    default:
      throw new Error(`not yet implemented`);
  }
}
