import SwaggerParser from '@apidevtools/swagger-parser';

const target = 'public/doc/api/openapi.yaml';

try {
  await SwaggerParser.validate(target);
  console.log(`OpenAPI schema is valid: ${target}`);
} catch (error) {
  console.error('OpenAPI validation failed');
  console.error(error);
  process.exit(1);
}
