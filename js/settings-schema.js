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

  function deepEqual(a, b) {
    if (a === b) return true;
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (let i = 0; i < keysA.length; i++) {
      const k = keysA[i];
      if (!Object.prototype.hasOwnProperty.call(b, k) || !deepEqual(a[k], b[k])) return false;
    }
    return true;
  }

  function getTypeName(val) {
    if (val === null) return 'null';
    if (val === undefined) return 'undefined';
    if (Array.isArray(val)) return 'array';
    if (typeof val === 'number') return Number.isInteger(val) ? 'integer' : 'number';
    return typeof val;
  }

  function matchType(val, typeName) {
    if (typeName === 'string') return typeof val === 'string';
    if (typeName === 'number') return typeof val === 'number' && Number.isFinite(val);
    if (typeName === 'integer') return typeof val === 'number' && Number.isInteger(val);
    if (typeName === 'boolean') return typeof val === 'boolean';
    if (typeName === 'object') return val !== null && typeof val === 'object' && !Array.isArray(val);
    if (typeName === 'array') return Array.isArray(val);
    if (typeName === 'null') return val === null;
    return false;
  }

  function validateValue(value, rawSchema, rootSchema, path, errors, options, schemaPath = '#', visited = new Set()) {
    if (options && options.maxErrors && errors.length >= options.maxErrors) {
      return;
    }

    if (rawSchema === true || rawSchema === undefined) return;
    if (rawSchema === false) {
      errors.push({
        path,
        message: 'Value is not allowed by schema (false)',
        keyword: 'false',
        schemaPath
      });
      return;
    }
    if (!rawSchema || typeof rawSchema !== 'object') return;

    let schema = rawSchema;
    if (schema.$ref) {
      try {
        schema = resolveSchema(schema, rootSchema);
      } catch (refErr) {
        errors.push({
          path,
          message: 'Could not resolve schema reference: ' + refErr.message,
          keyword: '$ref',
          schemaPath: schemaPath + '/$ref'
        });
        return;
      }
    }

    if (value && typeof value === 'object') {
      const cycleKey = `${schemaPath}::${path}`;
      if (visited.has(cycleKey)) return;
      visited.add(cycleKey);
    }

    function addError(errorPath, keyword, message, subSchemaPath) {
      if (options && options.maxErrors && errors.length >= options.maxErrors) return;
      errors.push({
        path: errorPath,
        keyword,
        message,
        schemaPath: subSchemaPath || `${schemaPath}/${keyword}`
      });
    }

    // 1. type
    if (schema.type) {
      if (Array.isArray(schema.type)) {
        const matched = schema.type.some(t => matchType(value, t));
        if (!matched) {
          addError(path, 'type', `Expected type to be one of [${schema.type.join(', ')}], but got ${getTypeName(value)}`, `${schemaPath}/type`);
          return;
        }
      } else if (typeof schema.type === 'string') {
        if (!matchType(value, schema.type)) {
          addError(path, 'type', `Expected ${schema.type}, but got ${getTypeName(value)}`, `${schemaPath}/type`);
          return;
        }
      }
    }

    // 2. const
    if (schema.const !== undefined) {
      if (!deepEqual(value, schema.const)) {
        addError(path, 'const', `Must be equal to constant ${JSON.stringify(schema.const)}`, `${schemaPath}/const`);
      }
    }

    // 3. enum
    if (Array.isArray(schema.enum)) {
      const inEnum = schema.enum.some(opt => deepEqual(value, opt));
      if (!inEnum) {
        addError(path, 'enum', `Must be equal to one of the allowed values: ${schema.enum.map(x => JSON.stringify(x)).join(', ')}`, `${schemaPath}/enum`);
      }
    }

    // 4. Number constraints
    if (typeof value === 'number' && Number.isFinite(value)) {
      if (typeof schema.minimum === 'number' && value < schema.minimum) {
        addError(path, 'minimum', `Must be greater than or equal to ${schema.minimum}`, `${schemaPath}/minimum`);
      }
      if (typeof schema.maximum === 'number' && value > schema.maximum) {
        addError(path, 'maximum', `Must be less than or equal to ${schema.maximum}`, `${schemaPath}/maximum`);
      }
      if (typeof schema.exclusiveMinimum === 'number' && value <= schema.exclusiveMinimum) {
        addError(path, 'exclusiveMinimum', `Must be strictly greater than ${schema.exclusiveMinimum}`, `${schemaPath}/exclusiveMinimum`);
      } else if (schema.exclusiveMinimum === true && typeof schema.minimum === 'number' && value <= schema.minimum) {
        addError(path, 'exclusiveMinimum', `Must be strictly greater than ${schema.minimum}`, `${schemaPath}/exclusiveMinimum`);
      }
      if (typeof schema.exclusiveMaximum === 'number' && value >= schema.exclusiveMaximum) {
        addError(path, 'exclusiveMaximum', `Must be strictly less than ${schema.exclusiveMaximum}`, `${schemaPath}/exclusiveMaximum`);
      } else if (schema.exclusiveMaximum === true && typeof schema.maximum === 'number' && value >= schema.maximum) {
        addError(path, 'exclusiveMaximum', `Must be strictly less than ${schema.maximum}`, `${schemaPath}/exclusiveMaximum`);
      }
      if (typeof schema.multipleOf === 'number' && schema.multipleOf > 0) {
        const div = value / schema.multipleOf;
        if (Math.abs(div - Math.round(div)) > 1e-9) {
          addError(path, 'multipleOf', `Must be a multiple of ${schema.multipleOf}`, `${schemaPath}/multipleOf`);
        }
      }
    }

    // 5. String constraints
    if (typeof value === 'string') {
      const strLen = Array.from(value).length;
      if (typeof schema.minLength === 'number' && strLen < schema.minLength) {
        addError(path, 'minLength', `String is shorter than minLength ${schema.minLength}`, `${schemaPath}/minLength`);
      }
      if (typeof schema.maxLength === 'number' && strLen > schema.maxLength) {
        addError(path, 'maxLength', `String is longer than maxLength ${schema.maxLength}`, `${schemaPath}/maxLength`);
      }
      if (typeof schema.pattern === 'string') {
        try {
          const rx = new RegExp(schema.pattern);
          if (!rx.test(value)) {
            addError(path, 'pattern', `Must match pattern "${schema.pattern}"`, `${schemaPath}/pattern`);
          }
        } catch (_) {}
      }
    }

    // 6. Array constraints
    if (Array.isArray(value)) {
      if (typeof schema.minItems === 'number' && value.length < schema.minItems) {
        addError(path, 'minItems', `Array must contain at least ${schema.minItems} item${schema.minItems === 1 ? '' : 's'}`, `${schemaPath}/minItems`);
      }
      if (typeof schema.maxItems === 'number' && value.length > schema.maxItems) {
        addError(path, 'maxItems', `Array must contain at most ${schema.maxItems} item${schema.maxItems === 1 ? '' : 's'}`, `${schemaPath}/maxItems`);
      }
      if (schema.uniqueItems === true && value.length > 1) {
        for (let i = 0; i < value.length; i++) {
          for (let j = i + 1; j < value.length; j++) {
            if (deepEqual(value[i], value[j])) {
              addError(path ? `${path}.${j}` : String(j), 'uniqueItems', `Array items must be unique (duplicate found at index ${j})`, `${schemaPath}/uniqueItems`);
              break;
            }
          }
        }
      }
      if (schema.contains && typeof schema.contains === 'object') {
        const matched = value.some(item => {
          const subErrors = [];
          validateValue(item, schema.contains, rootSchema, '', subErrors, options, `${schemaPath}/contains`, new Set(visited));
          return subErrors.length === 0;
        });
        if (!matched) {
          addError(path, 'contains', 'Array must contain at least one item matching schema', `${schemaPath}/contains`);
        }
      }
      if (Array.isArray(schema.items)) {
        for (let i = 0; i < value.length; i++) {
          const itemPath = path ? `${path}.${i}` : String(i);
          if (i < schema.items.length) {
            validateValue(value[i], schema.items[i], rootSchema, itemPath, errors, options, `${schemaPath}/items/${i}`, visited);
          } else if (schema.additionalItems === false) {
            addError(itemPath, 'additionalItems', `Additional item at index ${i} is not allowed`, `${schemaPath}/additionalItems`);
          } else if (typeof schema.additionalItems === 'object' && schema.additionalItems !== null) {
            validateValue(value[i], schema.additionalItems, rootSchema, itemPath, errors, options, `${schemaPath}/additionalItems`, visited);
          }
        }
      } else if (schema.items && (typeof schema.items === 'object' || typeof schema.items === 'boolean')) {
        for (let i = 0; i < value.length; i++) {
          const itemPath = path ? `${path}.${i}` : String(i);
          validateValue(value[i], schema.items, rootSchema, itemPath, errors, options, `${schemaPath}/items`, visited);
        }
      }
    }

    // 7. Object constraints
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const valKeys = Object.keys(value);
      if (typeof schema.minProperties === 'number' && valKeys.length < schema.minProperties) {
        addError(path, 'minProperties', `Object must have at least ${schema.minProperties} propert${schema.minProperties === 1 ? 'y' : 'ies'}`, `${schemaPath}/minProperties`);
      }
      if (typeof schema.maxProperties === 'number' && valKeys.length > schema.maxProperties) {
        addError(path, 'maxProperties', `Object must have at most ${schema.maxProperties} propert${schema.maxProperties === 1 ? 'y' : 'ies'}`, `${schemaPath}/maxProperties`);
      }

      if (Array.isArray(schema.required)) {
        for (const req of schema.required) {
          if (value[req] === undefined) {
            const reqPath = path ? `${path}.${req}` : req;
            addError(reqPath, 'required', `Missing required property: "${req}"`, `${schemaPath}/required`);
          }
        }
      }

      const definedProps = (schema.properties && typeof schema.properties === 'object') ? schema.properties : {};
      const patternProps = (schema.patternProperties && typeof schema.patternProperties === 'object') ? schema.patternProperties : {};
      const matchedKeys = new Set();

      for (const key of Object.keys(definedProps)) {
        if (key in value && value[key] !== undefined) {
          matchedKeys.add(key);
          const propPath = path ? `${path}.${key}` : key;
          validateValue(value[key], definedProps[key], rootSchema, propPath, errors, options, `${schemaPath}/properties/${key}`, visited);
        }
      }

      for (const [patternStr, patternSchema] of Object.entries(patternProps)) {
        let rx;
        try { rx = new RegExp(patternStr); } catch (_) { continue; }
        for (const key of valKeys) {
          if (rx.test(key)) {
            matchedKeys.add(key);
            const propPath = path ? `${path}.${key}` : key;
            validateValue(value[key], patternSchema, rootSchema, propPath, errors, options, `${schemaPath}/patternProperties/${patternStr}`, visited);
          }
        }
      }

      if (schema.additionalProperties !== undefined) {
        for (const key of valKeys) {
          if (!matchedKeys.has(key)) {
            const propPath = path ? `${path}.${key}` : key;
            if (schema.additionalProperties === false) {
              addError(propPath, 'additionalProperties', `Property "${key}" is not allowed`, `${schemaPath}/additionalProperties`);
            } else if (typeof schema.additionalProperties === 'object' && schema.additionalProperties !== null) {
              validateValue(value[key], schema.additionalProperties, rootSchema, propPath, errors, options, `${schemaPath}/additionalProperties`, visited);
            }
          }
        }
      }

      if (schema.propertyNames && typeof schema.propertyNames === 'object') {
        for (const key of valKeys) {
          const propPath = path ? `${path}.${key}` : key;
          validateValue(key, schema.propertyNames, rootSchema, propPath, errors, options, `${schemaPath}/propertyNames`, visited);
        }
      }

      if (schema.dependencies && typeof schema.dependencies === 'object') {
        for (const [depKey, depRule] of Object.entries(schema.dependencies)) {
          if (depKey in value) {
            if (Array.isArray(depRule)) {
              for (const req of depRule) {
                if (value[req] === undefined) {
                  addError(path ? `${path}.${req}` : req, 'dependencies', `Property "${depKey}" requires property "${req}"`, `${schemaPath}/dependencies/${depKey}`);
                }
              }
            } else if (typeof depRule === 'object' && depRule !== null) {
              validateValue(value, depRule, rootSchema, path, errors, options, `${schemaPath}/dependencies/${depKey}`, visited);
            }
          }
        }
      }
    }

    // 8. Combinators
    if (Array.isArray(schema.allOf)) {
      for (let i = 0; i < schema.allOf.length; i++) {
        validateValue(value, schema.allOf[i], rootSchema, path, errors, options, `${schemaPath}/allOf/${i}`, visited);
      }
    }

    if (Array.isArray(schema.anyOf)) {
      let anyPassed = false;
      for (let i = 0; i < schema.anyOf.length; i++) {
        const branchErrors = [];
        validateValue(value, schema.anyOf[i], rootSchema, path, branchErrors, options, `${schemaPath}/anyOf/${i}`, new Set(visited));
        if (branchErrors.length === 0) {
          anyPassed = true;
          break;
        }
      }
      if (!anyPassed) {
        addError(path, 'anyOf', 'Must match at least one schema in anyOf', `${schemaPath}/anyOf`);
      }
    }

    if (Array.isArray(schema.oneOf)) {
      let matchCount = 0;
      for (let i = 0; i < schema.oneOf.length; i++) {
        const branchErrors = [];
        validateValue(value, schema.oneOf[i], rootSchema, path, branchErrors, options, `${schemaPath}/oneOf/${i}`, new Set(visited));
        if (branchErrors.length === 0) {
          matchCount++;
        }
      }
      if (matchCount === 0) {
        addError(path, 'oneOf', 'Must match exactly one schema in oneOf (0 matched)', `${schemaPath}/oneOf`);
      } else if (matchCount > 1) {
        addError(path, 'oneOf', `Must match exactly one schema in oneOf (${matchCount} matched)`, `${schemaPath}/oneOf`);
      }
    }

    if (schema.not && typeof schema.not === 'object') {
      const notErrors = [];
      validateValue(value, schema.not, rootSchema, path, notErrors, options, `${schemaPath}/not`, new Set(visited));
      if (notErrors.length === 0) {
        addError(path, 'not', 'Must not match schema in "not"', `${schemaPath}/not`);
      }
    }

    // 9. Conditionals
    if (schema.if && typeof schema.if === 'object' && (schema.then || schema.else)) {
      const ifErrors = [];
      validateValue(value, schema.if, rootSchema, path, ifErrors, options, `${schemaPath}/if`, new Set(visited));
      if (ifErrors.length === 0) {
        if (schema.then) {
          validateValue(value, schema.then, rootSchema, path, errors, options, `${schemaPath}/then`, visited);
        }
      } else if (schema.else) {
        validateValue(value, schema.else, rootSchema, path, errors, options, `${schemaPath}/else`, visited);
      }
    }
  }

  function validateAgainstSchema(doc, rootSchema, options = {}) {
    const errors = [];
    validateValue(doc, rootSchema, rootSchema, '', errors, options, '#', new Set());
    return {
      valid: errors.length === 0,
      errors
    };
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
      },
      validate(doc, options) {
        return validateAgainstSchema(doc, rootSchema, options);
      }
    };
  }

  return {
    createSchemaAdapter,
    decodePointerSegment,
    deepEqual,
    flattenSchema,
    inferType,
    isFreeFormMap,
    normalizeDefinition,
    resolvePointer,
    resolveSchema,
    validateAgainstSchema,
    validateValue
  };
});
