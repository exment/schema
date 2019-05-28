import { Schema, type, ArraySchema } from "../src";

class IAmAChild extends Schema {
  @type("number") x: number;
  @type("number") y: number;
}

class ArraySchemaTypes extends Schema {
  @type([IAmAChild]) arrayOfSchemas = new ArraySchema<IAmAChild>();
  @type(["number"]) arrayOfNumbers = new ArraySchema<number>();
  @type(["string"]) arrayOfStrings = new ArraySchema<string>();
  @type(["int32"]) arrayOfInt32 = new ArraySchema<number>();
}

const state = new ArraySchemaTypes();

const item1 = new IAmAChild();
item1.x = 100;
item1.y = -100;
state.arrayOfSchemas.push(item1);

const item2 = new IAmAChild();
item2.x = 100;
item2.y = -100;
state.arrayOfSchemas.push(item2);

state.arrayOfNumbers.push(0);
state.arrayOfNumbers.push(10);
state.arrayOfNumbers.push(20);
state.arrayOfNumbers.push(30);

state.arrayOfStrings.push("one");
state.arrayOfStrings.push("two");
state.arrayOfStrings.push("three");

state.arrayOfInt32.push(1000);
state.arrayOfInt32.push(2000);
state.arrayOfInt32.push(-3000);


const bytes = Array.from(Uint8Array.from(Buffer.from( state.encode() )));

console.log("ArraySchemaTypes =>");
console.log(`{ ${bytes.join(", ")} }`);