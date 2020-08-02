import { DBSetting } from './db-setting';
import { rdbmsTypeToKnexType } from './knex-client';
import { RelationSetting } from './relation-setting';
import {
  ColumnDefinition,
  getPrimaryKey,
  parseToColumnDefinitionPart,
  parseToArgsPart, parseToWherePart,
} from './column-definition';
import { parseToRelationPart, RelationDefinition2 } from './relation-definition2';
import { RelationDefinition } from './relation-definition';
import { capitalizeHead } from '../util/string-util';

export const buildRdbmsSchema = (tableNames: string[], columnDefinitions: ColumnDefinition[], relationDefinitions: RelationDefinition[]): string => {
  return importStatementPart +
    tableNames.map(tableName =>
      buildTableSchema(tableName, columnDefinitions, relationDefinitions)
    ).join("\n") + "\n" +
    queryRootPart(tableNames);
};

const queryRootPart = (tableNames: string[]): string => {
  return `export const rootQueryObjectType = new GiraphyObjectType({\n` +
    `  name: "Query",\n` +
    `  fields: () => ({\n` +
    tableNames.map(tableName =>
      `    ${tableName}: ${tableName}RootQuery,`
    ).join("\n") + "\n" +
    `  }),\n` +
    `});\n`
};

const buildTableSchema = (tableName: string, allColumnDefinitions: ColumnDefinition[], relationDefiniations: RelationDefinition[]): string => {
  const targetColumnDefinitions = allColumnDefinitions.filter(c => c.table_name == tableName).map(c => columnDefinitionToLowerCase(c));
  const primaryKey = getPrimaryKey(targetColumnDefinitions);
  const columnDefinitionPart = parseToColumnDefinitionPart(targetColumnDefinitions);
  const argsPart = parseToArgsPart(targetColumnDefinitions);
  const wherePart = parseToWherePart(targetColumnDefinitions, tableName);


  const tableType = `export const ${tableName}: GiraphyObjectType<any, any, any> = new GiraphyObjectType({\n` +
    `  name: "${capitalizeHead(tableName)}",\n` +
    `  sqlTable: "${tableName}",\n` +
    `  uniqueKey: "${primaryKey}",\n` +
    `  fields: () => ({\n` +
    columnDefinitionPart +
    `  }),\n` +
    `});\n`;

  const tableRootQuery = `const ${tableName}RootQuery: GraphQLFieldConfig<any, any> = {\n` +
    `  type: new GraphQLList(${tableName}.objectType),\n` +
    `  resolve: (source, args, context, info) => {\n` +
    `    return executeQuery(info, context)\n` +
    `  },\n` +
    `  args: {\n` +
    argsPart +
    `  },\n` +
    `  where: (table: string, args: any, context: any) => {\n` +
    wherePart +
    `  },\n` +
    `};\n`;

  return tableType + "\n" + tableRootQuery;
};

const columnDefinitionToLowerCase = (columnDefinition: ColumnDefinition): ColumnDefinition => ({
  table_name: columnDefinition.table_name.toLowerCase(),
  column_name: columnDefinition.column_name.toLowerCase(),
  data_type: columnDefinition.data_type.toLowerCase(),
  column_key: columnDefinition.column_key.toLowerCase()
});

