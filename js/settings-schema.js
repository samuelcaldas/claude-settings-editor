/**
 * Claude Settings Editor - Settings Schema Adapter
 * Pure JSON Schema ($defs, $ref, allOf, anyOf, oneOf, constraints) traversal & normalization.
 */
(function exposeSettingsSchema(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SettingsSchema = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createSettingsSchema() {
  'use strict';

  function decodePointerSegment(segment) {
    return String(segment).replace(/~1/g, '/').replace(/~0/g, '~');
  }

  function resolvePointer(rootSchema, pointer) {
    if (!pointer || pointer === '#') return rootSchema;
    if (!pointer.startsWith('#/')) {
      throw new Error('Unsupported $ref pointer (only local fragment pointers are supported): ' + pointer);
    }
    const rawSegments = pointer.slice(2).split('/');
    let current = rootSchema;
    for (let i = 0; i < rawSegments.length; i++) {
      const segment = decodePointerSegment(rawSegments[i]);
      if (!current || typeof current !== 'object' || !(segment in current)) {
        throw new Error('Unresolvable $ref pointer segment "' + segment + '" in: ' + pointer);
      }
      current = current[segment];
    }
    return current;
  }

  function resolveSchema(rawSchema, rootSchema, seenRefs) {
    if (!rawSchema || typeof rawSchema !== 'object') return rawSchema;
    const seen = seenRefs ? new Set(seenRefs) : new Set();

    let current = rawSchema;
    while (current && typeof current === 'object' && typeof current.$ref === 'string') {
      const ref = current.$ref;
      if (seen.has(ref)) {
        throw new Error('Circular $ref detected: ' + Array.from(seen).join(' -> ') + ' -> ' + ref);
      }
      seen.add(ref);
      const target = resolvePointer(rootSchema || rawSchema, ref);
      // Merge outer schema overrides (e.g. description) over resolved reference
      const { $ref, ...rest } = current;
      current = { ...target, ...rest };
    }

    if (Array.isArray(current.allOf) && current.allOf.length > 0) {
      const merged = {};
      current.allOf.forEach(sub => {
        const resolvedSub = resolveSchema(sub, rootSchema || rawSchema, seen);
        if (resolvedSub && typeof resolvedSub === 'object') {
          Object.assign(merged, resolvedSub);
          if (resolvedSub.properties) {
            merged.properties = { ...(merged.properties || {}), ...resolvedSub.properties };
          }
          if (resolvedSub.required) {
            merged.required = Array.from(new Set([...(merged.required || []), ...resolvedSub.required]));
          }
        }
      });
      const { allOf, ...rest } = current;
      current = { ...merged, ...rest };
    }

    return current;
  }

  function inferType(schema) {
    if (!schema || typeof schema !== 'object') return 'unknown';
    if (schema.type) {
      return Array.isArray(schema.type) ? schema.type[0] : schema.type;
    }
    if (Array.isArray(schema.enum) || schema.const !== undefined) {
      return 'string';
    }
    if (schema.properties || schema.additionalProperties) {
      return 'object';
    }
    if (schema.items) {
      return 'array';
    }
    if (Array.isArray(schema.anyOf) || Array.isArray(schema.oneOf)) {
      return 'union';
    }
    return 'unknown';
  }

  function normalizeDefinition(rawSchema, rootSchema, path, name) {
    const resolved = resolveSchema(rawSchema, rootSchema);
    const type = inferType(resolved);
    const def = {
      path,
      name: name || (path ? path.split('.').pop() : ''),
      type,
      description: resolved.description || '',
      default: resolved.default !== undefined ? resolved.default : undefined,
      required: Boolean(resolved.required && Array.isArray(resolved.required)),
      raw: resolved
    };

    if (Array.isArray(resolved.enum)) {
      def.enum = [...resolved.enum];
    } else if (resolved.const !== undefined) {
      def.enum = [resolved.const];
      def.const = resolved.const;
    }

    if (type === 'integer' || type === 'number') {
      if (typeof resolved.minimum === 'number') def.minimum = resolved.minimum;
      if (typeof resolved.maximum === 'number') def.maximum = resolved.maximum;
      if (typeof resolved.exclusiveMinimum === 'number') def.exclusiveMinimum = resolved.exclusiveMinimum;
      if (typeof resolved.exclusiveMaximum === 'number') def.exclusiveMaximum = resolved.exclusiveMaximum;
      if (typeof resolved.multipleOf === 'number') def.multipleOf = resolved.multipleOf;
    }

    if (type === 'string') {
      if (typeof resolved.minLength === 'number') def.minLength = resolved.minLength;
      if (typeof resolved.maxLength === 'number') def.maxLength = resolved.maxLength;
      if (typeof resolved.pattern === 'string') def.pattern = resolved.pattern;
      if (typeof resolved.format === 'string') def.format = resolved.format;
    }

    if (type === 'array' && resolved.items) {
      def.items = normalizeDefinition(resolved.items, rootSchema, path ? path + '[]' : '[]');
      if (typeof resolved.minItems === 'number') def.minItems = resolved.minItems;
      if (typeof resolved.maxItems === 'number') def.maxItems = resolved.maxItems;
      if (typeof resolved.uniqueItems === 'boolean') def.uniqueItems = resolved.uniqueItems;
    }

    if (type === 'object') {
      if (resolved.additionalProperties && typeof resolved.additionalProperties === 'object') {
        def.additionalProperties = normalizeDefinition(resolved.additionalProperties, rootSchema, path ? path + '.*' : '*');
      } else if (typeof resolved.additionalProperties === 'boolean') {
        def.additionalProperties = resolved.additionalProperties;
      }
    }

    if (Array.isArray(resolved.anyOf)) {
      def.anyOf = resolved.anyOf.map((branch, idx) =>
        normalizeDefinition(branch, rootSchema, path ? `${path}[anyOf:${idx}]` : `[anyOf:${idx}]`)
      );
      // Collect union enums if all branches are literal consts/enums
      const unionEnums = [];
      resolved.anyOf.forEach(branch => {
        const resolvedBranch = resolveSchema(branch, rootSchema);
        if (Array.isArray(resolvedBranch.enum)) {
          unionEnums.push(...resolvedBranch.enum);
        } else if (resolvedBranch.const !== undefined) {
          unionEnums.push(resolvedBranch.const);
        }
      });
      if (unionEnums.length > 0 && !def.enum) {
        def.enum = Array.from(new Set(unionEnums));
      }
    }

    if (Array.isArray(resolved.oneOf)) {
      def.oneOf = resolved.oneOf.map((branch, idx) =>
        normalizeDefinition(branch, rootSchema, path ? `${path}[oneOf:${idx}]` : `[oneOf:${idx}]`)
      );
    }

    return def;
  }

  function isFreeFormMap(schemaNode) {
    if (!schemaNode || typeof schemaNode !== 'object') return false;
    // An object is freeform map if it specifies additionalProperties (e.g. env, pluginConfigs, hooks)
    // and does not have named fixed properties or has purely sample properties
    if (schemaNode.additionalProperties && (!schemaNode.properties || Object.keys(schemaNode.properties).length === 0)) {
      return true;
    }
    return false;
  }

  function flattenSchema(rootSchema) {
    if (!rootSchema || typeof rootSchema !== 'object') return new Map();
    const map = new Map();

    function walk(schemaNode, parentPath) {
      const resolved = resolveSchema(schemaNode, rootSchema);
      if (!resolved || typeof resolved !== 'object') return;

      if (resolved.properties && typeof resolved.properties === 'object') {
        const requiredSet = new Set(Array.isArray(resolved.required) ? resolved.required : []);
        for (const [key, rawProp] of Object.entries(resolved.properties)) {
          // Exclude freeform environment variable sample properties or hook event maps from dotted settings paths
          if (parentPath === 'env' || parentPath === 'hooks' || parentPath.startsWith('hooks.')) {
            continue;
          }
          const currentPath = parentPath ? `${parentPath}.${key}` : key;
          const normalized = normalizeDefinition(rawProp, rootSchema, currentPath, key);
          if (requiredSet.has(key)) normalized.required = true;
          map.set(currentPath, normalized);

          const resolvedProp = resolveSchema(rawProp, rootSchema);
          if (resolvedProp && resolvedProp.type === 'object' && resolvedProp.properties && !isFreeFormMap(resolvedProp)) {
            walk(resolvedProp, currentPath);
          }
        }
      }
    }

    walk(rootSchema, '');
    return map;
  }

  function createSchemaAdapter(rootSchema) {
    if (!rootSchema || typeof rootSchema !== 'object') {
      throw new Error('Valid root schema object required');
    }
    const definitionsMap = flattenSchema(rootSchema);

    return {
      schema: rootSchema,
      definitionsMap,
      getDefinition(path) {
        return definitionsMap.get(path) || null;
      },
      hasDefinition(path) {
        return definitionsMap.has(path);
      },
      getAllPaths() {
        return Array.from(definitionsMap.keys());
      },
      getAllDefinitions() {
        return Array.from(definitionsMap.values());
      },
      resolvePointer(pointer) {
        return resolvePointer(rootSchema, pointer);
      },
      resolveSchema(subSchema) {
        return resolveSchema(subSchema, rootSchema);
      },
      normalizeDefinition(subSchema, path, name) {
        return normalizeDefinition(subSchema, rootSchema, path, name);
      }
    };
  }

  return {
    createSchemaAdapter,
    decodePointerSegment,
    flattenSchema,
    inferType,
    isFreeFormMap,
    normalizeDefinition,
    resolvePointer,
    resolveSchema
  };
});
