import {
  ColumnDefinition,
  getPrimaryKey,
  parseToArgsPart,
  parseToColumnDefinitionPart,
  parseToWherePart,
} from './column-definition';
import { parseToRelationDefinitionPart, RelationDefinition } from './relation-definition';
import { capitalizeHead } from '../util/string-util';

export const buildRdbmsSchema = (tableNames: string[], columnDefinitions: ColumnDefinition[], relationDefinitions: RelationDefinition[]): string => {
  return importStatementPart +
    tableNames.map(tableName =>
      buildTableSchema(tableName, columnDefinitions, relationDefinitions)
    ).join("\n")
};

const buildTableSchema = (tableName: string, allColumnDefinitions: ColumnDefinition[], relationDefiniations: RelationDefinition[]): string => {
  const targetColumnDefinitions = allColumnDefinitions.filter(c => c.table_name == tableName).map(c => columnDefinitionToLowerCase(c));
  const primaryKey = getPrimaryKey(targetColumnDefinitions);
  const columnDefinitionPart = parseToColumnDefinitionPart(targetColumnDefinitions);
  const relationDefinitonPart = parseToRelationDefinitionPart(
    relationDefiniations.filter(r => r.referenced_table_name === tableName),
    relationDefiniations.filter(r => r.table_name === tableName),
    allColumnDefinitions
  );
  const argsPart = parseToArgsPart(targetColumnDefinitions);
  const wherePart = parseToWherePart(targetColumnDefinitions, tableName);

  const tableType = `export const ${tableName}: GiraphyObjectType<any, any, any> = new GiraphyObjectType({\n` +
    `  name: "${capitalizeHead(tableName)}",\n` +
    `  // @ts-ignore\n` +
    `  sqlTable: "${tableName}",\n` +
    `  uniqueKey: "${primaryKey}",\n` +
    `  fields: () => ({\n` +
    columnDefinitionPart +
    relationDefinitonPart +
    `  }),\n` +
    `});\n`;

  const tableRootQuery = `export const ${tableName}RootQuery: GraphQLFieldConfig<any, any> = {\n` +
    `  type: new GraphQLList(${tableName}.objectType),\n` +
    `  resolve: (source, args, context, info) => {\n` +
    `    return executeQuery(info, context)\n` +
    `  },\n` +
    `  args: {\n` +
    argsPart +
    `  },\n` +
    `  // @ts-ignore\n` +
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

const importStatementPart = 'import { GraphQLFieldConfig, GraphQLInt, GraphQLList, GraphQLSchema, GraphQLString } from \'graphql\';\n' +
  'import * as SqlString from \'sqlstring\';\n' +
  'import { GiraphyObjectType } from \'@giraphy/giraphy/lib/schema/giraphy-schema\';\n' +
  'import { executeQuery } from \'@giraphy/giraphy/lib/schema/rdbms/rdbms-schema\';\n\n';
