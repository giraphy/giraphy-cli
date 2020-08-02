import { ColumnDefinition, parseToArgsPart, parseToWherePart } from './column-definition';

export type RelationDefinition = {
  table_name: string;
  column_name: string;
  referenced_table_name: string;
  referenced_column_name: string;
};

export const parseToRelationDefinitionPart = (toManyRelationDefinitions: RelationDefinition[], toOneRelationDefinitions: RelationDefinition[], allColumnDefinitions: ColumnDefinition[]): string => {
  const toManyRelationDefinitionPart = toManyRelationDefinitions.length > 0 ? toManyRelationDefinitions.map(relationDefinition => {
    return `    ${relationDefinition.table_name}List: {\n` +
      `      type: new GraphQLList(${relationDefinition.table_name}.objectType),\n` +
      `      sqlJoin: (${relationDefinition.referenced_table_name}Table: string, ${relationDefinition.table_name}Table: string) =>\n` +
      `        \`\${${relationDefinition.referenced_table_name}Table}.${relationDefinition.referenced_column_name} = \${${relationDefinition.table_name}Table}.${relationDefinition.column_name}\`,\n` +
      `      args: {\n` +
      parseToArgsPart(allColumnDefinitions.filter(c => c.table_name === relationDefinition.table_name), 4) +
      `      },\n` +
      `      where: (table: string, args: any, context: any) => {\n` +
      parseToWherePart(allColumnDefinitions.filter(c => c.table_name === relationDefinition.table_name), relationDefinition.table_name, 4) +
      `      },\n` +
      `    },`
  }).join("\n") + "\n" : "";

  const toOneRelationDefinitionPart = toOneRelationDefinitions.length > 0 ? toOneRelationDefinitions.map(relationDefinition => {
    return `    ${relationDefinition.referenced_table_name}One: {\n` +
      `      type: ${relationDefinition.referenced_table_name}.objectType,\n` +
      `      sqlJoin: (${relationDefinition.table_name}Table: string, ${relationDefinition.referenced_table_name}Table: string) =>\n` +
      `        \`\${${relationDefinition.table_name}Table}.${relationDefinition.column_name} = \${${relationDefinition.referenced_table_name}Table}.${relationDefinition.referenced_column_name}\`,\n` +
      `      args: {\n` +
      parseToArgsPart(allColumnDefinitions.filter(c => c.table_name === relationDefinition.referenced_table_name), 4) +
      `      },\n` +
      `      where: (table: string, args: any, context: any) => {\n` +
      parseToWherePart(allColumnDefinitions.filter(c => c.table_name === relationDefinition.referenced_table_name), relationDefinition.referenced_table_name, 4) +
      `      },\n` +
      `    },`
  }).join("\n") + "\n" : "";

  return toManyRelationDefinitionPart + toOneRelationDefinitionPart;
};
