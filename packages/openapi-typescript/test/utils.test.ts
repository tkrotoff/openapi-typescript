import { bench } from "vitest";
import { comment, escObjKey, getSchemaObjectComment, parseRef, tsIntersectionOf, tsUnionOf } from "../src/utils.js";

describe("utils", () => {
  describe("tsUnionOf", () => {
    test("never for no elements", () => {
      expect(tsUnionOf()).toBe("never");
    });
    test("identity for single element", () => {
      expect(tsUnionOf("boolean")).toBe("boolean");
    });
    test("primitive", () => {
      expect(tsUnionOf("string", "number", "boolean")).toBe("string | number | boolean");
    });
    test("constant booleans", () => {
      expect(tsUnionOf(true, false)).toBe("true | false");
    });
    test("constant strings", () => {
      expect(tsUnionOf('"hello"', '"world"')).toBe('"hello" | "world"');
    });
    test("constant numbers", () => {
      expect(tsUnionOf(0, 1, 2, 3)).toBe("0 | 1 | 2 | 3");
    });
    test("mixed", () => {
      expect(tsUnionOf(0, true, "string", '"hello"')).toBe('0 | true | string | "hello"');
    });
    test("de-duplicate", () => {
      expect(tsUnionOf("string", "string", "number")).toBe("string | number");
    });
    test("remove all but unknown", () => {
      expect(tsUnionOf("string", "unknown")).toBe("unknown");
    });
    test("remove never", () => {
      expect(tsUnionOf("string", "never")).toBe("string");
    });
    test("never if no other members of union", () => {
      expect(tsUnionOf("never", "never")).toBe("never");
    });
    test("don't add parenthesis around a single element from a de-duped union", () => {
      expect(tsUnionOf("number & number", "number & number")).toBe("number & number");
    });
  });

  describe("tsIntersectionOf", () => {
    const tests: [string, string[], string][] = [
      ["identity for single type", ["string"], "string"],
      ["basic intersection", ["string", "number"], "string & number"],
      ["filter out unknown", ["string", "number", "unknown"], "string & number"],
      ["identity for unknown type", ["unknown"], "unknown"],
      ["unknown for no types passed", [], "unknown"],
      ["parentheses around types with union", ["4", `string | number`], "4 & (string | number)"],
      ["parentheses around types with intersection", ["{ red: string }", "{ blue: string } & { green: string }"], "{ red: string } & ({ blue: string } & { green: string })"],
    ];

    tests.forEach(([name, input, output]) => {
      test(name, () => {
        expect(tsIntersectionOf(...input)).toBe(output);
      });
    });
  });

  describe("parseRef", () => {
    it("basic", () => {
      expect(parseRef("#/test/schema-object")).toStrictEqual({ filename: ".", path: ["test", "schema-object"] });
    });

    it("double quote", () => {
      expect(parseRef('#/test/"')).toStrictEqual({ filename: ".", path: ["test", '\\"'] });
    });

    it("escaped double quote", () => {
      expect(parseRef('#/test/\\"')).toStrictEqual({ filename: ".", path: ["test", '\\"'] });
    });

    it("tilde escapes", () => {
      expect(parseRef("#/test/~1~0")).toStrictEqual({ filename: ".", path: ["test", "/~"] });
    });

    it("remote ref", () => {
      expect(parseRef("remote.yaml#/Subpath")).toStrictEqual({ filename: "remote.yaml", path: ["Subpath"] });
      expect(parseRef("../schemas/remote.yaml#/Subpath")).toStrictEqual({ filename: "../schemas/remote.yaml", path: ["Subpath"] });
      expect(parseRef("https://myschema.com/api/v1/openapi.yaml#/Subpath")).toStrictEqual({ filename: "https://myschema.com/api/v1/openapi.yaml", path: ["Subpath"] });
    });

    it("js-yaml $ref", () => {
      expect(parseRef('components["schemas"]["SchemaObject"]')).toStrictEqual({ filename: ".", path: ["components", "schemas", "SchemaObject"] });
    });
  });

  describe("escObjKey", () => {
    it("basic", () => {
      expect(escObjKey("some-prop")).toStrictEqual('"some-prop"');
    });

    it("@ escapes", () => {
      expect(escObjKey("@type")).toStrictEqual('"@type"');
    });

    it("number escapes", () => {
      expect(escObjKey("123var")).toStrictEqual('"123var"');
    });

    it("only number no escapes", () => {
      expect(escObjKey("123")).toStrictEqual("123");
    });

    it("$ no escapes", () => {
      expect(escObjKey("$ref")).toStrictEqual("$ref");
    });

    it("_ no escapes", () => {
      expect(escObjKey("_ref_")).toStrictEqual("_ref_");
    });
  });

  describe("comment", () => {
    it("basic", () => {
      expect(comment("A comment")).toStrictEqual("/** A comment */");
      expect(comment("A multi-line \n\n comment")).toStrictEqual(
        // prettier-ignore
        "/**\n" +
        " * A multi-line\n" +
        " *\n" +
        " *  comment\n"+
        " */"
      );
    });
  });

  describe("getSchemaObjectComment", () => {
    it("object with 1 property", () => {
      expect(
        getSchemaObjectComment({
          title: "A title",
        })
      ).toStrictEqual("/** A title */");
    });

    it("object with 2 properties", () => {
      expect(
        getSchemaObjectComment({
          title: "A title",
          description: "A description",
        })
      ).toStrictEqual(
        // prettier-ignore
        "/**\n" +
        " * A title\n" +
        " * @description A description\n"+
        " */"
      );
    });

    it("object with a multi-line property", () => {
      expect(
        getSchemaObjectComment({
          title: "A title",
          description: "A multi-line \n\n description",
        })
      ).toStrictEqual(
        // prettier-ignore
        "/**\n" +
        " * A title\n" +
        " * @description A multi-line\n" +
        " *\n" +
        " *  description\n" +
        " */"
      );
    });
  });
});
