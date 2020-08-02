import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { DBSetting } from './db-setting';
import { createKnex } from './knex-client';
import { ColumnDefinition } from './column-definition';
import { RelationDefinition } from './relation-definition';
import { buildRdbmsSchema } from './rdbms-schema-parser';

const giraphySetting = yaml.safeLoad((fs.readFileSync('./giraphy.yaml', 'utf8'))) as (any | undefined);
if (!giraphySetting) {
  throw new Error("giraphy.yaml is required")
}

const dbSetting: DBSetting | undefined = giraphySetting["database"];
if (!dbSetting) {
  throw new Error("database setting is required")
}

export const createRdbmsSchema = async () => {
  // TODO select table_name, column_name, referenced_table_name, referenced_column_name from key_column_usage where table_schema = "example" and referenced_table_name is not null;でリレーションを取得する。
  const knex = createKnex(dbSetting);
  const tableResult = await knex.raw(`select table_name from information_schema.tables where table_schema = '${dbSetting.database}';`);
  const tableRows = tableResult[0] as { table_name: string }[];
  const columnResult = await knex.raw(`select table_name, column_name, data_type, column_key from information_schema.columns where table_schema = '${dbSetting.database}';`);
  const columnDefinitions = columnResult[0] as ColumnDefinition[];

  const relationDefinitions = (await knex.raw(`select table_name, column_name, referenced_table_name, referenced_column_name from key_column_usage where table_schema = "${dbSetting.database}" and referenced_table_name is not null;`))[0] as RelationDefinition[];

  const result = buildRdbmsSchema(tableRows.map(t => t.table_name), columnDefinitions, relationDefinitions, dbSetting);
  fs.writeFileSync('schema.js', result);
  process.exit(0);
};