export const tableSchemaToGraphQLSchema = (tableName: string, allColumnDefinitions: ColumnDefinition[], relationDefinitions: RelationDefinition2[]): string => {
  const targetColumnDefinitions = allColumnDefinitions.filter(c => c.table_name.toLowerCase() == tableName.toLowerCase()).map(c => columnDefinitionToLowerCase(c));
  const lowerCaseTableName = tableName.toLowerCase();

  const primaryKey = getPrimaryKey(targetColumnDefinitions);
  const columnDefinitionPart = parseToColumnDefinitionPart(targetColumnDefinitions);
  const argsPart = parseToArgsPart(targetColumnDefinitions);
  const wherePart = parseToWherePart(targetColumnDefinitions, lowerCaseTableName);
  const relationDefinitionPart = parseToRelationPart(relationDefinitions, allColumnDefinitions);

  const tableType = `const ${capitalizeHead(lowerCaseTableName)} = new GraphQLObjectType({\n` +
    `  name: "${capitalizeHead(lowerCaseTableName)}",\n` +
    `  sqlTable: "${tableName}",\n` +
    `  uniqueKey: "${primaryKey}",\n` +
    `  fields: () => ({\n` +
       columnDefinitionPart + relationDefinitionPart +
    `  }),\n` +
    `});\n`;

  const tableRootQuery = `const ${lowerCaseTableName} = {\n` +
    `  type: new GraphQLList(${capitalizeHead(lowerCaseTableName)}),\n` +
    `  resolve: (source, args, context, info) =>\n` +
    `    joinMonster.default(resolveInfo, context, (sql) =>\n` +
    `      dbCall(sql, context)\n` +
    `    ),\n` +
    `  args: {\n` +
    argsPart +
    `  },\n` +
    `  where: (${lowerCaseTableName}Table, args, context) => {\n` +
    wherePart +
    `  },\n` +
    `};\n`;

  return tableType + tableRootQuery;
};

const importStatementPart = 'import { GraphQLFieldConfig, GraphQLInt, GraphQLList, GraphQLSchema, GraphQLString } from \'graphql\';\n' +
  'import { executeQuery, GiraphyObjectType } from \'giraphy\';\n' +
  'import * as SqlString from \'sqlstring\';\n';

const dbCallPart = (dbSetting: DBSetting) => {
  return 'const knex = require("knex")({\n' +
    `  client: "${rdbmsTypeToKnexType(dbSetting.type)}",\n` +
    '  connection: {\n' +
    `    host: "${dbSetting.host}",\n` +
    `    user: "${dbSetting.user}",\n` +
    `    password: "${dbSetting.password}",\n` +
    `    database: "${dbSetting.database}",\n` +
    '  },\n' +
    '});\n' +
    'const dbCall = (sql, context) => {\n' +
    '  return knex\n' +
    '    .raw(sql.split(\'"\').join(""))\n' +
    '    .then(result => (result.length > 0 ? result[0] : null));\n' +
    '};\n\n';
};

export const createRdbmsBaseSchema = (tableNames: string[]) => {
  return 'exports.schema = new GraphQLSchema({\n' +
  '  query: new GraphQLObjectType({\n' +
  '    description: "global query object",\n' +
  '    name: "Query",\n' +
  '    fields: () => ({\n' +
  '      version: {\n' +
  '        type: GraphQLString,\n' +
  '        resolve: () => "0.1",\n' +
  '      },\n' +
  tableNames.map(tableName => `      ${tableName}: ${tableName}`).join(',\n') + ',\n' +
  '    }),\n' +
  '  }),\n' +
  '});'
};

export const parseRdbmsSchemaToGraphQLSchema = (tableNames: string[], columnDefinitions: ColumnDefinition[], dbSetting: DBSetting, relationSettingMaybe: RelationSetting | undefined): string => {
  return importStatementPart +
    dbCallPart(dbSetting) +
    tableNames
      .map(tableName => {
        let relationDefinitions: RelationDefinition2[] = [];
        if (relationSettingMaybe) {
          const relationDefinitionMapMaybe = relationSettingMaybe[tableName.toLowerCase()];
          if (!relationDefinitionMapMaybe) {
            return;
          }

          relationDefinitions = Object.keys(relationDefinitionMapMaybe).map(relationMapKey => {
            return ({
              ...relationDefinitionMapMaybe[relationMapKey],
              name: relationMapKey
            })
          });
        }
        return tableSchemaToGraphQLSchema(tableName, columnDefinitions, relationDefinitions)
      })
    .join("\n") + "\n" +
    createRdbmsBaseSchema(tableNames.map(t => t.toLowerCase()))
};
