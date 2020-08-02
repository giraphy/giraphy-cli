import { buildRdbmsSchema } from './rdbms-schema-parser';
import { ColumnDefinition } from './column-definition';
import fs from "fs";
import { RelationDefinition } from './relation-definition';

describe("parseRdbmsDdlToSchema ", () => {
  test("should return GraphQL schema", () => {
    const columnDefinitions: ColumnDefinition[] = [
      {
        table_name: "users",
        column_name: "user_id",
        data_type: "bigint",
        column_key: "PRI",
      },
      {
        table_name: "users",
        column_name: "email",
        data_type: "text",
        column_key: "",
      },
      {
        table_name: "comments",
        column_name: "comment_id",
        data_type: "bigint",
        column_key: "PRI"
      },
      {
        table_name: "comments",
        column_name: "user_id",
        data_type: "bigint",
        column_key: "FRI"
      },
      {
        table_name: "comments",
        column_name: "body",
        data_type: "text",
        column_key: ""
      }
    ];

    const relationDefinitions: RelationDefinition[] = [
      {
        table_name: "comments",
        column_name: "user_id",
        referenced_table_name: "users",
        referenced_column_name: "user_id"
      }
    ];

    const expected: string = fs.readFileSync('src/rdbms-schema/expected-base-schema.txt', 'utf8');
    expect(buildRdbmsSchema(["users", "comments"], columnDefinitions, relationDefinitions)).toBe(expected);
  });
});
